import { generate, SkimahConfig } from "@skimah/api";
import { graphql } from "graphql";
import Records from "../src/json";

const typeDefs = `
  type Customer @datasource(name: "customers") {
      id: ID @named(as: "CustomerId")
      firstName: String @named(as: "FirstName")
      lastName: String @named(as: "LastName")
      email: String @named(as: "Email")

      supportRep: Employee! @relation @named(as: "SupportRepId")
  }

  type Employee @datasource(name: "employees") {
      id: ID @named(as: "EmployeeId")
      firstName: String @named(as: "FirstName")
      lastName: String @named(as: "LastName")
      title: String @named(as: "Title")
      email: String @named(as: "Email")

      supporting: [Customer] @relation
  }
`;

describe("JSON Datasource", () => {
  let schema;

  beforeAll(async () => {
    const customers = new Records({
      filepath: "fixtures/Customer.json"
    });

    const employees = new Records({
      filepath: "fixtures/Employee.json"
    });

    const sources = {
      customers,
      employees
    };
    const config: SkimahConfig = {
      typeDefs,
      sources
    };

    const skimahResult = await generate(config);
    schema = skimahResult.schema;
  });

  describe("Selection", () => {
    test("Skip and Limit", async () => {
      const query = `
        query {
            findCustomers(limit: 2) {
              firstName
            }
        }
      `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();
      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "findCustomers": Array [
            Object {
              "firstName": "Luís",
            },
            Object {
              "firstName": "Leonie",
            },
          ],
        }
      `);
    });

    test("One-to-One Relationships", async () => {
      const query = `
        query {
          findCustomers(limit: 2) {
            firstName

            supportRep {
              id
              firstName
              email
            }
          }
        }
      `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "findCustomers": Array [
            Object {
              "firstName": "Luís",
              "supportRep": Object {
                "email": "jane@chinookcorp.com",
                "firstName": "Jane",
                "id": "3",
              },
            },
            Object {
              "firstName": "Leonie",
              "supportRep": Object {
                "email": "steve@chinookcorp.com",
                "firstName": "Steve",
                "id": "5",
              },
            },
          ],
        }
      `);
    });

    test("One-to-Many Relationships", async () => {
      const query = `
        query {
          findEmployees(limit: 2, skip: 2) {
            id
            firstName
            email

            supporting(limit: 2) {
              firstName
              email
            }
          }
        }
      `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "findEmployees": Array [
            Object {
              "email": "jane@chinookcorp.com",
              "firstName": "Jane",
              "id": "3",
              "supporting": Array [
                Object {
                  "email": "luisg@embraer.com.br",
                  "firstName": "Luís",
                },
                Object {
                  "email": "ftremblay@gmail.com",
                  "firstName": "François",
                },
              ],
            },
            Object {
              "email": "margaret@chinookcorp.com",
              "firstName": "Margaret",
              "id": "4",
              "supporting": Array [
                Object {
                  "email": "bjorn.hansen@yahoo.no",
                  "firstName": "Bjørn",
                },
                Object {
                  "email": "frantisekw@jetbrains.com",
                  "firstName": "František",
                },
              ],
            },
          ],
        }
      `);
    });

    test("Criteria", async () => {
      const query = `
        query {
          findCustomers(where: { supportRep: { eq: "3" }}, limit: 2) {
            id
            firstName
            email

            supportRep {
              id
              email
            }
          }

        }
      `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "findCustomers": Array [
            Object {
              "email": "luisg@embraer.com.br",
              "firstName": "Luís",
              "id": "1",
              "supportRep": Object {
                "email": "jane@chinookcorp.com",
                "id": "3",
              },
            },
            Object {
              "email": "ftremblay@gmail.com",
              "firstName": "François",
              "id": "3",
              "supportRep": Object {
                "email": "jane@chinookcorp.com",
                "id": "3",
              },
            },
          ],
        }
      `);
    });

    test("Sort - ASC", async () => {
      const query = `
          query {
            findCustomers(orderBy: { firstName: asc }, limit: 5) {
              firstName
            }
          }
        `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "findCustomers": Array [
            Object {
              "firstName": "Aaron",
            },
            Object {
              "firstName": "Alexandre",
            },
            Object {
              "firstName": "Astrid",
            },
            Object {
              "firstName": "Bjørn",
            },
            Object {
              "firstName": "Camille",
            },
          ],
        }
      `);
    });

    test("Sort - DESC", async () => {
      const query = `
            query {
            findCustomers(orderBy: { firstName: desc }, limit: 5) {
              firstName
            }
          }
        `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "findCustomers": Array [
            Object {
              "firstName": "Wyatt",
            },
            Object {
              "firstName": "Victor",
            },
            Object {
              "firstName": "Tim",
            },
            Object {
              "firstName": "Terhi",
            },
            Object {
              "firstName": "Steve",
            },
          ],
        }
      `);
    });
  });

  describe("Mutations", () => {
    it("Insert", async () => {
      const query = `
          mutation {
            createCustomers(data: [
              { id: 1112, firstName: "James", lastName: "Bond", supportRep: "3", email:"james.bond@mi5.co.uk" },
              { id: 1113, firstName: "Agent", lastName: "007", supportRep: "3",  email:"007@mi5.co.uk" }
            ]) {
              affected
              customers {
                firstName
              }
            }
          }
        `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "createCustomers": Object {
            "affected": Array [
              "1112",
              "1113",
            ],
            "customers": Array [
              Object {
                "firstName": "James",
              },
              Object {
                "firstName": "Agent",
              },
            ],
          },
        }
      `);
    });

    it("Update", async () => {
      const query = `
          mutation {
            updateCustomers( 
              where: { supportRep: { eq: 3 } }, 
              changes: { supportRep: 5 } ) {
              affected
              customers {
                firstName
                supportRep {
                  id
                }
              }
            }
          }
        `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "updateCustomers": Object {
            "affected": Array [
              "1",
              "3",
              "12",
              "15",
              "18",
              "19",
              "24",
              "29",
              "30",
              "33",
              "37",
              "38",
              "42",
              "43",
              "44",
              "45",
              "46",
              "52",
              "53",
              "58",
              "59",
              "1112",
              "1113",
            ],
            "customers": Array [
              Object {
                "firstName": "Luís",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "François",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Roberto",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Jennifer",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Michelle",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Tim",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Frank",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Robert",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Edward",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Ellie",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Fynn",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Niklas",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Wyatt",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Isabelle",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Terhi",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Ladislav",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Hugh",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Emma",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Phil",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Manoj",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Puja",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "James",
                "supportRep": Object {
                  "id": "5",
                },
              },
              Object {
                "firstName": "Agent",
                "supportRep": Object {
                  "id": "5",
                },
              },
            ],
          },
        }
      `);
    });

    it("Delete", async () => {
      const query = `
          mutation {
            deleteCustomers(  where: { supportRep: { eq: 4 } }) {
              affected
              customers {
                firstName
                
                supportRep {
                  email
                }
              }
            }
          }
        `;

      const result = await graphql(schema, query);

      expect(result.errors).toBeUndefined();

      expect(result.data).toMatchInlineSnapshot(`
        Object {
          "deleteCustomers": Object {
            "affected": Array [
              "4",
              "5",
              "8",
              "9",
              "10",
              "13",
              "16",
              "20",
              "22",
              "23",
              "26",
              "27",
              "32",
              "34",
              "35",
              "39",
              "40",
              "49",
              "55",
              "56",
            ],
            "customers": Array [
              Object {
                "firstName": "Bjørn",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "František",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Daan",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Kara",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Eduardo",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Fernanda",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Frank",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Dan",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Heather",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "John",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Richard",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Patrick",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Aaron",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "João",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Madalena",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Camille",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Dominique",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Stanisław",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Mark",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
              Object {
                "firstName": "Diego",
                "supportRep": Object {
                  "email": "margaret@chinookcorp.com",
                },
              },
            ],
          },
        }
      `);
    });
  });
});
