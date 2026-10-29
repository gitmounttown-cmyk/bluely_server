const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getMe,
} = require("../controller/authController");

// Authentication Routes matching frontend requests
router.post("/signup", createUser);
router.post("/register", createUser); // Aliased for website registration
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.get("/me", verifyToken, getMe);

// User Management Routes
router.get("/all", getAllUsers);
router.get("/:id", getUserById);
router.put("/update/:id", updateUser);
router.delete("/delete/:id", deleteUser);

module.exports = router;
