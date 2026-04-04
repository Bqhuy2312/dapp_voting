const { ethers } = require("ethers");
require("dotenv").config();
// Kết nối đến blockchain thông qua RPC URL
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
// Tạo wallet từ private key và kết nối với provider
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
// Tạo instance hợp đồng
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  require("../abi/voting.json").abi,
  wallet
);

module.exports = contract;