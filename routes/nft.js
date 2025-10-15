const router = require("express").Router();
const mongoose = require("mongoose");

const NFT = require("../models/NFT");
const Voucher = require("../models/Voucher");
const Category = require("../models/Category");
const User = require("../models/User");
const Metadata = require("../models/Metadata");

const { authenticate } = require("../utils/middleware/middleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("node:crypto");

require("dotenv").config();

const cron = require("node-cron");

const UPLOADS_DIR = "./uploads";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
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
    const randomKey = Math.floor(Math.random() * 1_000_000);
    const wallet = req.user.wallet.toLowerCase();

    const voucher = new Voucher({
      creator: wallet,
      owner: wallet,
      price,
      signature,
      isListed,
      expiry: expiryDate,
      randomKey,
    });

    voucher.uri = `${process.env.SERVER_URL}/nft/metadata/${voucher._id}`;

    await voucher.save(voucher);

    const metadata = {
      name,
      description,
      image: uri,
      categories,
      itemId: voucher._id,
    };

    await Metadata.create(metadata);

    res.json({ voucher });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error Saving Voucher" });
  }
});

router.get("/items", authenticate, async (req, res) => {
  const { sort, sessionId, searchTerm, ownerAddress, filterType } = req.query;
  let { filters, nftIds } = req.query;
  const page = Number(req.query.page);
  const order = req.query.order === "desc" ? 1 : -1;
  const walletAddr = req.user.wallet;
  const pageSize = 5;

  if ((sort !== "explore" && sort !== "age" && sort !== "price") || !page) {
    return res.status(400).json({ error: "Invalid sort format" });
  }

  if (filters) {
    if (!Array.isArray(filters)) {
      filters = [filters];
    }
  }

  if (nftIds) {
    if (!Array.isArray(nftIds)) {
      nftIds = [nftIds];
    }
  }

  try {
    const data = await getItems(
      sort,
      page,
      pageSize,
      order,
      walletAddr,
      sessionId,
      filters,
      searchTerm,
      ownerAddress,
      nftIds,
      filterType
    );

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find({});

    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching NFT categories" });
  }
});

router.get("/details", async (req, res) => {
  try {
    const { type, id } = req.query;

    if (!type || !id) {
      return res.status(400).json({ error: "Id and/or type not specified" });
    }

    let item;

    if (type === "nft") {
      item = await NFT.findById(id).lean();
    } else if (type === "voucher") {
      item = await Voucher.findById(id).lean();
    } else {
      return res.status(400).json({ error: "Invalid type provided " });
    }

    if (!item) {
      return res
        .status(404)
        .json({ error: `${type} with id: ${id} not found` });
    }

    const metadata = await Metadata.findOne({ itemId: id }).lean();
    if (!metadata) return res.status(404).json({ error: "Metadata not found" });

    item.metadata = metadata;

    res.json({ item });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: `Error fetching details of ${type} with id: ${id} ` });
  }
});

router.post("/bookmark", authenticate, async (req, res) => {
  try {
    const { id, owner } = req.body;
    const walletAddress = req.user.wallet.toLowerCase();

    if (!id || !owner) {
      return res.status(400).json({ error: "Id or Owner not provided" });
    }

    if (owner.toLowerCase() === walletAddress) {
      return res.status(400).json({ error: "Cannot bookmark your own nft" });
    }

    const user = await User.findOne({ walletAddress });
    if (!user) return res.status(404).json({ error: "User not found" });

    const index = user.bookmarkedNFTs.indexOf(id);
    let action = "";

    if (index > -1) {
      user.bookmarkedNFTs.splice(index, 1);
      action = "removed";
    } else {
      user.bookmarkedNFTs.push(id);
      action = "added";
    }

    await user.save();

    res.json({
      message: `NFT ${action} from bookmarks successfully.`,
      bookmarks: user.bookmarkedNFTs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error toggling bookmark" });
  }
});

router.get("/metadata/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const metadata = await Metadata.findOne({ itemId: id });
    if (!metadata) return res.status(404).json({ error: "Metadata not found" });

    res.json({ metadata });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching metadata" });
  }
});

cron.schedule("0 0 * * *", async () => {
  await Voucher.deleteMany({ expiry: { $lte: new Date() } });
  console.log("Expired vouchers cleaned up");
});

function walletToSeed(wallet) {
  let hash = 0;
  for (let i = 0; i < wallet.length; i++) {
    hash = (hash << 5) - hash + wallet.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getItems(
  sort,
  page,
  pageSize,
  order,
  wallet,
  sessionId,
  filters,
  searchTerm,
  ownerAddress,
  nftIds,
  filterType
) {
  const skip = (page - 1) * pageSize;

  let sortStage = {};
  let addFieldsStage = null;

  // Sorting logic
  if (sort === "explore") {
    const seed = walletToSeed(wallet + sessionId);
    addFieldsStage = {
      seededRandom: { $mod: [{ $add: ["$randomKey", seed] }, 1_000_000] },
    };
    sortStage = { seededRandom: 1 };
  } else if (sort === "age") {
    sortStage = { createdAt: order };
  } else if (sort === "price") {
    order *= -1;
    addFieldsStage = { numericPrice: { $toDouble: "$price" } };
    sortStage = { numericPrice: order };
  }

  const matchConditions = [];

  //  FILTERS For explore
  if (filters && filters.length > 0 && !filters.includes("all")) {
    const categoryFilters = filters.filter(
      (f) => f !== "sold" && f !== "for-sale"
    );

    if (categoryFilters.length > 0) {
      matchConditions.push({ category: { $in: categoryFilters } });
    }

    if (filters.includes("sold")) {
      matchConditions.push({ isListed: false });
    }

    if (filters.includes("for-sale")) {
      matchConditions.push({ isListed: true });
    }
  }

  // SEARCH TERM
  if (searchTerm && searchTerm.trim() !== "") {
    const words = searchTerm.trim().split(/\s+/);
    const regexConditions = words.map((word) => ({
      "metadata.name": { $regex: escapeRegex(word), $options: "i" },
    }));

    matchConditions.push({ $and: regexConditions });
  }

  //  FILTER BY OWNER FOR PROFILE
  if (ownerAddress) {
    matchConditions.push({ owner: ownerAddress });
  }

  // 🔹 FILTER BY NFT IDs
  if (Array.isArray(nftIds) && nftIds.length > 0) {
    const objectIds = nftIds.map((id) => new mongoose.Types.ObjectId(id));
    matchConditions.push({ _id: { $in: objectIds } });
  }

  //  SPECIAL FILTERS (created, bought, onsale, nosale) ON PROFILE
  if (filterType && ownerAddress) {
    const lowerWallet = ownerAddress;

    switch (filterType) {
      case "created":
        matchConditions.push({ creator: lowerWallet });
        break;

      case "bought":
        matchConditions.push({
          owner: lowerWallet,
          creator: { $ne: lowerWallet },
        });
        break;

      case "onsale":
        matchConditions.push({ isListed: true, owner: lowerWallet });
        break;

      case "nosale":
        matchConditions.push({ isListed: false, owner: lowerWallet });
        break;
    }
  }

  // Build pipeline
  const pipeline = [
    { $unionWith: { coll: "vouchers" } },
    ...(matchConditions.length > 0
      ? [{ $match: { $and: matchConditions } }]
      : []),
    ...(addFieldsStage ? [{ $addFields: addFieldsStage }] : []),
    {
      $facet: {
        items: [{ $sort: sortStage }, { $skip: skip }, { $limit: pageSize }],
        totalCount: [{ $count: "count" }],
      },
    },
    {
      $project: {
        items: 1,
        totalCount: {
          $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0],
        },
      },
    },
  ];

  const response = await NFT.aggregate(pipeline).exec();

  const result = response[0] || { items: [], totalCount: 0 };

  if (result.totalCount > 0) {
    const ids = result.items.map((item) => item._id);

    const metadataList = await Metadata.find({ itemId: { $in: ids } });

    const itemsWithMetadata = result.items.map((item) => {
      const meta = metadataList.find(
        (m) => m.itemId.toString() === item._id.toString()
      );
      return {
        ...item,
        metadata: meta.toObject() || null,
      };
    });

    result.items = itemsWithMetadata;
  }

  return result;
}

module.exports = router;
