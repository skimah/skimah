import { schemaComposer } from "graphql-compose";
import createModel from "../../src/models/base";

const typeDefs = `
    directive @datasource(
      name: String
    ) on OBJECT

    directive @relation(
      field: String
    ) on FIELD_DEFINITION

    directive @unique on FIELD_DEFINITION

    directive @named(as: String) on FIELD_DEFINITION | OBJECT

    type User {
        userid: ID
        email: String

        videos: [Video] @relation(field: "publisher")
    }

    type Video {
        videoID: ID
        name: String
        
        publisher: User! @named(as: "user") @relation(field: "userid")
    }

    type Consumer {
      id: ID
      ratings: [Rating] @relation
    }

    type Rating @named(as: "ratings") {
        ratingID: Int @unique
        count: Float @named(as: "total")

        consumer: Consumer @relation
    }

    type Sample {
        id: ID 
        text: String
    }
`;

schemaComposer.addTypeDefs(typeDefs);

test("create model with named directives", () => {
  const sampleModel = createModel(schemaComposer.getOTC("Rating"));

  expect(sampleModel).toMatchInlineSnapshot(`
    Object {
      "attributes": Object {
        "count": Object {
          "name": "count",
          "sourceName": "total",
          "type": "Float",
          "unique": false,
        },
        "ratingID": Object {
          "name": "ratingID",
          "sourceName": "ratingID",
          "type": "Int",
          "unique": true,
        },
      },
      "datasource": "default",
      "identities": Array [
        Object {
          "name": "ratingID",
          "sourceName": "ratingID",
          "type": "Int",
          "unique": true,
        },
      ],
      "name": "Rating",
      "relations": Object {
        "consumer": Object {
          "condition": Object {
            "child": Object {
              "name": "id",
              "sourceName": "id",
            },
            "parent": Object {
              "name": "consumer",
              "sourceName": "consumer",
            },
          },
          "isCollection": false,
          "model": null,
          "name": "consumer",
          "sourceName": "consumer",
          "type": "Consumer",
          "unique": false,
        },
      },
      "sourceName": "ratings",
    }
  `);
});

test("create model with no directives", () => {
  const sampleModel = createModel(schemaComposer.getOTC("Sample"));

  expect(sampleModel).toMatchInlineSnapshot(`
    Object {
      "attributes": Object {
        "id": Object {
          "name": "id",
          "sourceName": "id",
          "type": "ID",
          "unique": true,
        },
        "text": Object {
          "name": "text",
          "sourceName": "text",
          "type": "String",
          "unique": false,
        },
      },
      "datasource": "default",
      "identities": Array [
        Object {
          "name": "id",
          "sourceName": "id",
          "type": "ID",
          "unique": true,
        },
      ],
      "name": "Sample",
      "relations": Object {},
      "sourceName": "Sample",
    }
  `);
});

test("create model relations with directive: one-to-many", () => {
  const sampleModel = createModel(schemaComposer.getOTC("User"));

  expect(sampleModel.relations).toMatchInlineSnapshot(`
    Object {
      "videos": Object {
        "condition": Object {
          "child": Object {
            "name": "publisher",
            "sourceName": "user",
          },
          "parent": Object {
            "name": "userid",
            "sourceName": "userid",
          },
        },
        "isCollection": true,
        "model": null,
        "name": "videos",
        "sourceName": "videos",
        "type": "Video",
        "unique": false,
      },
    }
  `);
});

test("create model relations with directive: one-to-one", () => {
  const sampleModel = createModel(schemaComposer.getOTC("Video"));

  expect(sampleModel.relations).toMatchInlineSnapshot(`
Object {
  "publisher": Object {
    "condition": Object {
      "child": Object {
        "name": "userid",
        "sourceName": "userid",
      },
      "parent": Object {
        "name": "publisher",
        "sourceName": "user",
      },
    },
    "isCollection": false,
    "model": null,
    "name": "publisher",
    "sourceName": "user",
    "type": "User",
    "unique": false,
  },
}
`);
});

test("create model relations with directive: one-to-one", () => {
  const sampleModel = createModel(schemaComposer.getOTC("Video"));

  expect(sampleModel.relations).toMatchInlineSnapshot(`
Object {
  "publisher": Object {
    "condition": Object {
      "child": Object {
        "name": "userid",
        "sourceName": "userid",
      },
      "parent": Object {
        "name": "publisher",
        "sourceName": "user",
      },
    },
    "isCollection": false,
    "model": null,
    "name": "publisher",
    "sourceName": "user",
    "type": "User",
    "unique": false,
  },
}
`);
});

test("Infer one-to-many relationships from field definition", () => {
  const consumer = createModel(schemaComposer.getOTC("Consumer"));

  expect(consumer.relations).toMatchInlineSnapshot(`
Object {
  "ratings": Object {
    "condition": Object {
      "child": Object {
        "name": "consumer",
        "sourceName": "consumer",
      },
      "parent": Object {
        "name": "id",
        "sourceName": "id",
      },
    },
    "isCollection": true,
    "model": null,
    "name": "ratings",
    "sourceName": "ratings",
    "type": "Rating",
    "unique": false,
  },
}
`);
});

test("Infer one-to-one relationships from field definition", () => {
  const rating = createModel(schemaComposer.getOTC("Rating"));

  expect(rating.relations).toMatchInlineSnapshot(`
Object {
  "consumer": Object {
    "condition": Object {
      "child": Object {
        "name": "id",
        "sourceName": "id",
      },
      "parent": Object {
        "name": "consumer",
        "sourceName": "consumer",
      },
    },
    "isCollection": false,
    "model": null,
    "name": "consumer",
    "sourceName": "consumer",
    "type": "Consumer",
    "unique": false,
  },
}
`);
});
