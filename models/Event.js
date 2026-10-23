const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, title: { type: String, required: true }, eventDate: { type: Date, required: true }, category: { type: String, enum: ['Exam', 'Assignment', 'Quiz', 'Revision'], default: 'Revision' }, description: String, status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' } });

// Date inputs are date-only values. Construct a canonical UTC-midnight Date
// from the components so the YYYY-MM-DD portion survives API serialization.
schema.statics.parseDateOnly = function (dateValue) {
  if (dateValue instanceof Date) return dateValue;
  const [year, month, day] = String(dateValue).split('-').map(Number);
  if (!year || !month || !day) throw new Error('Invalid event date');
  return new Date(Date.UTC(year, month - 1, day));
};

schema.statics.toggleStatus = async function (eventId, userId) {
  const event = await this.findOne({ _id: eventId, userId });
  if (!event) return null;
  event.status = event.status === 'Completed' ? 'Pending' : 'Completed';
  return event.save();
};

module.exports = mongoose.model('Event', schema);
