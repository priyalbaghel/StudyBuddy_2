const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }, contentHash: String, source: String, cards: [{ frontQuestion: String, backAnswer: String }], createdAt: { type: Date, default: Date.now } });
module.exports = mongoose.model('Flashcard', schema);
