import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import {
  addCandidateOnChain,
  deleteCandidateOnChain,
  endElectionOnChain,
  updateCandidateOnChain,
} from "../services/blockchain";
import { getElectionStatus } from "../utils/electionStatus";
import "./ElectionManage.css";

function formatDateTimeLocal(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(Number(timestamp));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

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
  const [newCandidate, setNewCandidate] = useState({ name: "", file: null });
  const [candidateEdits, setCandidateEdits] = useState({});
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");

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
        file: null,
      };
    });

    setCandidateEdits(nextEdits);
  };

  useEffect(() => {
    Promise.all([loadElection(), loadCandidates()])
      .catch((error) => {
        console.error(error);
        alert("Khong tai duoc election.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      setMessage("Ban khong phai chu election nay.");
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
      setMessage("Cap nhat election thanh cong.");
    } catch (error) {
      console.error(error);
      setMessage("Cap nhat election that bai.");
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!wallet || !isOwner) {
      setMessage("Ban khong phai chu election nay.");
      return;
    }

    const confirmed = window.confirm(
      "Ban chac chan muon xoa election nay? Hanh dong nay khong the hoan tac.",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await API.delete(`/elections/${id}`, { params: { wallet } });
      alert("Da xoa election.");
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Xoa election that bai.");
      setDeleting(false);
    }
  };

  const handleEndElection = async () => {
    if (!wallet || !isOwner) {
      setMessage("Ban khong phai chu election nay.");
      return;
    }

    if (!Number.isFinite(Number(election?.contract_election_id))) {
      setMessage("Election nay chua duoc dong bo blockchain.");
      return;
    }

    setEnding(true);

    try {
      await endElectionOnChain(Number(election.contract_election_id));
      await API.post(`/elections/${id}/end`, { wallet });
      await loadElection();
      setMessage("Da ket thuc som election.");
    } catch (error) {
      console.error(error);
      setMessage("Khong the ket thuc election.");
    }

    setEnding(false);
  };

  const handleAddCandidate = async () => {
    if (!wallet || !isOwner) {
      setMessage("Ban khong phai chu election nay.");
      return;
    }

    if (!newCandidate.name.trim()) {
      setMessage("Vui long nhap ten ung vien.");
      return;
    }

    if (status?.isEnded) {
      setMessage("Election da ket thuc.");
      return;
    }

    if (!Number.isFinite(Number(election?.contract_election_id))) {
      setMessage("Election nay chua duoc dong bo blockchain.");
      return;
    }

    if (newCandidate.name.trim().length < 2) {
      setMessage("Ten ung vien phai co it nhat 2 ky tu.");
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
      });

      setNewCandidate({ name: "", file: null });
      await loadCandidates();
      setMessage("Them ung vien thanh cong.");
    } catch (error) {
      console.error(error);
      setMessage("Them ung vien that bai.");
    }

    setCandidateSubmitting(false);
  };

  const handleUpdateCandidate = async (candidate) => {
    const edit = candidateEdits[candidate.id];

    if (!edit) {
      return;
    }

    if (!edit.name.trim()) {
      setMessage("Ten ung vien khong duoc de trong.");
      return;
    }

    setCandidateSubmitting(true);

    try {
      let imageUrl = candidate.image || "";

      if (edit.file) {
        const formData = new FormData();
        formData.append("image", edit.file);

        const uploadRes = await API.post("/upload", formData);
        imageUrl = uploadRes.data.url;
      }

      if (
        edit.name.trim() !== candidate.name &&
        Number.isFinite(Number(candidate.contract_candidate_index)) &&
        Number.isFinite(Number(election?.contract_election_id))
      ) {
        await updateCandidateOnChain(
          Number(election.contract_election_id),
          Number(candidate.contract_candidate_index),
          edit.name.trim(),
        );
      }

      await API.put(`/candidates/${candidate.id}`, {
        name: edit.name.trim(),
        image: imageUrl,
        wallet,
      });

      await loadCandidates();
      setMessage("Cap nhat ung vien thanh cong.");
    } catch (error) {
      console.error(error);
      setMessage("Cap nhat ung vien that bai.");
    }

    setCandidateSubmitting(false);
  };

  const handleDeleteCandidate = async (candidate) => {
    const confirmed = window.confirm("Ban chac chan muon xoa ung vien nay?");

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
      setMessage("Da xoa ung vien.");
    } catch (error) {
      console.error(error);
      setMessage("Xoa ung vien that bai.");
    }

    setCandidateSubmitting(false);
  };

  if (loading) {
    return <div className="manage-page">Dang tai election...</div>;
  }

  if (!election) {
    return <div className="manage-page">Khong tim thay election.</div>;
  }

  return (
    <div className="manage-page">
      <div className="manage-card">
        <div className="manage-header">
          <div>
            <p className="manage-label">Trang quan ly election</p>
            <h2 className="manage-title">{election.title}</h2>
          </div>
          <Link to="/" className="back-link">
            Ve Home
          </Link>
        </div>

        <div className="owner-panel">
          {message ? <p className="status-message">{message}</p> : null}
          <p><strong>ID:</strong> {election.id}</p>
          <p><strong>Creator:</strong> {election.creator}</p>
          <p><strong>Contract Election ID:</strong> {election.contract_election_id ?? "Chua dong bo"}</p>
          <p><strong>Trang thai:</strong> {status?.label || "Khong ro"}</p>
          <p><strong>Con lai:</strong> {status?.countdown || "Khong ro"}</p>
        </div>

        {!isOwner ? (
          <div className="blocked-box">
            Election nay khong thuoc vi hien tai. Hay doi dung MetaMask account cua creator de quan ly.
          </div>
        ) : (
          <>
            <div className="form-grid">
              <label className="field">
                <span>Tieu de</span>
                <input
                  className="manage-input"
                  value={form.title}
                  onChange={handleChange("title")}
                />
              </label>

              <label className="field">
                <span>Mo ta</span>
                <textarea
                  className="manage-textarea"
                  value={form.description}
                  onChange={handleChange("description")}
                />
              </label>

              <label className="field">
                <span>Ma truy cap moi</span>
                <input
                  className="manage-input"
                  placeholder="Bo trong neu giu nguyen"
                  value={form.accessCode}
                  onChange={handleChange("accessCode")}
                />
              </label>

              <label className="field">
                <span>Hinh anh moi</span>
                <input
                  type="file"
                  className="manage-input"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </label>
            </div>

            {election.image ? (
              <img src={election.image} alt={election.title} className="preview-image" />
            ) : null}

            <div className="manage-actions">
              <button
                className="save-btn"
                onClick={handleUpdate}
                disabled={saving || deleting || ending}
              >
                {saving ? "Dang luu..." : "Cap nhat election"}
              </button>

              <button
                className="end-btn"
                onClick={handleEndElection}
                disabled={saving || deleting || ending || status?.isEnded}
              >
                {ending ? "Dang ket thuc..." : "Ket thuc som election"}
              </button>

              <Link to={`/vote/${election.id}`} className="secondary-link">
                Mo trang vote
              </Link>

              <button
                className="delete-btn"
                onClick={handleDelete}
                disabled={saving || deleting || ending}
              >
                {deleting ? "Dang xoa..." : "Xoa election"}
              </button>
            </div>

            <div className="candidate-admin">
              <h3 className="candidate-admin-title">CRUD ung vien</h3>

              <div className="candidate-create-box">
                <input
                  className="manage-input"
                  placeholder="Ten ung vien moi"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate((current) => ({ ...current, name: e.target.value }))}
                />
                <input
                  type="file"
                  className="manage-input"
                  onChange={(e) => setNewCandidate((current) => ({ ...current, file: e.target.files[0] || null }))}
                />
                <button
                  className="save-btn"
                  onClick={handleAddCandidate}
                  disabled={candidateSubmitting || status?.isEnded}
                >
                  {candidateSubmitting ? "Dang xu ly..." : "Them ung vien"}
                </button>
              </div>

              <div className="candidate-admin-list">
                {candidates.length === 0 ? (
                  <p className="empty-note">Chua co ung vien nao.</p>
                ) : (
                  candidates.map((candidate) => {
                    const edit = candidateEdits[candidate.id] || { name: candidate.name, file: null };

                    return (
                      <div key={candidate.id} className="candidate-admin-item">
                        <div className="candidate-admin-meta">
                          <p><strong>ID:</strong> {candidate.id}</p>
                          <p><strong>Contract Index:</strong> {candidate.contract_candidate_index ?? "Chua dong bo"}</p>
                          <p><strong>So phieu:</strong> {candidate.vote_count}</p>
                        </div>

                        {candidate.image ? (
                          <img src={candidate.image} alt={candidate.name} className="candidate-thumb" />
                        ) : null}

                        <input
                          className="manage-input"
                          value={edit.name}
                          onChange={(e) => handleCandidateEditChange(candidate.id, "name", e.target.value)}
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
                            Cap nhat
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteCandidate(candidate)}
                            disabled={candidateSubmitting || status?.isEnded}
                          >
                            Xoa
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ElectionManage;
