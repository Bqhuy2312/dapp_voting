import { ethers } from "ethers";
import VotingABI from "../abi/Voting.json";

const CONTRACT_ADDRESS = "0x2132FB3dB97e9eb3d17E2EbC52f3f68073E260EB";

export const getConnectedWallet = async () => {
  if (!window.ethereum) {
    return "";
  }

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0] || "";
};

export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { signer, address };
};

export const getContract = async () => {
  const { signer } = await connectWallet();

  return new ethers.Contract(CONTRACT_ADDRESS, VotingABI.abi ?? VotingABI, signer);
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
