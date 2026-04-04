import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { useNotifications } from "../components/Notifications";
import { connectWallet } from "../services/blockchain";
import { getElectionStatus } from "../utils/electionStatus";
import { resolveImageUrlWithFallback } from "../utils/imageUrl";
import "./Home.css";

// Trang chủ hiển thị danh sách election, bộ lọc và trạng thái ví MetaMask.
function Home({ wallet, setWallet, onDisconnectWallet }) {
  const { notify } = useNotifications();
  const [elections, setElections] = useState([]);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now());
  const [statusFilter, setStatusFilter] = useState("all");
  // Lấy danh sách election để hiển thị ở trang chủ.
  useEffect(() => {
    API.get("/elections")
      .then((res) => setElections(res.data))
      .catch((err) => console.error(err));
  }, []);
  // Cập nhật thời gian hiện tại mỗi giây để countdown luôn đúng.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  // Kết nối MetaMask và lưu ví đang hoạt động vào state ứng dụng.
  const handleConnectWallet = async () => {
    try {
      const { address } = await connectWallet();
      localStorage.removeItem("walletDisconnected");
      setWallet(address);
    } catch (error) {
      console.error(error);
      notify("Không thể kết nối MetaMask. Vui lòng kiểm tra ví của bạn.", {
        type: "error",
        title: "Kết nối ví thất bại",
      });
    }
  };
// Chuẩn hóa địa chỉ ví để so sánh và lọc cuộc bầu cử
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
        <h2 className="title">Danh sách vote</h2>

        <div className="header-actions">
          {wallet ? (
            <>
              <span className="wallet-badge">
                {wallet.slice(0, 6)}...{wallet.slice(-4)}
              </span>
              <button className="disconnect-btn" onClick={onDisconnectWallet}>
                Đăng xuất
              </button>
            </>
          ) : (
            <button className="connect-btn" onClick={handleConnectWallet}>
              Kết nối MetaMask
            </button>
          )}

          <Link to="/create" className="create-btn">
            + Tạo vote
          </Link>
        </div>
      </div>

      <input
        type="text"
        placeholder="Tìm kiếm theo tiêu đề..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      <div className="filter-row">
        <button
          className={`filter-btn ${statusFilter === "all" ? "filter-btn-active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          Tất cả
        </button>
        <button
          className={`filter-btn ${statusFilter === "upcoming" ? "filter-btn-active" : ""}`}
          onClick={() => setStatusFilter("upcoming")}
        >
          Sắp diễn ra
        </button>
        <button
          className={`filter-btn ${statusFilter === "active" ? "filter-btn-active" : ""}`}
          onClick={() => setStatusFilter("active")}
        >
          Đang diễn ra
        </button>
        <button
          className={`filter-btn ${statusFilter === "ended" ? "filter-btn-active" : ""}`}
          onClick={() => setStatusFilter("ended")}
        >
          Đã kết thúc
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">Không có kết quả</p>
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
              <img
                src={resolveImageUrlWithFallback(election.image, election.title)}
                alt={election.title}
                className="card-image"
              />

              <div className="card-content">
                <h3 className="card-title">{election.title}</h3>
                {isOwner ? <span className="owner-badge">Election của bạn</span> : null}
                <div className="status-row">
                  <span
                    className={`status-badge ${status.isEnded ? "status-ended" : "status-active"}`}
                  >
                    {status.label}
                  </span>
                  <span className="countdown-text">
                    {status.isUpcoming ? "Bắt đầu sau: " : "Còn lại: "}
                    {status.countdown}
                  </span>
                </div>
              </div>

              <div className="card-actions">
                {isOwner ? (
                  <Link to={`/manage/${election.id}`} className="manage-btn">
                    Quản lý
                  </Link>
                ) : null}

                <Link to={`/vote/${election.id}`} className="vote-btn">
                  {status.isEnded ? "Xem kết quả" : "Vote"}
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
