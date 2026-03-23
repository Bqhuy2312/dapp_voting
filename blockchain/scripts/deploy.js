async function main() {
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();

  await voting.waitForDeployment();

  console.log("Contract address:", voting.target);
}

main();