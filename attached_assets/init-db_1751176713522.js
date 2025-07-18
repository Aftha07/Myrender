const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

async function initDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Drop existing session table and index if they exist
    await pool.query(`DROP INDEX IF EXISTS "IDX_session_expire";`);
    await pool.query(`DROP TABLE IF EXISTS session;`);
    
    // Create sessions table for authentication with proper primary key
    await pool.query(`
      CREATE TABLE session (
        sid VARCHAR PRIMARY KEY NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
    `);
    
    await pool.query(`CREATE INDEX "IDX_session_expire" ON session (expire);`);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        username VARCHAR UNIQUE NOT NULL,
        email VARCHAR UNIQUE,
        password_hash VARCHAR NOT NULL,
        first_name VARCHAR,
        last_name VARCHAR,
        role VARCHAR DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database tables created successfully');
    
    // Create default admin user if none exists
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    if (result.rows[0].count === '0') {
      const bcrypt = require('bcryptjs');
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      await pool.query(`
        INSERT INTO users (id, username, email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        Date.now().toString(),
        'admin',
        'admin@vom.com',
        adminPassword,
        'Admin',
        'User',
        'admin'
      ]);
      
      console.log('Default admin user created:');
      console.log('Username: admin');
      console.log('Password: admin123');
    }
    
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    await pool.end();
  }
}

initDatabase();