CREATE DATABASE IF NOT EXISTS dapp_voting
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dapp_voting;

CREATE TABLE IF NOT EXISTS elections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  creator VARCHAR(255) NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  access_code_hash VARCHAR(255) NOT NULL,
  image TEXT NULL,
  contract_election_id BIGINT NULL,
  PRIMARY KEY (id),
  KEY idx_elections_creator (creator),
  KEY idx_elections_contract_election_id (contract_election_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  election_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  image TEXT NULL,
  vote_count INT UNSIGNED NOT NULL DEFAULT 0,
  contract_candidate_index BIGINT NULL,
  birth_date DATE NULL,
  hometown VARCHAR(255) NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_candidates_election_id (election_id),
  KEY idx_candidates_contract_candidate_index (contract_candidate_index),
  CONSTRAINT fk_candidates_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS votes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  election_id INT UNSIGNED NOT NULL,
  voter VARCHAR(255) NOT NULL,
  candidate_index INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_votes_election_voter (election_id, voter),
  KEY idx_votes_candidate_index (candidate_index),
  CONSTRAINT fk_votes_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_votes_candidate
    FOREIGN KEY (candidate_index) REFERENCES candidates(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_election_activities_created_at (created_at),
  CONSTRAINT fk_activities_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
  
  select * from candidates;
  select * from elections;