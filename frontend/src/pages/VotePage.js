import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../services/api";
import { addCandidateOnChain, voteOnChain } from "../services/blockchain";
import { formatCandidateBirthLabel } from "../utils/candidateProfile";
import { getElectionStatus } from "../utils/electionStatus";
import { resolveImageUrlWithFallback } from "../utils/imageUrl";
import { formatWalletAddress } from "../utils/wallet";
import "./VotePage.css";

function VotePage({ wallet }) {
  const { id } = useParams();

  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [history, setHistory] = useState([]);
  const [accessCode, setAccessCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    birthDate: "",
    hometown: "",
    description: "",
    file: null,
  });
  const [now, setNow] = useState(Date.now());

  const loadElection = async () => {
    try {
      const res = await API.get(`/elections/${id}`);
      setElection(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadCandidates = async () => {
    try {
      const res = await API.get(`/candidates/${id}`);
      setCandidates(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadElection();
    loadCandidates();
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!wallet) {
      setHasVoted(false);
      return;
    }

    API.get("/votes/check", {
      params: { electionId: id, voter: wallet },
    })
      .then((res) => setHasVoted(res.data.voted))
      .catch((error) => console.error(error));
  }, [id, wallet]);

  const isOwner =
    wallet &&
    election &&
    String(election.creator || "").toLowerCase() === wallet.toLowerCase();

  useEffect(() => {
    if (!election) {
      return;
    }

    if (isOwner) {
      setVerified(true);
      return;
    }

    setVerified(false);
  }, [election, isOwner, wallet]);

  const status = election
    ? getElectionStatus(election.start_time, election.end_time, now)
    : null;

  const handleVerify = async () => {
    try {
      await API.post("/votes/verify-code", {
        electionId: id,
        accessCode: String(accessCode).trim(),
      });

      setVerified(true);
    } catch (error) {
      console.error(error);
      alert("Sai mã hoặc election không tồn tại!");
    }
  };

  const handleVote = async (candidate) => {
    if (!wallet) {
      alert("Vui lòng kết nối MetaMask ở trang chủ trước.");
      return;
    }

    if (!Number.isFinite(Number(election?.contract_election_id))) {
      alert("Election này chưa được đồng bộ blockchain.");
      return;
    }

    if (!Number.isFinite(Number(candidate.contract_candidate_index))) {
      alert("Ứng viên này chưa được đồng bộ blockchain.");
      return;
    }

    setLoading(true);

    try {
      await voteOnChain(
        Number(election.contract_election_id),
        Number(candidate.contract_candidate_index),
      );

      await API.post("/votes", {
        electionId: id,
        voter: wallet,
        candidateId: candidate.id,
      });

      setHasVoted(true);
      await loadCandidates();
      alert("Vote thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi vote");
    }

    setLoading(false);
  };

  const handleAddCandidate = async () => {
    if (!isOwner) {
      alert("Chỉ creator mới được thêm ứng viên.");
      return;
    }

    if (!newCandidate.name.trim()) {
      alert("Vui lòng nhập tên ứng viên.");
      return;
    }

    if (!Number.isFinite(Number(election?.contract_election_id))) {
      alert("Election này chưa được đồng bộ blockchain.");
      return;
    }

    setAddingCandidate(true);

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
      alert("Thêm ứng viên thành công!");
    } catch (error) {
      console.error(error);
      alert("Không thể thêm ứng viên.");
    }

    setAddingCandidate(false);
  };

  const handleToggleHistory = async () => {
    if (!isOwner) {
      alert("Chỉ creator mới được xem lịch sử vote.");
      return;
    }

    if (showHistory) {
      setShowHistory(false);
      return;
    }

    try {
      const res = await API.get("/votes/history", {
        params: { electionId: id, wallet },
      });
      setHistory(res.data);
      setShowHistory(true);
    } catch (error) {
      console.error(error);
      alert("Không tải được lịch sử vote.");
    }
  };

  const totalVotes = candidates.reduce(
    (sum, candidate) => sum + Number(candidate.vote_count || 0),
    0,
  );

  return (
    <div className="vote-container">
      <div className="vote-shell">
        <div className="page-top">
          <div>
            <p className="page-label">Trang election</p>
            <h2 className="vote-title">{election?.title || "Bỏ phiếu"}</h2>
          </div>
          <Link to="/" className="back-home">
            Về trang chủ
          </Link>
        </div>

        {wallet ? (
          <p className="wallet">Ví: {formatWalletAddress(wallet)}</p>
        ) : (
          <p className="wallet">
            Vui lòng <Link to="/">kết nối MetaMask ở trang chủ</Link> trước khi vote.
          </p>
        )}

        {status ? (
          <div className="election-status-box">
            <span
              className={`status-badge ${
                status.isEnded
                  ? "status-ended"
                  : status.isUpcoming
                    ? "status-upcoming"
                    : "status-active"
              }`}
            >
              {status.label}
            </span>
            <p className="status-countdown">
              {status.isUpcoming ? "Bắt đầu sau: " : "Thời gian còn lại: "}
              {status.countdown}
            </p>
          </div>
        ) : null}

        {election ? (
          <img
            src={resolveImageUrlWithFallback(election.image, election.title)}
            alt={election.title}
            className="election-hero-image"
          />
        ) : null}

        {election ? (
          <div className="election-info-card">
            <h3 className="section-title">Thông tin election</h3>
            <div className="election-info-grid">
              <p><strong>Trạng thái:</strong> {status?.label || "Không rõ"}</p>
            </div>
            <p className="election-description">
              <strong>Mô tả:</strong> {election.description || "Chưa có mô tả cho election này."}
            </p>
          </div>
        ) : null}

        {!verified && (
          <div className="verify-box">
            <p className="verify-title">Nhập mã truy cập để vào election</p>
            <div className="verify-row">
              <input
                placeholder="Nhập mã vote"
                className="input"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
              <button className="verify-btn" onClick={handleVerify}>
                Xác nhận
              </button>
            </div>
          </div>
        )}

        {verified && (
          <>
            {isOwner ? (
              <div className="owner-tools">
                <div className="owner-card">
                  <h3 className="section-title">Quản trị election</h3>
                  <div className="owner-actions">
                    <button className="owner-btn" onClick={handleAddCandidate} disabled={addingCandidate || status?.isEnded}>
                      {addingCandidate ? "Đang thêm..." : "Thêm ứng viên"}
                    </button>
                    <button className="history-btn" onClick={handleToggleHistory}>
                      {showHistory ? "Ẩn lịch sử vote" : "Xem lịch sử ai đã vote"}
                    </button>
                    <Link to={`/manage/${id}`} className="manage-link">Mở trang quản lý</Link>
                  </div>
                  <div className="candidate-form">
                    <input
                      className="input full-width"
                      placeholder="Tên ứng viên mới"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate((current) => ({ ...current, name: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="input full-width"
                      value={newCandidate.birthDate}
                      onChange={(e) => setNewCandidate((current) => ({ ...current, birthDate: e.target.value }))}
                    />
                    <input
                      className="input full-width"
                      placeholder="Quê quán"
                      value={newCandidate.hometown}
                      onChange={(e) => setNewCandidate((current) => ({ ...current, hometown: e.target.value }))}
                    />
                    <textarea
                      className="input full-width"
                      placeholder="Mô tả ứng viên"
                      value={newCandidate.description}
                      onChange={(e) => setNewCandidate((current) => ({ ...current, description: e.target.value }))}
                    />
                    <input
                      type="file"
                      className="input full-width file-field"
                      onChange={(e) => setNewCandidate((current) => ({ ...current, file: e.target.files[0] || null }))}
                    />
                  </div>
                </div>

                {showHistory ? (
                  <div className="history-card">
                    <h3 className="section-title">Lịch sử vote</h3>
                    {history.length === 0 ? (
                      <p className="empty-state">Chưa có ai vote.</p>
                    ) : (
                      <div className="history-list">
                        {history.map((item) => (
                          <div key={item.id} className="history-item">
                            <p className="history-voter">{item.voter}</p>
                            <p className="history-choice">
                              Ứng viên: {item.candidate_name || `ID ${item.candidate_index}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="candidate-list">
              {candidates.length === 0 ? (
                <p className="empty-state">Election này chưa có ứng viên.</p>
              ) : (
                candidates.map((candidate) => {
                  const voteCount = Number(candidate.vote_count || 0);
                  const percent =
                    totalVotes === 0 ? 0 : ((voteCount / totalVotes) * 100).toFixed(1);

                  return (
                    <div key={candidate.id} className="candidate-card">
                      <img
                        src={resolveImageUrlWithFallback(candidate.image, candidate.name)}
                        alt={candidate.name}
                        className="candidate-image"
                      />

                      <p className="candidate-name">{candidate.name}</p>
                      <p className="candidate-meta">{voteCount} phiếu</p>
                      <p className="candidate-detail">
                        <strong>Ngày sinh:</strong> {formatCandidateBirthLabel(candidate.birth_date)}
                      </p>
                      <p className="candidate-detail">
                        <strong>Quê quán:</strong> {candidate.hometown || "Chưa cập nhật"}
                      </p>
                      <p className="candidate-detail">
                        <strong>Mô tả:</strong> {candidate.description || "Chưa có mô tả"}
                      </p>

                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${percent}%` }}
                        >
                          {percent}%
                        </div>
                      </div>

                      <button
                        disabled={
                          !wallet || hasVoted || loading || status?.isEnded || status?.isUpcoming
                        }
                        onClick={() => handleVote(candidate)}
                        className="vote-btn"
                      >
                        {!wallet
                          ? "Chưa kết nối ví"
                          : status?.isEnded
                            ? "Election đã kết thúc"
                            : status?.isUpcoming
                              ? "Chưa tới giờ vote"
                              : hasVoted
                                ? "Đã vote"
                                : loading
                                  ? "Đang xử lý..."
                                  : "Vote"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VotePage;
