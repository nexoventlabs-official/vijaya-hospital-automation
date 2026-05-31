const mongoose = require('mongoose');

const InboundMessageSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    profileName: { type: String, default: '' },
    language: { type: String, enum: ['en', 'te'], default: 'en' },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastMessage: { type: String, default: '' },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InboundMessage', InboundMessageSchema);
