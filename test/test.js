const { expect } = require("chai");
const { ethers } = require("hardhat");
const timeMachine = require('ganache-time-traveler');
const BigNumber = require('bignumber.js');

describe.skip("TokenVesting2", function () {
  let Token;
  let testToken;
  let TokenVesting;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  before(async function () {
    Token = await ethers.getContractFactory("MyToken");
    TokenVesting = await ethers.getContractFactory("MockTokenVesting");
    Roles = await ethers.getContractFactory("Roles");

   
    roles = await Roles.deploy();
    await roles.deployed();
    await roles.initialize("0xe62E317325934667156028966830588385021956");
    testToken = await Token.deploy();
    await testToken.deployed();
    vesting = await TokenVesting.deploy(testToken.address, roles.address);
    await vesting.deployed();

    await testToken.transfer(vesting.address,'5000000000000000000000000');
    
  });
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    await roles.grantRole(roles.getHashRole("ICO_CONTRACT"),addr1.address);
  });

/*   describe.skip("Vesting", function () {
    it("owner should have NTF_ADMIN_ROLE", async function () {
        expect(await roles.hasRole(roles.getHashRole("NFT_ADMIN_ROLE"), owner.address)).to.be.true;
    });
    
    it("ICO role should be the only that can create vesting schedules", async function () {
        expect( vesting.connect(addr1).createVestingSchedule(addr1.address,1111,111,1111,1,true,1111)).to.be.reverted;
        await roles.grantRole(roles.getHashRole("ICO_CONTRACT"),addr1.address);
        await vesting.connect(addr1).createVestingSchedule(addr1.address,1111,111,1111,1,true,1111);
    });

    it("Release test ", async function () {
        expect(await vesting.getVestingSchedulesCountByBeneficiary(addr1.address)).to.equal(1);
    });
  }); */

  describe("Start Setter", function () {
    it("Start time should be uninitialized", async function () {
        await vesting.connect(addr1).createVestingSchedule(addr2.address,3600,5200,1,true,'500000000000000000000000',addr1.address);
        let schedule = await vesting.getLastVestingScheduleForHolder(addr2.address);
        let scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(addr2.address,0);
        expect(await vesting.startInitialized()).to.be.false;
        await vesting.setCurrentTime('1651853200');
        expect(await vesting.computeReleasableAmount(scheduleId)).to.be.equal(0);
        expect( vesting.release(scheduleId, '10000')).to.be.reverted;
    });

    it("Cannot withdraw inside lock time", async function () {
        let scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(addr2.address,0);
        await vesting.setStartTime('1651854200');
        expect(vesting.release(scheduleId, '10000')).to.be.reverted;
        expect(await vesting.startInitialized()).to.be.true;
        expect(await vesting.computeReleasableAmount(scheduleId)).to.be.equal(0);
    });

    it("Cannot withdraw inside lock time", async function () {
        let scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(addr2.address,0);
        await vesting.setStartTime('1651854200');
        expect(vesting.release(scheduleId, '10000')).to.be.reverted;
        expect(await vesting.startInitialized()).to.be.true;
        expect(await vesting.computeReleasableAmount(scheduleId)).to.be.equal(0);
    });
  });
});


describe("Crowdsale", function () {
  let account1, account2, account3, snapshotId, openingTime, closingTime;
   
  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  /* Se agregan roles para el correcto funcionamiento
   * de la whitelist y se tranfieren la cantidad de tokens
   * que fueron destinados a esta etapa de la ICO
   * 
   * add roles that allows the best performance of whitelist functions 
   * then transfer to the ICO stage the amount of tokens
  */
  before(async () => {
    [account1, account2, account3, account4, account5] = await ethers.getSigners();
    let latestBlock = await web3.eth.getBlock('latest');
    openingTime = latestBlock.timestamp + 1000;
    closingTime = latestBlock.timestamp + 20000;

    
    const Roles = await ethers.getContractFactory("Roles");
    roles = await Roles.deploy();
    await roles.deployed();
    await roles.initialize("0x9B4A98d77c01b720F95592cd32891A7E4E1D7324");

    const Token = await ethers.getContractFactory("MyToken");
    testToken = await Token.deploy();
    await testToken.deployed();

    const VestingContract = await ethers.getContractFactory("VestingNfts");
    vestingContract = await VestingContract.deploy(testToken.address, roles.address)
    await vestingContract.deployed();

    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    crowdsale = await Crowdsale.deploy(16, "0x9B4A98d77c01b720F95592cd32891A7E4E1D7324", openingTime, closingTime,'1000000000000000000',vestingContract.address ,roles.address);
    await crowdsale.deployed();
    

    await testToken.transfer(vestingContract.address,'5000000000000000000000000');
    await roles.addPreSaleWhitelist(account2.address);
    await roles.addPreSaleWhitelist(account3.address);
    await roles.grantRole(roles.getHashRole("ICO_ADDRESS"),crowdsale.address);
  });


  it("Initialized crowdsale check", async function () {
      expect(await crowdsale.isOpen()).to.be.false;
      expect(await crowdsale.hasClosed()).to.be.false;
      expect(await crowdsale.rate()).to.be.equal(16);
      expect(await crowdsale.cap()).to.be.equal('1000000000000000000');
      expect(await crowdsale.capReached()).to.be.false;
      expect(await crowdsale.openingTime()).to.be.equal(openingTime);
      expect(await crowdsale.closingTime()).to.be.equal(closingTime);
      expect(await crowdsale.weiRaised()).to.be.equal(0);
      expect(await crowdsale.tokensSold()).to.be.equal(0);
  });

  it("Try to buy with crowdsale closed", async function () {
    expect( crowdsale.connect(account2).buyTokens(account2.address, {value: '100000000000000000' })).to.be.reverted;
    expect(await crowdsale.weiRaised()).to.be.equal(0);
    expect(await crowdsale.tokensSold()).to.be.equal(0);
  });

  it("Try to buy without whitelist Role", async function () {
    await timeMachine.advanceTimeAndBlock(2000);
    expect( crowdsale.connect(account3).buyTokens(account3.address, {value: '100000000000000000' })).to.be.revertedWith("Address not whitelisted");
  });

  it("Buy correctly and check vesting", async function () {
    await timeMachine.advanceTimeAndBlock(2000);
    await crowdsale.connect(account2).buyTokens(account2.address, {value: '500000000000000000' });
    expect(await crowdsale.weiRaised()).to.be.equal('500000000000000000');
    rate = await crowdsale.rate();
    expect(await crowdsale.tokensSold()).to.be.equal(rate.mul('500000000000000000'));
    expect(await vestingContract.getVestingSchedulesCount()).to.be.equal(1);
    expect(await vestingContract.getVestingSchedulesCountByBeneficiary(account2.address)).to.be.equal(1);
    expect(await vestingContract.computeReleasableAmount(vestingContract.computeVestingScheduleIdForAddressAndIndex(account2.address,0))).to.be.equal(0);
    expect(vestingContract.connect(account2).release(vestingContract.computeVestingScheduleIdForAddressAndIndex(account2.address,0), "20")).to.be.revertedWith("TokenVesting: cannot release tokens, not enough vested tokens");
  });

  it("Buy twice and check vesting", async function () {
    await timeMachine.advanceTimeAndBlock(2000);
    await crowdsale.connect(account2).buyTokens(account2.address, {value: '500000000000000000' });
    let vesting = await vestingContract.getVestingSchedule(vestingContract.getVestingIdAtIndex(0));
    expect(vesting.amountTotal).to.be.equal("8000000000000000000");
    await crowdsale.connect(account2).buyTokens(account2.address, {value: '500000000000000000' });
    vesting = await vestingContract.getVestingSchedule(vestingContract.getVestingIdAtIndex(0));
    expect(vesting.amountTotal).to.be.equal("16000000000000000000");
    expect(await vestingContract.getVestingSchedulesCount()).to.be.equal(1);
  });

  it("Advance time and check start time and withdraws amounts", async function () {
    expect(await vestingContract.startTime()).to.be.equal(0);
    expect(await vestingContract.startInitialized()).to.be.false;
    await timeMachine.advanceTimeAndBlock(2000);
    await crowdsale.connect(account2).buyTokens(account2.address, {value: '500000000000000000' });
    await timeMachine.advanceTimeAndBlock(18000);
    latestBlock = await web3.eth.getBlock('latest');
    await vestingContract.setStartTime(latestBlock.timestamp + 100);
    expect(await vestingContract.startTime()).to.be.equal(latestBlock.timestamp+100);
    expect(await vestingContract.startInitialized()).to.be.true;
    expect(await vestingContract.computeReleasableAmount(vestingContract.computeVestingScheduleIdForAddressAndIndex(account2.address,0))).to.be.equal(0);
    await timeMachine.advanceTimeAndBlock(1600);
    expect(await vestingContract.computeReleasableAmount(vestingContract.computeVestingScheduleIdForAddressAndIndex(account2.address,0))).to.be.equal(0);
    await timeMachine.advanceTimeAndBlock(1000);
    await vestingContract.connect(account2).release(vestingContract.computeVestingScheduleIdForAddressAndIndex(account2.address,0),1);
    expect(await testToken.balanceOf(account2.address)).to.be.equal(1);
    let vesting = await vestingContract.getVestingSchedule(vestingContract.getVestingIdAtIndex(0));
    expect(vesting.released).to.be.equal(1);
    await timeMachine.advanceTimeAndBlock(4000);
    await vestingContract.connect(account2).release(vestingContract.computeVestingScheduleIdForAddressAndIndex(account2.address,0),7);
    vesting = await vestingContract.getVestingSchedule(vestingContract.getVestingIdAtIndex(0));
    expect(vesting.released).to.be.equal(8);
    expect(vestingContract.connect(account2).release(vestingContract.computeVestingScheduleIdForAddressAndIndex(account2.address,0),7)).to.be.reverted;
  });

  it("Try to buy out of bonds", async function () {
    await timeMachine.advanceTimeAndBlock(2000);
    expect(crowdsale.connect(account2).buyTokens(account2.address, {value: '1' })).to.be.reverted;
    expect(crowdsale.connect(account2).buyTokens(account2.address, {value: '1000000000000000000' })).to.be.reverted; //1 matic
  });

  it("Advance time and check", async function () {
    await timeMachine.advanceTimeAndBlock(2000);
    expect(await crowdsale.isOpen()).to.be.true;
    expect(await crowdsale.hasClosed()).to.be.false;
  });
});

