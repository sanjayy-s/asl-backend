// backend/controllers/tournamentController.js

const Tournament = require('../models/tournamentModel');
const Team = require('../models/teamModel');

const generateInviteCode = (length = 10) => Math.random().toString(36).substring(2, 2 + length).toUpperCase();

// Helper to populate tournament data
const populateTournamentData = (query) => {
  return query.populate({
    path: 'teams',
    populate: {
      path: 'members captainId viceCaptainId adminIds',
      model: 'User',
      select: '-dob',
    },
  }).populate({
    path: 'matches.teamAId matches.teamBId',
    model: 'Team',
    populate: { // This nested populate is the fix.
        path: 'members',
        model: 'User',
        select: '-dob'
    }
  }).populate({
    path: 'matches.goals.scorerId matches.goals.assistId matches.cards.playerId matches.playerOfTheMatchId',
    model: 'User',
    select: '-dob'
  });
};

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Private
const getAllTournaments = async (req, res) => {
  try {
    const tournaments = await populateTournamentData(Tournament.find({}));
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new tournament
// @route   POST /api/tournaments
// @access  Private
const createTournament = async (req, res) => {
  const { name, logoUrl } = req.body;
  const adminId = req.user._id;

  try {
    const newTournament = await Tournament.create({
      name,
      logoUrl,
      adminId,
      inviteCode: generateInviteCode(),
      teams: [],
      matches: [],
    });
    const populated = await populateTournamentData(Tournament.findById(newTournament._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get tournament by ID
// @route   GET /api/tournaments/:id
// @access  Private
const getTournamentById = async (req, res) => {
    try {
        const tournament = await populateTournamentData(Tournament.findById(req.params.id));
        if (tournament) {
            res.json(tournament);
        } else {
            res.status(404).json({ message: 'Tournament not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Join a tournament with an invite code
// @route   POST /api/tournaments/join
// @access  Private
const joinTournament = async (req, res) => {
    const { inviteCode, teamId } = req.body;
    try {
        const tournament = await Tournament.findOne({ inviteCode: inviteCode.toUpperCase() });
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found.' });

        if (tournament.teams.includes(teamId)) {
            return res.status(400).json({ success: false, message: 'This team is already in the tournament.' });
        }
        
        tournament.teams.push(teamId);
        await tournament.save();
        res.json({ success: true, message: 'Successfully joined tournament!', tournamentId: tournament._id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Admin-only actions from here

const checkAdmin = async (tournamentId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return { error: 'Tournament not found', status: 404 };
    if (tournament.adminId.toString() !== userId.toString()) {
        return { error: 'Not authorized', status: 403 };
    }
    return { tournament };
};

const updateTournament = async (req, res) => {
    const { error, status, tournament } = await checkAdmin(req.params.id, req.user._id);
    if (error) return res.status(status).json({ message: error });

    tournament.name = req.body.name || tournament.name;
    tournament.logoUrl = req.body.logoUrl ?? tournament.logoUrl;
    
    await tournament.save();
    const populated = await populateTournamentData(Tournament.findById(tournament._id));
    res.json(populated);
};

const addTeamToTournament = async (req, res) => {
    const { teamCodeOrId } = req.body;
    const { error, status, tournament } = await checkAdmin(req.params.id, req.user._id);
    if (error) return res.status(status).json({ message: error });

    const team = await Team.findOne({ $or: [{ _id: teamCodeOrId }, { inviteCode: teamCodeOrId }]});
    if (!team) return res.status(404).json({ success: false, message: "Team not found" });
    
    if (tournament.teams.includes(team._id)) return res.status(400).json({ success: false, message: "Team already in tournament" });
    
    tournament.teams.push(team._id);
    await tournament.save();
    res.json({ success: true, message: "Team added" });
};

const scheduleMatches = async (req, res) => {
    const { error, status, tournament } = await checkAdmin(req.params.id, req.user._id);
    if (error) return res.status(status).json({ message: error });
    
    const newMatches = [];
    let matchNumber = 1;
    for (let i = 0; i < tournament.teams.length; i++) {
        for (let j = i + 1; j < tournament.teams.length; j++) {
            newMatches.push({
                matchNumber: matchNumber++,
                teamAId: tournament.teams[i],
                teamBId: tournament.teams[j],
                round: 'League Stage',
                status: 'Scheduled',
            });
        }
    }
    tournament.matches = newMatches;
    tournament.isSchedulingDone = true;
    await tournament.save();
    res.json({ success: true, message: 'Matches scheduled' });
};

const addMatchManually = async (req, res) => {
    const { teamAId, teamBId, round } = req.body;
    const { error, status, tournament } = await checkAdmin(req.params.id, req.user._id);
    if (error) return res.status(status).json({ message: error });
    
    const newMatch = {
        matchNumber: (tournament.matches.length || 0) + 1,
        teamAId,
        teamBId,
        round,
        status: 'Scheduled',
    };
    tournament.matches.push(newMatch);
    await tournament.save();
    res.status(201).json({ success: true, message: "Match added" });
};

const updateMatchDetails = async (req, res) => {
    const { matchId, id: tournamentId } = req.params;
    const { teamAId, teamBId, date, time } = req.body;
    const { error, status, tournament } = await checkAdmin(tournamentId, req.user._id);
    if (error) return res.status(status).json({ message: error });

    const match = tournament.matches.id(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    // Apply updates to the specific match
    if (teamAId) match.teamAId = teamAId;
    if (teamBId) match.teamBId = teamBId;
    
    // A check to see if date/time are passed in the body.
    // This allows clearing the date/time by passing an empty string.
    if (date !== undefined) match.date = date;
    if (time !== undefined) match.time = time;
    
    // Re-sort and re-number all matches
    const sortMatches = (a, b) => {
        // Matches with no date (or empty string) go to the end
        const aHasDate = a.date && a.date.length > 0;
        const bHasDate = b.date && b.date.length > 0;

        if (!aHasDate && bHasDate) return 1;
        if (aHasDate && !bHasDate) return -1;
        
        // Sort by date if both exist
        if (aHasDate && bHasDate) {
            const dateComparison = a.date.localeCompare(b.date);
            if (dateComparison !== 0) return dateComparison;
        }

        // If dates are same or both are null, sort by time
        const aHasTime = a.time && a.time.length > 0;
        const bHasTime = b.time && b.time.length > 0;

        if (!aHasTime && bHasTime) return 1;
        if (aHasTime && !bHasTime) return -1;

        if (aHasTime && bHasTime) {
            const timeComparison = a.time.localeCompare(b.time);
            if (timeComparison !== 0) return timeComparison;
        }

        // As a final tie-breaker, use the original matchNumber for stability
        // This is important for matches that have no date/time set.
        return a.matchNumber - b.matchNumber;
    };

    // Extract, sort, and re-assign the matches array
    let sortedMatches = [...tournament.matches].sort(sortMatches);

    // Re-assign match numbers
    sortedMatches.forEach((m, index) => {
        m.matchNumber = index + 1;
    });
    
    // Replace the old matches array with the newly sorted and numbered one.
    tournament.matches = sortedMatches;
    
    await tournament.save();
    res.json({ success: true, message: "Match updated and schedule re-ordered" });
};

const startMatch = async (req, res) => {
    const { matchId, id: tournamentId } = req.params;
    const { error, status, tournament } = await checkAdmin(tournamentId, req.user._id);
    if (error) return res.status(status).json({ message: error });
    
    const match = tournament.matches.id(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    match.status = 'Live';
    await tournament.save();
    res.json({ success: true, message: "Match started" });
};

const endMatch = async (req, res) => {
    const { matchId, id: tournamentId } = req.params;
    const { penaltyScores } = req.body;
    const { error, status, tournament } = await checkAdmin(tournamentId, req.user._id);
    if (error) return res.status(status).json({ message: error });
    
    const match = tournament.matches.id(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    
    let winnerId = null;
    if (match.scoreA > match.scoreB) winnerId = match.teamAId;
    else if (match.scoreB > match.scoreA) winnerId = match.teamBId;
    else if (penaltyScores && penaltyScores.penaltyScoreA !== penaltyScores.penaltyScoreB) {
        winnerId = penaltyScores.penaltyScoreA > penaltyScores.penaltyScoreB ? match.teamAId : match.teamBId;
        match.penaltyScoreA = penaltyScores.penaltyScoreA;
        match.penaltyScoreB = penaltyScores.penaltyScoreB;
    }

    match.winnerId = winnerId;
    match.status = 'Finished';
    await tournament.save();
    res.json({ success: true, message: "Match ended" });
};

const recordGoal = async (req, res) => {
    const { scorerId, assistId, isOwnGoal, benefitingTeamId } = req.body;
    const { matchId, id: tournamentId } = req.params;
    const { error, status, tournament } = await checkAdmin(tournamentId, req.user._id);
    if (error) return res.status(status).json({ message: error });

    const match = tournament.matches.id(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    if (!benefitingTeamId) {
        return res.status(400).json({ message: 'Benefiting team ID is required.' });
    }

    if (match.teamAId.equals(benefitingTeamId)) {
        match.scoreA++;
    } else if (match.teamBId.equals(benefitingTeamId)) {
        match.scoreB++;
    } else {
        return res.status(400).json({ message: 'Benefiting team is not in this match.' });
    }

    match.goals.push({ scorerId, assistId, isOwnGoal, teamId: benefitingTeamId, minute: 0 });
    await tournament.save();
    res.json({ success: true, message: 'Goal recorded' });
};

const recordCard = async (req, res) => {
    const { playerId, cardType, teamId } = req.body;
    const { matchId, id: tournamentId } = req.params;
    const { error, status, tournament } = await checkAdmin(tournamentId, req.user._id);
    if (error) return res.status(status).json({ message: error });
    
    const match = tournament.matches.id(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (!match.teamAId.equals(teamId) && !match.teamBId.equals(teamId)) {
        return res.status(400).json({ message: "Player's team is not in this match" });
    }

    match.cards.push({ playerId, type: cardType, teamId: teamId, minute: 0 });
    await tournament.save();
    res.json({ success: true, message: "Card recorded" });
};

const setPlayerOfTheMatch = async (req, res) => {
    const { playerId } = req.body;
    const { matchId, id: tournamentId } = req.params;
    const { error, status, tournament } = await checkAdmin(tournamentId, req.user._id);
    if (error) return res.status(status).json({ message: error });
    
    const match = tournament.matches.id(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    match.playerOfTheMatchId = playerId;
    await tournament.save();
    res.json({ success: true, message: "Player of the Match set" });
};

module.exports = {
  getAllTournaments,
  createTournament,
  getTournamentById,
  joinTournament,
  updateTournament,
  addTeamToTournament,
  scheduleMatches,
  addMatchManually,
  updateMatchDetails,
  startMatch,
  endMatch,
  recordGoal,
  recordCard,
  setPlayerOfTheMatch
};
