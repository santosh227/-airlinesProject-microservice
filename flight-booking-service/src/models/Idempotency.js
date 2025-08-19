const mongoose = require('mongoose');

const idempotencySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  userId: { type: String }, // optional
  requestHash: { type: String, required: true }, // hash(method+path+body+query)
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  responseStatus: { type: Number },
  responseBody: { type: mongoose.Schema.Types.Mixed },
  lockedUntil: { type: Date }, // short processing lock
  expiresAt: { type: Date }    // TTL auto-cleanup
}, { timestamps: true });

idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Idempotency', idempotencySchema);
