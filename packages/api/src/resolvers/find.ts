import { getPluralName } from "graphql-compose";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";
import createSelection from "../models/selection";
import { ResolverDefinition } from "./index";
import { RelationCondition } from "../types";

/**
 * @internal
 * Creates a find{Type}s resolver that can be reused
 * for fetching a type. The datasource defined in the
 * schema for the type is invoked for sourcing this type
 *
 * The resolver will generate a {Criteria} from the graphql
 * query inputs that becomes the input to the datasource
 *
 *
 * @remarks
 * E.g for a type called User, a `findUsers` resolver is generated
 *
 * For fetching data across datasources, the relationship
 * that is declared between types in schema is automatically
 * inserted as a where clause into the criteria of the datasource
 *
 * e.g
 * type User {
 *  id: ID
 *  comments: [Comments]
 * }
 *
 * type Comments {
 *  id: ID
 *  text: String
 *
 *  user: User `@relation` `@named(as: "user_id")`
 * }
 *
 * using an example query like this
 *
 * query {
 *   findUsers {
 *      comments {
 *          text
 *      }
 *   }
 * }
 *
 * the Comment's datasource will receive an extra criteria filter
 * called `user_id` which will equal the id of the user automatically.
 *
 */
export default (definition: ResolverDefinition): string => {
  const { type: tc, models, datasources } = definition;

  const resolverName = getPluralName(`find${tc.getTypeName()}`);

  const pluralName = getPluralName(tc.getTypeName());

  tc.addResolver({
    name: resolverName,

    type: tc.getTypePlural().getTypeNonNull(),

    args: {
      limit: {
        type: "Int",
        description: `Limit the number of ${pluralName} that will be returned`
      },

      skip: {
        type: "Int",
        description: `Skip the first number of ${pluralName} that will be returned`
      },

      where: {
        type: `${tc.getTypeName()}Filter`,
        description: `Filter condition for ${pluralName} that will be returned`
      },

      orderBy: {
        type: `${tc.getTypeName()}OrderBy`,
        description: `Sort ${pluralName} that will be returned`
      }
    },

    resolve: async ({ source: parent, info, context }) => {
      const modelType = tc.getTypeName();
      const baseModel = models[modelType];
      const modelSource = datasources[baseModel.datasource];

      const tree = parseResolveInfo(info) as ResolveTree;

      let relationCondition: RelationCondition;

      /**
       * For fetching data from multiple datasources,
       * the connecting relationship is supplied to
       * the child as a `where` condition automatically
       *
       * If this query has a parent,
       * 1. Find the parent model and the relation
       * 2. Get the parent condition
       * 3. Add the child field to the args to be used eventually for creating
       * the query criteria
       */
      if (parent) {
        const parentModel = models[info.parentType];
        relationCondition = parentModel.relations[tree.name].condition;
        const parentField = parent[relationCondition.parent.name];
        const filterCriteria = {
          [relationCondition.child.name]: {
            eq: parentField
          }
        };

        if (tree.args.where) {
          Object.assign(tree.args.where, filterCriteria);
        } else {
          Object.assign(tree.args, {
            where: filterCriteria
          });
        }
      }

      /**
       *  If the call was a result of a mutation response, construct
       *  a where in argument to be sent to the datasource.
       *  Using the IDs of the newly created models, construct a where criteria
       */
      if (context && context.mutationAffected) {
        const [id] = baseModel.identities;
        Object.assign(tree.args, {
          where: {
            [id.name]: {
              in: context.mutationAffected
            }
          }
        });
      }

      const queryModel = createSelection({
        models,
        baseModel,
        tree
      });

      /**
       * If there is a relation condition, make sure
       * the child condition is projected.
       *
       * Relation must be directional
       */
      if (relationCondition) {
        const foreignRelation =
          queryModel.relations[relationCondition.child.name];
        const foreignFieldName = relationCondition.child.name;

        if (foreignRelation) {
          queryModel.projectedAttributes[foreignFieldName] = {
            name: foreignRelation.name,
            sourceName: foreignRelation.sourceName,
            unique: false,
            type: "ID"
          };
        }
      }

      const response = await modelSource.select(queryModel);

      if (info.returnType.toString().includes("[")) {
        return response;
      } else {
        return response[0];
      }
    }
  });

  return resolverName;
};
