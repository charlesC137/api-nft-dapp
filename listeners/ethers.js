const { Contract, WebSocketProvider, ethers } = require("ethers");

const Activity = require("../models/Activity");
const NFT = require("../models/NFT");
const Metadata = require("../models/Metadata");
const Voucher = require("../models/Voucher");

const abi = require("../abi/NFT.json").abi;

const { emitNFTMinted } = require("./websocket");

require("dotenv").config();

async function startNFTListener() {
  const provider = new WebSocketProvider(process.env.WSS_URL);
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  const contract = new Contract(contractAddress, abi, provider);

  contract.on(
    "NFTMinted",
    async (tokenId, creator, owner, uri, price, isListed, createdAt, event) => {
      try {
        console.log(`NFTMinted detected! TokenID: ${tokenId.toString()}`);

        const tokenIdNum = Number(tokenId);
        const priceEth = ethers.formatEther(price);
        const timestamp = new Date(Number(createdAt) * 1000);
        const randomKey = Math.floor(Math.random() * 1_000_000);

        const receipt = await event.getTransactionReceipt();
        const gasUsed = receipt.gasUsed.toString() || "";

        const nft = new NFT({
          tokenId: tokenIdNum,
          creator: creator.toLowerCase(),
          owner: owner.toLowerCase(),
          price: priceEth,
          isListed,
          createdAt: timestamp,
          randomKey,
        });

        nft.uri = `${process.env.SERVER_URL}/nft/metadata/${nft._id}`;

        await nft.save();

        const prevItemId = uri.split("/").pop();

        const metadata = await Metadata.findOneAndUpdate(
          { itemId: prevItemId },
          { $set: { itemId: nft._id } },
          { new: true }
        );

        await Activity.create({
          nftId: tokenIdNum,
          nftType: "nft",
          type: "mint",
          from: creator,
          to: owner,
          price: priceEth,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          status: "success",
          timestamp,
          gasUsed,
        });

        await Voucher.findOneAndDelete({ uri });

        emitNFTMinted({
          nftId: nft._id.toString(),
          metadataId: metadata._id.toString(),
        });

        console.log(`NFT ${tokenIdNum} saved & activity logged.`);
      } catch (err) {
        console.error(`Error saving NFTMinted event:`, err);
      } finally {
      }
    }
  );

  try {
    //const network = await provider.getNetwork(); hardhat doenst let you run this well for some reason
    // console.log("WebSocket connected to:", network.name);

    const chainIdHex = await provider.send("eth_chainId", []);
    const chainId = parseInt(chainIdHex, 16);

    let networkName = "unknown";
    if (chainId === 31337) networkName = "Hardhat Local";

    console.log("WebSocket connected to:", networkName);
  } catch (err) {
    console.error("WebSocket connection issue:", err);
  }
}

module.exports = startNFTListener;
