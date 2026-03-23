const fs = require('fs');
const path = require('path');

const output = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'blockchain', 'tmp-solc-output.json'), 'utf8'));
const voting = output.contracts['Voting.sol'].Voting;
const artifact = {
  _format: 'manual-artifact',
  contractName: 'Voting',
  sourceName: 'contracts/Voting.sol',
  abi: voting.abi,
  bytecode: '0x' + voting.evm.bytecode.object,
};

fs.writeFileSync(path.join(process.cwd(), 'frontend', 'src', 'abi', 'Voting.json'), JSON.stringify(artifact, null, 2));
fs.writeFileSync(path.join(process.cwd(), 'backend', 'abi', 'Voting.json'), JSON.stringify(artifact, null, 2));
console.log('abi updated');
