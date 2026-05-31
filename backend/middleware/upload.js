const multer = require('multer');

// memory storage — buffers go straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

module.exports = { upload };
