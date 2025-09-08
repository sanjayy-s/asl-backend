// backend/controllers/authController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// Helper function to create a signed JWT
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // The token will be valid for 30 days
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { name, email, dob } = req.body;

  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create a new user with the provided details
    const newUser = await User.create({
      email,
      dob,
      profile: { 
          name, 
          // Initialize other profile fields as null or with default values
          age: null, 
          position: null, 
          imageUrl: null,
          year: null,
          mobile: null,
      },
    });

    // Create a token for the new user
    const token = createToken(newUser._id);

    // Send back the token and user data (excluding sensitive info)
    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        email: newUser.email,
        profile: newUser.profile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, dob } = req.body;

  try {
    // IMPROVEMENT: Convert email to lowercase to make login case-insensitive
    const user = await User.findOne({ email: email.toLowerCase() });

    // Check if user exists AND if the date of birth matches
    if (!user || user.dob !== dob) {
      return res.status(401).json({ message: 'Invalid credentials. Please check your email and date of birth.' });
    }

    // If credentials are correct, create a token
    const token = createToken(user._id);

    // Send back the token and user data
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

module.exports = { register, login };