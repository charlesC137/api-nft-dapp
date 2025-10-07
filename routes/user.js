const router = require("express").Router();

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const multer = require("multer");

const User = require("../models/User");
const NFT = require("../models/NFT");
const { authenticate } = require("../utils/middleware/middleware");

const UPLOADS_DIR = "./uploads";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const walletAddress = req.user.wallet;
    const ext = path.extname(file.originalname);
    const newFileName = `${walletAddress}${ext}`;
    const newFilePath = path.join(UPLOADS_DIR, newFileName);

    const existingFiles = fs.readdirSync(UPLOADS_DIR);
    for (const existing of existingFiles) {
      if (existing.startsWith(walletAddress) && existing !== newFileName) {
        fs.unlinkSync(path.join(UPLOADS_DIR, existing));
      }
    }

    if (fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
    }

    cb(null, newFileName);
  },
});

const upload = multer({ storage });

router.get("/:address", authenticate, async (req, res) => {
  try {
    const reqAddress = req.params.address.toLowerCase();
    const userAddr = req.user.wallet;

    const user = await User.findOne({ walletAddress: reqAddress });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDetails = {
      walletAddress: user.walletAddress,
      bio: user.bio,
      username: user.username,
      ownedNFTs: user.ownedNFTs,
      avatarUrl: `${process.env.SERVER_URL}/user/avatar/${user.walletAddress}`,
    };

    if (user.walletAddress === userAddr || user.private === false) {
      Object.assign(userDetails, {
        private: user.private,
        bookmarkedNFTs: user.bookmarkedNFTs,
      });
    }

    res.json({ userDetails });
  } catch (err) {
    res.status(500).json({
      error: `Error fetching details of user with address ${reqAddress}`,
    });
  }
});

router.get("/avatar/:id", (req, res) => {
  const uploadsDir = path.join(__dirname, "../uploads");
  const walletId = req.params.id.trim();

  const files = fs.readdirSync(uploadsDir);

  const file = files.find((f) =>
    f.toLowerCase().startsWith(walletId.toLowerCase())
  );

  if (file) {
    res.sendFile(path.join(uploadsDir, file));
  } else {
    res.sendFile(path.join(uploadsDir, "default-avatar.jpg"));
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

router.post(
  "/upload-avatar",
  authenticate,
  upload.single("image"),
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "Missing wallet or file" });
      }

      res.status(200).json({
        message: "Avatar uploaded successfully",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error uploading avatar" });
    }
  }
);

module.exports = router;
