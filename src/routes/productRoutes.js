
const express = require("express");
const router = express.Router();

const uploadProductImage = require("../middleware/uploadMiddleware");

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controller/productController");

// Create product with image
router.post(
  "/create",
  uploadProductImage.single("image"),
  createProduct
);

// Get all products
router.get("/all", getAllProducts);

// Get product by ID
router.get("/:id", getProductById);

// Update product with optional replacement image
router.put(
  "/update/:id",
  uploadProductImage.single("image"),
  updateProduct
);

// Delete product and its image
router.delete("/delete/:id", deleteProduct);

module.exports = router;
