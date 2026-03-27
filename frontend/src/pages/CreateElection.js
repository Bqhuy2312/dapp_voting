import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  createElectionOnChain,
  getReadableBlockchainError,
} from "../services/blockchain";
import { resolveImageUrlWithFallback } from "../utils/imageUrl";
import { formatWalletAddress } from "../utils/wallet";
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
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const handleCreate = async () => {
    if (!wallet) {
      setErrorMessage("Vui lòng kết nối MetaMask ở trang chủ trước khi tạo election.");
      return;
    }

    if (!data.title.trim() || !data.accessCode.trim() || !data.endTime) {
      setErrorMessage("Vui lòng nhập đầy đủ tiêu đề, mã truy cập và thời gian kết thúc.");
      return;
    }

    if (data.accessCode.trim().length < 3) {
      setErrorMessage("Mã truy cập phải có ít nhất 3 ký tự.");
      return;
    }

    const startTime = Date.now();
    const endTime = new Date(data.endTime).getTime();

    if (!Number.isFinite(endTime) || endTime <= startTime) {
      setErrorMessage("Thời gian kết thúc phải lớn hơn hiện tại.");
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

      await API.post("/elections", {
        ...data,
        accessCode: String(data.accessCode).trim(),
        image: imageUrl,
        creator: wallet,
        startTime,
        endTime,
        contractElectionId: chainRes.contractElectionId,
      });

      alert("Tạo election thành công");
      navigate("/");
    } catch (err) {
      console.error(err);
      setErrorMessage(`Lỗi tạo election: ${getReadableBlockchainError(err)}`);
    }

    setSubmitting(false);
  };

  return (
    <div className="create-container">
      <div className="create-card">
        <h2 className="create-title">Tạo cuộc vote</h2>

        {wallet ? <p className="wallet-text">Ví tạo: {formatWalletAddress(wallet)}</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <input
          placeholder="Tiêu đề"
          className="input"
          onChange={(e) => setData({ ...data, title: e.target.value })}
        />

        <input
          placeholder="Mô tả"
          className="input"
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />

        <input
          placeholder="Mã truy cập"
          className="input"
          value={data.accessCode}
          onChange={(e) => setData({ ...data, accessCode: e.target.value })}
        />

        <input
          type="file"
          className="file-input"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />

        <img
          src={previewUrl || resolveImageUrlWithFallback("", data.title || "Election")}
          alt={data.title || "Xem trước election"}
          className="create-image-preview"
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
          {submitting ? "Đang tạo..." : "Tạo vote"}
        </button>
      </div>
    </div>
  );
}

export default CreateElection;
