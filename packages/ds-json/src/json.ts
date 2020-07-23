import {
  Attribute,
  Criteria,
  CriteriaFilter,
  Datasource,
  Model,
  MutationModel,
  MutationResponse,
  QueryModel
} from "@skimah/api";

import sift from "./sift";

export interface Config {
  /**
   * The path of the csv file that should be loaded
   */
  filepath?: string;

  /**
   * An array of objects that should used instead of loading it from a file
   */
  records?: any[];
}

export default class implements Datasource {
  protected records: any[];

  constructor(private config: Config) {}

  private loadFile(): any[] {
    const { readFileSync } = require("fs");
    const jsonText = readFileSync(this.config.filepath);
    const rows = JSON.parse(jsonText.toString());
    return rows;
  }

  private mapField(record: any, attributes: { [key: string]: Attribute }): any {
    const newRecord = {};
    Object.keys(attributes).forEach(attrKey => {
      const attr = attributes[attrKey];
      newRecord[attr.name] = record[attr.sourceName];
    });

    return newRecord;
  }

  private sort(rows: any[], model: QueryModel): any[] {
    try {
      const [[attr, order]] = Object.entries(model.criteria.orderBy || {});

      return rows.sort((r1, r2) => {
        if (order === "asc") {
          return r1[attr] > r2[attr] ? 1 : -1;
        }

        return r2[attr] > r1[attr] ? 1 : -1;
      });
    } catch {
      return rows;
    }
  }

  private page(rows: any[], model: QueryModel): any[] {
    if (model.criteria.skip || model.criteria.limit) {
      const skip = model.criteria.skip ?? 0;
      const limit = model.criteria.limit
        ? skip + model.criteria.limit
        : rows.length;

      return rows.slice(skip, limit);
    }

    return rows;
  }

  private criteria(criteria: Criteria) {
    const query = {};

    const covertFilters = (filters: { [key: string]: CriteriaFilter }[]) => {
      return filters.map(c => {
        const [[field, filter]] = Object.entries(c);
        const newFilter = {};

        Object.entries(filter).forEach(([key, value]) => {
          if (key === "like") {
            newFilter[`$regex`] = value;
            return;
          }
          newFilter[`$${key}`] = value;
        });

        return { [field]: newFilter };
      });
    };

    if (criteria.and.length) {
      const and = criteria.and.filter(c => Object.keys(c).length);
      Object.assign(query, { $and: covertFilters(and) });
    }

    if (criteria.or.length) {
      const or = criteria.and.filter(c => Object.keys(c).length);
      Object.assign(query, { $or: covertFilters(or) });
    }

    return query;
  }

  private filter(rows: any[], model: QueryModel): any[] {
    const query: any = this.criteria(model.criteria);
    const filtered = rows.filter(sift(query));

    const mappedRows = filtered.map(row =>
      this.mapField(row, model.projectedAttributes)
    );

    const sorted = this.sort(mappedRows, model);
    const paged = this.page(sorted, model);

    return paged;
  }

  public async initialize(_: Model[]) {
    if (this.config.filepath) {
      this.records = this.loadFile();
    }

    if (this.config.records) {
      this.records = this.config.records;
    }
  }

  public async create(models: MutationModel[]): Promise<MutationResponse<any>> {
    const affectedRecordIDs = [];
    const inputRecords = [];
    const sourceRecords = [];

    models.forEach(model => {
      const sourceRecord = {};
      const inputRecord = {};

      const [id] = model.identities;

      if (!id) {
        throw new Error(`${model.name} does not have a unique field`);
      }

      Object.values(model.mutatedAttributes).forEach(attr => {
        sourceRecord[attr.sourceName] = attr.value;
        inputRecord[attr.name] = attr.value;
      });

      affectedRecordIDs.push(model.mutatedAttributes[id.name].value);

      inputRecords.push(inputRecord);
      sourceRecords.push(sourceRecord);
    });

    this.records = this.records.concat(...sourceRecords);

    return {
      affected: affectedRecordIDs,
      records: inputRecords
    };
  }

  public async select(selection: QueryModel): Promise<any[]> {
    const rows = this.filter(this.records, selection);
    return rows;
  }

  public async update(
    criteria: Criteria,
    changes: MutationModel
  ): Promise<MutationResponse<any>> {
    const query: any = this.criteria(criteria);
    const recordsToUpdate = this.records.filter(sift(query));

    const affectedRecordIDs = [];
    const changedRecord = {};

    Object.values(changes.mutatedAttributes).forEach(attr => {
      changedRecord[attr.sourceName] = attr.value;
    });

    recordsToUpdate.forEach(recordToUpdate => {
      const responseRecord = {};
      Object.assign(recordToUpdate, changedRecord);

      Object.values(changes.mutatedAttributes).forEach(attr => {
        responseRecord[attr.name] = recordToUpdate[attr.sourceName];
      });

      const [id] = changes.identities;
      affectedRecordIDs.push(recordToUpdate[id.sourceName]);
    });

    return {
      affected: affectedRecordIDs
    };
  }

  public async delete(
    criteria: Criteria,
    model: Model
  ): Promise<MutationResponse<any>> {
    const query: any = this.criteria(criteria);
    const recordsToDelete = this.records.filter(sift(query));

    const [id] = model.identities;
    const affectedIDs = recordsToDelete.map(record => {
      return record[id.sourceName];
    });

    return {
      affected: affectedIDs
    };
  }
}
