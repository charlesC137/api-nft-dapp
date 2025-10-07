const router = require("express").Router();

const NFT = require("../models/NFT");
const Voucher = require("../models/Voucher");
const Category = require("../models/Category");

const { authenticate } = require("../utils/middleware/middleware");

const multer = require("multer");
const path = require("path");
const crypto = require("node:crypto");
const cron = require("node-cron");
const fs = require("fs");

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

    const voucher = {
      creator: req.user.wallet,
      uri,
      metadata: { name, description, image: uri, categories },
      price,
      signature,
      isListed,
      expiry: expiryDate,
      randomKey,
    };

    await Voucher.create(voucher);

    res.json({ voucher });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error Saving Voucher" });
  }
});

router.get("/items", authenticate, async (req, res) => {
  const { sort, sessionId, searchTerm } = req.query;
  let filters = req.query.filters;
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

  try {
    const data = await getItems(
      sort,
      page,
      pageSize,
      order,
      walletAddr,
      sessionId,
      filters,
      searchTerm
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
      item = await NFT.findById(id);
    } else if (type === "voucher") {
      item = await Voucher.findById(id);
    } else {
      return res.status(400).json({ error: "Invalid type provided " });
    }

    if (!item) {
      return res
        .status(404)
        .json({ error: `${type} with id: ${id} not found` });
    }

    return res.json({ item });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: `Error fetching details of ${type} with id: ${id} ` });
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
  searchTerm
) {
  const skip = (page - 1) * pageSize;

  let sortStage = {};
  let addFieldsStage = null;

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

  if (searchTerm && searchTerm.trim() !== "") {
    const words = searchTerm.trim().split(/\s+/);
    const regexConditions = words.map((word) => ({
      "metadata.name": { $regex: escapeRegex(word), $options: "i" },
    }));

    matchConditions.push({ $and: regexConditions });
  }

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

  const result = await NFT.aggregate(pipeline).exec();
  return result[0] || { items: [], totalCount: 0 };
}

module.exports = router;
