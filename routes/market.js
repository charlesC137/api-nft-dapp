const router = require("express").Router();

const NFT = require("../models/NFT");
const { authenticate } = require("../utils/middleware/middleware");

router.post("/list", authenticate, async (req, res) => {
  const { tokenId, price, isListed } = req.body;

  if (!tokenId) return res.status(400).json({ error: "Token ID is required" });

  const nft = await NFT.findOne({ tokenId });
  if (!nft) return res.status(404).json({ error: "NFT not found" });

  if (isListed && nft.isListed) {
    return res.status(400).json({ error: "NFT is already listed" });
  }

  if (!isListed && !nft.isListed) {
    return res.status(400).json({ error: "NFT is not listed" });
  }

  nft.isListed = isListed;

  if (isListed) {
    if (!price || price <= 0) {
      return res
        .status(400)
        .json({ error: "Price must be provided when listing" });
    }
    nft.price = price;
  }

  await nft.save();
  res
    .status(200)
    .json({ message: `NFT ${isListed ? "listed" : "unlisted"} successfully.` });
});

router.post("/buy", authenticate, async (req, res) => {
  const { tokenId, buyer } = req.body;
  if (!tokenId || !buyer)
    return res
      .status(400)
      .json({ error: "Token ID and buyer address is required" });

  //check if the client is the owner with the jwt

  const nft = await NFT.findOne({ tokenId });
  if (!nft) return res.status(404).json({ error: "NFT not found" });

  nft.isListed = false;
  nft.owner = buyer.toLowerCase();
  nft.modifiedAt = Date.now();
  await nft.save();

  res.status(200).json({ message: "NFT bought", nft });
});

module.exports = router;
