// backend/routes/userRoutes.js
const express = require('express');
const { getMyProfile, getUserById, updateMyProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes in this file are protected
router.use(protect);

// Routes for the currently logged-in user's profile
router.route('/profile')
  .get(getMyProfile)       // GET /api/users/profile
  .put(updateMyProfile);    // PUT /api/users/profile

// Route for getting any user's public profile by their ID
router.route('/:id').get(getUserById); // GET /api/users/:id

module.exports = router;