import blueprint from "../src/blueprint";
import { Datasource } from "../src/types";

const typeDefs = `
    type User {
        userid: Int @unique
        firstName: String
        lastName: String
        emails: [String]

        profile: Profile @relation(field: "user", isOwner: true)
        posts: [Post] @relation(field: "author")
        categories: [Category!]
    }

    type Profile {
        id: ID @unique
        role: String

        user: User! @relation(field: "userid")
    }

    type Post {
      id: ID @unique
      text: String

      author: User! @relation(field: "userid")
    }

    type Category {
      type: String @unique
    }
`;

const defaultSource: Datasource = {
  select: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

describe("Schema Mutation Input", () => {
  let blueprintResult;

  beforeEach(async () => {
    blueprintResult = await blueprint({
      typeDefs,
      sources: {
        default: defaultSource
      }
    });
  });

  test("basic", () => {
    expect(blueprintResult.schemaComposer.getITC("UserInput").toSDL())
      .toMatchInlineSnapshot(`
      "input UserInput {
        userid: Int
        firstName: String
        lastName: String
        emails: [String]
        profile: ID
        categories: [CategoryInput!]
      }"
    `);

    expect(blueprintResult.schemaComposer.getITC("ProfileInput").toSDL())
      .toMatchInlineSnapshot(`
"input ProfileInput {
  id: ID
  role: String
  user: ID
}"
`);
  });

  test("simple", () => {
    expect(blueprintResult.schemaComposer.getITC("ProfileInput").toSDL())
      .toMatchInlineSnapshot(`
"input ProfileInput {
  id: ID
  role: String
  user: ID
}"
`);
  });
});
