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

describe("Schema Create Resolvers", () => {
  test("create data", async () => {
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
            createUsers (data: [{userid: 1, age: 10, avatar: "an_avatar"}]) {
                affected
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    const [[models]] = (source.create as jest.MockedFunction<any>).mock.calls;

    expect(source.create).toHaveBeenCalledTimes(1);
    expect(models).toMatchInlineSnapshot(`
      Array [
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
              "value": 10,
            },
            "avatar": Object {
              "name": "avatar",
              "sourceName": "avatar",
              "type": "ID",
              "unique": true,
              "value": "an_avatar",
            },
            "userid": Object {
              "name": "userid",
              "sourceName": "userid",
              "type": "ID",
              "unique": true,
              "value": "1",
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
        },
      ]
    `);
  });
});
