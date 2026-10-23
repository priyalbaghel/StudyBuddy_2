const express = require('express');
const Event = require('../models/Event');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/calendar', (req, res) => res.render('calendar', { title: 'Study calendar' }));

router.get('/api/events', async (req, res, next) => {
  try {
    res.json(await Event.find({ userId: req.session.userId }).sort({ eventDate: 1 }).lean());
  } catch (e) { next(e); }
});

router.post('/api/events', async (req, res, next) => {
  try {
    const event = await Event.create({
      ...req.body,
      userId: req.session.userId,
      eventDate: Event.parseDateOnly(req.body.eventDate)
    });
    res.status(201).json(event);
  } catch (e) { next(e); }
});

router.patch('/api/events/:id/toggle', async (req, res, next) => {
  try {
    const event = await Event.toggleStatus(req.params.id, req.session.userId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (e) { next(e); }
});

router.patch('/api/events/:id', async (req, res, next) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { status: req.body.status },
      { new: true }
    );
    res.json(event);
  } catch (e) { next(e); }
});

router.delete('/api/events/:id', async (req, res, next) => {
  try {
    await Event.deleteOne({ _id: req.params.id, userId: req.session.userId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
