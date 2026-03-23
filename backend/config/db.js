const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "dapp_voting",
});

const ensureSchema = () => {
  const queries = [
    `
      ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS contract_election_id BIGINT NULL
    `,
    `
      ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS contract_candidate_index BIGINT NULL
    `,
  ];

  queries.forEach((query) => {
    db.query(query, (err) => {
      if (err) {
        console.error("Schema sync error:", err.message);
      }
    });
  });
};

db.connect((err) => {
  if (err) {
    console.error("DB error:", err);
  } else {
    console.log("MySQL connected");
    ensureSchema();
  }
});

module.exports = db;
