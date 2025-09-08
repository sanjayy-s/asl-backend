// backend/models/tournamentModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// --- Sub-document Schemas ---

const goalSchema = new Schema({
  scorerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assistId: { type: Schema.Types.ObjectId, ref: 'User' },
  minute: { type: Number, required: true },
  isOwnGoal: { type: Boolean, default: false },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
});

const cardSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  minute: { type: Number, required: true },
  type: { type: String, enum: ['Yellow', 'Red'], required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
});

const matchSchema = new Schema({
  matchNumber: { type: Number, required: true },
  teamAId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  teamBId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  date: String,
  time: String,
  scoreA: { type: Number, default: 0 },
  scoreB: { type: Number, default: 0 },
  penaltyScoreA: Number,
  penaltyScoreB: Number,
  status: { 
    type: String, 
    enum: ['Scheduled', 'Live', 'Finished'], 
    default: 'Scheduled' 
  },
  goals: [goalSchema],
  cards: [cardSchema],
  round: { type: String, required: true },
  winnerId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
  playerOfTheMatchId: { type: Schema.Types.ObjectId, ref: 'User' },
});


// --- Main Tournament Schema ---

const tournamentSchema = new Schema({
  name: { type: String, required: true },
  logoUrl: { type: String, default: null },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  matches: [matchSchema],
  isSchedulingDone: { type: Boolean, default: false },
  inviteCode: { type: String, required: true, unique: true },
}, { timestamps: true });

const Tournament = mongoose.model('Tournament', tournamentSchema);
module.exports = Tournament;