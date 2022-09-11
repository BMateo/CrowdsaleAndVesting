//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title Vesting contract interface
/// @notice Vesting schedule that save client information
/// @dev Explain to a developer any extra details
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

    function computeVestingScheduleIdForAddressAndIndex(
        address holder,
        uint256 index
    ) external pure returns (bytes32);

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

/// @title Roles interface
/// @dev ROles interface that allows the contract to administrate roles.
interface IRoles {
    function hasRole(bytes32 role, address account)
        external
        view
        returns (bool);

    function getHashRole(string calldata _roleName)
        external
        view
        returns (bytes32);
}

/// @title ERC20 interface
/// @dev ERC20 interface, used to call ERC20 functions.
interface ERC20 {
    function transfer(address to, uint256 value) external returns (bool);

    function balanceOf(address owner) external view returns (uint256);

    function decimals() external view returns (uint256);
}

/// @title Etapa1
/// @dev Contract that represents the first stage of IDO.
contract Crowdsale is
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    // VARIABLES *************

    /// @return wallet the address of collector wallet
    address payable public wallet;

    /// @return weiRaised the total amount of wei raised
    uint256 public weiRaised;

    /// @return openingTime the openingTime in timestamp
    uint256 public openingTime;

    /// @return closingTime the closingTime in timestamp
    uint256 public closingTime;

    /// @dev This value is setted in USD
    /// @return cap the max amount of USD that this contract can raise.
    uint256 public cap;

    /// @dev total amount of tokens sold.
    uint256 public tokenSold;

    /// @dev the amount of tokens receive per ether. tokens/ether
    uint256 public rate;

    /// @dev return the amount of wei invested by an address.
    /// @return uint256
    mapping(address => uint256) public alreadyInvested;

    /// @return lockTime the lockTime in timestamp
    uint256 public lockTime;

    /// @return vestingTime the vestingTime in timestamp
    uint256 public vestingTime;

    /// @return minInvestment the minimum amount of USD to invest
    uint256 public minInvestment;

    /// @return maxInvesment the maximum amount of USD to invest
    uint256 public maxInvestment;

    /// @notice Instance of the vesting contract
    /// @dev Used to create vesting shedules, this contract should have ICO_ADDRESS role
    /// @return vestingContract
    IVesting public vestingContract;

    /// @notice Instance of the roles contract
    /// @dev Used to manage access control in the application
    /// @return rolesContract
    IRoles public rolesContract;

    /**
     * @dev Reverts if not in crowdsale time range.
     */
    modifier onlyWhileOpen() {
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
    event TokensPurchased(
        address indexed purchaser,
        address indexed beneficiary,
        uint256 value,
        uint256 amount
    );

    /**
     * Event for crowdsale extending
     * @param newClosingTime new closing time
     * @param prevClosingTime old closing time
     */
    event TimedCrowdsaleExtended(
        uint256 prevClosingTime,
        uint256 newClosingTime
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address payable _wallet,
        uint256 _openingTime,
        uint256 _closingTime,
        uint256 _lockTime,
        uint256 _vestingTime,
        uint256 _minInvestment,
        uint256 _maxInvestment,
        uint256 _cap,
        uint256 _rate,
        address _vestingContract,
        address _rolesContract
    ) public initializer {
        require(_wallet != address(0), "Crowdsale: wallet is the zero address");
        require(
            _vestingContract != address(0),
            "Crowdsale: vesting contract is the zero address"
        );
        require(
            _openingTime >= block.timestamp,
            "TimedCrowdsale: opening time is before current time"
        );
        require(
            _closingTime > _openingTime,
            "TimedCrowdsale: opening time is not before closing time"
        );
        require(_cap > 0, "CappedCrowdsale: cap is 0");
        vestingContract = IVesting(_vestingContract);
        rolesContract = IRoles(_rolesContract);
        cap = _cap;
        wallet = _wallet;
        openingTime = _openingTime;
        closingTime = _closingTime;
        lockTime = _lockTime;
        vestingTime = _vestingTime;
        minInvestment = _minInvestment;
        maxInvestment = _maxInvestment;
        rate = _rate;
    }

    receive() external payable {}

    // FUNCIONES *************

    /**
     * @return true if the crowdsale is open, false otherwise.
     */
    function isOpen() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp >= openingTime && block.timestamp <= closingTime;
    }

    /**
     * @dev Checks whether the period in which the crowdsale is open has already elapsed.
     * @return Whether crowdsale period has elapsed
     */
    function hasClosed() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp > closingTime;
    }

    /**
     * @dev Checks whether the cap has been reached.
     * @return Whether the cap was reached
     */
    function capReached() public view returns (bool) {
        return weiRaised >= cap;
    }

    /// @dev Return the amount of tokens sold by this stage
    /// @return tokenSold
    function tokensSold() public view returns (uint256) {
        return tokenSold;
    }

    /**
     * @dev low level token purchase ***DO NOT OVERRIDE***
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     * @param beneficiary Recipient of the token purchase
     */
    function buyTokens(address beneficiary)
        public
        payable
        nonReentrant
        whenNotPaused
    {
        uint256 weiAmount = msg.value;
        _preValidatePurchase(beneficiary, weiAmount);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(weiAmount);

        // update state
        weiRaised += weiAmount;

        _processPurchase(beneficiary, tokens);
        emit TokensPurchased(_msgSender(), beneficiary, weiAmount, tokens);

        _updatePurchasingState(beneficiary, weiAmount);
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
    function _preValidatePurchase(address beneficiary, uint256 weiAmount)
        internal
        view
        onlyWhileOpen
    {
        require(
            beneficiary != address(0),
            "Crowdsale: beneficiary is the zero address"
        );
        require(weiAmount != 0, "Crowdsale: weiAmount is 0");
    }

    /**
     * @dev Executed when a purchase has been validated and is ready to be executed. Doesn't necessarily emit/send
     * tokens.
     * @param beneficiary Address receiving the tokens
     * @param tokenAmount Number of tokens to be purchased
     */
    function _processPurchase(address beneficiary, uint256 tokenAmount)
        internal
    {
        _updateScheduleAmount(beneficiary, tokenAmount);
        tokenSold += tokenAmount;
    }

    function _updatePurchasingState(address beneficiary, uint256 weiAmount)
        internal
    {
        uint256 _existingContribution = alreadyInvested[beneficiary];
        uint256 _newContribution = _existingContribution + weiAmount;
        require(
            _newContribution >= minInvestment &&
                _newContribution <= maxInvestment,
            "Investment out of bonds"
        );

        alreadyInvested[beneficiary] += weiAmount;
        require(!this.capReached(), "The cap is exceeded");
    }

    /**
     * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid
     * conditions are not met.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _postValidatePurchase(address beneficiary, uint256 weiAmount)
        internal
        view
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 weiAmount)
        internal
        view
        returns (uint256)
    {
        return (weiAmount * rate) / 10**18;
    }

    //create or update a vesting schedule
    function _updateScheduleAmount(address _beneficiary, uint256 _amount)
        internal
    {
        uint256 beneficiaryCount = vestingContract
            .getVestingSchedulesCountByBeneficiary(_beneficiary);
        if (beneficiaryCount == 0) {
            vestingContract.createVestingSchedule(
                _beneficiary,
                lockTime,
                vestingTime,
                1,
                true,
                _amount
            );
            return;
        } else {
            vestingContract.addTotalAmount(
                _amount,
                vestingContract.computeVestingScheduleIdForAddressAndIndex(
                    _beneficiary,
                    1
                )
            );
        }
    }

    function _extendTime(uint256 newClosingTime) internal {
        require(!hasClosed(), "TimedCrowdsale: already closed");
        // solhint-disable-next-line max-line-length
        require(
            newClosingTime > closingTime,
            "TimedCrowdsale: new closing time is before current closing time"
        );

        emit TimedCrowdsaleExtended(closingTime, newClosingTime);
        closingTime = newClosingTime;
    }

    /**
     * @dev Extend crowdsale.
     * @param newClosingTime Crowdsale closing time
     */
    function extendTime(uint256 newClosingTime)
        external
        onlyOwner
        whenNotPaused
    {
        _extendTime(newClosingTime);
    }

    /// @dev Function to withdraw Matic from this contract
    function withdraw() external onlyOwner {
        require(address(this).balance > 0, "Contract has no balance");
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Forward funds fail");
    }

    //Funcion para pausar
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    //Funcion para despausar
    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

    /**
     *
     * @dev See {utils/UUPSUpgradeable-_authorizeUpgrade}.
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     * - The contract must be paused
     *
     */

    function _authorizeUpgrade(address _newImplementation)
        internal
        override
        whenPaused
        onlyOwner
    {}

    /**
     *
     * @dev See {utils/UUPSUpgradeable-upgradeTo}.
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     * - The contract must be paused
     *
     */

    function upgradeTo(address _newImplementation)
        external
        override
        onlyOwner
        whenPaused
    {
        _authorizeUpgrade(_newImplementation);
        _upgradeToAndCallUUPS(_newImplementation, new bytes(0), false);
    }

    /**
     *
     * @dev See {utils/UUPSUpgradeable-upgradeToAndCall}.
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     * - The contract must be paused
     *
     */

    function upgradeToAndCall(address _newImplementation, bytes memory _data)
        external
        payable
        override
        onlyOwner
        whenPaused
    {
        _authorizeUpgrade(_newImplementation);
        _upgradeToAndCallUUPS(_newImplementation, _data, true);
    }
}
