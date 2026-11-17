import { config } from "./env.js";

let mongoose = null;
try {
  const mod = await import("mongoose");
  mongoose = mod.default;
} catch {
  // Mongoose not installed or offline
}

let isConnected = false;

export async function connectMongoDB() {
  if (!mongoose) {
    console.warn(
      "[MongoDB] Mongoose package not installed. Running in mock/memory database mode.",
    );
    return null;
  }

  if (isConnected) return mongoose.connection;

  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 15000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.warn(
      `[MongoDB] Connection warning: ${error.message}. Running in offline/disconnected database mode.`,
    );
    isConnected = false;
    return null;
  }
}

export function isMongoConnected() {
  return Boolean(
    mongoose && isConnected && mongoose.connection?.readyState === 1,
  );
}

export default mongoose;
