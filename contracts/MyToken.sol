// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Pausable, Ownable, ReentrancyGuard {
    uint256 public maxWalletAmount;
    uint256 private TAXFEE = 1;
    mapping(address => bool) excludedFromTax;
    bool private taxEnable;

    constructor() ERC20("MyToken", "MTK") {
      excludedFromTax[_msgSender()] = true;
      _mint(msg.sender, 1000000000 * 10**18);
      taxEnable = false;
      setMaxWalletPercentage(100);
    }

    function transfer(address recipient, uint256 amount)
        public
        override
        nonReentrant
        returns (bool)
    {
        if (excludedFromTax[_msgSender()] || !taxEnable) {
            _transfer(_msgSender(), recipient, amount);
        } else {
            uint256 taxAmount = (amount * TAXFEE) / 100;
            _transfer(_msgSender(), owner(), taxAmount);
            _transfer(_msgSender(), recipient, amount - taxAmount);
        }
        return true;
    }

    function getTax() public view returns (uint256 _actualTax) {
        return TAXFEE;
    }

    function setTax(uint256 _nextFee) external onlyOwner whenNotPaused {
        TAXFEE = _nextFee;
    }

    function setMaxWalletPercentage(uint256 percentage)
        public
        onlyOwner
        whenNotPaused
    {
        maxWalletAmount = (totalSupply() * percentage) / 10000;
    }

    function excludeFromTax(address _address) external onlyOwner whenNotPaused {
        excludedFromTax[_address] = true;
    }

    function includeInTax(address _address) external onlyOwner whenNotPaused {
        excludedFromTax[_address] = false;
    }

    function enableTax() public onlyOwner whenNotPaused {
        taxEnable = true;
    }

    function pause() public onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() public onlyOwner whenPaused {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        require(
            excludedFromTax[to] || balanceOf(to) + amount <= maxWalletAmount,
            "Max Wallet Limit Exceeds!"
        );
        super._beforeTokenTransfer(from, to, amount);
    }
}
