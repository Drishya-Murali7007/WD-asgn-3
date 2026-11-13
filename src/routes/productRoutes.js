const express = require("express");
const Product = require("../models/Product");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router();

// GET /api/products/low-stock
// Products whose quantity is less than or equal to their reorder level.
router.get("/low-stock", async (req, res, next) => {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] }
    }).sort({ quantity: 1, name: 1 });

    res.json({ count: lowStockItems.length, lowStockItems });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/summary
// Category-wise report generated using a MongoDB aggregation pipeline.
router.get("/summary", async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          avgPrice: { $avg: "$price" }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalItems: 1,
          totalQuantity: 1,
          totalStockValue: { $round: ["$totalStockValue", 2] },
          avgPrice: { $round: ["$avgPrice", 2] }
        }
      }
    ]);

    res.json({ categories: summary.length, summary });
  } catch (error) {
    next(error);
  }
});

// POST /api/products — Create a product.
router.post("/", async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// GET /api/products — Filtering, sorting and pagination.
router.get("/", async (req, res, next) => {
  try {
    const {
      search, category, minPrice, maxPrice, minStock, maxStock,
      sortBy = "createdAt", order = "desc", page = 1, limit = 10
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { supplier: { $regex: search, $options: "i" } }
      ];
    }
    if (category) filter.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }
    if (minStock !== undefined || maxStock !== undefined) {
      filter.quantity = {};
      if (minStock !== undefined) filter.quantity.$gte = Number(minStock);
      if (maxStock !== undefined) filter.quantity.$lte = Number(maxStock);
    }

    const allowedSortFields = ["name", "price", "quantity", "category", "createdAt", "updatedAt"];
    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ message: `sortBy must be one of: ${allowedSortFields.join(", ")}` });
    }
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const sortOrder = String(order).toLowerCase() === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      Product.countDocuments(filter)
    ]);

    res.json({
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / pageSize),
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id — Single product.
router.get("/:id", validateObjectId, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id — Update product details.
router.put("/:id", validateObjectId, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/products/:id/stock — Safe stock adjustment.
// Positive change = restock; negative change = sale.
router.patch("/:id/stock", validateObjectId, async (req, res, next) => {
  try {
    const change = Number(req.body.change);
    if (!Number.isInteger(change) || change === 0) {
      return res.status(400).json({ message: "change must be a non-zero integer" });
    }

    const condition = { _id: req.params.id };
    if (change < 0) condition.quantity = { $gte: Math.abs(change) };

    const product = await Product.findOneAndUpdate(
      condition,
      { $inc: { quantity: change } },
      { new: true, runValidators: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) return res.status(404).json({ message: "Product not found" });
      return res.status(400).json({ message: "Insufficient stock for this sale" });
    }

    res.json({ message: "Stock updated", product });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id — Delete product.
router.delete("/:id", validateObjectId, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted", id: product._id });
  } catch (error) {
    next(error);
  }
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = router;
