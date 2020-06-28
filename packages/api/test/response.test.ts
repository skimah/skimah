import blueprint from "../src/blueprint";
import { Datasource } from "../src/types";

const typeDefs = `
    type User {
        userid: Int @unique
        firstName: String
        lastName: String
        emails: [String]
    }
`;

describe("Schema Mutation", () => {
  const defaultSource: Datasource = {
    select: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  test("response", async () => {
    const { schemaComposer } = await blueprint({
      typeDefs,
      sources: {
        default: defaultSource
      }
    });

    expect(schemaComposer.getOTC("UserMutationResponse").toSDL())
      .toMatchInlineSnapshot(`
      "type UserMutationResponse {
        \\"\\"\\"The total number of users affected\\"\\"\\"
        affected: [ID!]!

        \\"\\"\\"The affected users\\"\\"\\"
        users: [User!]!
      }"
    `);
  });
});
