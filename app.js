require('dotenv').config();
const express = require('express'); const path = require('path'); const session = require('express-session'); const MongoStore = require('connect-mongo'); const cors = require('cors'); const connectDB = require('./config/db');
const app = express(); const port = process.env.PORT || 3000;

app.set('view engine', 'ejs'); app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true })); app.use(express.json()); app.use(cors()); app.use(express.static(path.join(__dirname, 'public')));

async function start() {
  const mongoAvailable = await connectDB();
  const sessionOptions = { secret: process.env.SESSION_SECRET || 'dev-secret', resave: false, saveUninitialized: false, cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } };
  if (mongoAvailable) sessionOptions.store = MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 60 * 60 * 24 * 7 });
  else console.warn('Using in-memory sessions while MongoDB is unavailable.');
  app.use(session(sessionOptions));
  app.use((req, res, next) => { res.locals.user = null; res.locals.path = req.path; next(); });
  app.use(require('./routes/authRoutes')); app.use(require('./routes/indexRoutes')); app.use(require('./routes/documentRoutes')); app.use(require('./routes/calendarRoutes'));
  app.use((err, req, res, next) => { const status = Number.isInteger(err.status) ? err.status : 500; console.error(`Request failed ${req.method} ${req.path} (HTTP ${status}) at ${err.stage || 'application'}: ${err.message}`); if (req.path.startsWith('/api/') || req.path.includes('/document/')) return res.status(status).json({ error: err.status ? err.message : 'Something went wrong. Please try again.' }); res.status(status).render('error', { title: 'Something went wrong', message: err.status ? err.message : 'We could not complete that request.' }); });
  app.listen(port, () => console.log(`StudyBuddy running at http://localhost:${port}`));
}

start().catch(error => { console.error('Startup failed:', error); process.exitCode = 1; });
