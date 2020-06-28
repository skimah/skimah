import generate from "../src/generate";
import { Datasource, SkimahResult } from "../src/types";
import { graphql } from "graphql";

const typeDefs = `
    type User {
        userid: ID
        email: String
        age: Int
        height: Float

        videos: [Video] @relation(field: "publisher")
    }

    type Video {
        videoID: ID
        name: String
        url: String

        rated: Rated! @relation(field: "media")
        comments: [Comments] @relation @relation
        publisher: User! @relation(field: "userid")
    }

    type Comments @datasource(name: "wiki") {
      commentId: ID
      text: String

      video: Video @relation
    }

    type Rated @datasource(name: "google") {
      id: ID
      value: Float

      media: Video
    }

    type Query {
      hello: String
    }

    type Mutation {
      hello: String
    }
`;

const defaultSource: Datasource = {
  select: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const googleSource: Datasource = {
  select: jest.fn().mockResolvedValue([{ id: "ratedid" }]),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

let skimahResult: SkimahResult;

describe("Schema Relations", () => {
  beforeAll(async () => {
    skimahResult = await generate({
      typeDefs,
      sources: {
        default: defaultSource,
        google: googleSource,
        wiki: defaultSource
      }
    });
  });

  test("One-to-many field relations", () => {
    // videos field has a filter argument
    // emails which is a scalar has no filter
    expect(skimahResult.schemaComposer.getOTC("User").toSDL())
      .toMatchInlineSnapshot(`
      "type User {
        userid: ID
        email: String
        age: Int
        height: Float
        videos(
          \\"\\"\\"Limit the number of videos that will be returned\\"\\"\\"
          limit: Int

          \\"\\"\\"Skip the first number of videos that will be returned\\"\\"\\"
          skip: Int

          \\"\\"\\"Filter condition for videos that will be returned\\"\\"\\"
          where: VideoFilter

          \\"\\"\\"Sort videos that will be returned\\"\\"\\"
          orderBy: VideoOrderBy
        ): [Video] @relation(field: \\"publisher\\")
      }"
    `);

    // the publisher field, a non collection has no filter field
    expect(skimahResult.schemaComposer.getOTC("Video").toSDL())
      .toMatchInlineSnapshot(`
      "type Video {
        videoID: ID
        name: String
        url: String
        rated: Rated!
        comments(
          \\"\\"\\"Limit the number of comments that will be returned\\"\\"\\"
          limit: Int

          \\"\\"\\"Skip the first number of comments that will be returned\\"\\"\\"
          skip: Int

          \\"\\"\\"Filter condition for comments that will be returned\\"\\"\\"
          where: CommentsFilter

          \\"\\"\\"Sort comments that will be returned\\"\\"\\"
          orderBy: CommentsOrderBy
        ): [Comments]!
        publisher: User! @relation(field: \\"userid\\")
      }"
    `);
  });

  test("One-to-one field relations", () => {
    // videos field has a filter argument
    // emails which is a scalar has no filter
    expect(skimahResult.schemaComposer.getOTC("Video").toSDL())
      .toMatchInlineSnapshot(`
      "type Video {
        videoID: ID
        name: String
        url: String
        rated: Rated!
        comments(
          \\"\\"\\"Limit the number of comments that will be returned\\"\\"\\"
          limit: Int

          \\"\\"\\"Skip the first number of comments that will be returned\\"\\"\\"
          skip: Int

          \\"\\"\\"Filter condition for comments that will be returned\\"\\"\\"
          where: CommentsFilter

          \\"\\"\\"Sort comments that will be returned\\"\\"\\"
          orderBy: CommentsOrderBy
        ): [Comments]!
        publisher: User! @relation(field: \\"userid\\")
      }"
    `);

    // the publisher field, a non collection has no filter field
    expect(skimahResult.schemaComposer.getOTC("Video").toSDL())
      .toMatchInlineSnapshot(`
      "type Video {
        videoID: ID
        name: String
        url: String
        rated: Rated!
        comments(
          \\"\\"\\"Limit the number of comments that will be returned\\"\\"\\"
          limit: Int

          \\"\\"\\"Skip the first number of comments that will be returned\\"\\"\\"
          skip: Int

          \\"\\"\\"Filter condition for comments that will be returned\\"\\"\\"
          where: CommentsFilter

          \\"\\"\\"Sort comments that will be returned\\"\\"\\"
          orderBy: CommentsOrderBy
        ): [Comments]!
        publisher: User! @relation(field: \\"userid\\")
      }"
    `);
  });

  test("Same source Parent & Child use same resolver", async () => {
    const videoSource: Datasource = {
      select: jest.fn().mockResolvedValue([{ userid: "sample-video" }]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const wikiSource: Datasource = {
      select: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    const { schema } = await generate({
      typeDefs,
      sources: {
        default: videoSource,
        wiki: wikiSource,
        google: googleSource
      }
    });

    const query = `
        query {
            findUsers {
                videos(where : { name:{ eq: "trending" } }) {
                    name
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(videoSource.select).toHaveBeenCalledTimes(1);
  });

  test("Different source Parent & Child use different resolvers", async () => {
    const defaultSource: Datasource = {
      select: jest.fn().mockResolvedValue([{ userid: "sample-video" }]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const googleSource: Datasource = {
      select: jest.fn().mockResolvedValue([{ id: "ratedid", value: 2 }]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const wikiSource: Datasource = {
      select: jest.fn().mockResolvedValue([{ id: "ratedid" }]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const { schema } = await generate({
      typeDefs,
      sources: {
        default: defaultSource,
        google: googleSource,
        wiki: wikiSource
      }
    });

    const query = `
        query {
            findVideos {
                rated {
                    value
                }

                comments( where: { text:{ eq: "nice" } } ) {
                  text
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(defaultSource.select).toHaveBeenCalledTimes(1);
    expect(googleSource.select).toHaveBeenCalledTimes(1);
    expect(wikiSource.select).toHaveBeenCalledTimes(1);
  });

  test("Non-collection fields have no fields", async () => {
    const defaultSource: Datasource = {
      select: jest.fn().mockResolvedValue([{ userid: "sample-video" }]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const googleSource: Datasource = {
      select: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    const { schema } = await generate({
      typeDefs,
      sources: {
        default: defaultSource,
        google: googleSource,
        wiki: defaultSource
      }
    });

    const query = `
        query {
            findVideos {
                rated (skip: 1) {
                    value
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors[0].toString()).toContain(
      `Unknown argument "skip" on field "Video.rated`
    );
  });
});
