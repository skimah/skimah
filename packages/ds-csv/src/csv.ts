import JSONRecords from "@skimah/ds-json";
import { csvParse } from "d3-dsv";

export interface Config {
  /**
   * The path of the csv file that should be loaded
   */
  filepath?: string;

  /**
   * CSV text that should be used in lieu of a file
   */
  records?: string;
}

export default class CSVRecords extends JSONRecords {
  constructor(private csvConfig: Config) {
    super(Object.assign({}, csvConfig, { records: null }));
  }

  private loadCSV() {
    const { readFileSync } = require("fs");
    const csvText = readFileSync(this.csvConfig.filepath).toString();
    return csvParse(csvText);
  }

  async initialize() {
    if (this.csvConfig.filepath) {
      this.records = this.loadCSV();
    }

    if (this.csvConfig.records) {
      this.records = csvParse(this.csvConfig.records);
    }
  }
}
