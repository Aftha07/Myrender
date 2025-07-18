const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const connectPg = require('connect-pg-simple');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
const path = require('path');

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const app = express();
const port = 5000;

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Storage functions
const storage = {
  async getUser(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async getUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  },
  
  async createUser(userData) {
    const result = await pool.query(
      'INSERT INTO users (id, username, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [userData.id, userData.username, userData.email, userData.passwordHash, userData.firstName, userData.lastName, userData.role]
    );
    return result.rows[0];
  },
  
  async validateUser(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  },
  
  async updateLastVisit(userId) {
    await pool.query('UPDATE users SET last_visit = NOW() WHERE id = $1', [userId]);
  }
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Session configuration
const pgStore = connectPg(session);
const sessionStore = new pgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  ttl: 7 * 24 * 60 * 60, // 1 week
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'vom-dashboard-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    httpOnly: true,
    secure: false // Set to true in production with HTTPS
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login.html');
  }
};

// Routes
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dashboard.html'));
});

app.get('/login.html', (req, res) => {
  if (req.session.userId) {
    res.redirect('/');
  } else {
    res.sendFile(path.join(process.cwd(), 'login.html'));
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await storage.validateUser(username, password);
    if (user) {
      // Update last visit before setting session
      await storage.updateLastVisit(user.id);
      
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password, email, firstName, lastName } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await storage.createUser({
      id: Date.now().toString(),
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'user'
    });

    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      res.status(500).json({ error: 'Could not log out' });
    } else {
      res.json({ success: true, message: 'Logged out successfully' });
    }
  });
});

app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const user = await storage.getUser(req.session.userId);
    if (user) {
      const { password_hash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Second Support Dashboard with authentication running on http://0.0.0.0:${port}`);
  console.log('Default login credentials:');
  console.log('Username: admin');
  console.log('Password: admin123');
});

module.exports = app;