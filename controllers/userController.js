// backend/controllers/userController.js
const User = require('../models/userModel');

// @desc    Get current logged-in user's profile
// @route   GET /api/users/profile
// @access  Private
const getMyProfile = async (req, res) => {
  // The 'protect' middleware has already found the user and attached it to req.user.
  // We just need to send it back as the response. This is the fix.
  if (req.user) {
    res.json(req.user);
  } else {
    // This case should not be reached if 'protect' middleware is working correctly.
    res.status(404).json({ message: 'User not found' });
  }
};


// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    // We use .select('-dob') to exclude the date of birth for privacy
    const user = await User.findById(req.params.id).select('-dob');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update current user's profile
// @route   PUT /api/users/profile
// @access  Private
const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      // Only update the profile sub-document
      user.profile.name = req.body.name || user.profile.name;
      user.profile.age = req.body.age || user.profile.age;
      user.profile.position = req.body.position || user.profile.position;
      user.profile.imageUrl = req.body.imageUrl ?? user.profile.imageUrl;
      user.profile.year = req.body.year || user.profile.year;
      user.profile.mobile = req.body.mobile || user.profile.mobile;

      await user.save();

      // Return the updated full user (excluding dob)
      const updatedUser = await User.findById(req.user.id).select('-dob');

      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


module.exports = {
  getMyProfile,
  getUserById,
  updateMyProfile,
};