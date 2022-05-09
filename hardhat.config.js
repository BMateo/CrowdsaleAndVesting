require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-web3");


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    polygon: {
      url: `https://polygon-mainnet.infura.io/v3/295cce92179b4be498665b1b16dfee34`,
      accounts: [``],
      gas: 8000000
    },
    mumbai: {
      url: `https://speedy-nodes-nyc.moralis.io/73496c9d41ce91fedf9f4c56/polygon/mumbai`,
      accounts: [``]
    }
  }
};
