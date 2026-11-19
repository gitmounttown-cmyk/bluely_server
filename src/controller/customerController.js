const Customer = require("../model/customerModel");

// Get all customers (with optional search)
exports.getAllCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { isDeleted: false };

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { gstin: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single customer
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    return res.status(200).json({ success: true, data: customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const { name, mobile, email, gstin, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }
    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: "Customer address is required" });
    }

    const customer = await Customer.create({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim() : "",
      gstin: gstin ? gstin.trim().toUpperCase() : "",
      address: address.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update an existing customer
exports.updateCustomer = async (req, res) => {
  try {
    const { name, mobile, email, gstin, address } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (mobile) updateData.mobile = mobile.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (gstin !== undefined) updateData.gstin = gstin.trim().toUpperCase();
    if (address) updateData.address = address.trim();

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a customer (soft delete)
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
