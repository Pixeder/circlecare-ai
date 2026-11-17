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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD-mock-apiKey-for-client',
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
  // Check if API key is not just a placeholder
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'placeholder' && !firebaseConfig.apiKey.includes('mock')) {
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
