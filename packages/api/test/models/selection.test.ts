import { graphql } from "graphql";
import generate from "../../src/generate";
import { QueryModel, Datasource } from "../../src/types";

const typeDefs = `
    type User {
        userid: ID
        email: String
        username: String
        age: Int
        videos: [Video] @relation(field: "publisher")
    }

    type Video {
        videoID: ID
        name: String

        status: Status @relation
        publisher: User! @named(as: "user") @relation(field: "userid")
        comments: [Comment] @relation(field: "video")
    }

    type Status {
      id: ID
      created_at: String

      vid: Video @relation @named(as: "video")
    }

    type Comment @datasource(name:"mongo") {
      id: ID
      text: String

      video: Video! @relation(field: "videoID") @named(as: "mediaID")
    }

    type Query {
        hello: String
    }
`;

const noopSource = () => ({
  select: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
});

describe("Schema Selection", () => {
  test("Projection and identities", async () => {
    let selection: QueryModel;
    const { schema } = await generate({
      typeDefs,
      sources: {
        mongo: noopSource(),
        default: {
          select: sel => {
            selection = sel;
            return Promise.all([]);
          },
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      }
    });

    const query = `
        query {
            findUsers {
                email
                username
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(selection.projectedAttributes).toMatchInlineSnapshot(`
          Object {
            "email": Object {
              "name": "email",
              "sourceName": "email",
              "type": "String",
              "unique": false,
            },
            "userid": Object {
              "name": "userid",
              "sourceName": "userid",
              "type": "ID",
              "unique": true,
            },
            "username": Object {
              "name": "username",
              "sourceName": "username",
              "type": "String",
              "unique": false,
            },
          }
      `);

    expect(selection.identities).toMatchInlineSnapshot(`
          Array [
            Object {
              "name": "userid",
              "sourceName": "userid",
              "type": "ID",
              "unique": true,
            },
          ]
      `);

    expect(selection.datasource).toMatchInlineSnapshot(`"default"`);
    expect(selection.name).toMatchInlineSnapshot(`"User"`);
  });

  test("Filter criteria", async () => {
    let selection: QueryModel;
    const { schema } = await generate({
      typeDefs,
      sources: {
        mongo: noopSource(),
        default: {
          select: sel => {
            selection = sel;
            return Promise.all([]);
          },
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      }
    });

    const query = `
        query {
            findUsers(where: {
                username: { eq: "sayjava" },
                age: { eq: 20 }
            }
            ) {
                username
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(selection.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "age": Object {
              "eq": 20,
            },
            "username": Object {
              "eq": "sayjava",
            },
          },
        ],
        "limit": undefined,
        "or": Array [],
        "orderBy": Object {},
        "skip": undefined,
      }
    `);
  });

  test("OrderBy", async () => {
    let selection: QueryModel;
    const { schema } = await generate({
      typeDefs,
      sources: {
        mongo: noopSource(),
        default: {
          select: sel => {
            selection = sel;
            return Promise.all([]);
          },
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      }
    });

    const query = `
        query {
            findUsers(orderBy: { age: asc } ) {
                username
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(selection.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [],
        "limit": undefined,
        "or": Array [],
        "orderBy": Object {
          "age": "asc",
        },
        "skip": undefined,
      }
    `);
  });

  test("Combined filters", async () => {
    let selection: QueryModel;
    const { schema } = await generate({
      typeDefs,
      sources: {
        mongo: noopSource(),
        default: {
          select: sel => {
            selection = sel;
            return Promise.all([]);
          },
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      }
    });

    const query = `
        query {
            findUsers(where: {
                age: { gte: 20 },
                and: [
                    { username: { eq: "James" } },
                    { username: { eq: "Bond" } }
                ],
                or: [
                    { age: { gte: 5 } },
                    { age: { lte: 1 } }
                ] }) {
                username
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(selection.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "username": Object {
              "eq": "James",
            },
          },
          Object {
            "username": Object {
              "eq": "Bond",
            },
          },
          Object {
            "age": Object {
              "gte": 20,
            },
          },
        ],
        "limit": undefined,
        "or": Array [
          Object {
            "age": Object {
              "gte": 5,
            },
          },
          Object {
            "age": Object {
              "lte": 1,
            },
          },
        ],
        "orderBy": Object {},
        "skip": undefined,
      }
    `);
  });

  test("Simple nested filters", async () => {
    let selection: QueryModel;
    const { schema } = await generate({
      typeDefs,
      sources: {
        mongo: noopSource(),
        default: {
          select: sel => {
            selection = sel;
            return Promise.all([]);
          },
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      }
    });

    const query = `
        query {
            findUsers {
                videos(where : { name:{ eq: "trending" } }) {
                    name

                    status {
                      created_at
                    }
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(selection.projectedRelations["videos"].condition)
      .toMatchInlineSnapshot(`
      Object {
        "child": Object {
          "name": "publisher",
          "sourceName": "user",
        },
        "parent": Object {
          "name": "userid",
          "sourceName": "userid",
        },
      }
    `);

    expect(selection.projectedRelations["videos"].model?.projectedAttributes)
      .toMatchInlineSnapshot(`
      Object {
        "name": Object {
          "name": "name",
          "sourceName": "name",
          "type": "String",
          "unique": false,
        },
        "publisher": Object {
          "name": "publisher",
          "sourceName": "user",
          "type": "ID",
          "unique": false,
        },
        "status": Object {
          "name": "status",
          "sourceName": "status",
          "type": "ID",
          "unique": false,
        },
        "videoID": Object {
          "name": "videoID",
          "sourceName": "videoID",
          "type": "ID",
          "unique": true,
        },
      }
    `);

    expect(
      (selection.projectedRelations["videos"].model as QueryModel).criteria
    ).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "name": Object {
              "eq": "trending",
            },
          },
        ],
        "limit": undefined,
        "or": Array [],
        "orderBy": Object {},
        "skip": undefined,
      }
    `);

    expect(
      (selection.projectedRelations["videos"].model as QueryModel)
        .projectedAttributes
    ).toMatchInlineSnapshot(`
      Object {
        "name": Object {
          "name": "name",
          "sourceName": "name",
          "type": "String",
          "unique": false,
        },
        "publisher": Object {
          "name": "publisher",
          "sourceName": "user",
          "type": "ID",
          "unique": false,
        },
        "status": Object {
          "name": "status",
          "sourceName": "status",
          "type": "ID",
          "unique": false,
        },
        "videoID": Object {
          "name": "videoID",
          "sourceName": "videoID",
          "type": "ID",
          "unique": true,
        },
      }
    `);
  });

  test("Nested criteria", async () => {
    let mongoSelection: QueryModel;

    const defaultSource: Datasource = {
      select: jest.fn(() =>
        Promise.resolve([
          {
            videoID: "first-video"
          }
        ])
      ),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const mongoSource: Datasource = {
      select: jest.fn(selection => {
        mongoSelection = selection;
        return Promise.resolve([
          {
            text: "first video comments"
          }
        ]);
      }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const { schema } = await generate({
      typeDefs,
      sources: {
        default: defaultSource,
        mongo: mongoSource
      }
    });

    const query = `
        query {
            findVideos {
                comments {
                    text
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(mongoSelection.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "mediaID": Object {
              "eq": "first-video",
            },
          },
        ],
        "limit": undefined,
        "or": Array [],
        "orderBy": Object {},
        "skip": undefined,
      }
    `);
  });

  test("Nested query of different datasources", async () => {
    let mongoSelection: QueryModel;

    const defaultSource: Datasource = {
      select: jest.fn(() =>
        Promise.resolve([
          {
            videoID: "first-video"
          }
        ])
      ),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const mongoSource: Datasource = {
      select: jest.fn(selection => {
        mongoSelection = selection;
        return Promise.resolve([
          {
            text: "first video comments"
          }
        ]);
      }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const { schema } = await generate({
      typeDefs,
      sources: {
        default: defaultSource,
        mongo: mongoSource
      }
    });

    const query = `
        query {
            findVideos {
                comments ( where: { text: { nin: ["yummy"] } }) {
                    text
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(mongoSelection.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "mediaID": Object {
              "eq": "first-video",
            },
            "text": Object {
              "nin": Array [
                "yummy",
              ],
            },
          },
        ],
        "limit": undefined,
        "or": Array [],
        "orderBy": Object {},
        "skip": undefined,
      }
    `);

    expect(mongoSelection.projectedAttributes).toMatchInlineSnapshot(`
      Object {
        "id": Object {
          "name": "id",
          "sourceName": "id",
          "type": "ID",
          "unique": true,
        },
        "text": Object {
          "name": "text",
          "sourceName": "text",
          "type": "String",
          "unique": false,
        },
        "video": Object {
          "name": "video",
          "sourceName": "mediaID",
          "type": "ID",
          "unique": false,
        },
      }
    `);
  });

  test("Nested query only contains projectedRelations of same datasource", async () => {
    let defaultSelection: QueryModel;
    let mongoSelection: QueryModel;

    const defaultSource: Datasource = {
      select: jest.fn(selection => {
        defaultSelection = selection;
        return Promise.resolve([
          {
            userId: "demo-person"
          }
        ]);
      }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const mongoSource: Datasource = {
      select: jest.fn(selection => {
        mongoSelection = selection;
        return Promise.resolve([]);
      }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const { schema } = await generate({
      typeDefs,
      sources: {
        default: defaultSource,
        mongo: mongoSource
      }
    });

    const query = `
        query {
            findVideos {
                comments ( where: { text: { nin: ["yummy"] } }) {
                    text
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(mongoSelection.projectedRelations).toMatchInlineSnapshot(
      `Object {}`
    );

    expect(defaultSelection.projectedRelations).toMatchInlineSnapshot(
      `Object {}`
    );
  });

  test("Query args", async () => {
    let selection: QueryModel;
    const { schema } = await generate({
      typeDefs,
      sources: {
        mongo: noopSource(),
        default: {
          select: sel => {
            selection = sel;
            return Promise.all([]);
          },
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      }
    });

    const query = `
        query findMe($me:String) {
            findUsers(where: { username: { eq: $me }}
            ) {
                username
            }
        }
    `;

    const result = await graphql(schema, query, null, null, { me: "bond" });
    expect(result.errors).toBeUndefined();

    expect(selection.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "username": Object {
              "eq": "bond",
            },
          },
        ],
        "limit": undefined,
        "or": Array [],
        "orderBy": Object {},
        "skip": undefined,
      }
    `);
  });
});
