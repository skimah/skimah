import { generate, SkimahConfig } from "@skimah/api";
import { graphql } from "graphql";
import SampleSource from "../src/faker";

const typeDefs = `
  type Manager @datasource(name: "sample") {
    id: ID
    firstName: String @named(as: "FirstName_name_firstName")
    lastName: String @named(as: "LastName_name_lastName")
    title: String @named(as: "Title_name_jobTitle")
    status:Boolean @named(as:"userStatus")

    events: [Event] @relation
  }

  type Event @datasource(name: "sample") {
    eventId: ID
    date: String @named(as: "eventData_date_recent")

    managedBy: Manager @relation
  }
`;

let schema;

describe("Datasource SampleData", () => {
  beforeAll(async () => {
    const sample = new SampleSource({ recordMaximum: 10 });

    const config: SkimahConfig = {
      typeDefs,
      sources: { sample }
    };

    const skimahResult = await generate(config);
    schema = skimahResult.schema;
  });

  describe("Selection", () => {
    test("Skip and Limit", async () => {
      const query = `
          query {
              findManagers(limit: 2) {
                  id
                  firstName
                  lastName
                  title
              }
          }
        `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      const [first] = <any[]>result.data.findManagers;

      expect(first.id).not.toBeNull();
      expect(first.firstName).not.toBeNull();
      expect(first.lastName).not.toBeNull();
      expect(first.title).not.toBeNull();
    });

    test("One-to-Many Relationships", async () => {
      const query = `
          query {
            findManagers(limit: 2) {
              id
              firstName
              events  {
                date
              }
            }
          }
        `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();
      const [first] = <any[]>result.data.findManagers;

      expect(first.events[0].id).not.toBeNull();
      expect(first.events[0].date).not.toBeNull();
    });

    test("One-to-One Relationships", async () => {
      const query = `
          query {
            findEvents(limit: 2) {
              eventId
              managedBy {
                firstName
              }
            }
          }
        `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();
      const [first] = <any[]>result.data.findEvents;

      expect(first.managedBy.firstName).not.toBeNull();
    });
  });

  describe("Mutations", () => {
    test("Creation", async () => {
      const query = `
          mutation {
              createManagers(
                data: [
                  { id:100, firstName: "Bobby", lastName: "Jose", title: "Regional Manager" }, 
                  { id:200, firstName: "Jose",  lastName: "Murihino", title: "Branch Manager" } 
                ]
              ) {
                affected
                managers {
                  title
                }
              }
          }
        `;

      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "createManagers": Object {
            "affected": Array [
              "100",
              "200",
            ],
            "managers": Array [
              Object {
                "title": "Regional Manager",
              },
              Object {
                "title": "Branch Manager",
              },
            ],
          },
        }
      `);
    });

    test("Update", async () => {
      const query = `
          mutation {
              updateManagers(
                changes: { title: "National Manager" },
                where: { firstName: { eq: "Jose" } }               
              ) {
                affected
                managers {
                  id
                  firstName
                  lastName
                  title
                }
              }
          }
        `;

      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "updateManagers": Object {
            "affected": Array [
              "200",
            ],
            "managers": Array [
              Object {
                "firstName": "Jose",
                "id": "200",
                "lastName": "Murihino",
                "title": "National Manager",
              },
            ],
          },
        }
      `);
    });

    test("Delete", async () => {
      const query = `
          mutation {
              deleteManagers(
                where: { firstName: { eq: "Jose" } }               
              ) {
                affected
                managers {
                  title
                }
              }
          }
        `;

      const result = await graphql(schema, query);
      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "deleteManagers": Object {
            "affected": Array [
              "200",
            ],
            "managers": Array [
              Object {
                "title": "National Manager",
              },
            ],
          },
        }
      `);
    });
  });

  describe("Malformed", () => {
    test("Malformed attributes directives", async () => {
      const badTypeDef = `
        type Agent @datasource(name:"sample") {
          id: ID @named(as: "random_number")
          name: String @named(as: "bad_directive")
        }
      `;

      const sample = new SampleSource({ recordMaximum: 10 });
      const config: SkimahConfig = {
        typeDefs: badTypeDef,
        sources: { sample }
      };

      return expect(generate(config)).rejects.toContain(
        `The attribute named \"bad_directive\" does not match the format`
      );
    });
  });
});
