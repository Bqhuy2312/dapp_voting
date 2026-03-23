import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { connectWallet } from "../services/blockchain";
import { getElectionStatus } from "../utils/electionStatus";
import "./Home.css";

function Home({ wallet, setWallet }) {
  const [elections, setElections] = useState([]);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now());
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    API.get("/elections")
      .then((res) => setElections(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleConnectWallet = async () => {
    try {
      const { address } = await connectWallet();
      setWallet(address);
    } catch (error) {
      console.error(error);
      alert("Khong the ket noi MetaMask. Vui long kiem tra vi cua ban.");
    }
  };

  const normalizedWallet = wallet.toLowerCase();
  const filtered = elections.filter((election) => {
    const matchesSearch = election.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const status = getElectionStatus(election.start_time, election.end_time, now);
    const matchesStatus =
      statusFilter === "all" ? true : status.phase === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Danh sach vote</h2>

        <div className="header-actions">
          {wallet ? (
            <span className="wallet-badge">
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </span>
          ) : (
            <button className="connect-btn" onClick={handleConnectWallet}>
              Connect MetaMask
            </button>
          )}

          <Link to="/create" className="create-btn">
            + Tao Vote
          </Link>
        </div>
      </div>

      <input
        type="text"
        placeholder="Tim kiem theo tieu de..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      <div className="filter-row">
        <button
          className={`filter-btn ${statusFilter === "all" ? "filter-btn-active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          Tat ca
        </button>
        <button
          className={`filter-btn ${statusFilter === "upcoming" ? "filter-btn-active" : ""}`}
          onClick={() => setStatusFilter("upcoming")}
        >
          Sap dien ra
        </button>
        <button
          className={`filter-btn ${statusFilter === "active" ? "filter-btn-active" : ""}`}
          onClick={() => setStatusFilter("active")}
        >
          Dang dien ra
        </button>
        <button
          className={`filter-btn ${statusFilter === "ended" ? "filter-btn-active" : ""}`}
          onClick={() => setStatusFilter("ended")}
        >
          Da ket thuc
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">Khong co ket qua</p>
      ) : (
        filtered.map((election) => {
          const isOwner =
            normalizedWallet &&
            String(election.creator || "").toLowerCase() === normalizedWallet;
          const status = getElectionStatus(
            election.start_time,
            election.end_time,
            now,
          );

          return (
            <div key={election.id} className="card">
              <div className="card-content">
                <h3 className="card-title">{election.title}</h3>
                {isOwner ? <span className="owner-badge">Election cua ban</span> : null}
                <div className="status-row">
                  <span
                    className={`status-badge ${status.isEnded ? "status-ended" : "status-active"}`}
                  >
                    {status.label}
                  </span>
                  <span className="countdown-text">
                    {status.isUpcoming ? "Bat dau sau: " : "Con lai: "}
                    {status.countdown}
                  </span>
                </div>
              </div>

              <div className="card-actions">
                {isOwner ? (
                  <Link to={`/manage/${election.id}`} className="manage-btn">
                    Quan ly
                  </Link>
                ) : null}

                <Link to={`/vote/${election.id}`} className="vote-btn">
                  {status.isEnded ? "Xem ket qua" : "Vote"}
                </Link>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Home;
