import { ethers } from "ethers";
import VotingABI from "../abi/Voting.json";

// Địa chỉ contract Voting đã deploy để frontend gọi bằng ethers.
// Deployed Voting contract address used by the frontend via ethers.
const CONTRACT_ADDRESS = "0x5Eb10F4003fD1ebaBd7205547Ef02557bdc7Ec24";

// Lấy ví đã kết nối sẵn trong MetaMask mà không hiện popup xin quyền.
// Read the wallet already connected in MetaMask without opening a permission popup.
export const getConnectedWallet = async () => {
  if (!window.ethereum) {
    return "";
  }

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0] || "";
};

// Yêu cầu người dùng kết nối MetaMask và trả về signer đang hoạt động.
// Request MetaMask access and return the active signer.
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask chưa được cài đặt");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const selectedAddress = accounts[0] || "";

  if (!selectedAddress) {
    throw new Error("Không tìm thấy tài khoản nào trong MetaMask.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner(selectedAddress);
  const address = await signer.getAddress();

  return { signer, address };
};

// Tạo instance contract Voting từ signer MetaMask hiện tại.
// Build a Voting contract instance from the current MetaMask signer.
export const getContract = async () => {
  const { signer } = await connectWallet();
  const provider = signer.provider;

  if (!provider) {
    throw new Error("Không thể kết nối provider từ MetaMask.");
  }

  const contractCode = await provider.getCode(CONTRACT_ADDRESS);

  if (!contractCode || contractCode === "0x") {
    throw new Error(
      `Không tìm thấy contract Voting ở địa chỉ ${CONTRACT_ADDRESS}. Hãy kiểm tra lại network trong MetaMask.`,
    );
  }

  return new ethers.Contract(CONTRACT_ADDRESS, VotingABI.abi ?? VotingABI, signer);
};

// Chuyển lỗi kỹ thuật từ ethers/contract thành thông điệp dễ hiểu hơn.
// Convert low-level ethers/contract errors into friendlier UI messages.
export const getReadableBlockchainError = (error) => {
  const message =
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    "";

  if (message.includes("user rejected")) {
    return "Bạn đã hủy giao dịch trên MetaMask.";
  }

  if (message.includes("Invalid time")) {
    return "Thời gian kết thúc phải lớn hơn thời gian bắt đầu.";
  }

  if (message.includes("Not creator")) {
    return "Ví hiện tại không phải người tạo election này.";
  }

  if (message.includes("Election ended") || message.includes("Ended")) {
    return "Election này đã kết thúc nên không thể cập nhật trên blockchain.";
  }

  if (message.includes("Invalid candidate")) {
    return "Ứng viên này không tồn tại trên blockchain hoặc chỉ số ứng viên không khớp.";
  }

  if (message.includes("Candidate deleted")) {
    return "Ứng viên này đã bị xóa trên blockchain.";
  }

  if (message.includes("require(false)") || message.includes("execution reverted")) {
    return "Blockchain từ chối cập nhật. Có thể election đã kết thúc, ứng viên không tồn tại trên chain, hoặc dữ liệu DB không còn khớp với blockchain.";
  }

  if (message.includes("insufficient funds")) {
    return "Ví MetaMask không đủ phí gas để tạo election.";
  }

  return message || "Không xác định được lỗi từ blockchain.";
};

// Tìm một event cụ thể trong transaction receipt để lấy dữ liệu trả về.
// Find a named event inside the transaction receipt.
const parseLogByName = (contract, receipt, eventName) => {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === eventName) {
        return parsed;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  return null;
};

// Tạo election mới trên blockchain và lấy lại id election đã sinh ra.
// Create an election on-chain and recover the generated election id.
export const createElectionOnChain = async (startTime, endTime) => {
  const contract = await getContract();
  const tx = await contract.createElection(
    Math.floor(Number(startTime) / 1000),
    Math.floor(Number(endTime) / 1000),
  );
  const receipt = await tx.wait();
  const parsed = parseLogByName(contract, receipt, "ElectionCreated");

  if (parsed) {
    return { tx, contractElectionId: Number(parsed.args.electionId) };
  }

  const contractElectionId = Number(await contract.electionCount());
  return { tx, contractElectionId };
};

// Thêm ứng viên lên blockchain và trả về chỉ số ứng viên trong contract.
// Add a candidate on-chain and return its contract index.
export const addCandidateOnChain = async (contractElectionId, name) => {
  const contract = await getContract();
  const tx = await contract.addCandidate(contractElectionId, name);
  const receipt = await tx.wait();
  const candidates = await contract.getCandidates(contractElectionId);

  return {
    tx,
    receipt,
    contractCandidateIndex: candidates.length - 1,
  };
};

// Cập nhật tên ứng viên đã tồn tại trên blockchain.
// Update an existing candidate name on-chain.
export const updateCandidateOnChain = async (
  contractElectionId,
  contractCandidateIndex,
  name,
) => {
  const contract = await getContract();
  const tx = await contract.updateCandidate(
    contractElectionId,
    contractCandidateIndex,
    name,
  );

  await tx.wait();
  return { tx };
};

// Đánh dấu ứng viên là đã xóa trên blockchain.
// Delete a candidate on-chain.
export const deleteCandidateOnChain = async (
  contractElectionId,
  contractCandidateIndex,
) => {
  const contract = await getContract();
  const tx = await contract.deleteCandidate(
    contractElectionId,
    contractCandidateIndex,
  );

  await tx.wait();
  return { tx };
};

// Kết thúc election sớm trực tiếp trên smart contract.
// End an election early directly on the smart contract.
export const endElectionOnChain = async (contractElectionId) => {
  const contract = await getContract();
  const tx = await contract.endElection(contractElectionId);

  await tx.wait();
  return { tx };
};

// Gửi giao dịch vote cho ứng viên trên blockchain.
// Send the on-chain vote transaction for a candidate.
export const voteOnChain = async (contractElectionId, contractCandidateIndex) => {
  const contract = await getContract();
  const tx = await contract.vote(contractElectionId, contractCandidateIndex);

  await tx.wait();
  return { tx };
};
