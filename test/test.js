const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenVesting", function () {
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
    await roles.initialize();
    
    testToken = await Token.deploy();
    await testToken.deployed();
    vesting = await TokenVesting.deploy(testToken.address, roles.address);
    await vesting.deployed();

    await testToken.transfer(vesting.address,50000000);
  });
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  });

  describe("Vesting", function () {
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
  });
});
