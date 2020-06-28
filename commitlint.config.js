module.exports = {
  extends: ["@commitlint/config-conventional"],
  "header-min-length": 5,
  "header-max-length": 100,
  "scope-enum": [
    "records",
    "generator",
    "server",
    "site",
    "playground",
    "faker",
    "csv",
    "json",
    "sql",
    "docs",
    "ci",
    "repo"
  ]
};