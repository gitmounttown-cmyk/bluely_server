const express = require('express');
const router = express.Router();
const { getAddressesByEmail, saveAddresses } = require('../controller/addressController');

router.get('/:email', getAddressesByEmail);
router.put('/', saveAddresses);

module.exports = router;
