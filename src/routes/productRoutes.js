
const express = require("express");
const router = express.Router();

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getInventorySummary,
} = require("../controller/productController");

// Create
router.post("/create", createProduct);

// Inventory summary - keep before /:id
router.get("/inventory/summary", getInventorySummary);

// Get all products; supports search, category and stock filters
router.get("/all", getAllProducts);

// Get one product
router.get("/:id", getProductById);

// Update
router.put("/update/:id", updateProduct);

// Delete
router.delete("/delete/:id", deleteProduct);

module.exports = router;
