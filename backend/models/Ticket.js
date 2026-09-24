const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  attendeeName: { type: String, required: true, trim: true },
  attendeeEmail: { type: String, required: true, lowercase: true, trim: true },
  mobileNo: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 5, max: 120 },
  code: { type: String, required: true, unique: true, index: true },
  isUsed: { type: Boolean, default: false },
  usedAt: Date,
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// one ticket per email per event — blocks duplicate/fake registrations
ticketSchema.index({ eventId: 1, attendeeEmail: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', ticketSchema);
