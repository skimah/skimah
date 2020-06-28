import { schemaComposer, ObjectTypeComposer } from "graphql-compose";
import createInputFilter from "../src/filter";

const typeDefs = `
    type User {
      userid: ID
      username: String
      online: Boolean
      height: Float
      age: Int

      status: Status
      comments: [Comment]
    }

    type Comment {
      id: ID
      text: String
    }

    type Status {
      id: ID
      statusType: Boolean
    }
`;

describe("Schema Filter", () => {
  test("Operators", () => {
    const ts = schemaComposer.addTypeDefs(typeDefs);
    const tc = <ObjectTypeComposer>ts.get("User");

    createInputFilter(tc, schemaComposer);

    expect(schemaComposer.getAnyTC("UserFilter").toSDL())
      .toMatchInlineSnapshot(`
      "\\"\\"\\"Filter User fields\\"\\"\\"
      input UserFilter {
        \\"\\"\\"Filter users based on userid\\"\\"\\"
        userid: IDOpr

        \\"\\"\\"Filter users based on username\\"\\"\\"
        username: StringOpr

        \\"\\"\\"Filter users based on online\\"\\"\\"
        online: BooleanOpr

        \\"\\"\\"Filter users based on height\\"\\"\\"
        height: FloatOpr

        \\"\\"\\"Filter users based on age\\"\\"\\"
        age: IntOpr

        \\"\\"\\"Filter users based on status\\"\\"\\"
        status: IDOpr

        \\"\\"\\"Combine filters\\"\\"\\"
        and: [UserFilter!]

        \\"\\"\\"Combine filters\\"\\"\\"
        or: [UserFilter!]
      }"
    `);
  });

  test("Scalar", () => {
    const ts = schemaComposer.addTypeDefs(typeDefs);
    const tc = <ObjectTypeComposer>ts.get("User");

    createInputFilter(tc, schemaComposer);

    expect(schemaComposer.getAnyTC("IDOpr").toSDL()).toMatchInlineSnapshot(`
    "\\"\\"\\"Filter input based on ID\\"\\"\\"
    input IDOpr {
      eq: ID
      ne: ID
      in: [ID!]
      nin: [ID!]
    }"
  `);

    expect(schemaComposer.getAnyTC("StringOpr").toSDL()).toMatchInlineSnapshot(`
    "\\"\\"\\"Filter input based on String\\"\\"\\"
    input StringOpr {
      eq: String
      ne: String
      like: String
      in: [String!]
      nin: [String!]
    }"
  `);

    expect(schemaComposer.getAnyTC("BooleanOpr").toSDL())
      .toMatchInlineSnapshot(`
"\\"\\"\\"Filter input based on Boolean\\"\\"\\"
input BooleanOpr {
  eq: Boolean
  ne: Boolean
}"
`);

    expect(schemaComposer.getAnyTC("IntOpr").toSDL()).toMatchInlineSnapshot(`
"\\"\\"\\"Filter input based on Int\\"\\"\\"
input IntOpr {
  eq: Int
  ne: Int
  lte: Int
  lt: Int
  in: [Int!]
  nin: [Int!]
  gte: Int
  gt: Int
}"
`);

    expect(schemaComposer.getAnyTC("FloatOpr").toSDL()).toMatchInlineSnapshot(`
"\\"\\"\\"Filter input based on Float\\"\\"\\"
input FloatOpr {
  eq: Float
  ne: Float
  lte: Float
  lt: Float
  gte: Float
  gt: Float
}"
`);
  });
});
