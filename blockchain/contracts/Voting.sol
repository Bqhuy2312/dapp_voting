// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Voting {
    struct Candidate {
        string name;
        uint256 voteCount;
        bool active;
    }

    struct Election {
        address creator;
        uint256 startTime;
        uint256 endTime;
        bool ended;
        Candidate[] candidates;
        mapping(address => bool) hasVoted;
    }

    uint256 public electionCount;
    mapping(uint256 => Election) public elections;

    event ElectionCreated(uint256 electionId, address creator);
    event CandidateAdded(uint256 electionId, string name);
    event CandidateUpdated(uint256 electionId, uint256 candidateIndex, string name);
    event CandidateDeleted(uint256 electionId, uint256 candidateIndex);
    event Voted(uint256 electionId, address voter, uint256 candidateIndex);
    event ElectionEnded(uint256 electionId);

    function createElection(uint256 _startTime, uint256 _endTime) external {
        require(_endTime > _startTime, "Invalid time");

        electionCount++;

        Election storage e = elections[electionCount];
        e.creator = msg.sender;
        e.startTime = _startTime;
        e.endTime = _endTime;

        emit ElectionCreated(electionCount, msg.sender);
    }

    function addCandidate(uint256 electionId, string calldata name) external {
        Election storage e = elections[electionId];

        require(msg.sender == e.creator, "Not creator");
        require(block.timestamp < e.endTime && !e.ended, "Election ended");

        e.candidates.push(Candidate(name, 0, true));

        emit CandidateAdded(electionId, name);
    }

    function updateCandidate(uint256 electionId, uint256 candidateIndex, string calldata name) external {
        Election storage e = elections[electionId];

        require(msg.sender == e.creator, "Not creator");
        require(block.timestamp < e.endTime && !e.ended, "Election ended");
        require(candidateIndex < e.candidates.length, "Invalid candidate");
        require(e.candidates[candidateIndex].active, "Candidate deleted");

        e.candidates[candidateIndex].name = name;

        emit CandidateUpdated(electionId, candidateIndex, name);
    }

    function deleteCandidate(uint256 electionId, uint256 candidateIndex) external {
        Election storage e = elections[electionId];

        require(msg.sender == e.creator, "Not creator");
        require(block.timestamp < e.endTime && !e.ended, "Election ended");
        require(candidateIndex < e.candidates.length, "Invalid candidate");
        require(e.candidates[candidateIndex].active, "Candidate deleted");

        e.candidates[candidateIndex].active = false;

        emit CandidateDeleted(electionId, candidateIndex);
    }

    function vote(uint256 electionId, uint256 candidateIndex) external {
        Election storage e = elections[electionId];

        require(block.timestamp >= e.startTime, "Not started");
        require(block.timestamp <= e.endTime && !e.ended, "Ended");
        require(!e.hasVoted[msg.sender], "Already voted");
        require(candidateIndex < e.candidates.length, "Invalid candidate");
        require(e.candidates[candidateIndex].active, "Candidate deleted");

        e.candidates[candidateIndex].voteCount++;
        e.hasVoted[msg.sender] = true;

        emit Voted(electionId, msg.sender, candidateIndex);
    }

    function endElection(uint256 electionId) external {
        Election storage e = elections[electionId];

        require(msg.sender == e.creator, "Not creator");

        e.endTime = block.timestamp;
        e.ended = true;

        emit ElectionEnded(electionId);
    }

    function getCandidates(uint256 electionId)
        external
        view
        returns (Candidate[] memory)
    {
        return elections[electionId].candidates;
    }
}
