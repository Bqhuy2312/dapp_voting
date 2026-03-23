const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.verifyAccessCode = (req, res) => {
  const { electionId, accessCode } = req.body;
  const normalizedAccessCode = String(accessCode ?? "").trim();

  if (!normalizedAccessCode) {
    return res.status(400).json({ message: "Ma truy cap khong duoc de trong" });
  }

  db.query(
    "SELECT access_code_hash FROM elections WHERE id = ?",
    [electionId],
    async (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({ message: "Election khong ton tai" });
      }

      const hash = result[0].access_code_hash;
      const isMatch = await bcrypt.compare(normalizedAccessCode, hash);

      if (!isMatch) {
        return res.status(400).json({ message: "Sai ma truy cap" });
      }

      res.json({ success: true });
    },
  );
};

exports.vote = (req, res) => {
  const { electionId, voter, candidateId } = req.body;

  if (!voter) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  const checkSql = `
    SELECT * FROM votes
    WHERE election_id = ? AND voter = ?
  `;

  db.query(checkSql, [electionId, voter], (checkErr, votedRows) => {
    if (checkErr) return res.status(500).json(checkErr);

    if (votedRows.length > 0) {
      return res.status(400).json({ message: "Ban da vote roi" });
    }

    db.query(
      "SELECT * FROM elections WHERE id = ?",
      [electionId],
      (electionErr, electionRows) => {
        if (electionErr) return res.status(500).json(electionErr);

        if (electionRows.length === 0) {
          return res.status(404).json({ message: "Election khong ton tai" });
        }

        if (Number(electionRows[0].end_time) <= Date.now()) {
          return res.status(400).json({ message: "Election da ket thuc" });
        }

        db.query(
          "SELECT * FROM candidates WHERE id = ? AND election_id = ?",
          [candidateId, electionId],
          (candidateErr, candidateRows) => {
            if (candidateErr) return res.status(500).json(candidateErr);

            if (candidateRows.length === 0) {
              return res.status(404).json({ message: "Ung vien khong ton tai" });
            }

            const insertVote = `
              INSERT INTO votes (election_id, voter, candidate_index)
              VALUES (?, ?, ?)
            `;

            db.query(insertVote, [electionId, voter, candidateId], (insertErr) => {
              if (insertErr) return res.status(500).json(insertErr);

              db.query(
                "UPDATE candidates SET vote_count = vote_count + 1 WHERE id = ?",
                [candidateId],
                (updateErr) => {
                  if (updateErr) return res.status(500).json(updateErr);

                  res.json({ success: true });
                },
              );
            });
          },
        );
      },
    );
  });
};

exports.checkVoted = (req, res) => {
  const { electionId, voter } = req.query;

  db.query(
    `
      SELECT * FROM votes
      WHERE election_id = ? AND voter = ?
    `,
    [electionId, voter],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({ voted: result.length > 0 });
    },
  );
};

exports.getVoteHistory = (req, res) => {
  const { electionId, wallet } = req.query;
  const normalizedWallet = String(wallet || "").trim().toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  db.query("SELECT creator FROM elections WHERE id = ?", [electionId], (electionErr, electionResult) => {
    if (electionErr) return res.status(500).json(electionErr);

    if (electionResult.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const creator = String(electionResult[0].creator || "").trim().toLowerCase();

    if (creator !== normalizedWallet) {
      return res.status(403).json({ message: "Only creator can view vote history" });
    }

    const sql = `
      SELECT v.id, v.voter, v.candidate_index, c.name AS candidate_name
      FROM votes v
      LEFT JOIN candidates c ON c.id = v.candidate_index
      WHERE v.election_id = ?
      ORDER BY v.id DESC
    `;

    db.query(sql, [electionId], (err, result) => {
      if (err) return res.status(500).json(err);

      res.json(result);
    });
  });
};
