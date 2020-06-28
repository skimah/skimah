import {
  getPluralName,
  InputTypeComposerFieldConfigAsObjectDefinition,
  ObjectTypeComposer,
  SchemaComposer
} from "graphql-compose";

const TYPE_OPERATORS = {
  Boolean: ["eq", "ne"],
  Int: ["eq", "ne", "lte", "lt", "in", "nin", "gte", "gt"],
  Float: ["eq", "ne", "lte", "lt", "gte", "gt"],
  String: ["eq", "ne", "like", "in", "nin"],
  ID: ["eq", "ne", "in", "nin"]
};

/**
 * Create an operator input type
 */
const createTypeOperators = (composer: SchemaComposer<any>) => {
  for (let [typeKey, operators] of Object.entries(TYPE_OPERATORS)) {
    composer.getOrCreateITC(`${typeKey}Opr`, itc => {
      itc.setDescription(`Filter input based on ${typeKey}`);

      operators.forEach(operator => {
        // create array types
        if (["in", "nin"].includes(operator)) {
          itc.setField(operator, {
            type: `[${typeKey}!]`
          });
        } else {
          // check for the array type here and create a list type input
          itc.setField(operator, {
            type: typeKey
          });
        }
      });
    });
  }
};

/** @internal */
export default (tc: ObjectTypeComposer, composer: SchemaComposer<any>) => {
  createTypeOperators(composer);

  const fields = tc.getFields();
  const typeFilterName = `${tc.getTypeName()}Filter`;

  composer.getOrCreateITC(typeFilterName, itc => {
    itc.setDescription(`Filter ${tc.getTypeName()} fields`);

    for (const fieldName in fields) {
      const field = fields[fieldName];
      const fieldType = field.type.getType();
      const isScalar = composer.isScalarType(fieldType);

      // single field relationship
      const isSingleRelation = !tc.isFieldPlural(fieldName) && !isScalar;

      const pluralFieldName = getPluralName(tc.getTypeName());

      /**
       * Only scalar and a single relationship
       */
      if (isScalar || isSingleRelation) {
        // non-scalar single fields
        const type = isSingleRelation ? `IDOpr` : `${fieldType}Opr`;

        const objConfig = <InputTypeComposerFieldConfigAsObjectDefinition>{
          type,
          description: `Filter ${pluralFieldName} based on ${fieldName}`
        };

        itc.setField(fieldName, objConfig);
      }
    }

    /**
     * Combination filters
     */
    itc.setField("and", {
      type: `[${typeFilterName}!]`,
      description: `Combine filters`
    });

    itc.setField("or", {
      type: `[${typeFilterName}!]`,
      description: `Combine filters`
    });
  });
};
