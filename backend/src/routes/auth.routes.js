import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Caregiver } from '../models/Caregiver.js';
import { isMongoConnected } from '../config/mongodb.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/auth/me
 * Returns current authenticated user and their active patient profile
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const { uid, email, name, role, activePatientId } = req.user;

    let patientProfile = null;
    let accessiblePatients = [];

    if (isMongoConnected()) {
      // Find all patients owned by this user
      const owned = await Patient.find({ userId: uid }).lean();
      accessiblePatients.push(...owned.map((p) => ({ ...p, accessRole: 'owner' })));

      // Find all patients where this user is an authorized caregiver
      const caregiverLinks = await Caregiver.find({
        $or: [{ caregiverUid: uid }, { caregiverEmail: email.toLowerCase() }],
        invitationStatus: 'accepted',
      }).lean();

      for (const link of caregiverLinks) {
        const p = await Patient.findOne({ patientId: link.patientId }).lean();
        if (p && !accessiblePatients.some((existing) => existing.patientId === p.patientId)) {
          accessiblePatients.push({ ...p, accessRole: 'caregiver', permissions: link.permissions });
        }
      }

      if (activePatientId) {
        patientProfile = accessiblePatients.find((p) => p.patientId === activePatientId) || null;
      }
    }

    res.json({
      success: true,
      user: {
        uid,
        email,
        displayName: name,
        role,
        activePatientId,
      },
      patientProfile,
      accessiblePatients,
      hasPatientProfile: accessiblePatients.length > 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/patient-profile
 * Creates a real patient profile owned by the authenticated user
 */
router.post('/patient-profile', authenticateToken, async (req, res, next) => {
  try {
    const { uid } = req.user;
    const {
      name,
      dateOfBirth,
      gender,
      phone,
      emergencyContacts = [],
      allergies = [],
      chronicConditions = [],
      bloodType,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Patient name is required.' });
    }

    const patientId = `patient_${uid.slice(0, 10)}_${Date.now().toString().slice(-4)}`;

    const patientData = {
      patientId,
      userId: uid,
      name: name.trim(),
      dateOfBirth: dateOfBirth || '',
      gender: gender || '',
      phone: phone || '',
      emergencyContacts: Array.isArray(emergencyContacts) ? emergencyContacts : [],
      allergies: Array.isArray(allergies) ? allergies : [],
      chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [],
      authorizedCaregivers: [],
      medicalProfile: {
        bloodType: bloodType || 'Unknown',
      },
    };

    if (isMongoConnected()) {
      // Check if user already owns a patient profile, update or create
      const existing = await Patient.findOne({ userId: uid });
      if (existing) {
        const updated = await Patient.findOneAndUpdate(
          { userId: uid },
          { $set: patientData },
          { new: true }
        );
        return res.json({
          success: true,
          message: 'Patient profile updated successfully.',
          patient: updated,
        });
      }

      const doc = await Patient.create(patientData);
      return res.json({
        success: true,
        message: 'Patient profile created successfully.',
        patient: doc,
      });
    }

    res.json({
      success: true,
      message: 'Patient profile created (in-memory mode).',
      patient: patientData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/invite-caregiver
 * Authorizes a caregiver by email to access this patient's profile
 */
router.post('/invite-caregiver', authenticateToken, async (req, res, next) => {
  try {
    const { uid, activePatientId } = req.user;
    const { caregiverEmail, caregiverName, relationship, permissions } = req.body;

    if (!caregiverEmail) {
      return res.status(400).json({ success: false, error: 'Caregiver email is required.' });
    }

    if (!activePatientId) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

    // Verify authenticated user owns this patient
    if (isMongoConnected()) {
      const patient = await Patient.findOne({ patientId: activePatientId, userId: uid });
      if (!patient) {
        return res.status(403).json({
          success: false,
          error: 'Only the patient owner can invite caregivers.',
        });
      }

      const caregiverDoc = await Caregiver.findOneAndUpdate(
        { patientId: activePatientId, caregiverEmail: caregiverEmail.toLowerCase() },
        {
          $set: {
            patientId: activePatientId,
            caregiverEmail: caregiverEmail.toLowerCase(),
            caregiverName: caregiverName || caregiverEmail.split('@')[0],
            relationship: relationship || 'Family Caregiver',
            permissions: permissions || ['read_medications', 'log_dose', 'view_prescriptions'],
            invitationStatus: 'accepted',
            invitedBy: uid,
          },
        },
        { upsert: true, new: true }
      );

      // Add to patient's authorized list
      await Patient.findOneAndUpdate(
        { patientId: activePatientId },
        { $addToSet: { authorizedCaregivers: caregiverEmail.toLowerCase() } }
      );

      return res.json({
        success: true,
        message: `Caregiver ${caregiverEmail} authorized successfully.`,
        caregiver: caregiverDoc,
      });
    }

    res.json({
      success: true,
      message: `Caregiver ${caregiverEmail} authorized.`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
