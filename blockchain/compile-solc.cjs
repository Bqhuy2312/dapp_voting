const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const solcPath = path.join(process.env.LOCALAPPDATA, 'hardhat-nodejs', 'Cache', 'compilers-v3', 'windows-amd64', 'solc-windows-amd64-v0.8.28+commit.7893614a.exe');
const source = fs.readFileSync(path.join(process.cwd(), 'blockchain', 'contracts', 'Voting.sol'), 'utf8');
const input = {
  language: 'Solidity',
  sources: {
    'Voting.sol': { content: source },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

const result = spawnSync(solcPath, ['--standard-json'], {
  input: JSON.stringify(input),
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(result.status || 1);
}

fs.writeFileSync(path.join(process.cwd(), 'blockchain', 'tmp-solc-output.json'), result.stdout);
console.log('compiled');
