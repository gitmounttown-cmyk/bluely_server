const express = require("express");
const router = express.Router();
const { verifyToken, verifyTokenOptional, allowRoles } = require("../middleware/authMiddleware");

const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  removeOrderItem,
} = require("../controller/orderController");

// Website / Customer routes
router.post("/create", verifyTokenOptional, createOrder); // Allows guest or user checkout
router.post("/create-order", verifyTokenOptional, createOrder); // Alias for payment/create-order
router.get("/my-orders", verifyToken, getMyOrders); // Requires login to view personal order history
router.delete("/:orderId/item/:itemId", verifyToken, removeOrderItem);

// Admin & Cashier Dashboard routes
router.get("/all", verifyToken, allowRoles("Admin", "Cashier"), getAllOrders);
router.get("/:id", verifyToken, allowRoles("Admin", "Cashier"), getOrderById);
router.put("/update/:id", verifyToken, allowRoles("Admin", "Cashier"), updateOrder);
router.patch("/:id/status", verifyToken, allowRoles("Admin", "Cashier"), updateOrderStatus);
router.delete("/delete/:id", verifyToken, allowRoles("Admin"), deleteOrder);

module.exports = router;
