import { GraphQLResolveInfo, GraphQLSchema } from "graphql";
import { SchemaComposer } from "graphql-compose";

/**
 * @internal
 */
export type AttributeType = "String" | "Float" | "Int" | "Boolean" | "ID";

/**
 * @internal
 */
export type GraphqlResolver = (
  parent: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo
) => Promise<any>;

/**
 * A blueprint model field. This is the graphql field defined in the type definition
 */
export interface Field {
  /**
   * The name of the field as defined in the schema definition of the type
   */
  name: string;

  /**
   * The name of the field in the record in the underlying
   * datasource using the directive `@named`. This will
   * default to the field name if `@named` directive is not used
   */
  sourceName: string;
}

/**
 * Model field attribute
 */
export interface Attribute extends Field {
  /**
   * The type of the attribute as defined in the schema
   */
  type: AttributeType;

  /**
   * Defines if this field is unique. This can be defined in the schema field
   * with the `@unique` directive or any field of type `ID`
   */
  unique: boolean;
}

/**
 * The condition attached to a relationship.
 */
export interface RelationCondition {
  /**
   * The field in the type referenced by the `@relation` directive on the parent field
   */
  child: Field;

  /**
   * The field on which the `@relation` is defined in the parent type
   */
  parent: Field;
}

/**
 * Represents a relationship between two types in the schema definition
 *
 * A relation is defined in the schema with the aid of a `@relation` directive
 *
 * e.g
 *
 * ```graphql
 * type User {
 *   id: ID
 *   comments: [Comments] `@relation`
 * }
 *
 * type Comment {
 *   id: ID
 *   user: `@relation`
 * }
 *
 * ```
 *
 * The above schema will generate a one-to-many relationship from the `User` to the `Comment`
 * and a one-to-one relationship between a `Comment` and a `User`
 *
 */
export interface Relation extends Field {
  /**
   * Represents a one-to-many relationship.
   */
  isCollection: boolean;

  /**
   * The child model of this relation
   */
  model?: QueryModel;

  /**
   * The type of the model
   */
  type: string;

  /**
   * The condition by which this relationship is created.
   */
  condition?: RelationCondition;
}

/**
 * A Model maps directly to an Object type definition in a schema definition.
 */
export interface Model {
  /**
   * The name of the type from the schema definition
   */
  name: string;

  /**
   * The datasource associated with this model. This is the datasource
   * that is defined in the schema using the `@datasource` directive.
   *
   * This will default to `default` if not specified, meaning all type
   * definition without a `@datasource` definition  will use a default
   * datasource if defined
   */
  // TODO: change to instance of datasource
  datasource: string;

  /**
   * The name of this model in the datasource
   */
  sourceName: string;

  /**
   * Scalar fields detected from the type definition in the schema
   */
  attributes: { [key: string]: Attribute };

  /**
   * Unique identifiers for the type referenced by this model.
   * A model can have multiple identities.
   * Any field of type ID or a directive `@unique` will be considered an identity
   */
  identities: Attribute[];

  /**
   * The relationships defined in the schema. i.e non scalar fields
   */
  relations: { [key: string]: Relation };
}

export interface Resolvers {
  Query?: {
    [key: string]: GraphqlResolver;
  };
  Mutation?: {
    [key: string]: GraphqlResolver;
  };
}

/**
 * A model filter criteria. This is directly generated from the input
 * fields to a graphql query operation. The criteria is modelled after
 * mongodb query operators.
 *
 * An example criteria looks like
 *
 * {
 *  name: { eq: "Bond" }
 * }
 *
 * @see https://docs.mongodb.com/manual/reference/operator/query-comparison/
 */
export interface CriteriaFilter {
  /**
   * Matches values that are equal to a specified value.
   */
  eq?: any;

  /**
   * Matches all values that are not equal to a specified value.
   */
  ne?: any;

  /**
   * Matches values that are less than or equal to a specified value.
   */
  lte?: any;

  /**
   * Matches values that are less than a specified value.
   */
  lt?: any;

  /**
   * Matches values that are greater than or equal to a specified value.
   */
  gte?: any;

  /**
   * Matches values that are greater than a specified value.
   */
  gt?: any;

  /**
   * Matches values that are less than or equal to a specified value.
   */
  like?: any;

  /**
   * Matches any of the values specified in an array.
   */
  in?: any;

  /**
   * Matches none of the values specified in an array.
   */
  nin?: any;
}

/**
 * Directive in which retrieved records should be sorted
 */
declare enum SortDirection {
  /**
   * Sort records in descending order
   */
  desc = "desc",

  /**
   * Sort records in ascending order
   */
  asc = "asc"
}

/**
 * The criteria that is supplied to a datasource implementation to fetch
 * the appropriate records from the underlying datasource.
 */
export interface Criteria {
  /**
   * A combination of criteria filters to be treated as an `and` operation
   */
  and?: { [key: string]: CriteriaFilter }[];

  /**
   * A combination of criteria filters to be treated as an `or` operation
   */
  or?: { [key: string]: CriteriaFilter }[];

  /**
   * Sort the results of the records
   */
  orderBy?: { [key: string]: SortDirection };

  /**
   * Limit the results of the records
   */
  limit?: number;

  /**
   * Skip the number of records to return from the underlying datasource
   */
  skip?: number;
}

/**
 * A model to be selected model containing information on how to be selected from the source
 *
 * The attributes and relations will contain the projection from the graphql
 * selection set.
 */
export interface QueryModel extends Model {
  /**
   * The criteria to be used for the selection of records from the underlying datasource
   */
  criteria: Criteria;

  /**
   * The selection of attributes that have been explicitly selected
   * for querying the underlying datasource
   */
  projectedAttributes: { [key: string]: Attribute };

  /**
   * Nested relationship selections
   */
  projectedRelations: { [key: string]: Relation };
}

/**
 * A mutation
 */
export interface MutationAttribute extends Attribute {
  /**
   * The value attached to
   */
  value: any;
}

/**
 * An extension of a blueprint model used as arguments to datasource
 * operations that mutates underlying datasources.
 *
 */
export interface MutationModel extends Model {
  /**
   * Attributes that contains values to be mutated
   */
  mutatedAttributes: { [key: string]: MutationAttribute };
}

/**
 * Mutation Response
 */
export interface MutationResponse<T> {
  /**
   * The identity of the just mutated records. This is used if
   * the mutated records are requested in the same operation
   */
  affected: any[];

  /**
   * The records that have just been mutated.
   */
  records?: T[];
}

/**
 * A Blueprint Datasource is an object with a CRUD (create, read, update and delete) interface
 * that will be called by resolvers when an associated model is queried or mutated.
 *
 * A Datasource is a generic interface to interact with an underlying datasource which could be
 * anything from a filesystem, database, cache or even another graphql system.
 *
 * A datasource can be reused multiple times across models defined in a schema.
 *
 */
export interface Datasource {
  /**
   * Called for once for every type in the type definition
   */
  initialize?: (models: Model[]) => Promise<any>;

  /**
   *
   * Creates a collection of records in the underlying datasource when the mutation operation is
   * invoked by the graphql operation
   *
   * @param models The models to be created in the underlying datasource
   * @return The mutation response
   */
  create: (models: MutationModel[]) => Promise<MutationResponse<any>>;

  /**
   *
   * Selects a collection of records from the datasource using the selection fields
   * from the graphql query and the criteria by which to apply to the selection operation
   *
   * @param selection The model that contains all the information needed to select
   * records from the underlying the datasource
   *
   * @returns An array of records from the underlying datasource mapped correctly using the
   * projected attributes in the query model
   */
  select: (selection: QueryModel) => Promise<Array<any>>;

  /**
   * Updates underlying datasource records with the changes from a graphql mutation operation
   *
   * @param criteria The criteria by which the changes should be applied
   * @param changes A mutation model with values to be applied
   */
  update: (
    criteria: Criteria,
    changes: MutationModel
  ) => Promise<MutationResponse<any>>;

  /**
   * Deletes underlying datasource records
   *
   * @remarks
   * Delete is a special case, in that before the delete operation is executed, the resolver
   * will do a select using the same criteria before requesting the delete execution if records
   * are requested and only if records are requested.
   *
   * @param criteria The criteria by which to delete models from the underlying datasource.
   * @param model The model representing record definition in the underlying datasource.
   */
  delete: (criteria: Criteria, model: Model) => Promise<MutationResponse<any>>;
}

export interface BlueprintConfig {
  /**
   * The graphql type definitions to generate the blueprint API from. Each defined type
   * in the schema will have an API generated for them.
   */
  typeDefs: string;

  /**
   * A dictionary of datasources linked to Datasource instances.
   *
   * Datasources to source records from using the `@datasource` directive in
   * the schema definition
   *
   * e.g
   *
   * ```graphql
   *  type User @datasource(name: "mysql-users") {
   *    id: ID
   *    email: String
   *  }
   * ```
   *
   */
  sources: { [key: string]: Datasource };
}

/**
 *  The result of Blueprinting a schema
 */
export interface BlueprintResult {
  /**
   * An executable schema ready to used with a choice of graphql server.
   * The graphql schema has all the necessary resolvers attached and will
   * execute the appropriate datasources declared on the types
   */
  schema: GraphQLSchema;

  /**
   * These are the resolvers automatically generated for the models in the schema
   */
  resolvers: { [key: string]: any };

  /**
   * These are the blueprint generated models that can be useful for introspection and debugging
   */
  models: { [key: string]: any };

  /**
   * Schema composer, useful for debugging
   *
   * @see https://graphql-compose.github.io/
   */
  schemaComposer: SchemaComposer<any>;
}

/**
 * Generate an API from schema
 */
export interface blueprint {
  /**
   * @param config Blueprint configuration to modify the behavior
   * of the generated API
   */
  (config: BlueprintConfig): Promise<BlueprintResult>;
}
