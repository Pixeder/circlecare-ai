import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
const isPrivateKey = rawApiKey.includes('PRIVATE KEY') || rawApiKey.startsWith('-----BEGIN');
const effectiveApiKey = isPrivateKey ? 'AIzaSyD-mock-apiKey-for-client' : (rawApiKey || 'AIzaSyD-mock-apiKey-for-client');

const firebaseConfig = {
  apiKey: effectiveApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'carecircle-ai-d9610.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'carecircle-ai-d9610',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'carecircle-ai-d9610.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '613140d016',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:613140d016:web:carecircle',
};

// Initialize Firebase App
let app = null;
let auth = null;
let isFirebaseLive = false;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  if (
    effectiveApiKey &&
    effectiveApiKey.startsWith('AIzaSy') &&
    !effectiveApiKey.includes('mock') &&
    effectiveApiKey !== 'placeholder'
  ) {
    isFirebaseLive = true;
  }
} catch (err) {
  console.warn('[Firebase Client] Initialization warning:', err.message);
}

export {
  auth,
  isFirebaseLive,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
};

export default app;
