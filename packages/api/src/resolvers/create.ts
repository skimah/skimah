import { getPluralName } from "graphql-compose";
import createCreation from "../models/creation";
import { ResolverDefinition } from "./index";

/**
 * @internal
 */
export default ({
  models,
  datasources,
  type: tc,
  composer
}: ResolverDefinition): string => {
  const name = getPluralName(`create${tc.getTypeName()}`);

  tc.addResolver({
    name,
    type: `${tc.getTypeName()}MutationResponse`,
    args: {
      data: {
        type: composer
          .getITC(`${tc.getTypeName()}Input`)
          .getTypeNonNull()
          .getTypePlural()
          .getTypeNonNull()
      }
    },
    resolve: async ({ args }) => {
      const modelType = tc.getTypeName();
      const baseModel = models[modelType];
      const modelSource = datasources[baseModel.datasource];

      const creationModels = args.data.map(values =>
        createCreation({
          baseModel,
          models,
          values
        })
      );

      const response = await modelSource.create(creationModels);
      return response;
    }
  });

  return name;
};
