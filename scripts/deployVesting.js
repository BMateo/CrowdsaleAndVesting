// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  latestBlock = await web3.eth.getBlock('latest');
  openingTime = latestBlock.timestamp + 1000;
  closingTime = latestBlock.timestamp + 20000;

  const Vesting = await hre.ethers.getContractFactory("VestingNfts");
  const vesting = await Vesting.deploy('0xe76fC36F904E982D0991C6aE521c20f870EE2646','0xbdFC3633ff259Be9bFdfE074e5A7cDF115092735');

  await vesting.deployed();

  console.log("Vesting deployed to:", vesting.address);


  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
