require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition-ethers");
require("dotenv").config();

const {
  SEPOLIA_RPC_URL,
  HOLESKY_RPC_URL,
  PRIVATE_KEYS,
  PRIVATE_KEY,
  ETHERSCAN_API_KEY
} = process.env;

const accountsRaw = PRIVATE_KEYS
  ? PRIVATE_KEYS.split(",")
  : (PRIVATE_KEY ? [PRIVATE_KEY] : []);

const accounts = accountsRaw
  .map(s => (s || "").trim())
  .filter(Boolean)
  .map(k => (k.startsWith("0x") ? k.slice(2) : k));

module.exports = {
  solidity: {
    version: "0.8.23",
    evmVersion: "paris",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },

  networks: {

    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true,
      allowUnlimitedTransactionSize: true,
      accounts: { count: 40 },
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },

    // Testneturi publice
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY
        ? [(process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY.slice(2) : process.env.PRIVATE_KEY)]
        : [],
      chainId: 11155111
    },
    holesky: {
      url: HOLESKY_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 17000
    }
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY || ""
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  mocha: { timeout: 40000 }
};
