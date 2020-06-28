import { ObjectTypeComposer, SchemaComposer } from "graphql-compose";
import createInputFilter from "./filter";
import createInput from "./inputs";
import createModel from "./models/base";
import createOrderBy from "./orderby";
import createRelations from "./relations";
import createResolvers from "./resolvers";
import createMutationResponse from "./response";
import { Model, BlueprintConfig, BlueprintResult } from "./types";
import { nullSource } from "./datasource";

/**
 * @internal
 */
const DIRECTIVES = `
    """ Attach a datasource to this type """
    directive @datasource(
      """ The name of the datasource configured in the blueprint config """
      name: String
    ) on OBJECT

    """ Create relationships between types """
    directive @relation(
      """ The name of the field in the type for the connection """
      field: String,
      """ For one-to-one relations, specify the owner of that relationship. This will be the type that can create the relationship """
      isOwner: Boolean
    ) on FIELD_DEFINITION

    """ Mark a field as unique """
    directive @unique on FIELD_DEFINITION

    """ Rename a field or object from their source """
    directive @named(as: String) on FIELD_DEFINITION | OBJECT

    """ Skip mutation operations for models marked as readonly """
    directive @readOnly on OBJECT 

    `;

/**
 * @internal
 */
const DEFAULT_TYPES = [
  "Query",
  "Mutation",
  "String",
  "Float",
  "Boolean",
  "ID",
  "Int"
];

export default async (config: BlueprintConfig): Promise<BlueprintResult> => {
  const schemaComposer = new SchemaComposer<any>();
  const datasources = Object.assign({ default: nullSource }, config.sources);

  /**
   * Include the framework directives
   */
  const typeStorage = schemaComposer.addTypeDefs(
    `${DIRECTIVES} \n ${config.typeDefs}`
  );

  const models: { [key: string]: Model } = {};

  const modelsBySource: { [key: string]: Model[] } = {};

  const typeModels = Array.from(typeStorage.types.values()).filter(
    t => !DEFAULT_TYPES.includes(t.getTypeName())
  );

  // extend the types
  for (let tc of typeModels) {
    const typeName = tc.getTypeName();

    // create models
    models[typeName] = createModel(<ObjectTypeComposer>tc);

    // add type input
    createInput(<ObjectTypeComposer>tc, schemaComposer);

    // add a mutation response for this type
    createMutationResponse(<ObjectTypeComposer>tc, schemaComposer);

    // add input filters
    createInputFilter(<ObjectTypeComposer>tc, schemaComposer);

    // add orderby filters
    createOrderBy(<ObjectTypeComposer>tc, schemaComposer);

    // add resolvers
    createResolvers({
      composer: schemaComposer,
      datasources,
      type: <ObjectTypeComposer>tc,
      models
    });

    /**
     * Validate that datasources defined for defined types
     */
    const model: Model = models[typeName];
    const modelSource = datasources[model.datasource];
    if (!modelSource) {
      return Promise.reject(
        `Schema: No datasource named ${model.datasource} found for ${typeName}`
      );
    }

    modelsBySource[model.datasource] = (
      modelsBySource[model.datasource] || []
    ).concat([model]);
  }

  /**
   * Once all resolvers have been generated for the defined types
   * then add the resolvers to the relational field in the types
   */
  for (let tc of typeModels) {
    createRelations(<ObjectTypeComposer>tc, schemaComposer, models);
  }

  /**
   * Initialize all of the declare datasource with the models
   * attached to those datasources
   */
  for (const [name, datasource] of Object.entries(datasources)) {
    if (datasource.initialize) {
      try {
        const modelsAttachedToSource = modelsBySource[name] || [];
        await datasource.initialize(modelsAttachedToSource);
      } catch (error) {
        return Promise.reject(
          `Blueprint Datasource Error: ${name}, ${error.toString()}`
        );
      }
    }
  }

  return {
    schema: schemaComposer.buildSchema(),
    resolvers: schemaComposer.getResolveMethods(),
    models,
    schemaComposer
  };
};
