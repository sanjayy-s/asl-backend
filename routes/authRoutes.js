// backend/routes/authRoutes.js
const express = require('express');
const { register, login } = require('../controllers/authController');
const router = express.Router();

// These routes are public and do not use the 'protect' middleware.
// A user needs to be able to register and log in before they have a token.
router.post('/register', register);
router.post('/login', login);

module.exports = router;
