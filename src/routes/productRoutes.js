const express = require("express");
const router = express.Router();
const uploadProductImage = require("../middleware/uploadMiddleware");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controller/productController");

// Create product with image (Admin Only)[cite: 23]
router.post(
  "/create",
  verifyToken,
  allowRoles("Admin"),
  uploadProductImage.single("image"),
  createProduct
);

// Get all products (Admin & Cashier - needed for POS billing catalog)[cite: 23]
router.get("/all", verifyToken, allowRoles("Admin", "Cashier"), getAllProducts);

// Get product by ID (Admin & Cashier)[cite: 23]
router.get("/:id", verifyToken, allowRoles("Admin", "Cashier"), getProductById);

// Update product with optional replacement image (Admin Only)[cite: 23]
router.put(
  "/update/:id",
  verifyToken,
  allowRoles("Admin"),
  uploadProductImage.single("image"),
  updateProduct
);

// Delete product and its image (Admin Only)[cite: 23]
router.delete("/delete/:id", verifyToken, allowRoles("Admin"), deleteProduct);

module.exports = router;