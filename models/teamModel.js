// backend/models/teamModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const teamSchema = new Schema({
  name: { type: String, required: true },
  logoUrl: { type: String, default: null },
  adminIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  captainId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  viceCaptainId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  inviteCode: { type: String, required: true, unique: true },
});

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;
