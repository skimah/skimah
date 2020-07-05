import generate from "../../src/generate";
import { Datasource } from "../../src/types";
import { graphql } from "graphql";

const typeDefs = `
    type User @datasource(name: "users") {
        userid: ID
        email: String
        age: Int
        height: Float
        status: Status
        videos: [Video] @relation
    }

    enum Status {
      disabled
      ready
    }

    type Video @datasource(name: "videos") {
        videoID: ID
        name: String
        url: String
        publisher: User! @relation

        acl: ACL
        limit: Limit
    }

    type ACL {
      disabled: Boolean
    }

    interface Limit {
      when: String
      how: String
    }

    type VideoLimit implements Limit {
      when: String
      how: String
      url: String
    }

`;

const users: Datasource = {
  select: jest
    .fn()
    .mockResolvedValue([{ userid: "new-user-id", email: "test@example.com" }]),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const videos: Datasource = {
  select: jest.fn().mockResolvedValue([
    {
      videoID: "new-video",
      acl: { disabled: false },
      limit: { when: "now", url: "link_to_blocked_video" }
    }
  ]),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

describe("Schema Find Resolver", () => {
  let schemaResult;

  beforeAll(async () => {
    schemaResult = await generate({
      typeDefs,
      sources: {
        users,
        videos
      }
    });
  });

  test("query and mutation", () => {
    expect(schemaResult.schemaComposer.Mutation.toSDL()).toMatchInlineSnapshot(`
      "type Mutation {
        createUsers(data: [UserInput!]!): UserMutationResponse

        \\"\\"\\"Update users\\"\\"\\"
        updateUsers(
          \\"\\"\\"Update filter for users\\"\\"\\"
          where: UserFilter!
          changes: UserInput!
        ): UserMutationResponse

        \\"\\"\\"Delete users\\"\\"\\"
        deleteUsers(
          \\"\\"\\"Deletion filter for users\\"\\"\\"
          where: UserFilter!
        ): UserMutationResponse
        createVideos(data: [VideoInput!]!): VideoMutationResponse

        \\"\\"\\"Update videos\\"\\"\\"
        updateVideos(
          \\"\\"\\"Update filter for videos\\"\\"\\"
          where: VideoFilter!
          changes: VideoInput!
        ): VideoMutationResponse

        \\"\\"\\"Delete videos\\"\\"\\"
        deleteVideos(
          \\"\\"\\"Deletion filter for videos\\"\\"\\"
          where: VideoFilter!
        ): VideoMutationResponse
        createACL(data: [ACLInput!]!): ACLMutationResponse

        \\"\\"\\"Update aCL\\"\\"\\"
        updateACL(
          \\"\\"\\"Update filter for aCL\\"\\"\\"
          where: ACLFilter!
          changes: ACLInput!
        ): ACLMutationResponse

        \\"\\"\\"Delete aCL\\"\\"\\"
        deleteACL(
          \\"\\"\\"Deletion filter for aCL\\"\\"\\"
          where: ACLFilter!
        ): ACLMutationResponse
        createVideoLimits(data: [VideoLimitInput!]!): VideoLimitMutationResponse

        \\"\\"\\"Update videoLimits\\"\\"\\"
        updateVideoLimits(
          \\"\\"\\"Update filter for videoLimits\\"\\"\\"
          where: VideoLimitFilter!
          changes: VideoLimitInput!
        ): VideoLimitMutationResponse

        \\"\\"\\"Delete videoLimits\\"\\"\\"
        deleteVideoLimits(
          \\"\\"\\"Deletion filter for videoLimits\\"\\"\\"
          where: VideoLimitFilter!
        ): VideoLimitMutationResponse
      }"
    `);

    expect(schemaResult.schemaComposer.Query.toSDL()).toMatchInlineSnapshot(`
      "type Query {
        findUsers(
          \\"\\"\\"Limit the number of users that will be returned\\"\\"\\"
          limit: Int

          \\"\\"\\"Skip the first number of users that will be returned\\"\\"\\"
          skip: Int

          \\"\\"\\"Filter condition for users that will be returned\\"\\"\\"
          where: UserFilter

          \\"\\"\\"Sort users that will be returned\\"\\"\\"
          orderBy: UserOrderBy
        ): [User]!
        findVideos(
          \\"\\"\\"Limit the number of videos that will be returned\\"\\"\\"
          limit: Int

          \\"\\"\\"Skip the first number of videos that will be returned\\"\\"\\"
          skip: Int

          \\"\\"\\"Filter condition for videos that will be returned\\"\\"\\"
          where: VideoFilter

          \\"\\"\\"Sort videos that will be returned\\"\\"\\"
          orderBy: VideoOrderBy
        ): [Video]!
        findACL(
          \\"\\"\\"Limit the number of aCL that will be returned\\"\\"\\"
          limit: Int

          \\"\\"\\"Skip the first number of aCL that will be returned\\"\\"\\"
          skip: Int

          \\"\\"\\"Filter condition for aCL that will be returned\\"\\"\\"
          where: ACLFilter

          \\"\\"\\"Sort aCL that will be returned\\"\\"\\"
          orderBy: ACLOrderBy
        ): [ACL]!
        findVideoLimits(
          \\"\\"\\"Limit the number of videoLimits that will be returned\\"\\"\\"
          limit: Int

          \\"\\"\\"Skip the first number of videoLimits that will be returned\\"\\"\\"
          skip: Int

          \\"\\"\\"Filter condition for videoLimits that will be returned\\"\\"\\"
          where: VideoLimitFilter

          \\"\\"\\"Sort videoLimits that will be returned\\"\\"\\"
          orderBy: VideoLimitOrderBy
        ): [VideoLimit]!
      }"
    `);
  });

  test("Resolver returns a single response for single query", async () => {
    const query = `
        query {
            findVideos {
                publisher {
                    email
                }
            }
        }
    `;

    const result = await graphql(schemaResult.schema, query);

    expect(result.errors).toMatchInlineSnapshot(`undefined`);

    const {
      findVideos: [video]
    } = result.data;

    expect(video.publisher).toMatchInlineSnapshot(`
      Object {
        "email": "test@example.com",
      }
    `);
  });

  test("confirms resolver returns a single response for single query", async () => {
    const query = `
        query {
            findVideos {
                publisher {
                    email
                }
            }
        }
    `;

    const result = await graphql(schemaResult.schema, query);

    expect(result.errors).toMatchInlineSnapshot(`undefined`);

    const {
      findVideos: [video]
    } = result.data;

    expect(video.publisher).toMatchInlineSnapshot(`
      Object {
        "email": "test@example.com",
      }
    `);
  });

  test("confirms alias query fields", async () => {
    const query = `
        query {
            myVideos: findVideos {
                me:publisher {
                    myEmail:email
                }
            }
        }
    `;

    const result = await graphql(schemaResult.schema, query);

    expect(result.errors).toMatchInlineSnapshot(`undefined`);

    const {
      myVideos: [video]
    } = result.data;

    expect(video.me).toMatchInlineSnapshot(`
      Object {
        "myEmail": "test@example.com",
      }
    `);
  });

  test("confirms non-relationship object types", async () => {
    const query = `
        query {
            myVideos: findVideos {
                name
                acl {
                  disabled
                }
            }
        }
    `;

    const result = await graphql(schemaResult.schema, query);

    expect(result.errors).toMatchInlineSnapshot(`undefined`);

    const {
      myVideos: [video]
    } = result.data;

    expect(video.acl).toMatchInlineSnapshot(`
      Object {
        "disabled": false,
      }
    `);
  });

  test("confirms interface resolution", async () => {
    const query = `
        query {
            myVideos: findVideos {
                name
                limit {
                  when

                  ... on VideoLimit {
                    url
                  }
                }
            }
        }
    `;

    const result = await graphql(schemaResult.schema, query);

    expect(result.errors).toMatchInlineSnapshot(`undefined`);

    const {
      myVideos: [video]
    } = result.data;

    expect(video.limit).toMatchInlineSnapshot(`
      Object {
        "url": "link_to_blocked_video",
        "when": "now",
      }
    `);
  });

  test("confirms relation field are passed on to child selection as criteria", async () => {
    const query = `
        query {
            findUsers {
                videos {
                    name
                }
            }
        }
    `;

    const result = await graphql(schemaResult.schema, query);
    expect(result.errors).toMatchInlineSnapshot(`undefined`);

    const [[selection]] = (<jest.Mock>videos.select).mock.calls.reverse();

    expect(selection.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "publisher": Object {
              "eq": "new-user-id",
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
