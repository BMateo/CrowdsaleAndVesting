const { ethers, upgrades } = require("hardhat");

async function main() {
  // Deploying
  const Roles = await ethers.getContractFactory("Roles");
  const instance = await upgrades.deployProxy(Roles);
  await instance.deployed();
  console.log("Roles deployed to:", instance.address);

}

main();