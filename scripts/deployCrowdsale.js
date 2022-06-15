// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  latestBlock = await web3.eth.getBlock('latest');
  openingTime = latestBlock.timestamp + 120;
  closingTime = latestBlock.timestamp + 20000;
  const Crowdsale = await hre.ethers.getContractFactory("OracleTest");
  const crowdsale = await Crowdsale.deploy('0x8D96037b23f011F95b4dD288240B6bEb6316f2C3',openingTime,closingTime,'10000000000000000000','2000000000000000000','0x1a6792ef56684464baC55D4beA7D0c28574d59f8','0xbdFC3633ff259Be9bFdfE074e5A7cDF115092735');
  await crowdsale.deployed();

  console.log("CROWDSALE deployed to:", crowdsale.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
