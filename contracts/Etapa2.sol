//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IVesting {
    function createVestingSchedule(
        address _beneficiary,
        uint256 _cliff,
        uint256 _duration,
        uint256 _slicePeriodSeconds,
        bool _revocable,
        uint256 _amount
    ) external;

    function getVestingSchedulesCountByBeneficiary(address _beneficiary)
        external
        view
        returns (uint256);

    function getVestingScheduleByAddressAndIndex(address holder, uint256 index)
        external
        view
        returns (VestingSchedule memory);

    function addTotalAmount(uint256 _amount, bytes32 _scheduleId) external;

    function computeVestingScheduleIdForAddressAndIndex(address holder, uint256 index) external pure returns(bytes32);

    struct VestingSchedule {
        bool initialized;
        // beneficiary of tokens after they are released
        address beneficiary;
        // cliff period in seconds
        uint256 cliff;
        // duration of the vesting period in seconds
        uint256 duration;
        // duration of a slice period for the vesting in seconds
        uint256 slicePeriodSeconds;
        // whether or not the vesting is revocable
        bool revocable;
        // total amount of tokens to be released at the end of the vesting
        uint256 amountTotal;
        // amount of tokens released
        uint256 released;
        // whether or not the vesting has been revoked
        bool revoked;
        // address of the contract that create schedule
        address creator;
    }
}

interface IRoles {
    function hasRole(bytes32 role, address account)
        external
        view
        returns (bool);

    function getHashRole(string calldata _roleName) external view returns (bytes32);
}

interface IOracle {
    function latestAnswer() external view returns(uint256);
    function decimals() external view returns(uint256);
}

 interface UniswapV2Router02 {
     function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
}

 interface ERC20 {
     function transfer(address to, uint value) external returns (bool);
     function balanceOf(address owner) external view returns (uint);
     function decimals() external view returns(uint256);
}

contract Etapa2 is Ownable, ReentrancyGuard, Pausable {

    // VARIABLES *************
    address payable private _wallet;
    uint256 private _rate;
    // Amount of wei raised
    uint256 private _weiRaised;
    uint256 private _openingTime;
    uint256 private _closingTime;
    uint256 private _cap;
    uint256 private tokenSold;
    mapping(address => uint256) public alreadyInvested;

    uint256 public constant lockTime = 2000 seconds;
    uint256 public constant vestingTime = 4000 seconds;
    uint256 public  minInvestment = 100000000000000;// 0.0001 matic
    uint256 public  maxInvestment = 100000000000000000000; // 1 matic
    uint256 public tokenPriceUSD; //200000000000000000
    //slipagge porcentual se divide por 1000, 1 decimal, el 100% es 1000
    uint256 private slippagePorcentual = 10; //1%
    //oracle address
    address public  oracleAddress = 0xAB594600376Ec9fD91F8e885dADF0CE036862dE0; //matic/usd
    address public  TOKENADDRESS = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174; //usdc
    address public constant MATIC = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270; //WMATIC
    address public  ROUTER = 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff; //QUICKSWAP ROUTER

    IOracle private _oracle;
    IVesting private _vestingContract;
    IRoles private _rolesContract; 
    UniswapV2Router02 private _router;

    /**
     * @dev Reverts if not in crowdsale time range.
     */
    modifier onlyWhileOpen {
        require(isOpen(), "TimedCrowdsale: not open");
        _;
    }

    // EVENTOS ***************
        /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    /**
     * Event for crowdsale extending
     * @param newClosingTime new closing time
     * @param prevClosingTime old closing time
     */
    event TimedCrowdsaleExtended(uint256 prevClosingTime, uint256 newClosingTime);

    // FUNCIONES *************
    constructor(address payable wallet,uint256 openingTime, uint256 closingTime, uint256 cap, uint256 initialPrice,address vestingContract, address rolesContract) {
        require(wallet != address(0), "Crowdsale: wallet is the zero address");
        require(vestingContract != address(0), "Crowdsale: vesting contract is the zero address");
        require(openingTime >= block.timestamp, "TimedCrowdsale: opening time is before current time");
        require(closingTime > openingTime, "TimedCrowdsale: opening time is not before closing time");
        require(cap > 0, "CappedCrowdsale: cap is 0");
        _vestingContract = IVesting(vestingContract);
        _rolesContract = IRoles(rolesContract);
        tokenPriceUSD = initialPrice;
        _oracle = IOracle(oracleAddress);
        _router = UniswapV2Router02(ROUTER);
        _cap = cap;
        _wallet = wallet;
        _openingTime = openingTime;
        _closingTime = closingTime;
    }

    receive() external payable {}
    

    /**
     * @return the address where funds are collected.
     */
    function wallet() public view returns (address payable) {
        return _wallet;
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() public view returns (uint256) {
        //maticPrice in 8 decimals, shift to 18 decimals
        uint256 maticPrice = _oracle.latestAnswer() * 10**_oracleFactor(); 
        //represent the result in weis
        return maticPrice * 10**18 / tokenPriceUSD;
    }

    /**
     * @return the amount of wei raised.
     */
    function weiRaised() public view returns (uint256) {
        return _weiRaised;
    }

    /**
     * @return the crowdsale opening time.
     */
    function openingTime() public view returns (uint256) {
        return _openingTime;
    }

    /**
     * @return the crowdsale closing time.
     */
    function closingTime() public view returns (uint256) {
        return _closingTime;
    }

    /**
     * @return true if the crowdsale is open, false otherwise.
     */
    function isOpen() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp >= _openingTime && block.timestamp <= _closingTime;
    }

    /**
     * @dev Checks whether the period in which the crowdsale is open has already elapsed.
     * @return Whether crowdsale period has elapsed
     */
    function hasClosed() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp > _closingTime;
    }

    /**
     * @return the cap of the crowdsale.
     */
    function cap() public view returns (uint256) {
        return _cap;
    }

    /**
     * @dev Checks whether the cap has been reached.
     * @return Whether the cap was reached
     */
    function capReached() public view returns (bool) {
        return weiRaised() >= _cap;
    }

    function tokensSold() public view returns (uint256){
        return tokenSold;
    }

    /**
     * @dev low level token purchase ***DO NOT OVERRIDE***
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     * @param beneficiary Recipient of the token purchase
     */
    function buyTokens(address beneficiary) public nonReentrant whenNotPaused payable {
        uint256 weiAmount = msg.value;
        _preValidatePurchase(beneficiary, weiAmount);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(weiAmount);

        // update state
        _weiRaised += weiAmount;

        _processPurchase(beneficiary, tokens);
        emit TokensPurchased(_msgSender(), beneficiary, weiAmount, tokens);

        _updatePurchasingState(beneficiary, weiAmount);

        _forwardFunds();
        _postValidatePurchase(beneficiary, weiAmount);
    }

    /**
     * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
     * Use `super` in contracts that inherit from Crowdsale to extend their validations.
     * Example from CappedCrowdsale.sol's _preValidatePurchase method:
     *     super._preValidatePurchase(beneficiary, weiAmount);
     *     require(weiRaised().add(weiAmount) <= cap);
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal onlyWhileOpen view {
        require(_rolesContract.hasRole(_rolesContract.getHashRole("PRESALE_WHITELIST"),msg.sender),"Address not whitelisted" );
        require(beneficiary != address(0), "Crowdsale: beneficiary is the zero address");
        require(weiAmount != 0, "Crowdsale: weiAmount is 0");
        require(weiRaised() + weiAmount  <= _cap, "CappedCrowdsale: cap exceeded");
        uint256 _existingContribution = alreadyInvested[beneficiary];
        uint256 _newContribution = _existingContribution + weiAmount;
        require(_newContribution >= minInvestment && _newContribution <= maxInvestment);
    }

    /**
     * @dev Executed when a purchase has been validated and is ready to be executed. Doesn't necessarily emit/send
     * tokens.
     * @param beneficiary Address receiving the tokens
     * @param tokenAmount Number of tokens to be purchased
     */
    function _processPurchase(address beneficiary, uint256 tokenAmount) internal {
        _updateScheduleAmount(beneficiary, tokenAmount);
        tokenSold += tokenAmount;
    }

    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
        alreadyInvested[beneficiary] += weiAmount;
        //maticToUsdPrice in 8 decimals, shift to 18 decimals
        uint256 maticToTokenPrice =  _oracle.latestAnswer() * 10**_oracleFactor();
        //usdcAmount is shifted to 6 decimals
        uint256 tokenOutAmount = maticToTokenPrice * weiAmount /10**30;
        //uint256 tokenOutAmount =  (maticToTokenPrice * 10**18 /weiAmount)/ 10**_tokenFactor();
        //Amount with a % substracted
        uint256 amountOutMin = tokenOutAmount - tokenOutAmount * slippagePorcentual/1000;
        //path for the router
        address[] memory path = new address[](2);
        path[1] = TOKENADDRESS;
        path[0] = MATIC;
        //amount put is in 6 decimals
        uint256[] memory amounts = _router.swapExactETHForTokens{value:weiAmount}(amountOutMin,path, address(this), block.timestamp);    
    }

    function setSlippage(uint256 newSlippage) external onlyOwner {
        slippagePorcentual = newSlippage;
    }
    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        //transfer USDC tokens swapped to the collector wallet
        bool success = ERC20(TOKENADDRESS).transfer(_wallet,ERC20(TOKENADDRESS).balanceOf(address(this)));
        require(success, "Forward funds fail");
    }

    /**
     * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid
     * conditions are not met.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _postValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        // solhint-disable-previous-line no-empty-blocks

    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        return weiAmount * rate() / 10**18;
    }

    function _updateScheduleAmount(address _beneficiary, uint256 _amount) internal  {
        uint256 beneficiaryCount = _vestingContract
            .getVestingSchedulesCountByBeneficiary(_beneficiary);
        if (beneficiaryCount == 0) {
            _vestingContract.createVestingSchedule(
                _beneficiary,
                lockTime,
                vestingTime,
                1,
                true,
                _amount
            );
            return;
        } else {
            for(uint i=0; i < beneficiaryCount; i++){
                IVesting.VestingSchedule memory vesting = _vestingContract.getVestingScheduleByAddressAndIndex(_beneficiary,i);
                if(vesting.creator == address(this)){
                    _vestingContract.addTotalAmount(_amount,_vestingContract.computeVestingScheduleIdForAddressAndIndex(_beneficiary, i));
                    return;
                }
            }
          _vestingContract.createVestingSchedule(
                _beneficiary,
                lockTime,
                vestingTime,
                1,
                true,
                _amount
            );
            } 
    }

    /**
     * @dev Extend crowdsale.
     * @param newClosingTime Crowdsale closing time
     */
    function _extendTime(uint256 newClosingTime) internal {
        require(!hasClosed(), "TimedCrowdsale: already closed");
        // solhint-disable-next-line max-line-length
        require(newClosingTime > _closingTime, "TimedCrowdsale: new closing time is before current closing time");

        emit TimedCrowdsaleExtended(_closingTime, newClosingTime);
        _closingTime = newClosingTime;
    }

    function extendTime (uint256 newClosingTime) external onlyOwner whenNotPaused {
        _extendTime(newClosingTime);
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

    function withdraw() external onlyOwner {
        require(address(this).balance > 0, "Contract has no balances");
        (bool success,) = msg.sender.call{value: address(this).balance}("");
        require(success, "Forward funds fail");
    }

    function _tokenFactor() internal view returns(uint256){
        if(ERC20(TOKENADDRESS).decimals() == 18){
            return 0;
        } else {
            return 18 - ERC20(TOKENADDRESS).decimals();
        }
    }

    function _oracleFactor() internal view returns(uint256){
        if(_oracle.decimals() == 18){
            return 0;
        } else {
            return 18 - _oracle.decimals();
        }
    }

    function setMinInvesment(uint256 _minInvesment) external onlyOwner {
        minInvestment = _minInvesment;
    }

    function setMaxInvesment(uint256 _maxInvesment) external onlyOwner {
        maxInvestment = _maxInvesment;
    }
}
