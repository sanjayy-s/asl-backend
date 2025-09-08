// backend/routes/teamRoutes.js
const express = require('express');
const {
  createTeam,
  getAllTeams,
  joinTeam,
  getTeamById,
  updateTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  toggleTeamAdmin,
  setTeamRole,
} = require('../controllers/teamController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all team routes
router.use(protect);

router.route('/')
  .get(getAllTeams)
  .post(createTeam);
  
router.route('/join').post(joinTeam);

router.route('/:id').get(getTeamById).put(updateTeam);

router.route('/:id/members').post(addMemberToTeam);
router.route('/:id/members/:memberId').delete(removeMemberFromTeam);

router.route('/:id/admins/:memberId').put(toggleTeamAdmin);
router.route('/:id/roles').put(setTeamRole);

module.exports = router;
