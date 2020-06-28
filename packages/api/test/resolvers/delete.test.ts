import blueprint from "../../src/blueprint";
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
        avatarId: ID
        url: String
        user: User @relation
    }
`;

describe("Schema Delete Resolver", () => {
  test("delete criteria", async () => {
    const source: Datasource = {
      select: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(() => Promise.resolve({ affected: ["1", "2", "3"] }))
    };

    const { schema } = await blueprint({
      typeDefs,
      sources: { default: source }
    });

    const query = `
        mutation {
            deleteUsers (where: { age: { gte: 10 }, height: { lt: 50 }, avatar: { eq: "1" } }) {
                affected
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();

    const [[arg]] = (source.delete as jest.MockedFunction<any>).mock.calls;
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(arg).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "age": Object {
              "gte": 10,
            },
            "avatar": Object {
              "eq": "1",
            },
            "height": Object {
              "lt": 50,
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

  test("return deleted records", async () => {
    let calls = [];

    const source: Datasource = {
      update: jest.fn(),
      create: jest.fn(),
      select: jest.fn(() => {
        calls.push("selection");
        return Promise.resolve([
          { userid: 1, age: 10, avatar: { avatarId: 1, url: "a-b-c" } },
          { userid: 2, age: 2, avatar: { avatarId: 12, url: "d-e-f" } },
          { userid: 3, age: 4, avatar: { avatarId: 20, url: "g-h-j" } }
        ]);
      }),
      delete: jest.fn(() => {
        calls.push("deletion");
        return Promise.resolve({
          affected: ["1", "2", "3"],
          users: [{ userid: 1 }, { userid: 2 }, { userid: 3 }]
        });
      })
    };

    const { schema } = await blueprint({
      typeDefs,
      sources: { default: source }
    });

    const query = `
        mutation {
            deleteUsers (where: { age: { gte: 10 } }) {
                affected
                users {
                    userid
                    age
                }
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toBeUndefined();
    expect(source.select).toBeCalledTimes(1);

    expect(calls).toMatchInlineSnapshot(`
      Array [
        "selection",
        "deletion",
      ]
    `);

    const [[arg]] = (source.select as jest.MockedFunction<any>).mock.calls;
    expect(arg.criteria).toMatchInlineSnapshot(`
      Object {
        "and": Array [
          Object {
            "age": Object {
              "gte": 10,
            },
          },
        ],
        "limit": undefined,
        "or": Array [],
        "orderBy": Object {},
        "skip": undefined,
      }
    `);

    expect(result.data).toMatchInlineSnapshot(`
      Object {
        "deleteUsers": Object {
          "affected": Array [
            "1",
            "2",
            "3",
          ],
          "users": Array [
            Object {
              "age": 10,
              "userid": "1",
            },
            Object {
              "age": 2,
              "userid": "2",
            },
            Object {
              "age": 4,
              "userid": "3",
            },
          ],
        },
      }
    `);
  });
});
