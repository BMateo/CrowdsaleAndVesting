const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const timeMachine = require('ganache-time-traveler');
const BigNumber = require('bignumber.js');
const { verifyTypedData } = require("ethers/lib/utils");
const abi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "subtractedValue",
          "type": "uint256"
        }
      ],
      "name": "decreaseAllowance",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "enableTax",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_address",
          "type": "address"
        }
      ],
      "name": "excludeFromTax",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTax",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "_actualTax",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_address",
          "type": "address"
        }
      ],
      "name": "includeInTax",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "addedValue",
          "type": "uint256"
        }
      ],
      "name": "increaseAllowance",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maxWalletAmount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        }
      ],
      "name": "setMaxWalletPercentage",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_nextFee",
          "type": "uint256"
        }
      ],
      "name": "setTax",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
/* ********** FUNCIONES A TESTEAR **********
**Crowdsale** 
function setSlippage(uint256 newSlippage) external onlyOwner.
Variables modificadas: slippage
function buyTokens(address beneficiary) public nonReentrant whenNotPaused payable
variables modificadas:  weiRaised, usdcRaised, tokenSold, alreadyinvested
function extendTime (uint256 newClosingTime) external onlyOwner whenNotPaused
varaibles modificadas: closingTime

**Vesting Contract**
function createVestingSchedule( address _beneficiary, uint256 _cliff, uint256 _duration, uint256 _slicePeriodSeconds, bool _revocable, uint256 _amount) public
variables modificadas: vestingSchedulesIds, vestingSchedules, vestingSchedulesTotalAmount, holdersVestingCount
function revoke(bytes32 vestingScheduleId) public onlyOwner onlyIfVestingScheduleNotRevoked(vestingScheduleId)
variables modificadas: veestingSchedulesTotalAmount y estructura revocada
function withdraw(uint256 amount) public nonReentrant onlyOwner
variables modificadas: balance of contract
function release( bytes32 vestingScheduleId, uint256 amount) public nonReentrant onlyIfVestingScheduleNotRevoked(vestingScheduleId)
varaibles modificadas: vestingScheduleTotalAmount y estructura en cuestion
function addTotalAmount(uint256 _amount, bytes32 _scheduleId) external 
varaibles modificadas: vestingScheduleTotalAmount y estructura en cuestion
*/  
describe("Crowdsale", function () {
  //init vars, we use time machine to advance time on blockchain test
  let account1, account2, account3, account4, snapshotId, openingTime, closingTime, latestBlock, tokenUsdc, vesting, myToken, roles, crowdsale;
   
  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
    latestBlock = await web3.eth.getBlock('latest');
  });

  /* Se agregan roles para el correcto funcionamiento
   * de la whitelist y se tranfieren la cantidad de tokens
   * que fueron destinados a esta etapa de la ICO
   * 
   * add roles that allows the best performance of whitelist functions 
   * then transfer to the ICO stage the amount of tokens
  */
  before(async () => {
    [account1, account2, account3, account4] = await ethers.getSigners();
    latestBlock = await web3.eth.getBlock('latest');
    openingTime = latestBlock.timestamp + 1000;
    closingTime = latestBlock.timestamp + 20000;

    //Deploy contracts
    tokenUsdc = await ethers.getContractAt(abi,'0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');

    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy();
    await myToken.deployed();

    const Roles = await ethers.getContractFactory("Roles");
    roles = await upgrades.deployProxy(Roles,["0x9E6cb7d51B381C31f957446F7d26eE50EB931e76"],{kind: 'uups'});
    await roles.deployed();

    const Vesting = await ethers.getContractFactory("VestingTokens");
    vesting = await upgrades.deployProxy(Vesting, [myToken.address,roles.address],{kind: 'uups'});
    await vesting.deployed();

    const Crowdsale = await ethers.getContractFactory("Etapa1");
    crowdsale = await upgrades.deployProxy(Crowdsale,["0x9B4A98d77c01b720F95592cd32891A7E4E1D7324", openingTime, closingTime,'5000000000000000000000000','200000000000000000',vesting.address,roles.address],{kind:'uups'});
    await crowdsale.deployed();

    await roles.grantRole(await roles.getHashRole("ICO_ADDRESS"),crowdsale.address);
    await roles.grantRole(await roles.getHashRole("PRIVATE_SALE_WHITELIST"),account1.address);
    await roles.grantRole(await roles.getHashRole("PRIVATE_SALE_WHITELIST"),account2.address);
    await roles.grantRole(await roles.getHashRole("PRIVATE_SALE_WHITELIST"),account3.address);
    await myToken.excludeFromTax(vesting.address);
    await myToken.transfer(vesting.address,'50000000000000000000000000');
    });


  it("Initialized crowdsale check", async function () {
      expect(await crowdsale.isOpen()).to.be.false;
      expect(await crowdsale.hasClosed()).to.be.false;
      expect(await crowdsale.cap()).to.be.equal('5000000000000000000000000');
      expect(await crowdsale.capReached()).to.be.false;
      expect(await crowdsale.openingTime()).to.be.equal(openingTime);
      expect(await crowdsale.closingTime()).to.be.equal(closingTime);
      expect(await crowdsale.weiRaised()).to.be.equal(0);
      expect(await crowdsale.tokensSold()).to.be.equal(0);
  });

  it.skip("Check oracle Info", async function () {
    console.log("Rate: ", (await crowdsale.rate()).toString());
    console.log("Matic Min Investment: ", (await crowdsale.maticMinInvestment()).toString());
  });

  it.skip("Buy tests", async function () {
    await timeMachine.advanceTimeAndBlock(2000);
    await expect(crowdsale.buyTokens(account1.address,{value:'200000000000000'})).to.be.revertedWith("Investment out of bonds");
    await crowdsale.buyTokens(account1.address,{value:'6500000000000000000000'});
    console.log("***** Check info after buy *****");
    console.log("Usdc Raised: ", (await crowdsale.usdcRaised()).toString()/10**6);
    console.log("Matic Raised: ", (await crowdsale.weiRaised()).toString()/10**18);
    console.log("Tokens Sold: ", (await crowdsale.tokensSold()).toString()/10**18);
  });

  it("Check vesting Info test", async function () {
    await timeMachine.advanceTimeAndBlock(2000);
    await crowdsale.buyTokens(account1.address,{value:'6500000000000000000000'});
    let vestingSchedule1 = await vesting.getLastVestingScheduleForHolder(account1.address);
    console.log("***** Check Vesting info after buy *****");
    console.log("Vesting info: ", vestingSchedule1.toString());
    
  });
});
