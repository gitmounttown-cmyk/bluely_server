const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile_number: { type: String, trim: true, default: "" },
  address: { type: String, default: "" },
  role: { type: String, enum: ['Admin', 'Cashier', 'Inventory Manager', 'Customer', 'User'], default: 'Customer' }
}, { timestamps: true });

// Alias phone virtual for backward compatibility
userSchema.virtual('phone').get(function() {
  return this.mobile_number;
}).set(function(v) {
  this.mobile_number = v;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
