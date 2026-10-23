const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

router.get('/signup', (req, res) => res.render('signup', { title: 'Create your account', error: null }));
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) return res.render('signup', { title: 'Create your account', error: 'Enter all details. Passwords must be at least 6 characters.' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.render('signup', { title: 'Create your account', error: 'An account with that email already exists.' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    req.session.userId = user._id.toString(); res.redirect('/dashboard');
  } catch (error) {
    console.error('Signup database error:', error.message);
    res.status(503).render('signup', { title: 'Create your account', error: 'We could not reach the database right now. Please try again in a moment.' });
  }
});
router.get('/login', (req, res) => res.render('login', { title: 'Welcome back', error: null }));
router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: String(req.body.email).toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.render('login', { title: 'Welcome back', error: 'Email or password is incorrect.' });
    req.session.userId = user._id.toString(); res.redirect('/dashboard');
  } catch (error) {
    console.error('Login database error:', error.message);
    res.status(503).render('login', { title: 'Welcome back', error: 'We could not reach the database right now. Please try again in a moment.' });
  }
});
router.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));
module.exports = router;
