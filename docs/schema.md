# Type definition

As a schema-first approach to API development, the schema becomes the source of truth of what to expect from the API.

All types defined in a schema file will have a CRUD API automatically generated for them. The output schema of applying the Skimah library is an executable schema with automatically generated resolvers attached to the right datasources.

To harness the power of a schema first approach, Skimah ships with some useful directives that helps to instruct Skimah on how to generate the API. There directives are

- [@readonly](#Readonly-types)
- [@datasource](#Datasources)
- [@unique](#Unique-identifiers)
- [@named](#Field-mapping)
- [@relation](#Relationships)

### Readonly types

| @readonly | Marks a defined type as readonly |
| --------- | -------------------------------- |


Any type marked as readonly will not have mutation operations generated for it.

```graphql
type User @readonly {
  id: ID
  username: String
}
```

### Datasources

| @datasource | Specifies what datasource the records for the is located |
| ----------- | -------------------------------------------------------- |


Skimah will fetch/mutate records for a type using the `@datasource` directive associated with the type in the type definition. If the datasource directive can be omitted if a default datasource has been configured.

```graphql
type User @datasource(name:"a_user_datasource") {}

type Task @datasource(name:"a_task_datasource") {}

# A default datasource is assumed
type Events {}
```

:::note
if the @datasource directive is omitted, then a datasource named `default` is assumed to have been configured.
:::

### Unique identifiers

| @unique | Designates a field as unique |
| ------- | ---------------------------- |


To be able to uniquely identify and distinguished records fetched from a datasource, at least one field of a defined type is expected to be marked as unique. This can be achieved by defining a field as a `GraphQL ID` or marking the field with a `@unique` directive.

```graphql
type User {
  username: ID
}
```

or

```graphql
type User {
  email: String @unique
}
```

### Field mapping

| @named | Maps a field or type name to legacy name in the datasource |
| ------ | ---------------------------------------------------------- |


Skimah can re-map datasource fields to another field definition in the graphql schema and subsequently in the generated API. This is very useful when generating a new API for a legacy system with an undesirable legacy field or type name e.g old column/table names in a legacy database.

```graphql
type User @named(as: "old_customers") {
  id: ID
  username: String @named(as: "UserName")
}
```

## Relationships

| @relation | Creates a relationship between types |
| --------- | ------------------------------------ |


Skimah's core functionality is its ability to tie types together from several datasources. In most cases, relationships will be inferred from the schema definition with just annotating the fields with the `@relation` directive. Any non-scalar type annotated with `@relation` is assumed to be sourced as a relationship.

Direct siblings that are marked with the same `@datasource` batched fetched from the datasource. This potentially solves the famous `N + 1` problem especially with `SQL` databases.

### One-to-Many

These types of relationships are matches one parent type to many children.

```graphql {5,12}
type User {
  id: ID
  username: String

  tasks: [Task] @relation
}

type Task {
  id: ID
  title: String

  owner: User @relation
}
```

In the schema definition above, the `User` and `Task` types are tied together. Skimah will tie them automatically using their unique fields (`User.id` and `Task.owner`). The `@relation` is needed on both sides in the case to connect the sides together.

### One-to-One

Creates a direct relationship between a `User` and an `Avatar` using the `User.id` and `Avatar.user` fields.

```graphql {5,12}
type User {
  id: ID
  username: String

  avatar: Avatar @relation
}

type Avatar {
  id: ID
  url: String

  user: User @relation
}
```

### Named relationships

The reference in a sibling relationship can also be renamed to match the field in the datasource

```graphql {5,13}
type User {
  id: ID
  username: String

  avatar: Avatar @relation
}

type Avatar {
  id: ID
  url: String

  # The person field in the datasource will be renamed to user
  user: User @relation @named(as: "person")
}
```

A relationship can also be referenced directly in a sibling's field. i.e The field to use for creating the relationship can be referenced in the directive.

```graphql {6}
type User {
  id: ID
  username: String

  friend: User @relation
  nextOfKin: User @relation(as: "nextOfKin")
}
```
