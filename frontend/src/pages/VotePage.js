import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../services/api";
import { addCandidateOnChain, voteOnChain } from "../services/blockchain";
import { getElectionStatus } from "../utils/electionStatus";
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
  const [candidateName, setCandidateName] = useState("");
  const [candidateFile, setCandidateFile] = useState(null);
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
      alert("Sai ma hoac election khong ton tai!");
    }
  };

  const handleVote = async (candidate) => {
    if (!wallet) {
      alert("Vui long ket noi MetaMask o trang Home truoc.");
      return;
    }

    if (!Number.isFinite(Number(election?.contract_election_id))) {
      alert("Election nay chua duoc dong bo blockchain.");
      return;
    }

    if (!Number.isFinite(Number(candidate.contract_candidate_index))) {
      alert("Ung vien nay chua duoc dong bo blockchain.");
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
      alert("Vote thanh cong!");
    } catch (error) {
      console.error(error);
      alert("Loi vote");
    }

    setLoading(false);
  };

  const handleAddCandidate = async () => {
    if (!isOwner) {
      alert("Chi creator moi duoc them ung vien.");
      return;
    }

    if (!candidateName.trim()) {
      alert("Vui long nhap ten ung vien.");
      return;
    }

    if (!Number.isFinite(Number(election?.contract_election_id))) {
      alert("Election nay chua duoc dong bo blockchain.");
      return;
    }

    setAddingCandidate(true);

    try {
      let imageUrl = "";

      if (candidateFile) {
        const formData = new FormData();
        formData.append("image", candidateFile);

        const uploadRes = await API.post("/upload", formData);
        imageUrl = uploadRes.data.url;
      }

      const chainRes = await addCandidateOnChain(
        Number(election.contract_election_id),
        candidateName.trim(),
      );

      await API.post("/candidates", {
        electionId: id,
        name: candidateName.trim(),
        image: imageUrl,
        wallet,
        contractCandidateIndex: chainRes.contractCandidateIndex,
      });

      setCandidateName("");
      setCandidateFile(null);
      await loadCandidates();
      alert("Them ung vien thanh cong!");
    } catch (error) {
      console.error(error);
      alert("Khong the them ung vien.");
    }

    setAddingCandidate(false);
  };

  const handleToggleHistory = async () => {
    if (!isOwner) {
      alert("Chi creator moi duoc xem lich su vote.");
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
      alert("Khong tai duoc lich su vote.");
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
            <h2 className="vote-title">{election?.title || "Bo phieu"}</h2>
          </div>
          <Link to="/" className="back-home">
            Ve Home
          </Link>
        </div>

        {wallet ? (
          <p className="wallet">Vi: {wallet}</p>
        ) : (
          <p className="wallet">
            Vui long <Link to="/">ket noi MetaMask o trang Home</Link> truoc khi vote.
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
              {status.isUpcoming ? "Bat dau sau: " : "Thoi gian con lai: "}
              {status.countdown}
            </p>
          </div>
        ) : null}

        {!verified && (
          <div className="verify-box">
            <p className="verify-title">Nhap ma truy cap de vao election</p>
            <div className="verify-row">
              <input
                placeholder="Nhap ma vote"
                className="input"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
              <button className="verify-btn" onClick={handleVerify}>
                Xac nhan
              </button>
            </div>
          </div>
        )}

        {verified && (
          <>
            {isOwner ? (
              <div className="owner-tools">
                <div className="owner-card">
                  <h3 className="section-title">Quan tri election</h3>
                  <div className="owner-actions">
                    <button className="owner-btn" onClick={handleAddCandidate} disabled={addingCandidate || status?.isEnded}>
                      {addingCandidate ? "Dang them..." : "Them ung vien"}
                    </button>
                    <button className="history-btn" onClick={handleToggleHistory}>
                      {showHistory ? "An lich su vote" : "Xem lich su ai da vote"}
                    </button>
                    <Link to={`/manage/${id}`} className="manage-link">Mo trang quan ly</Link>
                  </div>
                  <div className="candidate-form">
                    <input
                      className="input full-width"
                      placeholder="Ten ung vien moi"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                    />
                    <input
                      type="file"
                      className="input full-width file-field"
                      onChange={(e) => setCandidateFile(e.target.files[0] || null)}
                    />
                  </div>
                </div>

                {showHistory ? (
                  <div className="history-card">
                    <h3 className="section-title">Lich su vote</h3>
                    {history.length === 0 ? (
                      <p className="empty-state">Chua co ai vote.</p>
                    ) : (
                      <div className="history-list">
                        {history.map((item) => (
                          <div key={item.id} className="history-item">
                            <p className="history-voter">{item.voter}</p>
                            <p className="history-choice">
                              Ung vien: {item.candidate_name || `ID ${item.candidate_index}`}
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
                <p className="empty-state">Election nay chua co ung vien.</p>
              ) : (
                candidates.map((candidate) => {
                  const voteCount = Number(candidate.vote_count || 0);
                  const percent =
                    totalVotes === 0 ? 0 : ((voteCount / totalVotes) * 100).toFixed(1);

                  return (
                    <div key={candidate.id} className="candidate-card">
                      {candidate.image ? (
                        <img
                          src={candidate.image}
                          alt={candidate.name}
                          className="candidate-image"
                        />
                      ) : null}

                      <p className="candidate-name">{candidate.name}</p>
                      <p className="candidate-meta">{voteCount} phieu</p>

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
                          ? "Chua ket noi vi"
                          : status?.isEnded
                            ? "Election da ket thuc"
                            : status?.isUpcoming
                              ? "Chua toi gio vote"
                          : hasVoted
                            ? "Da vote"
                            : loading
                                ? "Dang xu ly..."
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
