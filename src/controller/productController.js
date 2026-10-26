
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");

const Product = require("../model/productModel");

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "products"
);

// ==========================================
// HELPER: DELETE A LOCAL UPLOADED IMAGE
// ==========================================
const removeImageFile = async (imageURL) => {
  if (!imageURL || typeof imageURL !== "string") return;

  // Only delete files belonging to this upload directory
  const filename = path.basename(imageURL);

  if (filename !== imageURL.replace(/^.*\//, "")) return;

  try {
    await fs.unlink(path.join(uploadDirectory, filename));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Image cleanup error:", error.message);
    }
  }
};

// ==========================================
// HELPER: VALIDATE NUMERIC FORM FIELDS
// Supports JSON numbers and multipart strings
// ==========================================
const parseNumber = (value, field, { min = 0, integer = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    return { error: `${field} is required` };
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < min ||
    (integer && !Number.isInteger(number))
  ) {
    return {
      error: `${field} must be a valid ${integer ? "non-negative integer" : "non-negative number"}`,
    };
  }

  return { value: number };
};

// ==========================================
// CREATE PRODUCT
// POST /api/products
// ==========================================
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      litre,
      stock,
      lowStockThreshold,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      price === undefined ||
      price === ""
    ) {
      if (req.file) {
        await removeImageFile(
          `/uploads/products/${req.file.filename}`
        );
      }

      return res.status(400).json({
        success: false,
        message: "Name, category and price are required",
      });
    }

    if (!mongoose.isValidObjectId(category)) {
      if (req.file) {
        await removeImageFile(
          `/uploads/products/${req.file.filename}`
        );
      }

      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const parsedPrice = parseNumber(price, "Price");

    if (parsedPrice.error) {
      if (req.file) {
        await removeImageFile(`/uploads/products/${req.file.filename}`);
      }

      return res.status(400).json({
        success: false,
        message: parsedPrice.error,
      });
    }

    let parsedStock = { value: 0 };
    let parsedThreshold = { value: 5 };

    if (stock !== undefined && stock !== "") {
      parsedStock = parseNumber(stock, "Stock", {
        integer: true,
      });
    }

    if (
      lowStockThreshold !== undefined &&
      lowStockThreshold !== ""
    ) {
      parsedThreshold = parseNumber(
        lowStockThreshold,
        "Low stock threshold",
        { integer: true }
      );
    }

    if (parsedStock.error || parsedThreshold.error) {
      if (req.file) {
        await removeImageFile(`/uploads/products/${req.file.filename}`);
      }

      return res.status(400).json({
        success: false,
        message: parsedStock.error || parsedThreshold.error,
      });
    }

    if (
      litre !== undefined &&
      (typeof litre !== "string" || !litre.trim())
    ) {
      if (req.file) {
        await removeImageFile(`/uploads/products/${req.file.filename}`);
      }

      return res.status(400).json({
        success: false,
        message: "Litre must be a non-empty string",
      });
    }

    const imageURL = req.file
      ? `/uploads/products/${req.file.filename}`
      : null;

    const product = await Product.create({
      name: name.trim(),
      category,
      price: parsedPrice.value,
      litre: litre === undefined ? undefined : litre.trim(),
      stock: parsedStock.value,
      lowStockThreshold: parsedThreshold.value,
      imageURL,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    if (req.file) {
      await removeImageFile(`/uploads/products/${req.file.filename}`);
    }

    console.error("Create product error:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
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
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 20
      )
    );

    const filter = {};

    if (
      typeof req.query.search === "string" &&
      req.query.search.trim()
    ) {
      const search = req.query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.name = {
        $regex: search,
        $options: "i",
      };
    }

    if (req.query.category) {
      if (!mongoose.isValidObjectId(req.query.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      filter.category = req.query.category;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category")
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
      limit,
      totalPages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
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

    const product = await Product.findById(id)
      .populate("category");

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
      if (req.file) {
        await removeImageFile(`/uploads/products/${req.file.filename}`);
      }

      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      if (req.file) {
        await removeImageFile(`/uploads/products/${req.file.filename}`);
      }

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const {
      name,
      category,
      price,
      litre,
      stock,
      lowStockThreshold,
    } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        if (req.file) {
          await removeImageFile(`/uploads/products/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      updates.name = name.trim();
    }

    if (category !== undefined) {
      if (!mongoose.isValidObjectId(category)) {
        if (req.file) {
          await removeImageFile(`/uploads/products/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      updates.category = category;
    }

    if (price !== undefined) {
      const result = parseNumber(price, "Price");

      if (result.error) {
        if (req.file) {
          await removeImageFile(`/uploads/products/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      updates.price = result.value;
    }

    if (litre !== undefined) {
      if (typeof litre !== "string" || !litre.trim()) {
        if (req.file) {
          await removeImageFile(`/uploads/products/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: "Litre must be a non-empty string",
        });
      }

      updates.litre = litre.trim();
    }

    if (stock !== undefined) {
      const result = parseNumber(stock, "Stock", {
        integer: true,
      });

      if (result.error) {
        if (req.file) {
          await removeImageFile(`/uploads/products/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      updates.stock = result.value;
    }

    if (lowStockThreshold !== undefined) {
      const result = parseNumber(
        lowStockThreshold,
        "Low stock threshold",
        { integer: true }
      );

      if (result.error) {
        if (req.file) {
          await removeImageFile(`/uploads/products/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      updates.lowStockThreshold = result.value;
    }

    if (req.file) {
      updates.imageURL = `/uploads/products/${req.file.filename}`;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field or image to update",
      });
    }

    Object.assign(product, updates);
    await product.save();

    // Remove previous image only after successful database save
    if (req.file && product.imageURL !== updates.imageURL) {
      // This condition is normally false after Object.assign,
      // so use the old image URL captured before updating.
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    if (req.file) {
      await removeImageFile(`/uploads/products/${req.file.filename}`);
    }

    console.error("Update product error:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
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

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await Product.findByIdAndDelete(id);

    if (product.imageURL) {
      await removeImageFile(product.imageURL);
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};
