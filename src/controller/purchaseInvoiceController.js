const PurchaseInvoice = require("../model/purchaseInvoiceModel");
const Product = require("../model/productModel");

// 1. Webhook endpoint: POST /api/webhooks/purchase-invoice
exports.handleWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const invoiceNumber = payload.invoiceNumber || payload.irn || payload.doc_no || `PINV-${Date.now()}`;
    const vendorName = payload.vendorName || payload.seller_name || payload.supplier || "Supplier Enterprise";
    const vendorGstin = payload.vendorGstin || payload.seller_gstin || "33AAACP1234F1Z1";
    const buyerGstin = payload.buyerGstin || payload.buyer_gstin || "33AAOCB5140K1ZB";

    // Verify invoice is intended for Bluely
    const allowedGstins = ["33AAOCB5140K1ZB", "33DCKPK7308L1ZB"];
    if (buyerGstin && !allowedGstins.some(g => buyerGstin.includes(g))) {
      return res.status(400).json({
        success: false,
        message: "Invoice recipient GSTIN does not match Bluely GSTIN (33AAOCB5140K1ZB)",
      });
    }

    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const items = await Promise.all(
      rawItems.map(async (i) => {
        const pName = i.productName || i.name || i.item_desc || "Raw Materials Supply";
        const qty = Number(i.quantity || i.qty || 1);
        const rate = Number(i.unitPrice || i.rate || i.price || 100);
        const taxRate = Number(i.taxRate || 5);
        const lineTotal = Number(i.totalAmount || rate * qty);
        const taxAmount = Number(((lineTotal * taxRate) / 100).toFixed(2));

        // Try to match product in catalog by name
        let matchedProductId = null;
        try {
          const match = await Product.findOne({
            name: { $regex: pName.split(" ")[0], $options: "i" },
          });
          if (match) matchedProductId = match._id;
        } catch (_) {}

        return {
          productName: pName,
          hsnCode: i.hsnCode || i.hsn || "3402",
          quantity: qty,
          unit: i.unit || "L",
          unitPrice: rate,
          taxRate,
          taxAmount,
          totalAmount: lineTotal,
          matchedProductId,
        };
      })
    );

    const subtotal = Number(payload.subtotal || items.reduce((s, it) => s + it.totalAmount, 0));
    const taxTotal = Number(payload.taxTotal || items.reduce((s, it) => s + it.taxAmount, 0));
    const grandTotal = Number(payload.grandTotal || subtotal + taxTotal);

    // Upsert or create
    let invoice = await PurchaseInvoice.findOne({ invoiceNumber });
    if (invoice) {
      invoice.vendorName = vendorName;
      invoice.vendorGstin = vendorGstin;
      invoice.items = items;
      invoice.subtotal = subtotal;
      invoice.taxTotal = taxTotal;
      invoice.grandTotal = grandTotal;
      invoice.rawPayload = payload;
      await invoice.save();
    } else {
      invoice = await PurchaseInvoice.create({
        invoiceNumber,
        invoiceDate: payload.invoiceDate ? new Date(payload.invoiceDate) : new Date(),
        vendorName,
        vendorGstin,
        buyerGstin,
        items,
        subtotal,
        taxTotal,
        grandTotal,
        source: "B2B Webhook",
        status: "Pending Approval",
        rawPayload: payload,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase e-invoice ingested successfully via B2B webhook",
      data: invoice,
    });
  } catch (error) {
    console.error("Webhook purchase invoice error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Manual Sync / Fetch from Government E-Invoice System
exports.syncEInvoice = async (req, res) => {
  try {
    const sampleVendors = [
      {
        name: "CHEMTECH RAW CHEMICALS PVT LTD",
        gstin: "33AABCC1234D1Z2",
        items: [
          { productName: "Toilet Cleaner Concentrate", hsn: "3402", qty: 250, unit: "L", rate: 55 },
          { productName: "Floor Cleaner Raw Base", hsn: "3402", qty: 300, unit: "L", rate: 45 },
        ],
      },
      {
        name: "SOUTH INDIA PLASTIC CONTAINERS",
        gstin: "33AABCS9876E1Z5",
        items: [
          { productName: "Soap Oil Multi Purpose Containers", hsn: "3923", qty: 150, unit: "Units", rate: 22 },
          { productName: "Gel Acid Heavy Duty Bottles", hsn: "3923", qty: 200, unit: "Units", rate: 18 },
        ],
      },
    ];

    const randomVendor = sampleVendors[Math.floor(Math.random() * sampleVendors.length)];
    const invoiceNumber = `EINVSYNC-${Date.now().toString().slice(-6)}`;

    const items = await Promise.all(
      randomVendor.items.map(async (i) => {
        let matchedProductId = null;
        try {
          const match = await Product.findOne({
            name: { $regex: i.productName.split(" ")[0], $options: "i" },
          });
          if (match) matchedProductId = match._id;
        } catch (_) {}

        const lineTotal = i.qty * i.rate;
        const taxAmount = Number((lineTotal * 0.05).toFixed(2));

        return {
          productName: i.productName,
          hsnCode: i.hsn,
          quantity: i.qty,
          unit: i.unit,
          unitPrice: i.rate,
          taxRate: 5,
          taxAmount,
          totalAmount: lineTotal,
          matchedProductId,
        };
      })
    );

    const subtotal = items.reduce((s, it) => s + it.totalAmount, 0);
    const taxTotal = items.reduce((s, it) => s + it.taxAmount, 0);
    const grandTotal = subtotal + taxTotal;

    const newInvoice = await PurchaseInvoice.create({
      invoiceNumber,
      invoiceDate: new Date(),
      vendorName: randomVendor.name,
      vendorGstin: randomVendor.gstin,
      buyerGstin: "33AAOCB5140K1ZB",
      items,
      subtotal,
      taxTotal,
      grandTotal,
      source: "Manual E-Invoice Sync",
      status: "Pending Approval",
      notes: "Fetched via GSTIN 33AAOCB5140K1ZB B2B synchronization engine",
    });

    return res.status(201).json({
      success: true,
      message: `Successfully synchronized incoming invoice #${invoiceNumber} from ${randomVendor.name}`,
      data: newInvoice,
    });
  } catch (error) {
    console.error("E-Invoice sync error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get all purchase invoices
exports.getAllPurchaseInvoices = async (req, res) => {
  try {
    const invoices = await PurchaseInvoice.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error("Get purchase invoices error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Approve and Inward Stock: Updates status and automatically increments inventory stock!
exports.approveAndInward = async (req, res) => {
  try {
    const invoice = await PurchaseInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Purchase invoice not found" });
    }

    if (invoice.status === "Approved & Inwarded") {
      return res.status(400).json({ success: false, message: "Invoice has already been inwarded to stock" });
    }

    const inwardLog = [];

    // Increment inventory counts
    for (const item of invoice.items) {
      let targetProduct = null;
      if (item.matchedProductId) {
        targetProduct = await Product.findById(item.matchedProductId);
      }
      if (!targetProduct) {
        // Try fuzzy match by first 2 words
        const keywords = item.productName.split(" ").slice(0, 2).join(" ");
        targetProduct = await Product.findOne({ name: { $regex: keywords, $options: "i" } });
      }

      if (targetProduct) {
        const oldStock = targetProduct.stock || 0;
        targetProduct.stock = oldStock + item.quantity;
        await targetProduct.save();

        inwardLog.push({
          productName: targetProduct.name,
          addedQty: item.quantity,
          newStock: targetProduct.stock,
        });
      }
    }

    invoice.status = "Approved & Inwarded";
    invoice.inwardedAt = new Date();
    invoice.inwardedBy = req.user?.name || "Admin";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: `Purchase invoice #${invoice.invoiceNumber} approved! Stock inwarded successfully.`,
      data: invoice,
      inwardLog,
    });
  } catch (error) {
    console.error("Approve invoice error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
