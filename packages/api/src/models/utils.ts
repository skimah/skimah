import { ResolveTree } from "graphql-parse-resolve-info";
import { Attribute, Model, Relation } from "../types";

interface ModelArg {
  baseModel: Model;
  models: { [key: string]: Model };
  tree: ResolveTree;
}

/**
 * Convert a graphql selectionSet to
 *
 */
export const graphFieldsToModel = ({
  tree,
  baseModel,
  models
}: ModelArg): Model => {
  const attributes: { [key: string]: Attribute } = {};
  const relations: { [key: string]: Relation } = {};

  const { fieldsByTypeName } = tree;
  const [[, projection]] = Object.entries(fieldsByTypeName);

  for (const [fieldName, fieldTree] of Object.entries(projection)) {
    if (baseModel.attributes[fieldName]) {
      attributes[fieldName] = baseModel.attributes[fieldName];
    } else {
      const theRelation = { ...baseModel.relations[fieldName] };

      relations[fieldName] = Object.assign(theRelation, {
        model: graphFieldsToModel({
          baseModel: models[theRelation.type],
          models,
          tree: fieldTree
        })
      });
    }
  }

  return {
    ...baseModel,
    attributes,
    relations
  };
};
