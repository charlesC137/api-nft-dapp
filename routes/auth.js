const router = require("express").Router();

const jwt = require("jsonwebtoken");
const { verifyMessage } = require("ethers");
const User = require("../models/User");
const crypto = require("node:crypto");

const VERIFY_MESSAGE_PREFIX = "Sign this message to log in. Nonce:";

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

router.get("/nonce/:walletAddress", async (req, res) => {
  const walletAddress = req.params.walletAddress.toLowerCase();

  let user = await User.findOne({ walletAddress });

  const nonce = crypto.randomBytes(16).toString("hex");

  if (!user) {
    user = await User.create({ walletAddress, nonce });
  } else {
    user.nonce = nonce;
    await user.save();
  }

  res.json({ nonce, messageToSign: `${VERIFY_MESSAGE_PREFIX} ${nonce}` });
});

router.post("/verify", async (req, res) => {
  const { wallet, signature } = req.body;

  if (!wallet || !signature) {
    return res.status(400).json({ error: "Wallet and signature required" });
  }

  try {
    const user = await User.findOne({ walletAddress: wallet.toLowerCase() });

    if (!user || !user.nonce) {
      return res.status(400).json({ error: "Nonce not found" });
    }

    const message = `${VERIFY_MESSAGE_PREFIX} ${user.nonce}`;

    const recoveredAddress = verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    user.nonce = null;
    await user.save();

    const accessToken = jwt.sign({ wallet }, ACCESS_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ wallet }, REFRESH_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie("jwt", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.status(200).json({ message: "Verified Successfully" });
  } catch (err) {
    console.error("Verify error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, REFRESH_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);

    const accessToken = jwt.sign({ wallet: decoded.wallet }, ACCESS_SECRET, {
      expiresIn: "15m",
    });

    res.cookie("jwt", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: "New access token set" });
  });
});

module.exports = router;
