import {
  ObjectTypeComposer,
  SchemaComposer,
  InterfaceTypeComposer
} from "graphql-compose";
import { nullSource } from "./datasource";
import createInputFilter from "./filter";
import createInput from "./inputs";
import createModel from "./models/base";
import createOrderBy from "./orderby";
import createRelations from "./relations";
import createResolvers from "./resolvers";
import createMutationResponse from "./response";
import { Model, SkimahConfig, SkimahResult } from "./types";

/**
 * @internal
 */
const DIRECTIVES = `
    """ Attach a datasource to this type """
    directive @datasource(
      """ The name of the datasource configured in the Skimah config """
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

export default async (config: SkimahConfig): Promise<SkimahResult> => {
  const schemaComposer = new SchemaComposer<any>();
  const datasources = Object.assign({ default: nullSource }, config.sources);

  /**
   * Include the framework directives
   */
  const typeStorage = schemaComposer.addTypeDefs(
    `${DIRECTIVES} \n ${config.typeDefs}`
  );

  const models: { [key: string]: Model } = {};
  const interfaces: { [key: string]: Model[] } = {};

  const modelsBySource: { [key: string]: Model[] } = {};

  const typeModels = Array.from(typeStorage.types.values()).filter(t => {
    const typeKind = t.getType().astNode.kind;
    const isObject = typeKind === "ObjectTypeDefinition";

    return isObject && !DEFAULT_TYPES.includes(t.getTypeName());
  });

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
      models,
      interfaces
    });

    // Resolve interfaces
    const objComposer = tc as ObjectTypeComposer;
    objComposer.getInterfaces().forEach(itf => {
      const itComposer = itf as InterfaceTypeComposer;

      interfaces[itComposer.getTypeName()] = (
        interfaces[itComposer.getTypeName()] || []
      ).concat(models[typeName]);

      itComposer.addTypeResolver(objComposer, src => {
        const objectFields = objComposer.getFieldNames();
        const itfFields = Object.keys(src);
        const isSubset = itfFields.every(field => objectFields.includes(field));
        return isSubset;
      });
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
          `Skimah Datasource Error: ${name}, ${error.toString()}`
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
