const db = require("../config/db");

exports.addCandidate = (req, res) => {
  const { electionId, name, image, wallet, contractCandidateIndex } = req.body;
  const normalizedWallet = String(wallet || "").trim().toLowerCase();
  const normalizedContractCandidateIndex = Number(contractCandidateIndex);

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  if (!String(name || "").trim()) {
    return res.status(400).json({ message: "Candidate name is required" });
  }

  if (!Number.isFinite(normalizedContractCandidateIndex)) {
    return res.status(400).json({ message: "Contract candidate index is required" });
  }

  db.query("SELECT creator FROM elections WHERE id = ?", [electionId], (electionErr, electionResult) => {
    if (electionErr) return res.status(500).json(electionErr);

    if (electionResult.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const creator = String(electionResult[0].creator || "").trim().toLowerCase();

    if (creator !== normalizedWallet) {
      return res.status(403).json({ message: "Only creator can add candidates" });
    }

    const sql = `
      INSERT INTO candidates (election_id, name, image, contract_candidate_index)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [electionId, name.trim(), image, normalizedContractCandidateIndex], (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({ success: true, id: result.insertId });
    });
  });
};

exports.getCandidates = (req, res) => {
  const { electionId } = req.params;

  db.query(
    `
      SELECT *
      FROM candidates
      WHERE election_id = ?
      ORDER BY COALESCE(contract_candidate_index, id), id
    `,
    [electionId],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json(result);
    },
  );
};

exports.updateCandidate = (req, res) => {
  const { id } = req.params;
  const { name, image, wallet } = req.body;
  const normalizedWallet = String(wallet || "").trim().toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  const sql = `
    SELECT c.*, e.creator
    FROM candidates c
    JOIN elections e ON e.id = c.election_id
    WHERE c.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const candidate = result[0];

    if (String(candidate.creator || "").trim().toLowerCase() !== normalizedWallet) {
      return res.status(403).json({ message: "Only creator can update candidates" });
    }

    const nextName = String(name ?? candidate.name).trim();
    const nextImage = image ?? candidate.image;

    db.query(
      "UPDATE candidates SET name = ?, image = ? WHERE id = ?",
      [nextName, nextImage, id],
      (updateErr) => {
        if (updateErr) return res.status(500).json(updateErr);

        res.json({ success: true });
      },
    );
  });
};

exports.deleteCandidate = (req, res) => {
  const { id } = req.params;
  const normalizedWallet = String(req.query.wallet || "").trim().toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  const sql = `
    SELECT c.*, e.creator
    FROM candidates c
    JOIN elections e ON e.id = c.election_id
    WHERE c.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const candidate = result[0];

    if (String(candidate.creator || "").trim().toLowerCase() !== normalizedWallet) {
      return res.status(403).json({ message: "Only creator can delete candidates" });
    }

    db.query("DELETE FROM candidates WHERE id = ?", [id], (deleteErr) => {
      if (deleteErr) return res.status(500).json(deleteErr);

      res.json({ success: true });
    });
  });
};
