// backend/controllers/teamController.js
const Team = require('../models/teamModel');
const User = require('../models/userModel');

const generateInviteCode = (length = 8) => Math.random().toString(36).substring(2, 2 + length).toUpperCase();

// A helper to populate team data consistently
const populateTeamData = (query) => {
  return query.populate({
    path: 'members adminIds captainId viceCaptainId',
    select: '-dob', // Exclude DOB for privacy
  });
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private
const getAllTeams = async (req, res) => {
  try {
    const teams = await populateTeamData(Team.find({}));
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private
const createTeam = async (req, res) => {
  const { name, logoUrl } = req.body;
  const adminId = req.user._id;

  try {
    const newTeam = await Team.create({
      name,
      logoUrl,
      adminIds: [adminId],
      members: [adminId],
      inviteCode: generateInviteCode(),
    });

    const populatedTeam = await populateTeamData(Team.findById(newTeam._id));
    res.status(201).json(populatedTeam);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Join a team with an invite code
// @route   POST /api/teams/join
// @access  Private
const joinTeam = async (req, res) => {
  const { code } = req.body;
  const userId = req.user._id;

  try {
    const team = await Team.findOne({ inviteCode: code.toUpperCase() });

    if (!team) {
      return res.status(404).json({ message: 'Team not found with this invite code' });
    }

    if (team.members.includes(userId)) {
      return res.status(400).json({ message: 'You are already in this team' });
    }

    team.members.push(userId);
    await team.save();

    const populatedTeam = await populateTeamData(Team.findById(team._id));
    res.status(200).json(populatedTeam);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private
const getTeamById = async (req, res) => {
  try {
    const team = await populateTeamData(Team.findById(req.params.id));

    if (team) {
      res.json(team);
    } else {
      res.status(404).json({ message: 'Team not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update team details
// @route   PUT /api/teams/:id
// @access  Private (Admin only)
const updateTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // FIX: Use .some() and .equals() for correct ObjectId comparison.
    if (!team.adminIds.some(adminId => adminId.equals(req.user._id))) {
      return res.status(403).json({ message: 'Not authorized to update this team' });
    }

    team.name = req.body.name || team.name;
    team.logoUrl = req.body.logoUrl ?? team.logoUrl;

    await team.save();
    const populatedTeam = await populateTeamData(Team.findById(team._id));
    res.json(populatedTeam);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Add a member to a team
// @route   POST /api/teams/:id/members
// @access  Private (Admin only)
const addMemberToTeam = async (req, res) => {
  const { memberId } = req.body; // memberId is the unique player ID from frontend
  const { id: teamId } = req.params;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // FIX: Use .some() and .equals() for correct ObjectId comparison.
    if (!team.adminIds.some(adminId => adminId.equals(req.user._id))) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const user = await User.findById(memberId);
    if (!user) return res.status(404).json({ success: false, message: "User not found with that ID" });

    if (team.members.some(m => m.equals(memberId))) {
      return res.status(400).json({ success: false, message: "User is already in team" });
    }

    team.members.push(memberId);
    await team.save();
    const populatedTeam = await populateTeamData(Team.findById(teamId));
    res.json({ success: true, message: 'Member added successfully', team: populatedTeam });
  } catch (error) {
     res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Remove a member from a team
// @route   DELETE /api/teams/:id/members/:memberId
// @access  Private (Admin only)
const removeMemberFromTeam = async (req, res) => {
    const { id: teamId, memberId } = req.params;

    try {
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        // FIX: Use .some() and .equals() for correct ObjectId comparison.
        if (!team.adminIds.some(adminId => adminId.equals(req.user._id))) {
            return res.status(403).json({ message: "Not authorized" });
        }
        
        // Remove member from all roles and lists
        team.members = team.members.filter(id => !id.equals(memberId));
        team.adminIds = team.adminIds.filter(id => !id.equals(memberId));
        if (team.captainId && team.captainId.equals(memberId)) team.captainId = null;
        if (team.viceCaptainId && team.viceCaptainId.equals(memberId)) team.viceCaptainId = null;

        await team.save();
        const populatedTeam = await populateTeamData(Team.findById(teamId));
        res.json({ success: true, message: "Member removed successfully", team: populatedTeam });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Toggle a member's admin status
// @route   PUT /api/teams/:id/admins/:memberId
// @access  Private (Admin only)
const toggleTeamAdmin = async (req, res) => {
    const { id: teamId, memberId } = req.params;
    
    try {
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        // FIX: Use .some() and .equals() for correct ObjectId comparison.
        if (!team.adminIds.some(adminId => adminId.equals(req.user._id))) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const isAdmin = team.adminIds.some(adminId => adminId.equals(memberId));
        let message;
        if (isAdmin) {
            team.adminIds = team.adminIds.filter(id => !id.equals(memberId));
            message = "Admin status removed";
        } else {
            team.adminIds.push(memberId);
            message = "Admin status granted";
        }
        
        await team.save();
        const populatedTeam = await populateTeamData(Team.findById(teamId));
        res.json({ success: true, message, team: populatedTeam });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Set or remove a team role (captain/vice-captain)
// @route   PUT /api/teams/:id/roles
// @access  Private (Admin only)
const setTeamRole = async (req, res) => {
    const { memberId, role } = req.body;
    const { id: teamId } = req.params;

    try {
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        // FIX: Use .some() and .equals() for correct ObjectId comparison.
        if (!team.adminIds.some(adminId => adminId.equals(req.user._id))) {
            return res.status(403).json({ message: "Not authorized" });
        }
        
        let message = "";
        if (role === 'captain') {
            if (team.captainId && team.captainId.equals(memberId)) {
                team.captainId = null;
                message = "Captain removed";
            } else {
                team.captainId = memberId;
                message = "Captain set";
            }
        } else if (role === 'viceCaptain') {
            if (team.viceCaptainId && team.viceCaptainId.equals(memberId)) {
                team.viceCaptainId = null;
                message = "Vice-Captain removed";
            } else {
                team.viceCaptainId = memberId;
                message = "Vice-Captain set";
            }
        } else {
            return res.status(400).json({ message: "Invalid role specified" });
        }

        await team.save();
        const populatedTeam = await populateTeamData(Team.findById(teamId));
        res.json({ success: true, message, team: populatedTeam });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
  getAllTeams,
  createTeam,
  joinTeam,
  getTeamById,
  updateTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  toggleTeamAdmin,
  setTeamRole,
};