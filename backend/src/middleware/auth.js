import { verifyFirebaseToken } from '../config/firebase.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Caregiver } from '../models/Caregiver.js';
import { isMongoConnected } from '../config/mongodb.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Authorization header missing or malformed.',
    });
  }

  try {
    const decoded = await verifyFirebaseToken(token);

    // Sync or lookup user record in MongoDB
    let userDoc = null;
    if (isMongoConnected()) {
      userDoc = await User.findOneAndUpdate(
        { firebaseUid: decoded.uid },
        {
          $set: {
            email: decoded.email,
            displayName: decoded.name,
            lastLoginAt: new Date(),
          },
          $setOnInsert: {
            role: decoded.role || 'patient',
          },
        },
        { upsert: true, new: true }
      );
    }

    // Determine target patient context
    const requestedPatientId = req.headers['x-patient-id'] || req.query.patientId;
    let activePatientId = null;

    if (isMongoConnected()) {
      if (requestedPatientId) {
        // Enforce patient-level authorization: User must own the patient OR be an authorized caregiver
        const ownedPatient = await Patient.findOne({ patientId: requestedPatientId, userId: decoded.uid });

        if (ownedPatient) {
          activePatientId = ownedPatient.patientId;
        } else {
          // Check caregiver access table
          const caregiverRecord = await Caregiver.findOne({
            patientId: requestedPatientId,
            $or: [{ caregiverUid: decoded.uid }, { caregiverEmail: decoded.email?.toLowerCase() }],
            invitationStatus: 'accepted',
          });

          if (caregiverRecord) {
            activePatientId = requestedPatientId;
          } else {
            return res.status(403).json({
              success: false,
              error: `Access Denied: You do not have authorized access to patient profile: ${requestedPatientId}`,
            });
          }
        }
      } else {
        // Default to the patient owned by the user
        const ownedPatient = await Patient.findOne({ userId: decoded.uid });
        if (ownedPatient) {
          activePatientId = ownedPatient.patientId;
        } else {
          // Fallback: check if authorized for any patient as caregiver
          const caregiverRecord = await Caregiver.findOne({
            $or: [{ caregiverUid: decoded.uid }, { caregiverEmail: decoded.email?.toLowerCase() }],
            invitationStatus: 'accepted',
          });
          if (caregiverRecord) {
            activePatientId = caregiverRecord.patientId;
          }
        }
      }
    } else {
      activePatientId = requestedPatientId || `patient_${decoded.uid}`;
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: userDoc?.displayName || decoded.name || 'User',
      role: userDoc?.role || decoded.role || 'patient',
      activePatientId,
    };

    next();
  } catch (error) {
    const isExpired = error.code === 'auth/id-token-expired' || error.message?.includes('expired');
    return res.status(401).json({
      success: false,
      error: isExpired ? 'Authentication token has expired. Please log in again.' : 'Invalid authentication token.',
    });
  }
}

/**
 * Strict route guard checking that a valid patient profile is active
 */
export function requireActivePatient(req, res, next) {
  if (!req.user || !req.user.activePatientId) {
    return res.status(400).json({
      success: false,
      error: 'No active patient profile found for this account. Please create or select a patient profile first.',
      requiresPatientProfile: true,
    });
  }
  next();
}

export default { authenticateToken, requireActivePatient };
