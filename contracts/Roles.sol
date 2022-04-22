// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract Roles is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {

    mapping(string => bytes32) private roles;
    mapping(address => bool) private privateSaleWhitelist;
    mapping(address => bool) private preSaleWhitelist;

    event eventRole(
        address indexed roleAddress,
        string description
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();

        //Roles
        roles["NFT_ADMIN_ROLE"] = keccak256("NFT_ADMIN_ROLE");
        roles["ARTIST_ROLE"] =  keccak256("ARTIST_ROLE");

        // Contracts
        roles["MISTERY_BOX_ADDRESS"] = keccak256("MISTERY_BOX_ADDRESS");
        roles["ICO_ADDRESS"] = keccak256("ICO_ADDRESS");

        //Sacar cuando movamos redeem a misterybox
        roles["NFT_ART_ADDRESS"] = keccak256("NFT_ART_ADDRESS");

        _setupRole(roles["NFT_ADMIN_ROLE"], msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     * - The contract must not be paused.
     *
     */
    function grantRole(bytes32 role, address account) public virtual override whenNotPaused() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(roles["NFT_ADMIN_ROLE"], msg.sender), "error in grant role");

        if(role == getHashRole("NFT_ADMIN_ROLE")){
            require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only Default admin can grant NFT Admin role");
        }

        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     * - The contract must not be paused.
     */
    function revokeRole(bytes32 role, address account) public virtual override whenNotPaused(){
        require(role != DEFAULT_ADMIN_ROLE, "Can't revoke default admin role");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(roles["NFT_ADMIN_ROLE"], msg.sender), "error in revoke role");
        
        if(hasRole(role, msg.sender) == hasRole(role, account)){
            require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Can't revoke same role");
        }
        
        _revokeRole(role, account);
    }

    /**
     *
     * @dev Create the hash of the string sent by parameter
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     * - The contract must not be paused.
     *
     */

    function createRole(string memory _roleName) external whenNotPaused() {
        require(hasRole(roles["DEFAULT_ADMIN_ROLE"], msg.sender), "error");
        roles[_roleName] = keccak256(abi.encodePacked(_roleName));
    }

    /**
     *
     * @dev Get the hash of the string sent by parameter
     *
     * The role must be previously included previously the mapping `roles` 
     *
     * To add a role in the mapping, use {createRole}.
     *
     */

    function getHashRole(string memory _roleName) public view returns(bytes32) {
        return roles[_roleName];
    }

    /**
     *
     * @dev Returns `true` if the `account` was added to the private sale
     *
     * To add an account to the private sale, use{addPrivateSaleWhitelist}
     *
     */

    function isPrivateWhitelisted(address _address) external view returns(bool){
        return privateSaleWhitelist[_address];
    }

    /**
     *
     * @dev Returns `true` if the `account` was added to the presale
     *
     * To add an account to the presale, use{addPreSaleWhitelist}
     *
     */

    function isPreSaleWhitelisted(address _address) external view returns(bool){
        return preSaleWhitelist[_address];
    }

    /**
     *
     * @dev Add an account to the private sale
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     * - The contract must not be paused.
     *
     */

    function addPrivateSaleWhitelist(address _address) external whenNotPaused() onlyRole(DEFAULT_ADMIN_ROLE)  {
        emit eventRole(_address,"Add account to private sale");
        privateSaleWhitelist[_address] = true;
    }

   /**
     *
     * @dev Add an account to the presale
     *
     * Requirements:
     *
     * - The caller must have ``role``'s nft art role.
     * - The contract must not be paused.
     *
     */

    function addPreSaleWhitelist(address _address) external whenNotPaused(){
        require(hasRole(roles["MISTERY_BOX_ADDRESS"], msg.sender), "Error, the address does not have mistery box address role"); 
        emit eventRole(_address,"Add account to presale");
        preSaleWhitelist[_address] = true;
    }

    /**
     *
     * @dev remove an account of the private sale
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     * - The contract must not be paused.
     *
     */

    function removePrivateSaleWhitelist(address _address) external whenNotPaused() onlyRole(DEFAULT_ADMIN_ROLE) {
        emit eventRole(_address,"remove account from private sale");
        privateSaleWhitelist[_address] = false;
    }

    /**
     *
     * @dev remove an account of the presale sale
     *
     * Requirements:
     *
     * - The caller must have ``role``'s nft art role.
     * - The contract must not be paused.
     *
     */


    function removePreSaleWhitelist(address _address) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        emit eventRole(_address,"remove account from presale");
        preSaleWhitelist[_address] = false;
    }

    /**
     *
     * @dev See {security/PausableUpgradeable-_pause}.
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     *
     */

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        //Debería ser la misma persona la que deploya el contrato de roles y el de misteryBox
        _pause();
    }
    
   /**
     *
     * @dev See {security/PausableUpgradeable-_unpause}.
     *
     * Requirements:
     *
     * - The caller must have ``role``'s admin role.
     *
     */

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        //Debería ser la misma persona la que deploya el contrato de roles y el de misteryBox
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenPaused
        override
    {} 
}
