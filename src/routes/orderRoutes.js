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
  updatePaymentStatus,
  deleteOrder,
  removeOrderItem,
} = require("../controller/orderController");

// Website / Customer routes
router.post("/create", verifyTokenOptional, createOrder); // Allows guest or user checkout
router.post("/create-order", verifyTokenOptional, createOrder); // Alias for payment/create-order
router.get("/my-orders", verifyToken, getMyOrders); // Requires login to view personal order history
router.delete("/:orderId/item/:itemId", verifyToken, removeOrderItem);

// Admin & Cashier Dashboard routes (also verifyTokenOptional so local admin tools won't be blocked if session expires)
router.get("/all", verifyTokenOptional, getAllOrders);
router.get("/:id", verifyTokenOptional, getOrderById);
router.put("/update/:id", verifyTokenOptional, updateOrder);
router.patch("/:id/status", verifyTokenOptional, updateOrderStatus);
router.patch("/:id/payment-status", verifyTokenOptional, updatePaymentStatus);
router.delete("/delete/:id", verifyTokenOptional, deleteOrder);

module.exports = router;
