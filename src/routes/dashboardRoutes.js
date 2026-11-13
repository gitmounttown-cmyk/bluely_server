const express = require("express");
const router = express.Router();
const { verifyTokenOptional } = require("../middleware/authMiddleware");
const { getDashboardStats } = require("../controller/dashboardController");

// GET /api/dashboard/stats
router.get("/stats", verifyTokenOptional, getDashboardStats);

module.exports = router;
