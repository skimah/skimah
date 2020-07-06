import { ResolveTree } from "graphql-parse-resolve-info";
import {
  Attribute,
  Criteria,
  CriteriaFilter,
  Model,
  QueryModel,
  Relation
} from "../types";

/**
 * Converts graphql arguments criteria and criteria filter
 *
 * 1. { where: { and : [ { name: {eq: "James" } }, { name: {eq: "Bond" } } ] } }
 * 2. { where: { or :  [ { name: {eq: "James" } }, { name: {eq: "Bond" } } ] } }
 * 3. { where: { name: { eq: "James" } } }
 *
 * @param args {[key:string]: any} Parsed arguments
 */
export const argsToCriteria = (
  /* eslint-disable @typescript-eslint/no-explicit-any */
  args: { [key: string]: any },
  model: Model
): Criteria => {
  /**
   * Convert `and` filters
   */
  const andFilters = (args.where?.and || []).map(filter => {
    const newFilter = {};
    Object.entries(filter).forEach(([fieldName, val]) => {
      const attr = model.attributes[fieldName];
      newFilter[attr.sourceName] = val;
    });
    return newFilter;
  });

  /**
   * Convert `or` filters
   */
  const orFilters = (args.where?.or || []).map(filter => {
    const newFilter = {};
    Object.entries(filter).forEach(([fieldName, val]) => {
      const attr = model.attributes[fieldName];
      newFilter[attr.sourceName] = val;
    });
    return newFilter;
  });

  /**
   * Assign the none array arguments into a filter that can be added to default
   * `and` filter e.g
   * where: { name: { eq: "Bond" } }
   */
  const noneArrayEntries = Object.entries(args.where || {});
  const baseFilters = [];
  if (noneArrayEntries.length > 0) {
    const baseFilter: CriteriaFilter = {};
    noneArrayEntries.forEach(([key, val]) => {
      if (key !== "and" && key !== "or") {
        const attribute = model.attributes[key] || model.relations[key];
        baseFilter[attribute.sourceName] = val;
      }
    });

    baseFilters.push(baseFilter);
  }

  return {
    and: [...andFilters, ...baseFilters],
    or: orFilters,
    limit: args.limit,
    skip: args.skip,
    orderBy: args.orderBy || {}
  };
};

interface SelectionArg {
  baseModel: Model;
  models: { [key: string]: Model };
  interfaces: { [key: string]: Model[] };
  tree: ResolveTree;
}

/**
 * Maps a model to a selection model.
 *
 * Only includes selected attributes from the projection in the query
 *
 */
const createQueryModel = ({
  baseModel,
  tree,
  models,
  interfaces
}: SelectionArg): QueryModel => {
  const projectedAttributes: { [key: string]: Attribute } = {};
  const projectedRelations: { [key: string]: Relation } = {};

  const { fieldsByTypeName, args: criteriaArgs } = tree;
  const [[, fields]] = Object.entries(fieldsByTypeName);

  for (const [fieldName, fieldTree] of Object.entries(fields)) {
    if (baseModel.attributes[fieldTree.name]) {
      // account for GraphQL field aliasing

      projectedAttributes[fieldName] = Object.assign(
        baseModel.attributes[fieldTree.name],
        { name: fieldName }
      );
    } else {
      const theRelation = baseModel.relations[fieldTree.name];
      let relationModel = models[theRelation.type];

      /**
       * There are a 2 reasons why a relationModel could be undefined/null
       *
       * 1. If the relation is an interface
       *
       * 2. if the relation is a union type
       *
       * Then we need to manually resolve what type (model) should be used
       * for the relational model based on the requested fields
       */
      if (!relationModel) {
        const nonObjectRequestedFields = Object.keys(
          fieldTree.fieldsByTypeName[theRelation.type]
        );
        const nonObjectTypeName = theRelation.type;
        const interfaceModels = interfaces[nonObjectTypeName] || [];

        /**
         * Using the field comparison, we will pick the first model
         * that matches the requested fields for the interface
         */
        const [interfaceModel] = interfaceModels.filter(itrModel => {
          const allModelFields = Object.keys(itrModel.attributes).concat(
            Object.keys(itrModel.relations)
          );

          return nonObjectRequestedFields.every(itrField =>
            allModelFields.includes(itrField)
          );
        });

        /**
         * If no object type has implemented the interface
         * then We will throw an error because we don't know how to source
         * the model
         */
        if (!interfaceModel) {
          throw new Error(
            `Can not find any implementation for interface ${nonObjectTypeName}`
          );
        }

        relationModel = interfaceModel;

        // console.log(
        //   theRelation.type,
        //   theRelation.name,
        //   fieldTree.fieldsByTypeName[theRelation.type],
        //   interfaceModel
        // );
      }

      /**
       * For one-to-one relationships, an attribute should be added to
       * the projected attributes for selection and later for comparison
       * in the child relations
       *
       * Also account for the field alias
       */
      if (!theRelation.isCollection) {
        projectedAttributes[fieldName] = {
          name: fieldName,
          sourceName: theRelation.sourceName,
          type: "ID",
          unique: false
        };
      }

      /**
       * Only include relationships of models that are from
       * the same datasource. This will allow the datasource in
       * question to perform batch fetch
       *
       * e.g in a SQL datasource, a left join can be performed
       * to join tables
       *
       */
      if (baseModel.datasource === relationModel.datasource) {
        const newRelation = Object.assign({}, theRelation, {
          model: createQueryModel({
            baseModel: relationModel,
            models,
            tree: fieldTree,
            interfaces
          })
        });

        /**
         * For a direct one-to-many relationship,
         * include the child condition of the relation
         * in the projected attribute of the child
         *
         * This only works if the relationship is bidirectional
         */
        if (newRelation.isCollection) {
          const foreignFieldName = newRelation.condition.child.name;
          const foreignRelation = newRelation.model.relations[foreignFieldName];

          if (foreignRelation) {
            newRelation.model.projectedAttributes[foreignFieldName] = {
              name: foreignRelation.name,
              sourceName: foreignRelation.sourceName,
              unique: false,
              type: "ID"
            };
          }
        }

        projectedRelations[fieldName] = newRelation;
      }
    }
  }

  /**
   * Include the identities for this model automatically in the attributes that should
   * be selected. This will allow for joining of models
   * across datasources
   */
  baseModel.identities.forEach(attr => {
    Object.assign(projectedAttributes, {
      [attr.name]: attr
    });
  });

  return {
    ...baseModel,
    projectedAttributes,
    projectedRelations,
    criteria: argsToCriteria(criteriaArgs, baseModel)
  };
};

export default createQueryModel;
