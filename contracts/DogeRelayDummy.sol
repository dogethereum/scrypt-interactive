pragma solidity ^0.4.4;
import './ClaimManager.sol';
import './IScryptDependent.sol';

contract DogeRelayDummy is IScryptDependent {

	ClaimManager claimManager;

    event ScryptSubmitted(bytes32 proposalId, bytes32 scryptHash, bytes data, address submitter);
	event ScryptVerified(bytes32 proposalId);
    event ScryptFailed(bytes32 proposalId);

	constructor(ClaimManager _claimManager) public {
		claimManager = _claimManager;
	}

	function scryptVerified(bytes32 proposalId) external {
		emit ScryptVerified(proposalId);
	}

	function verifyScrypt(bytes _plaintext, bytes32 _hash, bytes32 proposalId) public payable {
		ClaimManager(claimManager).checkScrypt.value(msg.value)(_plaintext, _hash, proposalId, this);
	}

    function scryptSubmitted(bytes32 _proposalId, bytes32 _scryptHash, bytes _data, address _submitter) external {
        emit ScryptSubmitted(_proposalId, _scryptHash, _data, _submitter);
    }

    function scryptFailed(bytes32 _proposalId) external {
        emit ScryptFailed(_proposalId);
    }
}
