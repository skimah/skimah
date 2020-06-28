import {
  getPluralName,
  ObjectTypeComposer,
  SchemaComposer
} from "graphql-compose";

/** @internal */
export default (tc: ObjectTypeComposer, composer: SchemaComposer<any>) => {
  const typeName = tc.getTypeName();
  const pluralNames = getPluralName(typeName);

  composer.getOrCreateOTC(`${typeName}MutationResponse`, rtc => {
    rtc.addFields({
      affected: {
        type: `[ID!]!`,
        description: `The total number of ${pluralNames} affected`
      },

      [pluralNames]: {
        type: tc
          .getTypeNonNull()
          .getTypePlural()
          .getTypeNonNull(),

        description: `The affected ${pluralNames}`,

        /**
         * The parent is a type of MutationResponse { affected, records }
         *  */
        resolve: async (parent, args, context, info) => {
          if (!parent) {
            return Promise.reject(
              `IDs must be returned from mutation datasource`
            );
          }

          /**
           * If the records have returned already by the parent, resolver,
           * just respond with it.
           */
          if (parent.records) {
            return parent.records;
          }

          /**
           * Use the find resolver on the type source
           * the model. include the affected records
           * in the find context
           */
          const resolverName = getPluralName(`find${tc.getTypeName()}`);
          const resolver = tc.getResolver(resolverName);

          const response = await resolver.resolve({
            args,
            info,
            source: null,
            context: Object.assign({}, context, {
              mutationAffected: parent.affected
            })
          });

          return response;
        }
      }
    });
  });
};
