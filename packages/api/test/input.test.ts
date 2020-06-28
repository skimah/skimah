import { Datasource } from "../src/types";
import generate from "../src/generate";

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
  let skimahResult;

  beforeEach(async () => {
    skimahResult = await generate({
      typeDefs,
      sources: {
        default: defaultSource
      }
    });
  });

  test("basic", () => {
    expect(skimahResult.schemaComposer.getITC("UserInput").toSDL())
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

    expect(skimahResult.schemaComposer.getITC("ProfileInput").toSDL())
      .toMatchInlineSnapshot(`
"input ProfileInput {
  id: ID
  role: String
  user: ID
}"
`);
  });

  test("simple", () => {
    expect(skimahResult.schemaComposer.getITC("ProfileInput").toSDL())
      .toMatchInlineSnapshot(`
"input ProfileInput {
  id: ID
  role: String
  user: ID
}"
`);
  });
});
