const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, title: String, fileName: String, extractedText: String, contentHash: String, summary: String, summaryHash: String, summarySource: String, vivaQuestions: mongoose.Schema.Types.Mixed, vivaHash: String, vivaSource: String, createdAt: { type: Date, default: Date.now } });
module.exports = mongoose.model('Document', schema);
