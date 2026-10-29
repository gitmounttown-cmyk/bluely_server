const express = require("express");
const router = express.Router();
const uploadMiddleware = require("../middleware/uploadMiddleware"); // Uses your existing product/image upload middleware
const { verifyToken, verifyTokenOptional, allowRoles } = require("../middleware/authMiddleware");

const {
  getAllWhyChooseUs,
  createWhyChooseUs,
  deleteWhyChooseUs,
} = require("../controller/whyChooseUsController");

// Public route: Website visitors can fetch the features
router.get("/all", verifyTokenOptional, getAllWhyChooseUs);

// Admin routes: Only Admin can create or delete features
router.post(
  "/create",
  verifyToken,
  allowRoles("Admin"),
  uploadMiddleware.single("image"),
  createWhyChooseUs
);

router.delete(
  "/delete/:id",
  verifyToken,
  allowRoles("Admin"),
  deleteWhyChooseUs
);

module.exports = router;