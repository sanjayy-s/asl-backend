// backend/routes/tournamentRoutes.js
const express = require('express');
const {
  createTournament,
  getAllTournaments,
  joinTournament,
  getTournamentById,
  updateTournament,
  addTeamToTournament,
  scheduleMatches,
  addMatchManually,
  updateMatchDetails,
  deleteMatch,
  startMatch,
  endMatch,
  recordGoal,
  recordCard,
  setPlayerOfTheMatch,
} = require('../controllers/tournamentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect); // Protect all tournament routes

router.route('/')
  .get(getAllTournaments)
  .post(createTournament);

router.route('/join').post(joinTournament);

router.route('/:id').get(getTournamentById).put(updateTournament);

router.route('/:id/teams').post(addTeamToTournament);
router.route('/:id/schedule').post(scheduleMatches);

// Match-specific routes
router.route('/:id/matches').post(addMatchManually);
router.route('/:id/matches/:matchId').put(updateMatchDetails).delete(deleteMatch);
router.route('/:id/matches/:matchId/start').put(startMatch);
router.route('/:id/matches/:matchId/end').put(endMatch);
router.route('/:id/matches/:matchId/potm').put(setPlayerOfTheMatch);

// Live scoring routes
router.route('/:id/matches/:matchId/goals').post(recordGoal);
router.route('/:id/matches/:matchId/cards').post(recordCard);

module.exports = router;
