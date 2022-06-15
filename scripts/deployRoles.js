const { ethers, upgrades } = require("hardhat");


async function main() {
  // Deploying
  const Roles = await ethers.getContractFactory("RolesV3");
  const instance = await upgrades.deployProxy(Roles, ["0x8D96037b23f011F95b4dD288240B6bEb6316f2C3"]);
  await instance.deployed();
  console.log("Roles deployed to:", instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });