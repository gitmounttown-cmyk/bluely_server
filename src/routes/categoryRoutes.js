const express = require("express");
const router = express.Router();
const uploadCategoryImage = require("../middleware/uploadCategoryMiddleware");
const { verifyToken, verifyTokenOptional, allowRoles } = require("../middleware/authMiddleware");

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controller/categoryController");

// Public browsing for website visitors
router.get("/all", verifyTokenOptional, getAllCategories);
router.get("/:id", verifyTokenOptional, getCategoryById);

// Admin-only management
router.post("/create", verifyToken, allowRoles("Admin"), uploadCategoryImage.single("image"), createCategory);
router.put("/update/:id", verifyToken, allowRoles("Admin"), uploadCategoryImage.single("image"), updateCategory);
router.delete("/delete/:id", verifyToken, allowRoles("Admin"), deleteCategory);

module.exports = router;