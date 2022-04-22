require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');


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
      accounts: [`52d10417e9bbbbbf06dfbb41118bc24e44d8a98941fab2128adde77745222539`],
      gas: 8000000
    }
  }
};
