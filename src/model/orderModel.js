const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    volume: {
      type: String,
      default: "1L",
      trim: true,
    },
    hsnCode: {
      type: String,
      default: "9018",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: () => `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
    },

    invoiceNo: {
      type: String,
      trim: true,
      default: () => `V26-${Math.floor(100 + Math.random() * 900)}`,
    },

    deliveryNote: {
      type: String,
      trim: true,
      default: () => `DNTV26-${Math.floor(100 + Math.random() * 900)}`,
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    dispatchedThrough: {
      type: String,
      default: "Direct",
      trim: true,
    },

    dispatchedDate: {
      type: Date,
      default: Date.now,
    },

    termsOfDelivery: {
      type: String,
      default: "Direct Delivery",
      trim: true,
    },

    termsOfPayment: {
      type: String,
      default: "Bank Transfer (Days / Weeks / Month based delay)",
      trim: true,
    },

    // Hospital or Company Details
    hospitalOrCompanyName: {
      type: String,
      default: "",
      trim: true,
    },

    buyerGstin: {
      type: String,
      default: "",
      trim: true,
    },

    buyerAddress: {
      type: String,
      default: "",
      trim: true,
    },

    // Linked user reference for website customer profile order histories
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    customerName: {
      type: String,
      default: "Ganga Medical Centre and Hospitals Pvt Ltd",
      trim: true,
    },

    customerEmail: {
      type: String,
      default: "",
      trim: true,
    },

    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },

    shippingAddress: {
      type: String,
      default: "",
      trim: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "An order must contain at least one item",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    sgst: {
      type: Number,
      default: 0,
      min: 0,
    },

    cgst: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      default: "Bank Transfer",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Partially Paid", "Overdue", "Cancelled"],
      default: "Pending",
    },

    status: {
      type: String,
      default: "Pending",
    },

    orderStatus: {
      type: String,
      default: "Pending",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    bankReference: {
      type: String,
      default: "",
      trim: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    stockDeducted: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
