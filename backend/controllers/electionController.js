const db = require("../config/db");
const bcrypt = require("bcrypt");
const { logElectionActivity } = require("../services/activityLogger");

// Lấy toàn bộ election để hiển thị ở trang danh sách.
exports.getAllElections = (req, res) => {
  db.query("SELECT * FROM elections ORDER BY id DESC", (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result);
  });
};

// Lấy election theo id
// Lấy chi tiết một election theo id.
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

// Tạo election mới, hash mã truy cập và lưu metadata vào database.
exports.createElection = async (req, res) => {
  // Lấy dữ liệu từ body
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
  // Chuẩn hóa dữ liệu đầu vào
  try {
    const normalizedCreator = String(creator || "").trim();
    const normalizedAccessCode = String(accessCode ?? "").trim();
    const normalizedContractElectionId = Number(contractElectionId);
    // Validate dữ liệu đầu vào
    if (!normalizedCreator) {
      return res.status(400).json({ message: "Creator wallet is required" });
    }

    if (!normalizedAccessCode) {
      return res.status(400).json({ message: "Access code is required" });
    }

    if (!Number.isFinite(normalizedContractElectionId)) {
      return res
        .status(400)
        .json({ message: "Contract election id is required" });
    }
    // Mã hóa access code trước khi lưu vào database
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
    // Kiểm tra xem đã có election nào có cùng contract_election_id chưa
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

        logElectionActivity({
          electionId: result.insertId,
          actorWallet: normalizedCreator,
          actionType: "create_election",
          entityType: "election",
          entityId: result.insertId,
          summary: `Tạo election "${title}"`,
          details: {
            contractElectionId: normalizedContractElectionId,
          },
        });

        res.json({ id: result.insertId });
      },
    );
  } catch (err) {
    res.status(500).json(err.message);
  }
};

// Cập nhật thông tin election và cho phép đổi mã truy cập nếu được cung cấp.
exports.updateElection = (req, res) => {
  const { id } = req.params;
  const { title, description, accessCode, image, wallet } = req.body;
  const normalizedWallet = String(wallet || "")
    .trim()
    .toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  db.query(
    "SELECT * FROM elections WHERE id = ?",
    [id],
    async (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({ message: "Election not found" });
      }
      // Kiểm tra xem wallet có phải là creator của election không
      const election = result[0];
      // Chuẩn hóa creator để so sánh với wallet
      if (
        String(election.creator || "")
          .trim()
          .toLowerCase() !== normalizedWallet
      ) {
        return res
          .status(403)
          .json({ message: "You are not allowed to update this election" });
      }
      // Chuẩn hóa các trường dữ liệu khác để cập nhật
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
        // Cập nhật election trong database
        db.query(
          sql,
          [nextTitle, nextDescription, nextHash, nextImage, id],
          (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);

            logElectionActivity({
              electionId: id,
              actorWallet: normalizedWallet,
              actionType: "update_election",
              entityType: "election",
              entityId: Number(id),
              summary: `Cập nhật election "${nextTitle}"`,
              details: {
                titleChanged: nextTitle !== election.title,
                descriptionChanged: nextDescription !== election.description,
                imageChanged: nextImage !== election.image,
                accessCodeChanged: Boolean(normalizedAccessCode),
              },
            });

            res.json({ success: true });
          },
        );
      } catch (hashErr) {
        res.status(500).json(hashErr.message);
      }
    },
  );
};

// Cập nhật ứng viên
// Xóa election cùng toàn bộ dữ liệu liên quan như votes và candidates.
exports.deleteElection = (req, res) => {
  const { id } = req.params;
  const normalizedWallet = String(req.query.wallet || "")
    .trim()
    .toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  db.query("SELECT * FROM elections WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = result[0];

    if (
      String(election.creator || "")
        .trim()
        .toLowerCase() !== normalizedWallet
    ) {
      return res
        .status(403)
        .json({ message: "You are not allowed to delete this election" });
    }

    db.query("DELETE FROM votes WHERE election_id = ?", [id], (voteErr) => {
      if (voteErr) return res.status(500).json(voteErr);

      db.query(
        "DELETE FROM candidates WHERE election_id = ?",
        [id],
        (candidateErr) => {
          if (candidateErr) return res.status(500).json(candidateErr);

          db.query("DELETE FROM elections WHERE id = ?", [id], (deleteErr) => {
            if (deleteErr) return res.status(500).json(deleteErr);

            res.json({ success: true });
          });
        },
      );
    });
  });
};

// Kết thúc election sớm
// Kết thúc election sớm bằng cách cập nhật thời gian kết thúc về hiện tại.
exports.endElectionEarly = (req, res) => {
  const { id } = req.params;
  const normalizedWallet = String(req.body.wallet || "")
    .trim()
    .toLowerCase();

  if (!normalizedWallet) {
    return res.status(400).json({ message: "Wallet is required" });
  }

  db.query("SELECT * FROM elections WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = result[0];

    if (
      String(election.creator || "")
        .trim()
        .toLowerCase() !== normalizedWallet
    ) {
      return res
        .status(403)
        .json({ message: "You are not allowed to end this election" });
    }

    const endedAt = Date.now();

    db.query(
      "UPDATE elections SET end_time = ? WHERE id = ?",
      [endedAt, id],
      (updateErr) => {
        if (updateErr) return res.status(500).json(updateErr);

        logElectionActivity({
          electionId: id,
          actorWallet: normalizedWallet,
          actionType: "end_election",
          entityType: "election",
          entityId: Number(id),
          summary: "Kết thúc election sớm",
          details: {
            endedAt,
          },
        });

        res.json({ success: true, endedAt });
      },
    );
  });
};

// Cập nhật ứng viên
// Lấy lịch sử hoạt động đã được ghi log của election.
exports.getElectionActivities = (req, res) => {
  const { id } = req.params;

  db.query(
    `
      SELECT *
      FROM election_activities
      WHERE election_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json(result);
    },
  );
};
