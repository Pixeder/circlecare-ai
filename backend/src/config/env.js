import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dns from 'dns';

// Ensure all network operations prefer IPv4 on Windows to prevent IPv6 DNS routing timeouts
if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // ignore
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

// Prefer Node 20+ native loadEnvFile, fallback to dotenv, or parse manually
if (typeof process.loadEnvFile === 'function' && fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (e) {
    // fallback
  }
} else {
  try {
    const dotenv = await import('dotenv');
    dotenv.default.config({ path: envPath });
  } catch {
    // Lightweight manual fallback parser
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val.replace(/^["']|["']$/g, '');
            }
          }
        }
      }
    }
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  nvidia: {
    apiKey: process.env.NVIDIA_NIM_API_KEY || '',
    baseURL: (process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1')
      .replace(/\/chat\/completions\/?$/, '')
      .replace(/\/+$/, ''),
    model: process.env.NVIDIA_MISTRAL_MODEL || 'mistralai/mistral-large-4-1t-a52b',
    mockLLM: process.env.DEV_MOCK_LLM === 'true',
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/carecircle',
  },

  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
    collectionName: process.env.QDRANT_COLLECTION_NAME || 'carecircle_medical_memory',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'carecircle-ai',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    devBypassAuth: process.env.DEV_BYPASS_AUTH === 'true',
  },
};
