const mongoose = require('mongoose');

/** Image slot keyed by stable name (e.g. chat_welcome_header, icon_book_appointment). */
const FlowImageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlowImage', FlowImageSchema);
