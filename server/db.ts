import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimized connection pool with aggressive connection management
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increase max connections
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout
});

export const db = drizzle({ client: pool, schema });

// Warm up the database connection on startup
(async () => {
  try {
    await db.execute('SELECT 1');
    console.log('Database connection warmed up successfully');
  } catch (error) {
    console.error('Failed to warm up database connection:', error);
  }
})();