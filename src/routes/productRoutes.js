const express = require("express");
const router = express.Router();
const uploadProductImage = require("../middleware/uploadMiddleware");
const { verifyToken, verifyTokenOptional, allowRoles } = require("../middleware/authMiddleware");

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controller/productController");

// Public / Guest & Logged-in users can view products
router.get("/all", verifyTokenOptional, getAllProducts);
router.get("/:id", verifyTokenOptional, getProductById);

// Admin-only management routes
router.post("/create", verifyToken, allowRoles("Admin"), uploadProductImage.single("image"), createProduct);
router.put("/update/:id", verifyToken, allowRoles("Admin"), uploadProductImage.single("image"), updateProduct);
router.delete("/delete/:id", verifyToken, allowRoles("Admin"), deleteProduct);

module.exports = router;