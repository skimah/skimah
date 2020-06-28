import { Model, MutationModel, MutationAttribute } from "../types";

interface CreationArg {
  baseModel: Model;
  models: { [key: string]: Model };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  values: any;
  parentType?: string;
}

/**
 * Create a creation model with the arg value mapped to the attribute values
 */
const mapToModel = ({ baseModel, values }: CreationArg): MutationModel => {
  const mutatedAttributes: { [key: string]: MutationAttribute } = {};

  for (const [fieldName, value] of Object.entries(values)) {
    if (baseModel.attributes[fieldName]) {
      mutatedAttributes[fieldName] = Object.assign(
        {},
        baseModel.attributes[fieldName],
        {
          value
        }
      );
    } else if (baseModel.relations[fieldName]) {
      /**
       * In the case of updating a one-to-one relationship
       * include the field as a ID (String) to be able to create
       * the relationship
       */
      const relation = baseModel.relations[fieldName];

      mutatedAttributes[fieldName] = {
        name: relation.name,
        sourceName: relation.sourceName,
        value,
        unique: true,
        type: "ID"
      };
    }
  }

  return {
    ...baseModel,
    mutatedAttributes
  };
};

export default mapToModel;
