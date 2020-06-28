import { getPluralName } from "graphql-compose";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";
import createSelection, { argsToCriteria } from "../models/selection";
import { ResolverDefinition } from "./index";

/**
 * @internal
 * Delete model resolver
 *
 * @summary
 * This resolver will use the `where` criteria supplied
 * in the graphql mutation argument to delete a set of models in the source
 *
 * If the resources to be deleted is requested, the resolver will first
 * selected the models using the same criteria from the datasource
 * then proceed with the deletion
 *
 * @param definition {ResolverDefinition}
 */
export default (definition: ResolverDefinition): string => {
  const { type: tc, models, datasources } = definition;
  const typeName = tc.getTypeName();
  const pluralName = getPluralName(typeName);

  const name = getPluralName(`delete${typeName}`);
  tc.addResolver({
    name,
    description: `Delete ${pluralName}`,
    type: `${typeName}MutationResponse`,
    args: {
      where: {
        type: `${typeName}Filter!`,
        description: `Deletion filter for ${pluralName}`
      }
    },
    resolve: async ({ info }) => {
      const modelType = tc.getTypeName();
      const baseModel = models[modelType];
      const datasource = datasources[baseModel.datasource];
      const tree = parseResolveInfo(info) as ResolveTree;

      const projection =
        tree.fieldsByTypeName[`${tc.getTypeName()}MutationResponse`];
      const recordProjection = projection[pluralName];

      /**
       * If the models to be deleted is requested, then a select
       * operation is first conducted before deleting the models
       *
       * Use the same deletion criteria as the selection criteria
       */
      if (recordProjection) {
        const queryModel = createSelection({
          baseModel,
          tree: { ...recordProjection, args: tree.args },
          models
        });
        const records = await datasource.select(queryModel);
        const deleted = await datasource.delete(
          queryModel.criteria,
          queryModel
        );

        return {
          ...deleted,
          records
        };
      }

      const criteria = argsToCriteria(tree.args, baseModel);
      return datasource.delete(criteria, baseModel);
    }
  });

  return name;
};
