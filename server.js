// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // This loads the variables from .env at the very top

// --- 1. IMPORT ALL ROUTE FILES ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');

// --- 2. IMPORT ERROR MIDDLEWARE ---
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Initialize the Express app
const app = express();

// --- 3. CONFIGURE CORE MIDDLEWARE ---
// Enable Cross-Origin Resource Sharing for your frontend to communicate with this backend.
app.use(cors());
// Enable the server to accept and parse JSON in the request body.
// The 'limit' is increased to handle potentially large base64 image strings.
app.use(express.json({ limit: '5mb' }));
// Enable the server to parse URL-encoded data.
app.use(express.urlencoded({ extended: true, limit: '5mb' }));


// --- 4. MOUNT API ROUTES ---
// Any request starting with '/api/auth' will be handled by authRoutes.
app.use('/api/auth', authRoutes);
// Any request starting with '/api/users' will be handled by userRoutes.
app.use('/api/users', userRoutes);
// Any request starting with '/api/teams' will be handled by teamRoutes.
app.use('/api/teams', teamRoutes);
// Any request starting with '/api/tournaments' will be handled by tournamentRoutes.
app.use('/api/tournaments', tournamentRoutes);


// --- 5. CONFIGURE ERROR HANDLING MIDDLEWARE ---
// These MUST be placed AFTER all your API routes have been defined.
// If a request doesn't match any of the routes above, it falls through to here.
app.use(notFound);
// This is the final catch-all for any other errors that might occur.
app.use(errorHandler);


// --- 6. DEFINE PORT AND START SERVER ---
const PORT = process.env.PORT || 5001;

// Connect to the MongoDB database using the URI from your .env file.
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    // If the database connection is successful, start the Express server.
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} and connected to MongoDB`);
    });
  })
  .catch((error) => {
    // If the connection fails, log the error and do not start the server.
    console.error('Failed to connect to MongoDB', error);
  });
