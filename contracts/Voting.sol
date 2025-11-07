// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title PhilippineVoting
 * @notice Simple contract prototype for recording votes.
 * - Voters may vote once per position per election session (enforced by hasVoted mapping)
 * - Voters may abstain (submit zero candidateIds)
 * - President / Vice President: single choice (0 or 1)
 * - Senator: up to 12 choices
 *
 * NOTE: This is a minimal educational example. Storing raw votes or voter
 * addresses on-chain has strong privacy implications. In production, use
 * cryptographic techniques (blinding, hashes, commitments) and off-chain
 * privacy-preserving mechanisms.
 */

contract PhilippineVoting {
    address public admin;

    // hasVoted[voter][position] => true if voted
    mapping(address => mapping(bytes32 => bool)) public hasVoted;

    // votesCount[position][candidateId] => count
    mapping(bytes32 => mapping(bytes32 => uint256)) public votesCount;

    // candidates by position (store ids as bytes32)
    mapping(bytes32 => bytes32[]) public candidatesByPosition;

    event CandidateAdded(bytes32 indexed position, bytes32 indexed candidateId);
    event Voted(address indexed voter, bytes32 indexed position, bytes32[] candidateIds);

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addCandidate(bytes32 position, bytes32 candidateId) external onlyAdmin {
        candidatesByPosition[position].push(candidateId);
        emit CandidateAdded(position, candidateId);
    }

    function vote(bytes32 position, bytes32[] calldata candidateIds) external {
        require(!hasVoted[msg.sender][position], "already voted for position");

        // allow abstain: candidateIds length can be 0
        if (_isSingleChoice(position)) {
            require(candidateIds.length <= 1, "single choice position");
        } else if (_isSenator(position)) {
            require(candidateIds.length <= 12, "up to 12 senators");
        }

        for (uint256 i = 0; i < candidateIds.length; i++) {
            votesCount[position][candidateIds[i]] += 1;
        }

        hasVoted[msg.sender][position] = true;
        emit Voted(msg.sender, position, candidateIds);
    }

    function getCandidates(bytes32 position) external view returns (bytes32[] memory) {
        return candidatesByPosition[position];
    }

    function _isSingleChoice(bytes32 position) internal pure returns (bool) {
        return (keccak256(abi.encodePacked(position)) == keccak256(abi.encodePacked("President")) ||
                keccak256(abi.encodePacked(position)) == keccak256(abi.encodePacked("Vice President")));
    }

    function _isSenator(bytes32 position) internal pure returns (bool) {
        return (keccak256(abi.encodePacked(position)) == keccak256(abi.encodePacked("Senator")));
    }
}
