const mongoose = require('mongoose');
const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, email: { type: String, unique: true, required: true, lowercase: true, trim: true }, password: { type: String, required: true }, createdAt: { type: Date, default: Date.now } });
module.exports = mongoose.model('User', schema);
