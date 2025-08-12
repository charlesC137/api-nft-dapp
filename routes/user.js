const router = require("express").Router();

const User = require("../models/User");
const NFT = require("../models/NFT");
const { authenticate } = require("../utils/middleware/middleware");

router.get("/user/:address", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const user = await User.findOne({ address });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/user", authenticate, async (req, res) => {
  try {
    const { username, bio } = req.body;
    const address = req.user.address.toLowerCase();

    const updated = await User.findOneAndUpdate(
      { address },
      { username, bio },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/user/avatar", authenticate, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({ error: "Avatar URL is required" });
    }

    const address = req.user.address.toLowerCase();

    const updated = await User.findOneAndUpdate(
      { address },
      { avatar },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/user/:address/nfts", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { type } = req.query;

    const query =
      type === "created"
        ? { creator: address }
        : type === "owned"
        ? { owner: address }
        : { $or: [{ owner: address }, { creator: address }] };

    const nfts = await NFT.find(query);
    res.json(nfts);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
