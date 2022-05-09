const { expect } = require("chai");
const { ethers } = require("hardhat");
const timeMachine = require('ganache-time-traveler');

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
    [account1, account2, account3] = await ethers.getSigners();
    let latestBlock = await web3.eth.getBlock('latest');
     openingTime = latestBlock.timestamp + 1000;
     closingTime = latestBlock.timestamp + 20000;

    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    crowdsale = await Crowdsale.deploy(15, "0x9B4A98d77c01b720F95592cd32891A7E4E1D7324", openingTime, closingTime,'1000000000000000000', 'address del contrato de vesting');
  });


  it("Initialized crowdsale check", async function () {
      expect(await crowdsale.isOpen()).to.be.false;
      expect(await crowdsale.hasClosed()).to.be.false;
      expect(await crowdsale.rate()).to.be.equal(15);
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

  it("Advance time and check", async function () {
    await timeMachine.advanceTimeAndBlock(2000);
    expect(await crowdsale.isOpen()).to.be.true;
    expect(await crowdsale.hasClosed()).to.be.false;
  });
});

