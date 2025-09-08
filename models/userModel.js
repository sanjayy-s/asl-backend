// backend/models/userModel.js
const mongoose = require('mongoose');

const playerProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, default: null },
  position: { type: String, default: null },
  imageUrl: { type: String, default: null },
  year: { type: String, default: null },
  mobile: { type: String, default: null },
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  dob: { type: String, required: true }, // Storing as YYYY-MM-DD string
  profile: playerProfileSchema,
}, { timestamps: true }); // `timestamps` adds createdAt and updatedAt fields automatically

const User = mongoose.model('User', userSchema);
module.exports = User;
