const express = require("express");
const router = express.Router();
const { verifyTokenOptional } = require("../middleware/authMiddleware");
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controller/customerController");

router.get("/", verifyTokenOptional, getAllCustomers);
router.post("/", verifyTokenOptional, createCustomer);
router.get("/:id", verifyTokenOptional, getCustomerById);
router.put("/:id", verifyTokenOptional, updateCustomer);
router.delete("/:id", verifyTokenOptional, deleteCustomer);

module.exports = router;
