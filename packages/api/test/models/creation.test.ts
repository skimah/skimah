import { graphql } from "graphql";
import generate from "../../src/generate";
import { Datasource } from "../../src/types";

const typeDefs = `
    type User {
      userid: ID
      email: String
      username: String
      profile: Profile @relation
    }

    type Profile {
      id: ID
      type: String
    }
`;

describe("Schema Creation", () => {
  test("creation model", async () => {
    const defaultSource: Datasource = {
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(() => Promise.resolve({ affected: ["1", "2", "3"] }))
    };

    const { schema } = await generate({
      typeDefs,
      sources: { default: defaultSource }
    });

    const query = `
        mutation {
            createUsers ( data:[{ userid: "my-id", username: "bond" }]) {
                affected
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    const [[arg]] = (defaultSource.create as jest.MockedFunction<
      any
    >).mock.calls;

    expect(defaultSource.create).toHaveBeenCalledTimes(1);
    expect(arg).toMatchInlineSnapshot(`
      Array [
        Object {
          "attributes": Object {
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
          },
          "datasource": "default",
          "identities": Array [
            Object {
              "name": "userid",
              "sourceName": "userid",
              "type": "ID",
              "unique": true,
            },
          ],
          "mutatedAttributes": Object {
            "userid": Object {
              "name": "userid",
              "sourceName": "userid",
              "type": "ID",
              "unique": true,
              "value": "my-id",
            },
            "username": Object {
              "name": "username",
              "sourceName": "username",
              "type": "String",
              "unique": false,
              "value": "bond",
            },
          },
          "name": "User",
          "relations": Object {
            "profile": Object {
              "condition": Object {
                "child": Object {
                  "name": "id",
                  "sourceName": "id",
                },
                "parent": Object {
                  "name": "profile",
                  "sourceName": "profile",
                },
              },
              "isCollection": false,
              "model": null,
              "name": "profile",
              "sourceName": "profile",
              "type": "Profile",
              "unique": false,
            },
          },
          "sourceName": "User",
        },
      ]
    `);
  });

  test("creation response", async () => {
    const defaultSource: Datasource = {
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(() => Promise.resolve({ affected: ["1", "2", "3"] }))
    };

    const { schema } = await generate({
      typeDefs,
      sources: { default: defaultSource }
    });

    const query = `
        mutation {
            createUsers ( data:[{ userid: "my-id", username: "bond" }]) {
                affected
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(result.data).toMatchInlineSnapshot(`
      Object {
        "createUsers": Object {
          "affected": Array [
            "1",
            "2",
            "3",
          ],
        },
      }
    `);
  });

  test("returned records", async () => {
    const defaultSource: Datasource = {
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(() =>
        Promise.resolve({
          affected: ["1", "2", "3"],
          records: [{ userid: 1 }, { userid: 2 }, { userid: 3 }]
        })
      )
    };

    const { schema } = await generate({
      typeDefs,
      sources: {
        default: defaultSource
      }
    });

    const query = `
        mutation {
            createUsers (
                data:[{ userid: "my-id", username: "bond" }]
            ) {
                affected
                users {
                  userid
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    expect(result.data.createUsers).toMatchInlineSnapshot(`
      Object {
        "affected": Array [
          "1",
          "2",
          "3",
        ],
        "users": Array [
          Object {
            "userid": "1",
          },
          Object {
            "userid": "2",
          },
          Object {
            "userid": "3",
          },
        ],
      }
    `);
  });

  test("query returned records", async () => {
    const defaultSource: Datasource = {
      update: jest.fn(),
      delete: jest.fn(),
      select: jest.fn(() =>
        Promise.resolve([{ userid: 1 }, { userid: 2 }, { userid: 3 }])
      ),
      create: jest.fn(() =>
        Promise.resolve({
          affected: ["1", "2", "3"]
        })
      )
    };

    const { schema } = await generate({
      typeDefs,
      sources: {
        default: defaultSource
      }
    });

    const query = `
        mutation {
            createUsers (
                data:[{ userid: "my-id", username: "bond" }]
            ) {
                affected
                users {
                  userid
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    const [[selection]] = (<any>defaultSource.select).mock.calls;

    expect(selection.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "userid": Object {
              "in": Array [
                "1",
                "2",
                "3",
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

    expect(result.data.createUsers).toMatchInlineSnapshot(`
      Object {
        "affected": Array [
          "1",
          "2",
          "3",
        ],
        "users": Array [
          Object {
            "userid": "1",
          },
          Object {
            "userid": "2",
          },
          Object {
            "userid": "3",
          },
        ],
      }
    `);
  });
});
