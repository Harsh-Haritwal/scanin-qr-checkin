const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'coordinator', 'volunteer'], default: 'volunteer' }
}, { _id: false });

const inviteSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['coordinator', 'volunteer'], default: 'volunteer' }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  venue: String,
  category: { type: String, default: '' },
  date: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: { type: [memberSchema], default: [] },
  pendingInvites: { type: [inviteSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
