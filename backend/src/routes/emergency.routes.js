import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { triggerSosTool } from '../tools/emergencyTools.js';
import { Alert } from '../models/Alert.js';
import { Patient } from '../models/Patient.js';
import { isMongoConnected } from '../config/mongodb.js';

const router = express.Router();

let activeEmergencyState = null;

const defaultContacts = [
  { id: 'ec_01', name: 'Sarah Vance', phone: '+1-555-0192', relationship: 'Daughter (Primary)', isPrimary: true },
  { id: 'ec_02', name: 'Dr. Robert Miller', phone: '+1-555-0144', relationship: 'Primary Physician', isPrimary: false },
  { id: 'ec_03', name: 'City Geriatric Emergency Dispatch', phone: '911', relationship: 'EMS Services', isPrimary: false },
];

// GET /api/emergency/contacts
router.get('/contacts', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;

    if (isMongoConnected()) {
      const patient = await Patient.findOne({ patientId }).lean();
      if (patient?.emergencyContacts?.length > 0) {
        return res.json({ success: true, count: patient.emergencyContacts.length, contacts: patient.emergencyContacts });
      }
    }

    res.json({ success: true, count: defaultContacts.length, contacts: defaultContacts, activeEmergency: activeEmergencyState });
  } catch (error) {
    next(error);
  }
});

// POST /api/emergency/sos - Immediate deterministic SOS
router.post('/sos', authenticateToken, async (req, res, next) => {
  try {
    const context = { patientId: req.user.activePatientId, user: req.user };
    const { reason = 'Emergency SOS triggered from dashboard', urgency = 'critical' } = req.body;

    const result = await triggerSosTool.execute({ context, args: { reason, urgency } });

    activeEmergencyState = {
      triggeredAt: new Date().toISOString(),
      reason,
      urgency,
      status: 'DISPATCHED',
      dispatchedBy: req.user.name || 'Eleanor Vance',
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
