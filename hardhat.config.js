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
      accounts: [],
      gas: 8000000
    },
    mumbai: {
      url: `https://speedy-nodes-nyc.moralis.io/73496c9d41ce91fedf9f4c56/polygon/mumbai`,
      accounts: ['083786714cfb324a8f11922a6104eaff5d6a427a81a5c8167477b8d5200c2ca9']
    },
    binanceTestnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
      accounts: ['083786714cfb324a8f11922a6104eaff5d6a427a81a5c8167477b8d5200c2ca9']
    }
  }
};
