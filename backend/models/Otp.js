const mongoose = require('mongoose');

// Short-lived email OTP for public registration.
// Auto-deleted by Mongo TTL after expiresAt.
const otpSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  attendeeName: { type: String, required: true, trim: true },
  attendeeEmail: { type: String, required: true, lowercase: true, trim: true },
  mobileNo: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 5, max: 120 },
  code: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ eventId: 1, attendeeEmail: 1 }, { unique: true });

module.exports = mongoose.model('Otp', otpSchema);
