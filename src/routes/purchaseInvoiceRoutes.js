const express = require("express");
const router = express.Router();
const { verifyTokenOptional } = require("../middleware/authMiddleware");
const {
  handleWebhook,
  syncEInvoice,
  getAllPurchaseInvoices,
  approveAndInward,
} = require("../controller/purchaseInvoiceController");

// Public webhook endpoint for vendor ERPs
router.post("/webhooks/purchase-invoice", handleWebhook);

// Admin management endpoints
router.get("/purchase-invoices", verifyTokenOptional, getAllPurchaseInvoices);
router.post("/purchase-invoices/sync-einvoice", verifyTokenOptional, syncEInvoice);
router.patch("/purchase-invoices/:id/approve", verifyTokenOptional, approveAndInward);

module.exports = router;
