import {
  Attribute,
  Datasource,
  Model,
  MutationModel,
  MutationResponse,
  QueryModel,
  Criteria
} from "@skimah/api";
import JSONRecords from "@skimah/ds-json";
import faker from "faker";

export interface Config {
  /**
   * Maximum number of records to be generated for each type
   */
  recordMaximum: number;
}

const rangeGen = (start, max: number): number => {
  return Math.round(start + Math.random() * max);
};

const fakerGenerator = (source: string): any => {
  const errMsg = `The attribute named "${source}" does not match the format 
            fakerNamespace_function  e.g address_zipCode. 
            see https://rawgit.com/Marak/faker.js/master/examples/browser/index.html`;
  try {
    const [
      /** Source name */
      param1,
      /** Faker namespace */
      param2,
      /** Faker functions */
      param3
    ] = source.split("_");

    // source_fakerNamespace_function
    if (param3) {
      return faker[param2][param3]();
    }

    // source_fakerNamespace_function
    if (param2) {
      return faker[param1][param2]();
    }
  } catch {
    throw new Error(errMsg);
  }
};

const generateRecords = (config: Config, model: Model) => {
  const records = [];

  for (let index = 0; index < config.recordMaximum; index++) {
    const record = {};

    Object.values(model.attributes).forEach((attr: Attribute) => {
      if (attr.unique) {
        // auto increment ID/@unique values
        record[attr.sourceName] = (index + 1).toString();
      } else {
        record[attr.sourceName] = fakerGenerator(attr.sourceName);
      }
    });

    /**
     * For every one-to-one relationship, generate a foreign key
     * in the bounds of the max values of the parent
     *
     * All parents will not be guaranteed to have children
     */
    Object.values(model.relations)
      .filter(relation => !relation.isCollection)
      .forEach(relation => {
        // auto generate foreign keys between 0 and config.max
        record[relation.sourceName] = index + 1;
      });

    records.push(record);
  }

  return records;
};

export default class SampleRecords implements Datasource {
  private records: { [key: string]: JSONRecords } = {};

  constructor(private config: Config) {}

  async initialize(models: Model[]) {
    models.forEach(m => {
      const record = new JSONRecords({
        records: generateRecords(this.config, m)
      });

      record.initialize([m]);
      this.records[m.name] = record;
    });
  }

  async create(models: MutationModel[]): Promise<MutationResponse<any>> {
    const [first] = models;
    if (first) {
      return this.records[models[0].name].create(models);
    } else {
      return {
        affected: []
      };
    }
  }

  async select(selection: QueryModel): Promise<any[]> {
    const parents = await this.records[selection.name].select(selection);

    for (const relation of Object.values(selection.projectedRelations)) {
      const originalCriteria = relation.model.criteria.and;

      parents.forEach(async parent => {
        const newCriteria = {
          [relation.condition.child.sourceName]: {
            eq: parent[relation.condition.parent.name]
          }
        };

        // new criteria to be used to fetch child records
        relation.model.criteria.and = [...originalCriteria, newCriteria];

        if (relation.isCollection) {
          const children = await this.select(relation.model);
          parent[relation.name] = children;
        } else {
          const [child] = await this.select(relation.model);
          parent[relation.name] = child;
        }
      });
    }

    return parents;
  }

  async update(
    criteria: Criteria,
    changes: MutationModel
  ): Promise<MutationResponse<any>> {
    return this.records[changes.name].update(criteria, changes);
  }

  async delete(
    criteria: Criteria,
    model: Model
  ): Promise<MutationResponse<any>> {
    return this.records[model.name].delete(criteria, model);
  }
}
