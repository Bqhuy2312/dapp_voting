const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Qu@ngHuy2312",
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
    `
      ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS birth_date DATE NULL
    `,
    `
      ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS hometown VARCHAR(255) NULL
    `,
    `
      ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS description TEXT NULL
    `,
    `
      CREATE TABLE IF NOT EXISTS election_activities (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        election_id INT UNSIGNED NOT NULL,
        actor_wallet VARCHAR(255) NULL,
        action_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INT UNSIGNED NULL,
        summary TEXT NOT NULL,
        details_json TEXT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (id),
        KEY idx_election_activities_election_id (election_id),
        KEY idx_election_activities_created_at (created_at)
      )
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
