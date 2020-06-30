# Quick Start

```javascript
import { generate } from "@skimah/api";
import CsvSource from "@skimah/ds-csv";
import JsonSource from "@skimah/ds-json";
import { graphql } from "graphql";

const users = new CsvSource({
  records: `id,user_name
  1,james
    `,
});

const tasks = new JsonSource({
  records: [
    {
      id: 1,
      title: "compile",
      done: false,
      owner: 1,
    },
    {
      id: 2,
      title: "deploy",
      done: true,
      owner: 1,
    },
  ],
});

const sources = {
  users,
  tasks,
};

const typeDefs = `
    type User @datasource(name: "users") {
        id: ID
        userName: String @named(as: "user_name")
        tasks: [Task] @relation
    }

    type Task @datasource(name: "tasks") {
        id: ID
        title: String
        done: Boolean
        owner: User @relation
    }
`;

const query = `{
  findUsers(limit: 1) {
    userName
    tasks(where: { done: { eq: true } }) {
      title
    }
  }
}`;

(async () => {

  //  Generate executable schema
  const { schema } = await generate({
    typeDefs,
    sources,
  });

  // use whatever graphql server that suits you
  const result = await graphql({
    schema,
    source: query,
  });

  console.log(result.data.findUsers);
})();

```

## [Skimah Studio](https://studio.skimah.dev)

Experience the power of a schema-first approach to GraphQL API development with an online IDE for quickly generating GraphQL APIs and endpoints. 

![Skimah Studio Screenshot](_media/screenshot.png)

- Generate Skimah API on the fly
- Use your own datasources to try out your API
- Get a unique API endpoint to use in your application

[Give it a try](https://studio.skimah.dev)
