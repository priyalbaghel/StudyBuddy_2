const User = require('../models/User');

async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const user = await User.findById(req.session.userId).lean();
    if (!user) {
      req.session.destroy(() => res.redirect('/login'));
      return;
    }
    res.locals.user = user;
    next();
  } catch (error) {
    console.error('Authentication lookup failed:', error.message);
    res.status(503).render('error', {
      title: 'Database unavailable',
      message: 'We could not verify your session right now. Please try again in a moment.'
    });
  }
}

module.exports = { requireAuth };
