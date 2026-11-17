import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { triggerSosTool } from '../tools/emergencyTools.js';
import { Alert } from '../models/Alert.js';
import { Patient } from '../models/Patient.js';
import { isMongoConnected } from '../config/mongodb.js';

const router = express.Router();

let activeEmergencyState = null;

// GET /api/emergency/contacts
router.get('/contacts', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId || !isMongoConnected()) {
      return res.json({ success: true, count: 0, contacts: [], activeEmergency: activeEmergencyState });
    }

    const patient = await Patient.findOne({ patientId }).lean();
    const contacts = patient?.emergencyContacts || [];
    res.json({ success: true, count: contacts.length, contacts, activeEmergency: activeEmergencyState });
  } catch (error) {
    next(error);
  }
});

// POST /api/emergency/contacts
router.post('/contacts', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { name, phone, relationship, isPrimary } = req.body;

    if (!patientId || !isMongoConnected()) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Contact name and phone are required.' });
    }

    const updated = await Patient.findOneAndUpdate(
      { patientId },
      {
        $push: {
          emergencyContacts: {
            name: name.trim(),
            phone: phone.trim(),
            relationship: relationship || 'Family',
            isPrimary: Boolean(isPrimary),
          },
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Emergency contact added successfully.',
      contacts: updated?.emergencyContacts || [],
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/emergency/sos - Deterministic emergency SOS
router.post('/sos', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

    const context = { patientId, user: req.user };
    const { reason = 'Emergency SOS triggered from dashboard', urgency = 'critical' } = req.body;

    const result = await triggerSosTool.execute({ context, args: { reason, urgency } });

    activeEmergencyState = {
      triggeredAt: new Date().toISOString(),
      patientId,
      reason,
      urgency,
      status: 'DISPATCHED',
      dispatchedBy: req.user.name || req.user.email,
    };

    res.json({
      success: true,
      message: 'Emergency SOS activated. Deterministic dispatch initiated.',
      data: result,
      activeEmergency: activeEmergencyState,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/emergency/resolve - Resolve emergency state
router.post('/resolve', authenticateToken, async (req, res, next) => {
  try {
    activeEmergencyState = null;
    res.json({ success: true, message: 'Emergency situation marked as resolved and safely closed.' });
  } catch (error) {
    next(error);
  }
});

export default router;
