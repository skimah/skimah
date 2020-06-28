import { generate, SkimahConfig } from "@skimah/api";
import { graphql } from "graphql";
import CSVSource from "../src/csv";

const typeDefs = `
  type Album @datasource(name: "albums") {
    id: ID @named(as: "AlbumId")
    title: String @named(as: "Title")

    artist: Artist @relation @named(as: "ArtistId")
  }

  type Artist @datasource(name: "artists") {
    id: ID @named(as: "ArtistId")
    name: String @named(as: "Name")

    albums: [Album] @relation
  }
`;

describe("Datasource CSV", () => {
  let schema;

  beforeAll(async () => {
    const albums = new CSVSource({
      filepath: "fixtures/Album.csv"
    });

    const artists = new CSVSource({
      filepath: "fixtures/Artist.csv"
    });

    const sources = { albums, artists };
    const config: SkimahConfig = { typeDefs, sources };

    const scaffoldResult = await generate(config);
    schema = scaffoldResult.schema;
  });

  describe("Selection", () => {
    test("Skip and Limit", async () => {
      const query = `
          query {
              findAlbums(skip: 2, limit: 2) {
                  title
              }
          }
        `;

      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "findAlbums": Array [
            Object {
              "title": "Restless and Wild",
            },
            Object {
              "title": "Let There Be Rock",
            },
          ],
        }
      `);
    });

    test("One-to-Many relationship", async () => {
      const query = `
          query {
            findArtists(where: { name: { eq: "U2" } }) {
              id
              name

              albums {
                title
              }
            }
          }
        `;

      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "findArtists": Array [
            Object {
              "albums": Array [
                Object {
                  "title": "Achtung Baby",
                },
                Object {
                  "title": "All That You Can't Leave Behind",
                },
                Object {
                  "title": "B-Sides 1980-1990",
                },
                Object {
                  "title": "How To Dismantle An Atomic Bomb",
                },
                Object {
                  "title": "Pop",
                },
                Object {
                  "title": "Rattle And Hum",
                },
                Object {
                  "title": "The Best Of 1980-1990",
                },
                Object {
                  "title": "War",
                },
                Object {
                  "title": "Zooropa",
                },
                Object {
                  "title": "Instant Karma: The Amnesty International Campaign to Save Darfur",
                },
              ],
              "id": "150",
              "name": "U2",
            },
          ],
        }
      `);
    });

    test("One-to-One relationship", async () => {
      const query = `
        query {
          findAlbums(limit: 2) {
            title

            artist {
              name
            }
          }
        }
      `;

      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
Object {
  "findAlbums": Array [
    Object {
      "artist": Object {
        "name": "AC/DC",
      },
      "title": "For Those About To Rock We Salute You",
    },
    Object {
      "artist": Object {
        "name": "Accept",
      },
      "title": "Balls to the Wall",
    },
  ],
}
`);
    });
  });

  describe("Mutation", () => {
    it("Create", async () => {
      const createId = () => Math.round(Math.random() * 100000);
      const query = `
        mutation {
          createArtists(data: [
            { id: ${createId()}, name: "Artist-${createId()}" },
            { id: ${createId()}, name: "Artist-${createId()}" },
          ]) {
            affected
          }
        }
      `;
      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data.createArtists.affected).toHaveLength(2);
    });

    it("Update", async () => {
      const query = `
        mutation {
          updateArtists(changes: { name: "Maroon 5", }, where: { id: {eq: 100} }) {
            affected
            artists {
              id
              name
            }
          }
        }
      `;
      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
Object {
  "updateArtists": Object {
    "affected": Array [
      "100",
    ],
    "artists": Array [
      Object {
        "id": "100",
        "name": "Maroon 5",
      },
    ],
  },
}
`);
    });

    it("Delete", async () => {
      const query = `
          mutation {
            deleteAlbums(where: { title: { like: "For Those*" } } ) {
              affected

              albums {
                title
              }
            }
          }
        `;

      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
Object {
  "deleteAlbums": Object {
    "affected": Array [
      "1",
    ],
    "albums": Array [
      Object {
        "title": "For Those About To Rock We Salute You",
      },
    ],
  },
}
`);
    });
  });
});
