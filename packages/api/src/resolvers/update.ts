import { getPluralName } from "graphql-compose";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";
import { ResolverDefinition } from "./index";

import createCreation from "../models/creation";
import { argsToCriteria } from "../models/selection";

/**
 * @internal
 * @param definition
 */
export default (definition: ResolverDefinition): string => {
  const { type: tc, models, datasources } = definition;
  const typeName = tc.getTypeName();
  const pluralName = getPluralName(typeName);

  const name = getPluralName(`update${tc.getTypeName()}`);
  tc.addResolver({
    name,
    description: `Update ${pluralName}`,
    type: `${typeName}MutationResponse`,
    args: {
      where: {
        type: `${tc.getTypeName()}Filter!`,
        description: `Update filter for ${pluralName}`
      },
      changes: {
        type: definition.composer
          .getITC(`${tc.getTypeName()}Input`)
          .getTypeNonNull()
      }
    },
    resolve: async ({ info }) => {
      const modelType = tc.getTypeName();
      const baseModel = models[modelType];
      const datasource = datasources[baseModel.datasource];
      const tree = parseResolveInfo(info) as ResolveTree;

      const toBeUpdated = createCreation({
        baseModel,
        values: tree.args.changes,
        models
      });
      const criteria = argsToCriteria(tree.args, baseModel);

      return datasource.update(criteria, toBeUpdated);
    }
  });

  return name;
};
