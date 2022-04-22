// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Vesting = await hre.ethers.getContractFactory("TokenVestingModificado");
  const vesting = await Vesting.deploy('0x8fd0d82B23362041436e626Ef4aB41eacAeF62e1','0x7Ac1264BB74dBB88b51268BDf00Df6c1CE4a8e3A');

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
