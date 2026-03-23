import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VotingModule", (m) => {
  // Khai báo contract Voting
  const voting = m.contract("Voting");

  // Trả về contract để Hardhat quản lý
  return { voting };
});