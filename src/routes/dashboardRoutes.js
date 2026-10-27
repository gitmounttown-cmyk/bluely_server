const express = require("express");
const router = express.Router();
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");
const { getDashboardStats } = require("../controller/dashboardController");

// GET /api/dashboard/stats
router.get("/stats", verifyToken, allowRoles("Admin", "Cashier"), getDashboardStats);

module.exports = router;