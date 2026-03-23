const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  require("../abi/voting.json").abi,
  wallet
);

module.exports = contract;