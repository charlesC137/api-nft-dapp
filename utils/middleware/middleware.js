const jwt = require("jsonwebtoken");

exports.authenticate = (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    const walletFromHeader = req.headers["x-wallet-address"];

    if (!token || !walletFromHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

    if (decoded.wallet?.toLowerCase() !== walletFromHeader.toLowerCase()) {
      return res.status(401).json({ error: "Wallet mismatch" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
