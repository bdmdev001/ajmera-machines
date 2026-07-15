import mongoose from 'mongoose';

/* ============================================================================
   MongoDB (Atlas) connection — the connection string comes ONLY from the
   MONGODB_URI environment variable (see .env / .env.example). It is never
   hardcoded. A cached connection is reused across hot reloads / serverless
   invocations so we don't open a new socket on every request.
   ========================================================================= */

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = global as unknown as { mongoose?: MongooseCache };
const cached: MongooseCache = globalForMongoose.mongoose ?? { conn: null, promise: null };
globalForMongoose.mongoose = cached;

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    // Loud, actionable failure instead of silently falling back to localhost.
    throw new Error(
      '[db] MONGODB_URI is not set. Copy .env.example to .env and add your MongoDB Atlas connection string.',
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      // Fail fast (8s) when the cluster is unreachable so callers can fall back
      // to seed data instead of hanging on Mongoose's 30s default.
      .connect(MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 8000 })
      .then((instance) => {
        const { host, name } = instance.connection;
        console.log(`[db] ✅ Connected to MongoDB (host: ${host}, db: ${name})`);
        return instance;
      })
      .catch((err) => {
        cached.promise = null;
        console.error('[db] ❌ MongoDB connection failed:', err instanceof Error ? err.message : err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
