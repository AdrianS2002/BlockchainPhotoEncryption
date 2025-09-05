// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract PhotoMailboxPayable {

    address public owner;
    address payable public treasury;
    bool public allowlistEnabled;
    mapping(address => bool) public isAllowed;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }
    uint256 public sendFeeWei;    
    uint256 public decryptFeeWei;  

    event PhotoSent(
        address indexed from,
        address indexed to,
        string  storageRef,
        bytes32 sha256sum,
        uint256 photoId
    );

    event DecryptPaid(
        address indexed user,
        uint256 indexed photoId,
        uint256 amount,
        uint64  timestamp
    );

    event FeesUpdated(uint256 sendFeeWei, uint256 decryptFeeWei);
    event TreasuryUpdated(address indexed newTreasury);
    event AllowlistToggled(bool enabled);
    event AllowlistSet(address indexed user, bool allowed);

    constructor(
        address payable _treasury,
        uint256 _sendFeeWei,
        uint256 _decryptFeeWei,
        address[] memory initialAllowed
    ) {
        owner = msg.sender;
        treasury = _treasury != address(0) ? _treasury : payable(msg.sender);
        sendFeeWei = _sendFeeWei;
        decryptFeeWei = _decryptFeeWei;

        if (initialAllowed.length > 0) {
            allowlistEnabled = true;
            for (uint256 i = 0; i < initialAllowed.length; i++) {
                if (initialAllowed[i] != address(0)) {
                    isAllowed[initialAllowed[i]] = true;
                    emit AllowlistSet(initialAllowed[i], true);
                }
            }
        }
    }
    function setFees(uint256 _sendFeeWei, uint256 _decryptFeeWei) external onlyOwner {
        sendFeeWei = _sendFeeWei;
        decryptFeeWei = _decryptFeeWei;
        emit FeesUpdated(_sendFeeWei, _decryptFeeWei);
    }

    function setTreasury(address payable _treasury) external onlyOwner {
        require(_treasury != address(0), "treasury=0");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setAllowlistEnabled(bool enabled) external onlyOwner {
        allowlistEnabled = enabled;
        emit AllowlistToggled(enabled);
    }

    function setAllowed(address user, bool allowed) external onlyOwner {
        isAllowed[user] = allowed;
        emit AllowlistSet(user, allowed);
    }

    struct Entry {
        address from;
        string  storageRef;
        bytes32 sha256sum;
        uint256 photoId;
        uint64  timestamp;
    }
    mapping(address => Entry[]) private _inbox;

    function getInboxCount(address user) external view returns (uint256) {
        return _inbox[user].length;
    }

    function getInboxSlice(
        address user,
        uint256 start,
        uint256 count
    ) external view returns (Entry[] memory out) {
        uint256 len = _inbox[user].length;
        if (start >= len) return out;
        uint256 end = start + count;
        if (end > len) end = len;
        uint256 n = end - start;
        out = new Entry[](n);
        for (uint256 i = 0; i < n; i++) {
            out[i] = _inbox[user][start + i];
        }
    }

    mapping(uint256 => mapping(address => bool)) private _unlocked;

    function hasUnlocked(uint256 photoId, address user) external view returns (bool) {
        return _unlocked[photoId][user];
    }

    function payToUnlock(uint256 photoId) external payable {
        require(decryptFeeWei == 0 || msg.value >= decryptFeeWei, "fee<decryptFeeWei");
        _unlocked[photoId][msg.sender] = true;
        emit DecryptPaid(msg.sender, photoId, msg.value, uint64(block.timestamp));
    }

    function sendPhoto(
        address to,
        string calldata storageRef,
        bytes32 sha256sum,
        uint256 photoId
    ) external payable {
        require(to != address(0), "to=0");
        if (allowlistEnabled) {
            require(isAllowed[msg.sender], "sender !allowed");
            require(isAllowed[to], "recipient !allowed");
        }
        require(sendFeeWei == 0 || msg.value >= sendFeeWei, "fee<sendFeeWei");

        emit PhotoSent(msg.sender, to, storageRef, sha256sum, photoId);

        _inbox[to].push(Entry({
            from: msg.sender,
            storageRef: storageRef,
            sha256sum: sha256sum,
            photoId: photoId,
            timestamp: uint64(block.timestamp)
        }));
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "insufficient");
        (bool ok, ) = treasury.call{value: amount}("");
        require(ok, "withdraw failed");
    }

    function withdrawAll() external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal == 0) return;
        (bool ok, ) = treasury.call{value: bal}("");
        require(ok, "withdraw failed");
    }

    receive() external payable {}
}
