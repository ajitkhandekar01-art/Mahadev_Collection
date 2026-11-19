const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');

// Initialize database (creates tables & seeds if empty)
require('./db');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

// Security headers with Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", "https://www.google.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    }
  })
);

// Body parsers with 100kb limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Express session setup
const sessionSecret = process.env.SESSION_SECRET || 'mahadev-secret-fallback-key-2026';
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Block protected files and directories from web access
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p.startsWith('/server') ||
    p.startsWith('/data') ||
    p.startsWith('/scripts') ||
    p.startsWith('/node_modules') ||
    p.includes('.env') ||
    p.endsWith('.db') ||
    p.includes('.db-') ||
    p.includes('package.json') ||
    p.includes('package-lock.json') ||
    p.startsWith('/.')
  ) {
    return res.status(404).send('Not Found');
  }
  next();
});

// API routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Static site serving
const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot, { dotfiles: 'ignore', index: 'index.html' }));

// Fallback for not found pages
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Central error handler (never leaks stack traces)
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: 'An unexpected server error occurred.' });
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`\n======================================================`);
    console.log(` Mahadev Collection server running at:`);
    console.log(` http://${HOST}:${PORT}`);
    console.log(` Admin panel: http://${HOST}:${PORT}/admin.html`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;

