const express = require("express");
const router = express.Router();
const uploadDealerDocuments = require("../middleware/uploadDealerMiddleware");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");
const {
  getAllDealers,
  createDealerRequest,
  approveDealer,
} = require("../controller/dealerController");

// Public route to submit dealer application with multipart/form-data documents
router.post("/create", uploadDealerDocuments, createDealerRequest);

// Protected routes for Admin and Cashier review
router.get("/all", verifyToken, allowRoles("Admin", "Cashier"), getAllDealers);
router.patch("/:id/approve", verifyToken, allowRoles("Admin", "Cashier"), approveDealer);

module.exports = router;