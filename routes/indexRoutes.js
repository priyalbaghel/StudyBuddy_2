const express = require('express');
const Document = require('../models/Document');
const Event = require('../models/Event');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.get('/', (req, res) => res.render('index', { title: 'Study smarter, together' }));
router.get('/dashboard', requireAuth, async (req, res, next) => { try { const documents = await Document.find({ userId: req.session.userId }).sort({ createdAt: -1 }).lean(); const events = await Event.find({ userId: req.session.userId, status: 'Pending', eventDate: { $gte: new Date() } }).sort({ eventDate: 1 }).limit(4).lean(); res.render('dashboard', { title: 'Your dashboard', documents, events }); } catch (e) { next(e); } });
router.get('/upload', requireAuth, (req, res) => res.render('upload', { title: 'Upload notes' }));
module.exports = router;
