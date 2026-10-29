const Address = require('../model/addressModel');

exports.getAddressesByEmail = async (req, res) => {
  try {
    const email = req.params.email?.toLowerCase().trim();
    const entry = await Address.findOne({ email });
    res.status(200).json(entry ? entry.addresses : []);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveAddresses = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const addresses = req.body.addresses || [];

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const updated = await Address.findOneAndUpdate(
      { email },
      { email, addresses },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, addresses: updated.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
