const db = require("../config/db");
// Ghi log hoạt động liên quan đến bầu cử
exports.logElectionActivity = ({
  electionId,
  actorWallet,
  actionType,
  entityType,
  entityId = null,
  summary,
  details = null,
}) => {
  if (!electionId || !actionType || !entityType || !summary) {
    return;
  }
  // Lưu vào database
  const sql = `
    INSERT INTO election_activities (
      election_id,
      actor_wallet,
      action_type,
      entity_type,
      entity_id,
      summary,
      details_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      electionId,
      actorWallet || null,
      actionType,
      entityType,
      entityId,
      summary,
      details ? JSON.stringify(details) : null,
      Date.now(),
    ],
    (err) => {
      if (err) {
        console.error("Activity log error:", err.message);
      }
    },
  );
};
