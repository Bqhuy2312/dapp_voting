import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { createElectionOnChain } from "../services/blockchain";
import "./CreateElection.css";

function CreateElection({ wallet }) {
  const navigate = useNavigate();
  const [data, setData] = useState({
    title: "",
    description: "",
    accessCode: "",
    endTime: "",
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCreate = async () => {
    if (!wallet) {
      setErrorMessage("Vui long ket noi MetaMask o trang Home truoc khi tao election.");
      return;
    }

    if (!data.title.trim() || !data.accessCode.trim() || !data.endTime) {
      setErrorMessage("Vui long nhap day du tieu de, ma truy cap va thoi gian ket thuc.");
      return;
    }

    if (data.accessCode.trim().length < 3) {
      setErrorMessage("Ma truy cap phai co it nhat 3 ky tu.");
      return;
    }

    const startTime = Date.now();
    const endTime = new Date(data.endTime).getTime();

    if (!Number.isFinite(endTime) || endTime <= startTime) {
      setErrorMessage("Thoi gian ket thuc phai lon hon hien tai.");
      return;
    }

    setErrorMessage("");
    setSubmitting(true);

    try {
      let imageUrl = "";

      if (file) {
        const formData = new FormData();
        formData.append("image", file);

        const uploadRes = await API.post("/upload", formData);
        imageUrl = uploadRes.data.url;
      }

      const chainRes = await createElectionOnChain(startTime, endTime);

      const res = await API.post("/elections", {
        ...data,
        accessCode: String(data.accessCode).trim(),
        image: imageUrl,
        creator: wallet,
        startTime,
        endTime,
        contractElectionId: chainRes.contractElectionId,
      });

      alert("Tao election thanh cong");
      navigate(`/manage/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Loi tao election. Vui long kiem tra lai thong tin va MetaMask.");
    }

    setSubmitting(false);
  };

  return (
    <div className="create-container">
      <div className="create-card">
        <h2 className="create-title">Tao cuoc vote</h2>

        {wallet ? <p className="wallet-text">Vi tao: {wallet}</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <input
          placeholder="Tieu de"
          className="input"
          onChange={(e) => setData({ ...data, title: e.target.value })}
        />

        <input
          placeholder="Mo ta"
          className="input"
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />

        <input
          placeholder="Ma truy cap"
          className="input"
          value={data.accessCode}
          onChange={(e) => setData({ ...data, accessCode: e.target.value })}
        />

        <input
          type="file"
          className="file-input"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />

        <input
          type="datetime-local"
          className="input"
          onChange={(e) => setData({ ...data, endTime: e.target.value })}
        />

        <button
          onClick={handleCreate}
          className="submit-btn"
          disabled={!wallet || submitting}
        >
          {submitting ? "Dang tao..." : "Tao Vote"}
        </button>
      </div>
    </div>
  );
}

export default CreateElection;
