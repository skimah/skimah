import { graphql } from "graphql";
import { ObjectTypeComposer, schemaComposer } from "graphql-compose";
import generate from "../src/generate";
import { Datasource } from "../src/types";

const typeDefs = `
    type User {
        userid: Int
        username: String

        avatar: Avatar @relation(as:"user")
    }

    type Avatar @readOnly {
        id: ID
        url: String

        user: User
    }
`;

describe("Schema Orderby", () => {
  const defaultSource: Datasource = {
    select: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  test("confirms @readonly is immutable", async () => {
    const ts = schemaComposer.addTypeDefs(typeDefs);
    const tc = <ObjectTypeComposer>ts.get("User");

    const { schema } = await generate({
      typeDefs,
      sources: { default: defaultSource }
    });

    const query = `
        mutation {
            createAvatars(data:[{id: "simple", url: "http://example.com/me"}]) {
                affected
            }
        }
    `;

    const result = await graphql(schema, query);
    expect(result.errors).toMatchInlineSnapshot(`
      Array [
        [GraphQLError: Cannot query field "createAvatars" on type "Mutation". Did you mean "createUsers"?],
      ]
    `);
  });
});
