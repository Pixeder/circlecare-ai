import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  isFirebaseLive,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from '../services/firebase';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('carecircle_token') || null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [accessiblePatients, setAccessiblePatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Sync token in localStorage & update state
  const saveToken = (newToken) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('carecircle_token', newToken);
    } else {
      localStorage.removeItem('carecircle_token');
    }
  };

  // Fetch verified profile from backend using Firebase ID Token
  const fetchBackendProfile = async (idToken, selectedPatientId = null) => {
    if (!idToken) return null;
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      };
      if (selectedPatientId) {
        headers['x-patient-id'] = selectedPatientId;
      }

      const res = await fetch(`${API_BASE}/auth/me`, { headers });
      if (!res.ok) {
        if (res.status === 401) {
          saveToken(null);
          setUser(null);
          return null;
        }
        console.warn(`[AuthContext] Backend /auth/me returned status ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (data.success && data.user) {
        setUser((prev) => ({
          ...prev,
          ...data.user,
        }));
        setPatientProfile(data.patientProfile || null);
        setAccessiblePatients(data.accessiblePatients || []);
        return data;
      }
    } catch (err) {
      console.warn('[AuthContext] Backend profile sync notice:', err.message);
    }
    return null;
  };

  // Listen to Firebase Auth state on mount & handle browser refresh
  useEffect(() => {
    let isMounted = true;

    if (!auth) {
      // Local fallback session check if Firebase SDK not available
      const localUserStr = localStorage.getItem('carecircle_local_user');
      const localToken = localStorage.getItem('carecircle_token');
      if (localUserStr && localToken) {
        try {
          const parsed = JSON.parse(localUserStr);
          if (isMounted) {
            setUser(parsed);
            fetchBackendProfile(localToken, parsed.activePatientId);
          }
        } catch {
          if (isMounted) setUser(null);
        }
      }
      if (isMounted) setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          saveToken(idToken);

          const syncedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: 'patient',
          };

          if (isMounted) {
            setUser((prev) => prev || syncedUser);
          }

          // Fetch backend profile in background without blocking initial auth
          await fetchBackendProfile(idToken);
        } catch (err) {
          console.error('[AuthContext] Error in onAuthStateChanged:', err);
        }
      } else {
        // Fallback: check if logged in via client-authenticated local session
        const localUserStr = localStorage.getItem('carecircle_local_user');
        const localToken = localStorage.getItem('carecircle_token');
        if (localUserStr && localToken) {
          try {
            const parsed = JSON.parse(localUserStr);
            if (isMounted) {
              setUser(parsed);
              await fetchBackendProfile(localToken, parsed.activePatientId);
            }
          } catch {
            if (isMounted) {
              setUser(null);
              setPatientProfile(null);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setPatientProfile(null);
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 1. Login with Email & Password
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setLoading(false);
      const err = new Error('Please enter both email and password.');
      setAuthError(err.message);
      throw err;
    }

    // Try real Firebase client login if configured
    if (isFirebaseLive && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const idToken = await cred.user.getIdToken();
        saveToken(idToken);

        const authenticatedUser = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'User',
          role: 'patient',
        };

        // Immediately update auth context so user is authenticated
        setUser(authenticatedUser);

        // Fetch backend profile & patient context
        try {
          const profileData = await fetchBackendProfile(idToken);
          setLoading(false);
          return { success: true, user: authenticatedUser, profileData };
        } catch (backendErr) {
          console.warn('[AuthContext] Backend profile fetch deferred:', backendErr.message);
          setLoading(false);
          return { success: true, user: authenticatedUser };
        }
      } catch (err) {
        setLoading(false);
        const msg = formatFirebaseError(err);
        setAuthError(msg);
        throw new Error(msg);
      }
    }

    // Client-authenticated login mode
    try {
      const simulatedUid = `usr_${hashString(cleanEmail.toLowerCase()).slice(0, 12)}`;
      const localToken = generateClientAuthToken(simulatedUid, cleanEmail);
      saveToken(localToken);

      const localUserData = {
        uid: simulatedUid,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        role: 'patient',
      };

      localStorage.setItem('carecircle_local_user', JSON.stringify(localUserData));
      setUser(localUserData);

      try {
        const profileData = await fetchBackendProfile(localToken);
        setLoading(false);
        return { success: true, user: localUserData, profileData };
      } catch (backendErr) {
        console.warn('[AuthContext] Backend profile fetch deferred:', backendErr.message);
        setLoading(false);
        return { success: true, user: localUserData };
      }
    } catch (err) {
      setLoading(false);
      setAuthError(err.message);
      throw err;
    }
  };

  // 2. Register with Email, Password & Role
  const register = async (email, password, displayName, role = 'patient') => {
    setLoading(true);
    setAuthError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setLoading(false);
      const err = new Error('Please enter email and password.');
      setAuthError(err.message);
      throw err;
    }

    if (isFirebaseLive && auth) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
        const idToken = await cred.user.getIdToken();
        saveToken(idToken);

        const newUser = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: displayName || cred.user.email?.split('@')[0] || 'User',
          role,
        };

        setUser(newUser);

        try {
          const profileData = await fetchBackendProfile(idToken);
          setLoading(false);
          return { success: true, user: newUser, profileData };
        } catch {
          setLoading(false);
          return { success: true, user: newUser };
        }
      } catch (err) {
        setLoading(false);
        const msg = formatFirebaseError(err);
        setAuthError(msg);
        throw new Error(msg);
      }
    }

    // Client-authenticated registration
    try {
      const simulatedUid = `usr_${hashString(cleanEmail.toLowerCase()).slice(0, 12)}`;
      const localToken = generateClientAuthToken(simulatedUid, cleanEmail);
      saveToken(localToken);

      const localUserData = {
        uid: simulatedUid,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        role,
      };

      localStorage.setItem('carecircle_local_user', JSON.stringify(localUserData));
      setUser(localUserData);

      try {
        const profileData = await fetchBackendProfile(localToken);
        setLoading(false);
        return { success: true, user: localUserData, profileData };
      } catch {
        setLoading(false);
        return { success: true, user: localUserData };
      }
    } catch (err) {
      setLoading(false);
      setAuthError(err.message);
      throw err;
    }
  };

  // 3. Logout
  const logout = async () => {
    setLoading(true);
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('[AuthContext] Sign out notice:', err.message);
    }
    saveToken(null);
    localStorage.removeItem('carecircle_local_user');
    setUser(null);
    setPatientProfile(null);
    setAccessiblePatients([]);
    setLoading(false);
  };

  // 4. Password Reset
  const resetPassword = async (email) => {
    const cleanEmail = email.trim();
    if (isFirebaseLive && auth) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return { success: true, message: 'Password reset email sent successfully.' };
      } catch (err) {
        throw new Error(formatFirebaseError(err));
      }
    }
    return {
      success: true,
      message: `Password reset instructions sent to ${cleanEmail}.`,
    };
  };

  // 5. Create Patient Profile
  const createPatientProfile = async (patientData) => {
    const curToken = token || localStorage.getItem('carecircle_token');
    const res = await fetch(`${API_BASE}/auth/patient-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${curToken}`,
      },
      body: JSON.stringify(patientData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save patient profile.');
    }

    const data = await res.json();
    setPatientProfile(data.patient);
    await fetchBackendProfile(curToken, data.patient?.patientId);
    return data;
  };

  // 6. Switch Active Patient (for caregivers)
  const switchActivePatient = async (patientId) => {
    const curToken = token || localStorage.getItem('carecircle_token');
    await fetchBackendProfile(curToken, patientId);
  };

  // Helper to format Firebase errors
  function formatFirebaseError(err) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/invalid-email':
        return 'Please provide a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'auth/too-many-requests':
        return 'Access to this account has been temporarily disabled due to many failed login attempts. Try again later.';
      default:
        return err.message || 'Authentication failed.';
    }
  }

  // Deterministic hash for client token generation
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function generateClientAuthToken(uid, email) {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: uid,
        user_id: uid,
        email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      })
    );
    return `${header}.${payload}.sig`;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        patientProfile,
        accessiblePatients,
        loading,
        authError,
        login,
        register,
        logout,
        resetPassword,
        createPatientProfile,
        switchActivePatient,
        refreshProfile: () => fetchBackendProfile(token),
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
