import {
  DirectiveArgs,
  ObjectTypeComposer,
  SchemaComposer
} from "graphql-compose";

/** @internal */
export default (tc: ObjectTypeComposer, composer: SchemaComposer<any>) => {
  const itc = composer.getOrCreateITC(`${tc.getTypeName()}Input`, itc => {
    itc.merge(tc.getITC());
  });

  for (const [fieldName, fieldConfig] of Object.entries(itc.getFields())) {
    const fieldTC = tc.getFieldTC(fieldName);
    const relations = <DirectiveArgs>(
      tc.getFieldDirectiveByName(fieldName, "relation")
    );

    const isCollection = tc.isFieldPlural(fieldName);

    if (relations) {
      // TODO: no support for one-to-many mutation
      if (isCollection) {
        itc.removeField(fieldName);
      } else {
        itc.setField(fieldName, {
          description: fieldConfig.description,
          type: `ID`
        });
      }
    }
  }
};
