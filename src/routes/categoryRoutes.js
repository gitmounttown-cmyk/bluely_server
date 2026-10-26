const express = require("express");
const router = express.Router();
const uploadCategoryImage = require("../middleware/uploadCategoryMiddleware");

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controller/categoryController");

// CREATE CATEGORY (with single image file upload)
router.post("/create", uploadCategoryImage.single("image"), createCategory);

// GET ALL CATEGORIES
router.get("/all", getAllCategories);

// GET CATEGORY BY ID
router.get("/:id", getCategoryById);

// UPDATE CATEGORY (with optional new image file upload)
router.put("/update/:id", uploadCategoryImage.single("image"), updateCategory);

// DELETE CATEGORY
router.delete("/delete/:id", deleteCategory);

module.exports = router;