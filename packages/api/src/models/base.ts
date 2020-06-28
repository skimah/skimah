import {
  ComposeNamedOutputType,
  DirectiveArgs,
  ObjectTypeComposer,
  schemaComposer,
  unwrapOutputTC,
  ObjectTypeComposerFieldConfig
} from "graphql-compose";
import {
  Attribute,
  AttributeType,
  Model,
  Relation,
  RelationCondition
} from "../types";

const isFieldUnique = (
  /* eslint-disable @typescript-eslint/no-explicit-any */
  field: ComposeNamedOutputType<any>,
  uniqueDirective: DirectiveArgs | void
): boolean => {
  return !!uniqueDirective || field.getTypeName() === "ID";
};

const getSourceNameForField = (
  parent: ObjectTypeComposer,
  fieldName: string
): string => {
  const fieldDirective = parent.getFieldDirectiveByName(fieldName, "named");
  return fieldDirective ? fieldDirective.as : fieldName;
};

/**
 * Retrieve the type identity field
 */
const typeIdentity = (tc: ObjectTypeComposer): string => {
  const [uniqueField] = tc.getFieldNames().filter(fieldName => {
    return isFieldUnique(
      tc.getFieldTC(fieldName),
      tc.getFieldDirectiveByName(fieldName, "unique")
    );
  });

  if (!uniqueField) {
    throw Error(`${tc.getTypeName()} has no unique field`);
  }

  return uniqueField;
};

const getFieldByTypeName = (
  tc: ObjectTypeComposer,
  typeName: string
): [string, ObjectTypeComposerFieldConfig<any, any, any>] => {
  const [firstFieldByType] = Object.entries(tc.getFields()).filter(
    ([, field]) => {
      const baseType = unwrapOutputTC(field.type).getTypeName();
      return baseType === typeName;
    }
  );

  return firstFieldByType;
};

const relationships = {
  /**
   * One-to-Many relationship using `@relation` field
   * This will use the parent's unique identity to make connections to the child
   * This is because this is a virtual relationship that only
   * exists in the schema
   *
   * If the relation field is not specified, then use the field's type identity field
   */
  oneToManyByDirective: (
    relationField: string,
    parentOTC: ObjectTypeComposer,
    parentField: string
  ): RelationCondition => {
    const parentUniqueField = typeIdentity(parentOTC);

    const childOTC = parentOTC.getFieldOTC(parentField);

    return {
      parent: {
        name: parentUniqueField,
        sourceName: getSourceNameForField(parentOTC, parentUniqueField)
      },
      child: {
        name: relationField,
        sourceName: getSourceNameForField(childOTC, relationField)
      }
    };
  },
  /**
   * One-to-Many relationship using type inference.
   * This is useful when the `@relation`'s field parameter is omitted
   *
   * This type of relationship must be by-directional
   */
  oneToManyByType: (
    parentOTC: ObjectTypeComposer,
    parentField: string
  ): RelationCondition => {
    const parentUniqueField = typeIdentity(parentOTC);

    const childOTC = parentOTC.getFieldOTC(parentField);

    try {
      const [parentInsideChild] = getFieldByTypeName(
        childOTC,
        parentOTC.getTypeName()
      );

      return {
        parent: {
          name: parentUniqueField,
          sourceName: getSourceNameForField(parentOTC, parentUniqueField)
        },
        child: {
          name: parentInsideChild,
          sourceName: getSourceNameForField(childOTC, parentInsideChild)
        }
      };
    } catch {
      throw Error(
        `Without specifying @relation's field parameter, relationship definition must be bi-directional ${parentOTC.getTypeName()} -> ${childOTC.getTypeName()} `
      );
    }
  },
  /**
   * One-to-One relationship using `@relation` field
   */
  oneToOneByDirective: (
    relationField: string,
    parentOTC: ObjectTypeComposer,
    parentField: string
  ): RelationCondition => {
    const childOTC = parentOTC.getFieldOTC(parentField);

    return {
      parent: {
        name: parentField,
        sourceName: getSourceNameForField(parentOTC, parentField)
      },
      child: {
        name: relationField,
        sourceName: getSourceNameForField(childOTC, relationField)
      }
    };
  },
  /**
   * One-to-One relationship using type inference.
   * This is useful when the `@relation`'s field parameter is omitted
   */
  oneToOneByType: (
    parentOTC: ObjectTypeComposer,
    parentField: string
  ): RelationCondition => {
    const childOTC = parentOTC.getFieldOTC(parentField);

    try {
      const childUniqueIdentity = typeIdentity(childOTC);

      return {
        parent: {
          name: parentField,
          sourceName: getSourceNameForField(parentOTC, parentField)
        },
        child: {
          name: childUniqueIdentity,
          sourceName: getSourceNameForField(childOTC, childUniqueIdentity)
        }
      };
    } catch {
      throw Error(
        `Without specifying @relation's field parameter, relationship definition must be bi-directional ${parentOTC.getTypeName()} -> ${childOTC.getTypeName()} `
      );
    }
  }
};

export default (tc: ObjectTypeComposer): Model => {
  const attributes: { [key: string]: Attribute } = {};
  const identities: Attribute[] = [];
  const relations: { [key: string]: Relation } = {};

  /**
   * Rename the type name in the datasource `@named` directive
   */
  const sourceName = (
    tc.getDirectiveByName("named") || {
      as: tc.getTypeName()
    }
  ).as;

  /**
   * The datasource directive defaults to `default` if one is not provided
   */
  const datasource = (
    tc.getDirectiveByName("datasource") || {
      name: "default"
    }
  ).name;

  for (const [fieldName] of Object.entries(tc.getFields())) {
    const fieldTC = tc.getFieldTC(fieldName);

    /**
     * `@unique` directive or type of ID is used to determine if this is a unique field
     */
    const isUnique = isFieldUnique(
      fieldTC,
      tc.getFieldDirectiveByName(fieldName, "unique")
    );

    /**
     * Non scalar fields are treated as relationships
     */
    const isRelation = !schemaComposer.isScalarType(fieldTC.getType());
    const relationDirective = tc.getFieldDirectiveByName(fieldName, "relation");

    /**
     * Is this field a collection
     */
    const isCollection = tc.isFieldPlural(fieldName);

    /**
     * field renaming from @named(as:) directive
     */
    const sourceName = getSourceNameForField(tc, fieldName);

    /**
     * Field type name like ID, String e.t.c
     */
    const fieldTypeName = fieldTC.getTypeName() as AttributeType;

    /**
     * Create the attribute for model
     */
    const attribute = {
      name: fieldName,
      sourceName,
      unique: isUnique,
      type: fieldTypeName
    };

    // construct the relationship
    if (isRelation && relationDirective) {
      let condition: RelationCondition;

      // defined Relationships
      if (relationDirective.field) {
        // one-to-many
        if (isCollection) {
          condition = relationships.oneToManyByDirective(
            relationDirective.field,
            tc,
            fieldName
          );
        } else {
          // one-to-one
          condition = relationships.oneToOneByDirective(
            relationDirective.field,
            tc,
            fieldName
          );
        }
      } else {
        if (isCollection) {
          condition = relationships.oneToManyByType(tc, fieldName);
        } else {
          condition = relationships.oneToOneByType(tc, fieldName);
        }
      }

      // add relation condition to the attribute
      relations[fieldName] = {
        isCollection,
        condition,
        /**
         * Model will be added in the resolver phase
         */
        model: null,

        ...attribute
      };
    } else {
      // just attributes
      attributes[fieldName] = attribute;
    }
    isUnique && identities.push(attribute);
  }

  return {
    attributes,
    identities,
    relations,
    name: tc.getTypeName(),
    datasource,
    sourceName
  };
};
