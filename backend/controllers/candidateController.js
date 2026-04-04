const db = require("../config/db");
const { logElectionActivity } = require("../services/activityLogger");

// Thêm ứng viên mới vào election sau khi kiểm tra quyền creator.
exports.addCandidate = (req, res) => {
  // Lấy dữ liệu từ body
  const {
    electionId,
    name,
    image,
    wallet,
    contractCandidateIndex,
    birthDate,
    birth_date,
    hometown,
    description,
  } = req.body;
  // Chuẩn hóa dữ liệu đầu vào
  const normalizedWallet = String(wallet || "")
    .trim()
    .toLowerCase();
  const normalizedContractCandidateIndex = Number(contractCandidateIndex);
  const normalizedBirthDate =
    String(birthDate ?? birth_date ?? "").trim() || null;
  const normalizedHometown = String(hometown || "").trim();
  const normalizedDescription = String(description || "").trim();
  
  // Validate dữ liệu
  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  if (!String(name || "").trim()) {
    return res.status(400).json({ message: "Candidate name is required" });
  }

  if (!Number.isFinite(normalizedContractCandidateIndex)) {
    return res
      .status(400)
      .json({ message: "Contract candidate index is required" });
  }

  // kiểm tra xem electionId có tồn tại và wallet có phải là creator của election đó không
  db.query(
    "SELECT creator FROM elections WHERE id = ?",
    [electionId],
    (electionErr, electionResult) => {
      if (electionErr) return res.status(500).json(electionErr);

      if (electionResult.length === 0) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      // Chuẩn hóa creator để so sánh với wallet
      const creator = String(electionResult[0].creator || "")
        .trim()
        .toLowerCase();

      if (creator !== normalizedWallet) {
        return res
          .status(403)
          .json({ message: "Only creator can add candidates" });
      }

      // Thêm ứng viên vào database
      const sql = `
      INSERT INTO candidates (
        election_id,
        name,
        image,
        contract_candidate_index,
        birth_date,
        hometown,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

      // Kiểm tra xem đã có ứng viên nào trong election này có cùng contract_candidate_index chưa
      db.query(
        sql,
        [
          electionId,
          name.trim(),
          image,
          normalizedContractCandidateIndex,
          normalizedBirthDate,
          normalizedHometown,
          normalizedDescription,
        ],
        (err, result) => {
          if (err) return res.status(500).json(err);

          logElectionActivity({
            electionId,
            actorWallet: normalizedWallet,
            actionType: "add_candidate",
            entityType: "candidate",
            entityId: result.insertId,
            summary: `Thêm ứng viên "${name.trim()}"`,
            details: {
              contractCandidateIndex: normalizedContractCandidateIndex,
            },
          });

          res.json({ success: true, id: result.insertId });
        },
      );
    },
  );
};

// Trả về danh sách ứng viên của một election theo thứ tự hiển thị.
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

// Cập nhật hồ sơ ứng viên và chỉ cho phép creator của election thực hiện.
exports.updateCandidate = (req, res) => {
  const { id } = req.params;
  const { name, image, wallet, birthDate, birth_date, hometown, description } =
    req.body;
  // Chuẩn hóa wallet để kiểm tra quyền
  const normalizedWallet = String(wallet || "")
    .trim()
    .toLowerCase();
  // Chuẩn hóa các trường dữ liệu khác để cập nhật
  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  // Lấy thông tin candidate và election để kiểm tra quyền
  const sql = `
    SELECT c.*, e.creator
    FROM candidates c
    JOIN elections e ON e.id = c.election_id
    WHERE c.id = ?
  `;

  // Kiểm tra xem candidate có tồn tại không và wallet có phải là creator của election đó không
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Chuẩn hóa creator để so sánh với wallet
    const candidate = result[0];

    if (
      String(candidate.creator || "")
        .trim()
        .toLowerCase() !== normalizedWallet
    ) {
      return res
        .status(403)
        .json({ message: "Only creator can update candidates" });
    }
    // Xác định giá trị mới cho các trường, nếu không có dữ liệu mới thì giữ nguyên giá trị cũ
    const nextName = String(name ?? candidate.name).trim();
    const nextImage = image ?? candidate.image;
    const nextBirthDate =
      String(birthDate ?? birth_date ?? candidate.birth_date ?? "").trim() ||
      null;
    const nextHometown = String(hometown ?? candidate.hometown ?? "").trim();
    const nextDescription = String(
      description ?? candidate.description ?? "",
    ).trim();
    
    // Cập nhật ứng viên trong database
    db.query(
      `
        UPDATE candidates
        SET name = ?, image = ?, birth_date = ?, hometown = ?, description = ?
        WHERE id = ?
      `,
      [nextName, nextImage, nextBirthDate, nextHometown, nextDescription, id],
      (updateErr) => {
        if (updateErr) return res.status(500).json(updateErr);

        logElectionActivity({
          electionId: candidate.election_id,
          actorWallet: normalizedWallet,
          actionType: "update_candidate",
          entityType: "candidate",
          entityId: Number(id),
          summary: `Cập nhật ứng viên "${nextName}"`,
          details: {
            nameChanged: nextName !== candidate.name,
            imageChanged: nextImage !== candidate.image,
            birthDateChanged: String(nextBirthDate || "") !== String(candidate.birth_date || ""),
            hometownChanged: nextHometown !== String(candidate.hometown || ""),
            descriptionChanged: nextDescription !== String(candidate.description || ""),
          },
        });

        res.json({ success: true });
      },
    );
  });
};

// Xóa ứng viên khỏi election sau khi xác minh đúng creator.
exports.deleteCandidate = (req, res) => {
  const { id } = req.params;
  // Chuẩn hóa wallet để kiểm tra quyền
  const normalizedWallet = String(req.query.wallet || "")
    .trim()
    .toLowerCase();
  // Kiểm tra xem wallet có tồn tại không
  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  const sql = `
    SELECT c.*, e.creator
    FROM candidates c
    JOIN elections e ON e.id = c.election_id
    WHERE c.id = ?
  `;
  // Kiểm tra xem candidate có tồn tại không và wallet có phải là creator của election đó không
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    // Chuẩn hóa creator để so sánh với wallet
    const candidate = result[0];

    if (
      String(candidate.creator || "")
        .trim()
        .toLowerCase() !== normalizedWallet
    ) {
      return res
        .status(403)
        .json({ message: "Only creator can delete candidates" });
    }
    // Xóa ứng viên
    db.query("DELETE FROM candidates WHERE id = ?", [id], (deleteErr) => {
      if (deleteErr) return res.status(500).json(deleteErr);

      logElectionActivity({
        electionId: candidate.election_id,
        actorWallet: normalizedWallet,
        actionType: "delete_candidate",
        entityType: "candidate",
        entityId: Number(id),
        summary: `Xóa ứng viên "${candidate.name}"`,
      });

      res.json({ success: true });
    });
  });
};
