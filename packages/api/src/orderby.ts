/**
 * This will generate an input OrderBy with _OrderBy enum for each model type in the
 * type definition
 *
 * e.g
 * type  User {
 *  name: String
 *  age: Float
 * }
 *
 * This model will generate
 *
 * UserOrderBy {
 *   name: _OrderBy
 *   age: _OrderBy
 * }
 */
import {
  InputTypeComposerFieldConfigDefinition,
  ObjectTypeComposer,
  SchemaComposer
} from "graphql-compose";

const createOrderByEnum = (composer: SchemaComposer<any>) => {
  composer.getOrCreateETC("_OrderBy", etc => {
    etc.addFields({
      asc: {
        description: `Sort ascending`,
        value: "asc"
      },
      desc: {
        description: `Sort descending`,
        value: "desc"
      }
    });
  });
};

const createOrderByInput = (
  tc: ObjectTypeComposer,
  composer: SchemaComposer<any>
) => {
  const fields = tc.getFields();
  const sortFields: {
    [key: string]: InputTypeComposerFieldConfigDefinition;
  } = {};

  for (const fieldName in fields) {
    const field = fields[fieldName];
    const isScalar = composer.isScalarType(field.type.getType());

    if (isScalar) {
      sortFields[fieldName] = {
        type: "_OrderBy"
      };
    }
  }

  composer.createInputTC({
    name: `${tc.getTypeName()}OrderBy`,
    fields: sortFields,
    description: `Sort the field `
  });
};

/** @internal */
export default (tc: ObjectTypeComposer, composer: SchemaComposer<any>) => {
  createOrderByEnum(composer);
  createOrderByInput(tc, composer);
};
