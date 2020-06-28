import {
  Datasource,
  Model,
  MutationModel,
  Criteria,
  QueryModel
} from "./types";

export const noopSource = (): Datasource => {
  return {
    initialize: (_: Model[]) => Promise.resolve(null),

    select: (_: QueryModel) => Promise.resolve([]),

    create: (_: MutationModel[]) =>
      Promise.resolve({ records: [], affected: [] }),

    update: (_: Criteria) => Promise.resolve({ affected: [], records: [] }),

    delete: (_: Criteria, _1: Model) =>
      Promise.resolve({ records: [], affected: [] })
  };
};

export const nullSource = (): Datasource => {
  return {
    select: (q: QueryModel) =>
      Promise.reject(`No datasource configured for ${q.name}`),

    create: (m: MutationModel[]) =>
      Promise.reject(
        `No datasource configured for ${m[0] ? m[0].name : "creating models"} `
      ),

    update: (c: Criteria, changes: MutationModel) =>
      Promise.reject(`No datasource configured for ${changes[0].name}`),

    delete: (_: Criteria, m: Model) =>
      Promise.reject(`No datasource configured for ${m.name}`)
  };
};
