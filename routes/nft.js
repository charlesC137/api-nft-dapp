const router = require("express").Router();

const NFT = require("../models/NFT");
const Voucher = require("../models/Voucher");

const { authenticate } = require("../utils/middleware/middleware");

const multer = require("multer");
const path = require("path");
const crypto = require("node:crypto");
const cron = require("node-cron");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + crypto.randomUUID();
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);

    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".jpg", ".jpeg", ".png", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

router.post(
  "/create-voucher",
  authenticate,
  upload.single("image"),
  (req, res) => {
    try {
      const { price } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const uri = `${process.env.SERVER_URL}/uploads/${req.file.filename}`;

      const voucher = {
        creator: req.user.wallet,
        uri,
        price,
      };

      res.json({ voucher });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to create voucher", details: err.message });
    }
  }
);

router.post("/save-voucher", authenticate, async (req, res) => {
  try {
    const { price, uri, signature, name, categories, description, isListed } =
      req.body;

    if (!uri || !signature || !name) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const EXPIRY_DAYS = 30;
    const expiryDate = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const voucher = {
      creator: req.user.wallet,
      uri,
      metadata: { name, description, image: uri, categories },
      price,
      signature,
      isListed,
      expiry: expiryDate,
    };

    await Voucher.create(voucher);

    res.json({ voucher });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error Saving Voucher" });
  }
});

router.get("/:tokenId", async (req, res) => {
  try {
    const nft = await NFT.findOne({ tokenId: req.params.tokenId });
    if (!nft) return res.status(404).json({ error: "NFT not found" });

    res.json(nft);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const nfts = await NFT.find().sort({ createdAt: -1 });

    const now = new Date();
    const vouchers = await Voucher.find({ expiry: { $gt: now } }).sort({
      createdAt: -1,
    });

    const combined = [...nfts, ...vouchers];

    res.json(combined);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

router.get("/lazy/:voucherId", async (req, res) => {
  try {
    const voucher = await Voucher.findOne({ voucherId: req.params.voucherId });
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    res.json(voucher);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return res.status(400).json({ error: "Query string 'q' is required" });
  }

  const keyword = q.trim();

  try {
    // Search NFTs by name or tokenId
    const nftResults = await NFT.find({
      $or: [{ name: { $regex: keyword, $options: "i" } }, { tokenId: keyword }],
    });

    // Search Users by wallet address or username
    const userResults = await User.find({
      $or: [
        { walletAddress: { $regex: keyword, $options: "i" } },
        { username: { $regex: keyword, $options: "i" } },
      ],
    });

    res.status(200).json({
      nfts: nftResults,
      users: userResults,
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

cron.schedule("0 0 * * *", async () => {
  await Voucher.deleteMany({ expiry: { $lte: new Date() } });
  console.log("Expired vouchers cleaned up");
});

module.exports = router;
