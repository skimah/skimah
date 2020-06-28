import { schemaComposer, ObjectTypeComposer } from "graphql-compose";
import addOrderby from "../src/orderby";

const typeDefs = `
    type User {
        userid: Int
        firstName: String
        lastName: String
    }
`;

describe("Schema Orderby", () => {
  test("confirms order by", () => {
    const ts = schemaComposer.addTypeDefs(typeDefs);
    const tc = <ObjectTypeComposer>ts.get("User");

    addOrderby(tc, schemaComposer);
    expect(tc.toSDL()).toMatchInlineSnapshot(`
    "type User {
      userid: Int
      firstName: String
      lastName: String
    }"
  `);

    expect(schemaComposer.getAnyTC("UserOrderBy").toSDL())
      .toMatchInlineSnapshot(`
    "\\"\\"\\"Sort the field \\"\\"\\"
    input UserOrderBy {
      userid: _OrderBy
      firstName: _OrderBy
      lastName: _OrderBy
    }"
  `);

    expect(schemaComposer.getAnyTC("_OrderBy").toSDL()).toMatchInlineSnapshot(`
    "enum _OrderBy {
      \\"\\"\\"Sort ascending\\"\\"\\"
      asc

      \\"\\"\\"Sort descending\\"\\"\\"
      desc
    }"
  `);
  });
});
