import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import {
  addCandidateOnChain,
  deleteCandidateOnChain,
  endElectionOnChain,
  getReadableBlockchainError,
  updateCandidateOnChain,
} from "../services/blockchain";
import {
  formatCandidateBirthInputValue,
  formatCandidateBirthLabel,
} from "../utils/candidateProfile";
import { getElectionStatus } from "../utils/electionStatus";
import { resolveImageUrlWithFallback } from "../utils/imageUrl";
import "./ElectionManage.css";

function ElectionManage({ wallet }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [candidateSubmitting, setCandidateSubmitting] = useState(false);
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    accessCode: "",
  });
  const [file, setFile] = useState(null);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    birthDate: "",
    hometown: "",
    description: "",
    file: null,
  });
  const [candidateEdits, setCandidateEdits] = useState({});
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [electionPreviewUrl, setElectionPreviewUrl] = useState("");
  const [newCandidatePreviewUrl, setNewCandidatePreviewUrl] = useState("");
  const [candidatePreviewUrls, setCandidatePreviewUrls] = useState({});

  const loadElection = async () => {
    const res = await API.get(`/elections/${id}`);
    const data = res.data;
    setElection(data);
    setForm({
      title: data.title || "",
      description: data.description || "",
      accessCode: "",
    });
  };

  const loadCandidates = async () => {
    const res = await API.get(`/candidates/${id}`);
    setCandidates(res.data);
    const nextEdits = {};

    res.data.forEach((candidate) => {
      nextEdits[candidate.id] = {
        name: candidate.name || "",
        birthDate: formatCandidateBirthInputValue(candidate.birth_date),
        hometown: candidate.hometown || "",
        description: candidate.description || "",
        file: null,
      };
    });

    setCandidateEdits(nextEdits);
  };

  useEffect(() => {
    Promise.all([loadElection(), loadCandidates()])
      .catch((error) => {
        console.error(error);
        alert("Không tải được election.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!file) {
      setElectionPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setElectionPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!newCandidate.file) {
      setNewCandidatePreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(newCandidate.file);
    setNewCandidatePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [newCandidate.file]);

  useEffect(() => {
    const activeUrls = [];
    const nextPreviewUrls = {};

    Object.entries(candidateEdits).forEach(([candidateId, edit]) => {
      if (edit?.file) {
        const objectUrl = URL.createObjectURL(edit.file);
        nextPreviewUrls[candidateId] = objectUrl;
        activeUrls.push(objectUrl);
      }
    });

    setCandidatePreviewUrls(nextPreviewUrls);

    return () => {
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [candidateEdits]);

  const isOwner =
    wallet &&
    election &&
    String(election.creator || "").toLowerCase() === wallet.toLowerCase();

  const status = election ? getElectionStatus(election.end_time, now) : null;

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleCandidateEditChange = (candidateId, field, value) => {
    setCandidateEdits((current) => ({
      ...current,
      [candidateId]: {
        ...current[candidateId],
        [field]: value,
      },
    }));
  };

  const handleUpdate = async () => {
    if (!wallet || !isOwner) {
      setMessage("Bạn không phải chủ election này.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = election.image || "";

      if (file) {
        const formData = new FormData();
        formData.append("image", file);

        const uploadRes = await API.post("/upload", formData);
        imageUrl = uploadRes.data.url;
      }

      await API.put(`/elections/${id}`, {
        title: form.title,
        description: form.description,
        accessCode: form.accessCode,
        image: imageUrl,
        wallet,
      });

      await loadElection();
      setForm((current) => ({ ...current, accessCode: "" }));
      setFile(null);
      setMessage("Cập nhật election thành công.");
    } catch (error) {
      console.error(error);
      setMessage("Cập nhật election thất bại.");
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!wallet || !isOwner) {
      setMessage("Bạn không phải chủ election này.");
      return;
    }

    const confirmed = window.confirm(
      "Bạn chắc chắn muốn xóa election này? Hành động này không thể hoàn tác.",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await API.delete(`/elections/${id}`, { params: { wallet } });
      alert("Đã xóa election.");
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Xóa election thất bại.");
      setDeleting(false);
    }
  };

  const handleEndElection = async () => {
    if (!wallet || !isOwner) {
      setMessage("Bạn không phải chủ election này.");
      return;
    }

    if (!Number.isFinite(Number(election?.contract_election_id))) {
      setMessage("Election này chưa được đồng bộ blockchain.");
      return;
    }

    setEnding(true);

    try {
      await endElectionOnChain(Number(election.contract_election_id));
      await API.post(`/elections/${id}/end`, { wallet });
      await loadElection();
      setMessage("Đã kết thúc sớm election.");
    } catch (error) {
      console.error(error);
      setMessage("Không thể kết thúc election.");
    }

    setEnding(false);
  };

  const handleAddCandidate = async () => {
    if (!wallet || !isOwner) {
      setMessage("Bạn không phải chủ election này.");
      return;
    }

    if (!newCandidate.name.trim()) {
      setMessage("Vui lòng nhập tên ứng viên.");
      return;
    }

    if (status?.isEnded) {
      setMessage("Election đã kết thúc.");
      return;
    }

    if (!Number.isFinite(Number(election?.contract_election_id))) {
      setMessage("Election này chưa được đồng bộ blockchain.");
      return;
    }

    if (newCandidate.name.trim().length < 2) {
      setMessage("Tên ứng viên phải có ít nhất 2 ký tự.");
      return;
    }

    setCandidateSubmitting(true);

    try {
      let imageUrl = "";

      if (newCandidate.file) {
        const formData = new FormData();
        formData.append("image", newCandidate.file);

        const uploadRes = await API.post("/upload", formData);
        imageUrl = uploadRes.data.url;
      }

      const chainRes = await addCandidateOnChain(
        Number(election.contract_election_id),
        newCandidate.name.trim(),
      );

      await API.post("/candidates", {
        electionId: id,
        name: newCandidate.name.trim(),
        image: imageUrl,
        wallet,
        contractCandidateIndex: chainRes.contractCandidateIndex,
        birthDate: newCandidate.birthDate,
        birth_date: newCandidate.birthDate,
        hometown: newCandidate.hometown,
        description: newCandidate.description,
      });

      setNewCandidate({
        name: "",
        birthDate: "",
        hometown: "",
        description: "",
        file: null,
      });
      await loadCandidates();
      setMessage("Thêm ứng viên thành công.");
    } catch (error) {
      console.error(error);
      setMessage("Thêm ứng viên thất bại.");
    }

    setCandidateSubmitting(false);
  };

  const handleUpdateCandidate = async (candidate) => {
    const edit = candidateEdits[candidate.id];

    if (!edit) {
      return;
    }

    if (!wallet || !isOwner) {
      setMessage("Bạn không có quyền cập nhật ứng viên này.");
      return;
    }

    if (!edit.name.trim()) {
      setMessage("Tên ứng viên không được để trống.");
      return;
    }

    const trimmedName = edit.name.trim();
    const currentBirthDate = formatCandidateBirthInputValue(candidate.birth_date);
    const nextBirthDate = String(edit.birthDate || "").trim();
    const nextHometown = String(edit.hometown || "").trim();
    const nextDescription = String(edit.description || "").trim();
    const hasNameChanged = trimmedName !== String(candidate.name || "").trim();
    const hasProfileChanged =
      nextBirthDate !== currentBirthDate ||
      nextHometown !== String(candidate.hometown || "").trim() ||
      nextDescription !== String(candidate.description || "").trim() ||
      Boolean(edit.file);

    if (!hasNameChanged && !hasProfileChanged) {
      setMessage("Chưa có thay đổi nào để cập nhật.");
      return;
    }

    setCandidateSubmitting(true);

    try {
      let imageUrl = candidate.image || "";
      let blockchainNameWarning = "";

      if (edit.file) {
        const formData = new FormData();
        formData.append("image", edit.file);

        const uploadRes = await API.post("/upload", formData);
        imageUrl = uploadRes.data.url;
      }

      if (
        hasNameChanged &&
        Number.isFinite(Number(candidate.contract_candidate_index)) &&
        Number.isFinite(Number(election?.contract_election_id))
      ) {
        try {
          await updateCandidateOnChain(
            Number(election.contract_election_id),
            Number(candidate.contract_candidate_index),
            trimmedName,
          );
        } catch (chainError) {
          blockchainNameWarning = getReadableBlockchainError(chainError);
        }
      }

      await API.put(`/candidates/${candidate.id}`, {
        name: trimmedName,
        image: imageUrl,
        wallet,
        birthDate: nextBirthDate,
        birth_date: nextBirthDate,
        hometown: nextHometown,
        description: nextDescription,
      });

      await loadCandidates();
      setMessage(
        blockchainNameWarning
          ? `Đã cập nhật ứng viên trong hệ thống, nhưng tên trên blockchain chưa đổi: ${blockchainNameWarning}`
          : "Cập nhật ứng viên thành công.",
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Cập nhật ứng viên thất bại.",
      );
    }

    setCandidateSubmitting(false);
  };

  const handleDeleteCandidate = async (candidate) => {
    const confirmed = window.confirm("Bạn chắc chắn muốn xóa ứng viên này?");

    if (!confirmed) {
      return;
    }

    setCandidateSubmitting(true);

    try {
      if (
        Number.isFinite(Number(candidate.contract_candidate_index)) &&
        Number.isFinite(Number(election?.contract_election_id))
      ) {
        await deleteCandidateOnChain(
          Number(election.contract_election_id),
          Number(candidate.contract_candidate_index),
        );
      }

      await API.delete(`/candidates/${candidate.id}`, {
        params: { wallet },
      });

      await loadCandidates();
      setMessage("Đã xóa ứng viên.");
    } catch (error) {
      console.error(error);
      setMessage("Xóa ứng viên thất bại.");
    }

    setCandidateSubmitting(false);
  };

  if (loading) {
    return <div className="manage-page">Đang tải election...</div>;
  }

  if (!election) {
    return <div className="manage-page">Không tìm thấy election.</div>;
  }

  return (
    <div className="manage-page">
      <div className="manage-card">
        <div className="manage-header">
          <div>
            <p className="manage-label">Trang quản lý election</p>
            <h2 className="manage-title">{election.title}</h2>
          </div>
          <Link to="/" className="back-link">
            Về trang chủ
          </Link>
        </div>

        <div className="owner-panel">
          {message ? <p className="status-message">{message}</p> : null}
          <p><strong>Trạng thái:</strong> {status?.label || "Không rõ"}</p>
          <p><strong>Còn lại:</strong> {status?.countdown || "Không rõ"}</p>
          {election.description ? <p><strong>Mô tả:</strong> {election.description}</p> : null}
        </div>

        {!isOwner ? (
          <div className="blocked-box">
            Bạn đang xem election ở chế độ chỉ đọc. Chỉ creator mới có thể chỉnh sửa và quản lý election này.
          </div>
        ) : null}

        {isOwner ? (
          <div className="form-grid">
            <label className="field">
              <span>Tiêu đề</span>
              <input
                className="manage-input"
                value={form.title}
                onChange={handleChange("title")}
              />
            </label>

            <label className="field">
              <span>Mô tả</span>
              <textarea
                className="manage-textarea"
                value={form.description}
                onChange={handleChange("description")}
              />
            </label>

            <label className="field">
              <span>Mã truy cập mới</span>
              <input
                className="manage-input"
                placeholder="Bỏ trống nếu giữ nguyên"
                value={form.accessCode}
                onChange={handleChange("accessCode")}
              />
            </label>

            <label className="field">
              <span>Hình ảnh mới</span>
              <input
                type="file"
                className="manage-input"
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
            </label>
          </div>
        ) : null}

        <img
          src={
            electionPreviewUrl ||
            resolveImageUrlWithFallback(election.image, election.title)
          }
          alt={election.title}
          className="preview-image"
        />

        {isOwner ? (
          <div className="manage-actions">
            <button
              className="save-btn"
              onClick={handleUpdate}
              disabled={saving || deleting || ending}
            >
              {saving ? "Đang lưu..." : "Cập nhật election"}
            </button>

            <button
              className="end-btn"
              onClick={handleEndElection}
              disabled={saving || deleting || ending || status?.isEnded}
            >
              {ending ? "Đang kết thúc..." : "Kết thúc sớm election"}
            </button>

            <Link to={`/vote/${election.id}`} className="secondary-link">
              Mở trang vote
            </Link>

            <button
              className="delete-btn"
              onClick={handleDelete}
              disabled={saving || deleting || ending}
            >
              {deleting ? "Đang xóa..." : "Xóa election"}
            </button>
          </div>
        ) : null}

        <div className="candidate-admin">
          <h3 className="candidate-admin-title">Danh sách ứng viên</h3>

          {isOwner ? (
            <div className="candidate-create-box">
              <input
                className="manage-input"
                placeholder="Tên ứng viên mới"
                value={newCandidate.name}
                onChange={(e) => setNewCandidate((current) => ({ ...current, name: e.target.value }))}
              />
              <input
                type="date"
                className="manage-input"
                value={newCandidate.birthDate}
                onChange={(e) => setNewCandidate((current) => ({ ...current, birthDate: e.target.value }))}
              />
              <input
                className="manage-input"
                placeholder="Quê quán"
                value={newCandidate.hometown}
                onChange={(e) => setNewCandidate((current) => ({ ...current, hometown: e.target.value }))}
              />
              <textarea
                className="manage-textarea"
                placeholder="Mô tả ứng viên"
                value={newCandidate.description}
                onChange={(e) => setNewCandidate((current) => ({ ...current, description: e.target.value }))}
              />
              <input
                type="file"
                className="manage-input"
                onChange={(e) => setNewCandidate((current) => ({ ...current, file: e.target.files[0] || null }))}
              />
              <img
                src={
                  newCandidatePreviewUrl ||
                  resolveImageUrlWithFallback("", newCandidate.name || "Candidate")
                }
                alt={newCandidate.name || "New candidate preview"}
                className="candidate-thumb"
              />
              <button
                className="save-btn"
                onClick={handleAddCandidate}
                disabled={candidateSubmitting || status?.isEnded}
              >
                {candidateSubmitting ? "Đang xử lý..." : "Thêm ứng viên"}
              </button>
            </div>
          ) : null}

          <div className="candidate-admin-list">
            {candidates.length === 0 ? (
              <p className="empty-note">Chưa có ứng viên nào.</p>
            ) : (
              candidates.map((candidate) => {
                const edit = candidateEdits[candidate.id] || {
                  name: candidate.name,
                  birthDate: "",
                  hometown: "",
                  description: "",
                  file: null,
                };

                return (
                  <div key={candidate.id} className="candidate-admin-item">
                    <div className="candidate-admin-meta">
                      <p><strong>Số phiếu:</strong> {candidate.vote_count}</p>
                      <p><strong>Ngày sinh:</strong> {formatCandidateBirthLabel(candidate.birth_date)}</p>
                      <p><strong>Quê quán:</strong> {candidate.hometown || "Chưa cập nhật"}</p>
                      <p><strong>Mô tả:</strong> {candidate.description || "Chưa có mô tả"}</p>
                    </div>

                    <img
                      src={
                        candidatePreviewUrls[candidate.id] ||
                        resolveImageUrlWithFallback(candidate.image, candidate.name)
                      }
                      alt={candidate.name}
                      className="candidate-thumb"
                    />

                    {isOwner ? (
                      <>
                        <input
                          className="manage-input"
                          value={edit.name}
                          onChange={(e) => handleCandidateEditChange(candidate.id, "name", e.target.value)}
                        />
                        <input
                          type="date"
                          className="manage-input"
                          value={edit.birthDate}
                          onChange={(e) => handleCandidateEditChange(candidate.id, "birthDate", e.target.value)}
                        />
                        <input
                          className="manage-input"
                          value={edit.hometown}
                          onChange={(e) => handleCandidateEditChange(candidate.id, "hometown", e.target.value)}
                        />
                        <textarea
                          className="manage-textarea"
                          value={edit.description}
                          onChange={(e) => handleCandidateEditChange(candidate.id, "description", e.target.value)}
                        />
                        <input
                          type="file"
                          className="manage-input"
                          onChange={(e) => handleCandidateEditChange(candidate.id, "file", e.target.files[0] || null)}
                        />

                        <div className="candidate-row-actions">
                          <button
                            className="save-btn"
                            onClick={() => handleUpdateCandidate(candidate)}
                            disabled={candidateSubmitting || status?.isEnded}
                          >
                            Cập nhật
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteCandidate(candidate)}
                            disabled={candidateSubmitting || status?.isEnded}
                          >
                            Xóa
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="empty-note"><strong>Tên ứng viên:</strong> {candidate.name}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ElectionManage;
