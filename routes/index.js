const router = require("express").Router();

const authRouter = require("./auth");
const marketRouter = require("./market");
const nftRouter = require("./nft");
const userRouter = require("./user");

router.use("/auth", authRouter);
router.use("/market", marketRouter);
router.use("/nft", nftRouter);
router.use("/user", userRouter);

module.exports = router;
