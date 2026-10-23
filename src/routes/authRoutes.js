
const express = require("express");
const router = express.Router();

const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controller/authController");

// Create user
router.post("/create", createUser);

// Get all users
router.get("/all", getAllUsers);

// Get user by ID
router.get("/:id", getUserById);

// Update user
router.put("/update/:id", updateUser);

// Delete user
router.delete("/delete/:id", deleteUser);

module.exports = router;
