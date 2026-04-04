import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import { useNotifications } from "../components/Notifications";
import {
  addCandidateOnChain,
  deleteCandidateOnChain,
  endElectionOnChain,
  getReadableBlockchainError,
  updateCandidateOnChain,
} from "../services/blockchain";
import { uploadImage } from "../services/upload";
import {
  formatCandidateBirthInputValue,
  formatCandidateBirthLabel,
} from "../utils/candidateProfile";
import { getElectionStatus } from "../utils/electionStatus";
import { resolveImageUrlWithFallback } from "../utils/imageUrl";
import { formatWalletAddress } from "../utils/wallet";
import "./ElectionManage.css";

// Trang quản trị cho creator cập nhật election, ứng viên và nhật ký hoạt động.
function ElectionManage({ wallet }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [candidateSubmitting, setCandidateSubmitting] = useState(false);
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [activities, setActivities] = useState([]);
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

  // Tải chi tiết election để điền vào form quản trị.
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

  // Tải danh sách ứng viên và khởi tạo state chỉnh sửa cho từng dòng.
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

  // Tải nhật ký hoạt động để creator theo dõi các thay đổi trong election.
  const loadActivities = async () => {
    const res = await API.get(`/elections/${id}/activity`);
    setActivities(res.data);
  };

  // Nạp đồng thời dữ liệu election, ứng viên và hoạt động khi mở trang.
  useEffect(() => {
    Promise.all([loadElection(), loadCandidates(), loadActivities()])
      .catch((error) => {
        console.error(error);
        notify("Không tải được election.", {
          type: "error",
          title: "Tải dữ liệu thất bại",
        });
      })
      .finally(() => setLoading(false));
  }, [id, notify]);

  // Cập nhật thời gian hiện tại liên tục để countdown luôn chính xác.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tạo preview ảnh mới cho election trước khi upload.
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

  // Tạo preview ảnh cho form thêm ứng viên mới.
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

  // Tạo preview ảnh cho từng ứng viên đang được chỉnh sửa.
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

  // Trả về handler cập nhật field trong form thông tin election.
  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  // Cập nhật state chỉnh sửa cục bộ cho từng ứng viên.
  const handleCandidateEditChange = (candidateId, field, value) => {
    setCandidateEdits((current) => ({
      ...current,
      [candidateId]: {
        ...current[candidateId],
        [field]: value,
      },
    }));
  };

  // Lưu thay đổi election hiện tại lên backend.
  const handleUpdate = async () => {
    if (!wallet || !isOwner) {
      setMessage("Bạn không phải chủ election này.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = election.image || "";

      if (file) {
        imageUrl = await uploadImage(file, { requireCloud: true });
      }

      await API.put(`/elections/${id}`, {
        title: form.title,
        description: form.description,
        accessCode: form.accessCode,
        image: imageUrl,
        wallet,
      });

      await loadElection();
      await loadActivities();
      setForm((current) => ({ ...current, accessCode: "" }));
      setFile(null);
      setMessage("Cập nhật election thành công.");
      notify("Thông tin election đã được cập nhật.", {
        type: "success",
        title: "Cập nhật thành công",
      });
    } catch (error) {
      console.error(error);
      setMessage("Cập nhật election thất bại.");
      notify("Không thể cập nhật election này.", {
        type: "error",
        title: "Cập nhật thất bại",
      });
    }

    setSaving(false);
  };

  // Xóa toàn bộ election sau khi người dùng xác nhận.
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
      notify("Election đã được xóa.", {
        type: "success",
        title: "Xóa thành công",
      });
      navigate("/");
    } catch (error) {
      console.error(error);
      notify("Không thể xóa election.", {
        type: "error",
        title: "Xóa thất bại",
      });
      setDeleting(false);
    }
  };

  // Kết thúc election sớm trên blockchain rồi đồng bộ lại backend.
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
      await loadActivities();
      setMessage("Đã kết thúc sớm election.");
      notify("Election đã được kết thúc sớm.", {
        type: "success",
        title: "Kết thúc election",
      });
    } catch (error) {
      console.error(error);
      setMessage("Không thể kết thúc election.");
      notify("Không thể kết thúc election này.", {
        type: "error",
        title: "Kết thúc thất bại",
      });
    }

    setEnding(false);
  };

  // Thêm ứng viên mới lên blockchain và lưu hồ sơ vào database.
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
        imageUrl = await uploadImage(newCandidate.file, { requireCloud: true });
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
      await loadActivities();
      setMessage("Thêm ứng viên thành công.");
      notify("Ứng viên mới đã được thêm vào election.", {
        type: "success",
        title: "Thêm ứng viên thành công",
      });
    } catch (error) {
      console.error(error);
      setMessage("Thêm ứng viên thất bại.");
      notify("Không thể thêm ứng viên.", {
        type: "error",
        title: "Thêm ứng viên thất bại",
      });
    }

    setCandidateSubmitting(false);
  };

  // Cập nhật hồ sơ ứng viên và thử đồng bộ tên với blockchain nếu cần.
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
        imageUrl = await uploadImage(edit.file, { requireCloud: true });
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
      await loadActivities();
      setMessage(
        blockchainNameWarning
          ? `Đã cập nhật ứng viên trong hệ thống, nhưng tên trên blockchain chưa đổi: ${blockchainNameWarning}`
          : "Cập nhật ứng viên thành công.",
      );
      notify(
        blockchainNameWarning
          ? `Ứng viên đã được cập nhật trong hệ thống, nhưng tên trên blockchain chưa đổi: ${blockchainNameWarning}`
          : "Ứng viên đã được cập nhật thành công.",
        {
          type: blockchainNameWarning ? "warning" : "success",
          title: blockchainNameWarning
            ? "Đồng bộ chưa hoàn tất"
            : "Cập nhật ứng viên thành công",
        },
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Cập nhật ứng viên thất bại.",
      );
      notify(
        error?.response?.data?.message ||
          error?.message ||
          "Cập nhật ứng viên thất bại.",
        {
          type: "error",
          title: "Cập nhật ứng viên thất bại",
        },
      );
    }

    setCandidateSubmitting(false);
  };

  // Xóa ứng viên khỏi blockchain và database.
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
      await loadActivities();
      setMessage("Đã xóa ứng viên.");
      notify("Ứng viên đã được xóa khỏi election.", {
        type: "success",
        title: "Xóa ứng viên thành công",
      });
    } catch (error) {
      console.error(error);
      setMessage("Xóa ứng viên thất bại.");
      notify("Không thể xóa ứng viên.", {
        type: "error",
        title: "Xóa ứng viên thất bại",
      });
    }

    setCandidateSubmitting(false);
  };

  if (loading) {
    return <div className="manage-page">Đang tải election...</div>;
  }

  if (!election) {
    return <div className="manage-page">Không tìm thấy election.</div>;
  }

  if (!isOwner) {
    return (
      <div className="manage-page">
        <div className="manage-card">
          <div className="manage-header">
            <div>
              <p className="manage-label">Khu quản trị election</p>
              <h2 className="manage-title">{election.title}</h2>
            </div>
            <Link to={`/vote/${election.id}`} className="back-link">
              Mở trang chi tiết
            </Link>
          </div>

          <div className="blocked-box blocked-box-strong">
            <p className="blocked-title">Trang này chỉ dành cho creator của election.</p>
            <p className="blocked-text">
              Bạn vẫn có thể xem thông tin election, danh sách ứng viên và kết quả tại trang chi tiết.
            </p>
            <Link to={`/vote/${election.id}`} className="secondary-link">
              Đi tới trang chi tiết election
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Chuyển action_type kỹ thuật thành nhãn dễ đọc trong giao diện.
  const getActivityTitle = (activity) => {
    switch (activity.action_type) {
      case "create_election":
        return "Tạo election";
      case "update_election":
        return "Cập nhật election";
      case "end_election":
        return "Kết thúc election";
      case "add_candidate":
        return "Thêm ứng viên";
      case "update_candidate":
        return "Cập nhật ứng viên";
      case "delete_candidate":
        return "Xóa ứng viên";
      case "vote":
        return "Ghi nhận phiếu bầu";
      default:
        return "Hoạt động";
    }
  };

  // Định dạng timestamp activity thành thời gian địa phương dễ đọc.
  const formatActivityTime = (value) => {
    if (!value) {
      return "Không rõ thời gian";
    }

    return new Date(Number(value)).toLocaleString("vi-VN");
  };

  return (
    <div className="manage-page">
      <div className="manage-card">
        <div className="manage-header">
          <div>
            <p className="manage-label">Khu quản trị election</p>
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

        <img
          src={
            electionPreviewUrl ||
            resolveImageUrlWithFallback(election.image, election.title)
          }
          alt={election.title}
          className="preview-image"
        />

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
            Mở trang chi tiết
          </Link>

          <button
            className="delete-btn"
            onClick={handleDelete}
            disabled={saving || deleting || ending}
          >
            {deleting ? "Đang xóa..." : "Xóa election"}
          </button>
        </div>

        <div className="candidate-admin">
          <h3 className="candidate-admin-title">Danh sách ứng viên</h3>

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
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="candidate-admin">
          <h3 className="candidate-admin-title">Lịch sử hoạt động</h3>
          {activities.length === 0 ? (
            <p className="empty-note">Chưa có hoạt động nào được ghi lại.</p>
          ) : (
            <div className="activity-list">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-top">
                    <p className="activity-title">{getActivityTitle(activity)}</p>
                    <p className="activity-time">{formatActivityTime(activity.created_at)}</p>
                  </div>
                  <p className="activity-summary">{activity.summary}</p>
                  <p className="activity-meta">
                    {activity.actor_wallet
                      ? `Ví thực hiện: ${formatWalletAddress(activity.actor_wallet)}`
                      : "Hệ thống ghi nhận"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ElectionManage;
