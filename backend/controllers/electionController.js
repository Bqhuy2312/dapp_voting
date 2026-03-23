const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.getAllElections = (req, res) => {
  db.query("SELECT * FROM elections ORDER BY id DESC", (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result);
  });
};

exports.getElectionById = (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM elections WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    res.json(result[0]);
  });
};

exports.createElection = async (req, res) => {
  const {
    title,
    description,
    creator,
    startTime,
    endTime,
    accessCode,
    image,
    contractElectionId,
  } = req.body;

  try {
    const normalizedCreator = String(creator || "").trim();
    const normalizedAccessCode = String(accessCode ?? "").trim();
    const normalizedContractElectionId = Number(contractElectionId);

    if (!normalizedCreator) {
      return res.status(400).json({ message: "Creator wallet is required" });
    }

    if (!normalizedAccessCode) {
      return res.status(400).json({ message: "Access code is required" });
    }

    if (!Number.isFinite(normalizedContractElectionId)) {
      return res.status(400).json({ message: "Contract election id is required" });
    }

    const hash = await bcrypt.hash(normalizedAccessCode, 10);

    const sql = `
      INSERT INTO elections (
        title,
        description,
        creator,
        start_time,
        end_time,
        access_code_hash,
        image,
        contract_election_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        title,
        description,
        normalizedCreator,
        startTime,
        endTime,
        hash,
        image,
        normalizedContractElectionId,
      ],
      (err, result) => {
        if (err) return res.status(500).json(err);

        res.json({ id: result.insertId });
      },
    );
  } catch (err) {
    res.status(500).json(err.message);
  }
};

exports.updateElection = (req, res) => {
  const { id } = req.params;
  const { title, description, accessCode, image, wallet } = req.body;
  const normalizedWallet = String(wallet || "").trim().toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  db.query("SELECT * FROM elections WHERE id = ?", [id], async (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = result[0];

    if (String(election.creator || "").trim().toLowerCase() !== normalizedWallet) {
      return res.status(403).json({ message: "You are not allowed to update this election" });
    }

    try {
      const nextTitle = title ?? election.title;
      const nextDescription = description ?? election.description;
      const nextImage = image ?? election.image;
      const normalizedAccessCode = String(accessCode ?? "").trim();
      const nextHash = normalizedAccessCode
        ? await bcrypt.hash(normalizedAccessCode, 10)
        : election.access_code_hash;

      const sql = `
        UPDATE elections
        SET title = ?, description = ?, access_code_hash = ?, image = ?
        WHERE id = ?
      `;

      db.query(sql, [nextTitle, nextDescription, nextHash, nextImage, id], (updateErr) => {
        if (updateErr) return res.status(500).json(updateErr);

        res.json({ success: true });
      });
    } catch (hashErr) {
      res.status(500).json(hashErr.message);
    }
  });
};

exports.deleteElection = (req, res) => {
  const { id } = req.params;
  const normalizedWallet = String(req.query.wallet || "").trim().toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  db.query("SELECT * FROM elections WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = result[0];

    if (String(election.creator || "").trim().toLowerCase() !== normalizedWallet) {
      return res.status(403).json({ message: "You are not allowed to delete this election" });
    }

    db.query("DELETE FROM votes WHERE election_id = ?", [id], (voteErr) => {
      if (voteErr) return res.status(500).json(voteErr);

      db.query("DELETE FROM candidates WHERE election_id = ?", [id], (candidateErr) => {
        if (candidateErr) return res.status(500).json(candidateErr);

        db.query("DELETE FROM elections WHERE id = ?", [id], (deleteErr) => {
          if (deleteErr) return res.status(500).json(deleteErr);

          res.json({ success: true });
        });
      });
    });
  });
};

exports.endElectionEarly = (req, res) => {
  const { id } = req.params;
  const normalizedWallet = String(req.body.wallet || "").trim().toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  db.query("SELECT * FROM elections WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = result[0];

    if (String(election.creator || "").trim().toLowerCase() !== normalizedWallet) {
      return res.status(403).json({ message: "You are not allowed to end this election" });
    }

    const endedAt = Date.now();

    db.query("UPDATE elections SET end_time = ? WHERE id = ?", [endedAt, id], (updateErr) => {
      if (updateErr) return res.status(500).json(updateErr);

      res.json({ success: true, endedAt });
    });
  });
};
