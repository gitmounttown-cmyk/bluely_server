const mongoose = require("mongoose");

const purchaseInvoiceItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  hsnCode: { type: String, default: "3402" },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, default: "L" },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 5 }, // 5% GST
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  matchedProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
});

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },
    vendorGstin: {
      type: String,
      required: true,
      trim: true,
    },
    buyerGstin: {
      type: String,
      required: true,
      default: "33AAOCB5140K1ZB", // Bluely Chemical Private Limited GSTIN
    },
    items: [purchaseInvoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending Approval", "Approved & Inwarded", "Rejected"],
      default: "Pending Approval",
    },
    source: {
      type: String,
      enum: ["B2B Webhook", "Manual E-Invoice Sync", "Manual Upload"],
      default: "B2B Webhook",
    },
    inwardedAt: {
      type: Date,
    },
    inwardedBy: {
      type: String,
      default: "Admin",
    },
    rawPayload: {
      type: Object,
      default: {},
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

purchaseInvoiceSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
purchaseInvoiceSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("PurchaseInvoice", purchaseInvoiceSchema);
