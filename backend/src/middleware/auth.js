import { verifyFirebaseToken } from '../config/firebase.js';
import { config } from '../config/env.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  try {
    if (!token && !config.firebase.devBypassAuth) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token missing or invalid.',
      });
    }

    const decoded = await verifyFirebaseToken(token || 'mock-token');

    // Ensure patientId is assigned (defaulting to uid if user is patient, or query/header if caregiver)
    const patientId = req.headers['x-patient-id'] || req.query.patientId || decoded.patientId || decoded.uid;

    req.user = {
      ...decoded,
      activePatientId: patientId,
    };

    next();
  } catch (error) {
    console.error(`[Auth Middleware] Verification failed: ${error.message}`);
    return res.status(403).json({
      success: false,
      error: 'Unauthorized. Invalid or expired authentication token.',
    });
  }
}

/**
 * Middleware ensuring caregivers or users have access to the target patient
 */
export function authorizePatientAccess(req, res, next) {
  const user = req.user;
  const targetPatientId = req.params.patientId || req.body.patientId || req.user.activePatientId;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  // If user is the patient themselves
  if (user.uid === targetPatientId || user.patientId === targetPatientId) {
    return next();
  }

  // If user is an authorized caregiver
  if (user.role === 'caregiver' && user.authorizedCaregivers?.includes(targetPatientId)) {
    return next();
  }

  // In development bypass mode, permit access
  if (config.firebase.devBypassAuth) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: `Access denied. You do not have authorized access to patient profile: ${targetPatientId}`,
  });
}
