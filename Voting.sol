// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {

    struct Candidate {
        string name;
        uint voteCount;
    }

    address public immutable owner;

    Candidate[] public candidates;

    mapping(address => bool) public hasVoted;
    mapping(address => bool) public verifiedVoters;

    bool public votingActive;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(string[] memory candidateNames) {
        owner = msg.sender;
        votingActive = true;

        for (uint i = 0; i < candidateNames.length; i++) {
            candidates.push(Candidate(candidateNames[i], 0));
        }
    }

    function addCandidate(string memory name) public onlyOwner {
        require(bytes(name).length > 0, "Empty name");
        candidates.push(Candidate(name, 0));
    }

    /// @dev Only candidates with zero votes can be removed (keeps ballot indices stable for voters who already saw the list).
    function removeCandidate(uint256 index) public onlyOwner {
        require(index < candidates.length, "Invalid index");
        require(candidates[index].voteCount == 0, "Has votes");

        if (index != candidates.length - 1) {
            candidates[index] = candidates[candidates.length - 1];
        }
        candidates.pop();
    }

    function toggleVoting() public onlyOwner {
        votingActive = !votingActive;
    }

    // ✅ Anyone can verify (for project simplicity)
    function verifyVoter(address user) public {
        verifiedVoters[user] = true;
    }

    function vote(uint index) public {
        require(votingActive, "Voting closed");
        require(verifiedVoters[msg.sender], "Not verified");
        require(!hasVoted[msg.sender], "Already voted");

        hasVoted[msg.sender] = true;
        candidates[index].voteCount++;
    }

    function getCandidates() public view returns (Candidate[] memory) {
        return candidates;
    }
}