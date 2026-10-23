
const mongoose = require("mongoose");
const Product = require("../model/productModel");
const Category = require("../model/categortModel");

// ==========================================
// CREATE PRODUCT
// POST /api/products
// ==========================================
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      price,
      stock = 0,
      lowStockThreshold = 5,
    } = req.body;

    // Validate required fields
    if (
      !name?.trim() ||
      !sku?.trim() ||
      !category ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, SKU, category and price are required",
      });
    }

    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // Validate numeric fields
    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price must be non-negative; stock and threshold must be non-negative integers",
      });
    }

    // Verify category exists
    const categoryExists = await Category.exists({ _id: category });

    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check duplicate SKU
    const existingProduct = await Product.findOne({
      sku: sku.trim(),
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      sku: sku.trim(),
      category,
      price,
      stock,
      lowStockThreshold,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL PRODUCTS
// GET /api/products
// ==========================================
exports.getAllProducts = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = {};

    // Search by product name or SKU
    if (req.query.search?.trim()) {
      const search = req.query.search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (req.query.category) {
      if (!mongoose.isValidObjectId(req.query.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      filter.category = req.query.category;
    }

    // Filter stock status
    if (req.query.stockStatus === "low") {
      filter.$expr = {
        $and: [
          { $gt: ["$stock", 0] },
          { $lte: ["$stock", "$lowStockThreshold"] },
        ],
      };
    } else if (req.query.stockStatus === "out") {
      filter.stock = 0;
    } else if (req.query.stockStatus === "in") {
      filter.$expr = {
        $gt: ["$stock", "$lowStockThreshold"],
      };
    } else if (req.query.stockStatus) {
      return res.status(400).json({
        success: false,
        message: "stockStatus must be low, out or in",
      });
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name description")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// ==========================================
// GET PRODUCT BY ID
// GET /api/products/:id
// ==========================================
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id).populate(
      "category",
      "name description"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE PRODUCT
// PUT /api/products/:id
// ==========================================
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const allowedFields = [
      "name",
      "sku",
      "category",
      "price",
      "stock",
      "lowStockThreshold",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    // Validate name
    if (
      updates.name !== undefined &&
      (typeof updates.name !== "string" ||
        !updates.name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot be empty",
      });
    }

    // Validate SKU
    if (
      updates.sku !== undefined &&
      (typeof updates.sku !== "string" ||
        !updates.sku.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "SKU cannot be empty",
      });
    }

    // Validate category
    if (updates.category !== undefined) {
      if (!mongoose.isValidObjectId(updates.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const categoryExists = await Category.exists({
        _id: updates.category,
      });

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    // Validate numeric updates
    if (
      updates.price !== undefined &&
      (typeof updates.price !== "number" ||
        !Number.isFinite(updates.price) ||
        updates.price < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Price must be a non-negative number",
      });
    }

    for (const field of ["stock", "lowStockThreshold"]) {
      if (
        updates[field] !== undefined &&
        (!Number.isInteger(updates[field]) ||
          updates[field] < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a non-negative integer`,
        });
      }
    }

    // Normalize string fields
    if (updates.name !== undefined) {
      updates.name = updates.name.trim();
    }

    if (updates.sku !== undefined) {
      updates.sku = updates.sku.trim();
    }

    // Prevent duplicate SKU
    if (updates.sku !== undefined) {
      const duplicate = await Product.findOne({
        sku: updates.sku,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).populate("category", "name description");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE PRODUCT
// DELETE /api/products/:id
// ==========================================
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

// ==========================================
// GET INVENTORY SUMMARY
// GET /api/products/inventory/summary
// ==========================================
exports.getInventorySummary = async (req, res) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: "$stock" },
          lowStockProducts: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$stock", 0] },
                    { $lte: ["$stock", "$lowStockThreshold"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockProducts: {
            $sum: {
              $cond: [{ $eq: ["$stock", 0] }, 1, 0],
            },
          },
          inventoryValue: {
            $sum: { $multiply: ["$price", "$stock"] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          totalUnits: 1,
          lowStockProducts: 1,
          outOfStockProducts: 1,
          inventoryValue: { $round: ["$inventoryValue", 2] },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: summary[0] || {
        totalProducts: 0,
        totalUnits: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        inventoryValue: 0,
      },
    });
  } catch (error) {
    console.error("Inventory summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory summary",
      error: error.message,
    });
  }
};
