---
id: api
title: CRUD API
sidebar_label: CRUD
---

# Skimah CRUD API

> ⚠️ Documentation is still in progress

```graphql title="Basic schema definition"
type User {
  id: ID
  username: String
  age: Int
  height: Number
  tasks: [Task] @relation
}

type Task {
  id: ID
  title: String
  total: Int
  owner: User @relation
}
```

## Find

```graphql
    findUsers {
      username
      tasks {
        title
      }
    }
```

### Paging

```graphql
  findUsers(limit: 2) {
    username
    tasks(skip:4, limit: 4) {
      title
    }
  }
```

### Sorting

```graphql
  findUsers(orderBy: { username: DESC }) {
    username
  }
```

### Filters

#### eq

```graphql
  findUsers(where: { username: { eq: "james bond" } }) {
    username
  }
```

#### lt, lte, gt, gte

```graphql
  findUsers(where: { age: { lt: 10 } }) {
    username
    tasks(where: {total: { gt: 2 }} ) {
      title
    }
  }
```

#### like

```graphql
  findUsers(where: { username: { like: "%bond%" } }) {
    username
  }
```

### Combined filters

```graphql
  findUsers(where: { and:
    [ { age: { lt: 10 } }, { age: { gt: 5 } } ]
  } ) {
    username
  }
```

## Create

```graphql
  createUsers (data: [
    {id: 1, username: "james"},
    {id: 2, username: "007"}
  ]) {
    affected
    users {
      username
    }
  }
```

## Update

```graphql
  updateUsers (changes: {id: 2, username: "007"}, where: { name: { eq: "james" } } ) {
    affected
    users {
      username
    }
  }
```

## Delete

```graphql
  deleteUsers (where: { name: { eq: "james" } } ) {
    affected
    users {
      username
    }
  }
```
