
const express = require("express");
const router = express.Router();

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controller/categoryController");

// CREATE CATEGORY
// POST /api/categories
router.post("/create", createCategory);

// GET ALL CATEGORIES
// GET /api/categories
router.get("/all", getAllCategories);

// GET CATEGORY BY ID
// GET /api/categories/:id
router.get("/:id", getCategoryById);

// UPDATE CATEGORY
// PUT /api/categories/:id
router.put("/update/:id", updateCategory);

// DELETE CATEGORY
// DELETE /api/categories/:id
router.delete("/delete/:id", deleteCategory);

module.exports = router;
