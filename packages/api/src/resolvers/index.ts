import { SchemaComposer, ObjectTypeComposer } from "graphql-compose";
import { Datasource, Model } from "../types";

import findResolver from "./find";
import createResolver from "./create";
import updateResolver from "./update";
import deleteResolver from "./delete";

/**
 * @internal
 */
export interface ResolverDefinition {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  composer: SchemaComposer<any>;

  datasources: { [key: string]: Datasource };

  type: ObjectTypeComposer;

  models: { [key: string]: Model };
}

/**
 * @internal
 */
export default (definition: ResolverDefinition): void => {
  const { composer, type } = definition;
  const isReadOnly = !!type.getDirectiveByName("readOnly");

  // add the resolvers to the type composers
  const findName = findResolver(definition);
  composer.Query.addFields({
    [`${findName}`]: definition.type.getResolver(findName)
  });

  if (!isReadOnly) {
    const createName = createResolver(definition);
    const updateName = updateResolver(definition);
    const deleteName = deleteResolver(definition);

    composer.Mutation.addFields({
      [`${createName}`]: definition.type.getResolver(createName)
    });

    composer.Mutation.addFields({
      [`${updateName}`]: definition.type.getResolver(updateName)
    });

    composer.Mutation.addFields({
      [`${deleteName}`]: definition.type.getResolver(deleteName)
    });
  }
};
