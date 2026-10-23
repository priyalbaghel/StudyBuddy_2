const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }, contentHash: String, source: String, questions: [{ questionText: String, options: [String], correctOptionIndex: Number, explanation: String }], score: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now } });
module.exports = mongoose.model('Quiz', schema);
