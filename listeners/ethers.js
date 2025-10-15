const { Contract, WebSocketProvider } = require("ethers");

const Activity = require("../models/Activity");
const NFT = require("../models/NFT");

const abi = require("../abi/NFT.json").abi;

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

        // Convert BigInts
        const tokenIdNum = Number(tokenId);
        const priceEth = ethers.formatEther(price);
        const timestamp = new Date(Number(createdAt) * 1000);

        const receipt = await event.getTransactionReceipt();
        const gasUsed = receipt.gasUsed.toString() || "";

        // Save to NFT collection
        const nft = new NFT({
          tokenId: tokenIdNum,
          creator: creator.toLowerCase(),
          owner: owner.toLowerCase(),
          uri,
          price: priceEth,
          isListed,
          createdAt: timestamp,
        });

        await nft.save();

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

        console.log(`✅ NFT ${tokenIdNum} saved & activity logged.`);
      } catch (err) {
        console.error(`❌ Error saving NFTMinted event:`, err);
      }
    }
  );

  try {
    const network = await provider.getNetwork();
    console.log("✅ WebSocket connected to:", network.name);
  } catch (err) {
    console.error("⚠️ WebSocket connection issue:", err);
  }
}

module.exports = startNFTListener;
