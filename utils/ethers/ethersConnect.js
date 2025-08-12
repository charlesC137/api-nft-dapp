const { JsonRpcProvider, Wallet, Contract } = require("ethers");
require("dotenv").config();
const nftAbi = require("../../abi/NFT.json");

const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.ADMIN_WALLET_ADDRESS, provider);

const nftContract = new Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  nftAbi,
  wallet
);

module.exports = { nftContract };
