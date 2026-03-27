import { ethers } from "ethers";
import VotingABI from "../abi/Voting.json";

const CONTRACT_ADDRESS = "0x5Eb10F4003fD1ebaBd7205547Ef02557bdc7Ec24";

export const getConnectedWallet = async () => {
  if (!window.ethereum) {
    return "";
  }

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0] || "";
};

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

export const endElectionOnChain = async (contractElectionId) => {
  const contract = await getContract();
  const tx = await contract.endElection(contractElectionId);

  await tx.wait();
  return { tx };
};

export const voteOnChain = async (contractElectionId, contractCandidateIndex) => {
  const contract = await getContract();
  const tx = await contract.vote(contractElectionId, contractCandidateIndex);

  await tx.wait();
  return { tx };
};
