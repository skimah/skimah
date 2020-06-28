import generate from "../../src/generate";
import { Datasource } from "../../src/types";
import { graphql } from "graphql";

const typeDefs = `
    type User {
        userid: ID
        age: Int
        height: Float

        avatar: Avatar @relation
    }

    type Avatar {
      id: ID
      url: String
    }
`;

describe("Schema Resolvers", () => {
  test("update criteria", async () => {
    const source: Datasource = {
      select: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    };

    const { schema } = await generate({
      typeDefs,
      sources: { default: source }
    });

    const query = `
        mutation {
            updateUsers (
                where: { age:{ gte: 10 }, height: { lt: 50 } }, 
                changes: { userid:2, age: 20, avatar: 2 }) {
                affected
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    const [[arg, criteria]] = (source.update as jest.MockedFunction<
      any
    >).mock.calls;

    expect(source.update).toHaveBeenCalledTimes(1);
    expect(arg.mutatedAttributes).toMatchInlineSnapshot(`undefined`);
    expect(criteria).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "age": Object {
            "name": "age",
            "sourceName": "age",
            "type": "Int",
            "unique": false,
          },
          "height": Object {
            "name": "height",
            "sourceName": "height",
            "type": "Float",
            "unique": false,
          },
          "userid": Object {
            "name": "userid",
            "sourceName": "userid",
            "type": "ID",
            "unique": true,
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
          "age": Object {
            "name": "age",
            "sourceName": "age",
            "type": "Int",
            "unique": false,
            "value": 20,
          },
          "avatar": Object {
            "name": "avatar",
            "sourceName": "avatar",
            "type": "ID",
            "unique": true,
            "value": "2",
          },
          "userid": Object {
            "name": "userid",
            "sourceName": "userid",
            "type": "ID",
            "unique": true,
            "value": "2",
          },
        },
        "name": "User",
        "relations": Object {
          "avatar": Object {
            "condition": Object {
              "child": Object {
                "name": "id",
                "sourceName": "id",
              },
              "parent": Object {
                "name": "avatar",
                "sourceName": "avatar",
              },
            },
            "isCollection": false,
            "model": null,
            "name": "avatar",
            "sourceName": "avatar",
            "type": "Avatar",
            "unique": false,
          },
        },
        "sourceName": "User",
      }
    `);
  });

  test("updated records", async () => {
    const source: Datasource = {
      select: jest.fn(() => Promise.resolve([])),
      update: jest.fn(() =>
        Promise.resolve({
          affected: ["1", "2", "3"]
        })
      ),
      create: jest.fn(),
      delete: jest.fn()
    };

    const { schema } = await generate({
      typeDefs,
      sources: { default: source }
    });

    const query = `
        mutation {
            updateUsers (
                where: { age:{ gte: 10 }, height: { lt: 50 } }, 
                changes: { userid:2, age: 20 }) {
                affected
                users {
                    userid
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    const [[arg]] = (source.select as jest.MockedFunction<any>).mock.calls;

    expect(arg).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "age": Object {
            "name": "age",
            "sourceName": "age",
            "type": "Int",
            "unique": false,
          },
          "height": Object {
            "name": "height",
            "sourceName": "height",
            "type": "Float",
            "unique": false,
          },
          "userid": Object {
            "name": "userid",
            "sourceName": "userid",
            "type": "ID",
            "unique": true,
          },
        },
        "criteria": Object {
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
        "name": "User",
        "projectedAttributes": Object {
          "userid": Object {
            "name": "userid",
            "sourceName": "userid",
            "type": "ID",
            "unique": true,
          },
        },
        "projectedRelations": Object {},
        "relations": Object {
          "avatar": Object {
            "condition": Object {
              "child": Object {
                "name": "id",
                "sourceName": "id",
              },
              "parent": Object {
                "name": "avatar",
                "sourceName": "avatar",
              },
            },
            "isCollection": false,
            "model": null,
            "name": "avatar",
            "sourceName": "avatar",
            "type": "Avatar",
            "unique": false,
          },
        },
        "sourceName": "User",
      }
    `);
  });
});
