const fs = require('fs');
const path = require('path');
const { ethers } = require(path.join(process.cwd(), 'blockchain', 'node_modules', 'ethers'));

const envPath = path.join(process.cwd(), 'backend', '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1)];
    })
);

const artifact = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'backend', 'abi', 'Voting.json'), 'utf8'));
const provider = new ethers.JsonRpcProvider(env.RPC_URL);
const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

(async () => {
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(address);
})();
