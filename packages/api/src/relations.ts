import {
  getPluralName,
  ObjectTypeComposer,
  SchemaComposer
} from "graphql-compose";
import { Model } from "./types";

export const isFieldRelation = (fieldName: string, tc: ObjectTypeComposer) => {
  const isDefined = !!tc.getFieldDirectiveByName(fieldName, "relation");
  return isDefined;
};

export const constructRelationType = (
  isCollection: boolean,
  isDifferentSources: boolean
) => {
  return {
    collectionFromSameSources: isCollection && !isDifferentSources,
    collectionFromDifferentSources: isCollection && isDifferentSources,
    singleFromSameSources: !isCollection && !isDifferentSources,
    singleFromDifferentSources: !isCollection && isDifferentSources
  };
};

/**
 * @internal
 * This module will create relations between a Type and its fields
 *
 * To determine if a field should be considered for relation,
 * the following conditions must be satisfied
 *
 * 1. Must be defined with a `@relation` directive
 * 2. Must be non scalar type
 *
 * fields with datasources different from the parent type
 * will use the field's type resolver instead of use the parent's
 * resolver
 *
 */
export default (
  tc: ObjectTypeComposer,
  composer: SchemaComposer<any>,
  models: { [key: string]: Model }
) => {
  const fields = tc.getFields();

  for (const fieldName in fields) {
    const fieldTC = tc.getFieldTC(fieldName);

    const isNonScalar = !composer.isScalarType(fieldTC.getType());
    const isRelation = isFieldRelation(fieldName, tc);
    const isCollection = tc.isFieldPlural(fieldName);

    const fieldTypeName = fieldTC.getTypeName();

    const parentModel = models[tc.getTypeName()];
    const fieldModel = models[fieldTypeName];

    if (isRelation && isNonScalar) {
      const differentDatsources =
        parentModel.datasource !== fieldModel.datasource;

      const typeResolverName = getPluralName(`find ${fieldTypeName}`);

      const typeCollectionResolver = composer
        .getOTC(fieldTypeName)
        .getResolver(typeResolverName)
        .clone();

      const singleResolver = typeCollectionResolver
        .clone()
        .removeArg(["where", "limit", "skip", "orderBy"])
        .setType(fields[fieldName].type);

      const relationshipType = constructRelationType(
        isCollection,
        differentDatsources
      );

      if (relationshipType.collectionFromDifferentSources) {
        tc.addRelation(fieldName, { resolver: typeCollectionResolver });
      } else if (relationshipType.singleFromDifferentSources) {
        tc.addRelation(fieldName, { resolver: singleResolver });
      } else if (relationshipType.collectionFromSameSources) {
        tc.extendField(fieldName, { args: typeCollectionResolver.args });
      } else if (relationshipType.singleFromSameSources) {
        tc.extendField(fieldName, {
          resolver: singleResolver
        });
      }
    }
  }
};
