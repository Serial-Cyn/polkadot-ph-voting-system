// Polkadot / EVM integration helper (stub / prototype)
// This module demonstrates two approaches:
//  - Calling a Substrate-based chain via @polkadot/api (left as notes)
//  - Calling a Solidity contract on an EVM-compatible parachain using ethers.js (optional)
//
// By default this will simulate a tx hash. If you deploy the `contracts/Voting.sol`
// contract to an EVM-compatible parachain (e.g., Moonbeam / Moonriver) and provide
// the environment variables CONTRACT_ADDRESS, ETH_PROVIDER, and SIGNER_PRIVATE_KEY,
// the module will attempt to call the contract via ethers.

// Try to import ethers if available (optional).
let ethers: any = null;
try {
  // dynamic require to avoid bundling errors if ethers is not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ethers = require('ethers');
} catch (e) {
  // ethers not installed — contract calls will be simulated.
}

export async function submitVoteOnChain(payload: {
  voterId: string;
  position: string;
  candidateIds: string[];
}) {
  // If an ethers provider and contract address are configured, attempt to call the contract.
  const providerUrl = typeof process !== 'undefined' ? process.env.CONTRACT_PROVIDER_URL || process.env.ETH_PROVIDER : undefined;
  const contractAddress = typeof process !== 'undefined' ? process.env.CONTRACT_ADDRESS : undefined;
  const signerKey = typeof process !== 'undefined' ? process.env.SIGNER_PRIVATE_KEY : undefined;

  if (ethers && providerUrl && contractAddress && signerKey) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(providerUrl);
      const wallet = new ethers.Wallet(signerKey, provider);
      // Minimal ABI for the Voting contract methods we need.
      const abi = [
        'function vote(bytes32 position, bytes32[] calldata candidateIds) external',
      ];
      const contract = new ethers.Contract(contractAddress, abi, wallet);

      // Convert string position and candidate ids to bytes32
      const toBytes32 = (s: string) => ethers.utils.formatBytes32String(s);
      const pos = toBytes32(payload.position);
      const cids = payload.candidateIds.map((c) => toBytes32(c));

      const tx = await contract.vote(pos, cids, { gasLimit: 500000 });
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (err) {
      // If contract call fails, fall back to simulated hash but surface the error in logs.
      // In production, propagate or handle appropriately.
      // eslint-disable-next-line no-console
      console.error('Contract call failed:', err);
    }
  }

  // Fallback: simulate network delay and return a fake tx hash
  await new Promise((r) => setTimeout(r, 300));
  const txHash = `0x${Math.floor(Math.random() * 1e16).toString(16).padStart(16, '0')}`;
  return txHash;
}

export const POLKADOT_INTEGRATION_NOTES = `Notes:
1) To interact with Substrate-based chains use @polkadot/api and build an extrinsic.
2) To interact with EVM-compatible parachains deploy contracts/Voting.sol and set CONTRACT_PROVIDER_URL, CONTRACT_ADDRESS, and SIGNER_PRIVATE_KEY.
3) This file currently attempts an ethers.js call if configuration is present, otherwise returns a simulated tx hash.`;
