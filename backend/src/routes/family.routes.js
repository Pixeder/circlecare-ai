import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Alert } from '../models/Alert.js';
import { isMongoConnected } from '../config/mongodb.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const inMemoryCaregivers = [
  {
    caregiverId: 'cg_sarah_01',
    name: 'Sarah Vance',
    relationship: 'Daughter (Primary Caregiver)',
    phone: '+1-555-0192',
    email: 'sarah.vance@carecircle.health',
    accessLevel: 'full_medical_proxy',
    status: 'active',
    lastActive: '10 minutes ago',
    avatar: '👩',
  },
  {
    caregiverId: 'cg_david_02',
    name: 'David Vance',
    relationship: 'Son',
    phone: '+1-555-0198',
    email: 'david.vance@carecircle.health',
    accessLevel: 'emergency_only',
    status: 'active',
    lastActive: '2 days ago',
    avatar: '👨',
  },
  {
    caregiverId: 'cg_nurse_maria',
    name: 'Nurse Maria Santos, RN',
    relationship: 'Visiting Home Nurse',
    phone: '+1-555-0145',
    email: 'maria.santos@homehealth.org',
    accessLevel: 'medication_adherence_only',
    status: 'active',
    lastActive: 'Yesterday',
    avatar: '🩺',
  },
];

const inMemoryActivity = [
  {
    id: 'act_01',
    patientId: 'patient_elderly_001',
    type: 'medication_dose',
    icon: 'pill',
    title: 'Morning Dose Logged',
    description: 'Eleanor logged morning dose of Metformin (500mg) and Amlodipine (5mg).',
    actor: 'Eleanor Vance',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    status: 'taken',
  },
  {
    id: 'act_02',
    patientId: 'patient_elderly_001',
    type: 'prescription_verified',
    icon: 'file-check',
    title: 'Prescription Verified',
    description: 'Sarah verified Prescription #RX-9942 from Dr. S. Sharma. 2 medications added.',
    actor: 'Sarah Vance',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'verified',
  },
  {
    id: 'act_03',
    patientId: 'patient_elderly_001',
    type: 'appointment_scheduled',
    icon: 'calendar',
    title: 'Cardiology Appointment Booked',
    description: 'Follow-up with Dr. Robert Miller scheduled for Nov 20 at 10:30 AM.',
    actor: 'CareCircle Agent',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: 'scheduled',
  },
];

const inMemoryAlerts = [
  {
    _id: 'alert_001',
    patientId: 'patient_elderly_001',
    type: 'refill_needed',
    severity: 'medium',
    message: 'Amlodipine 5mg has only 4 tablets remaining (Refill threshold: 5).',
    caregiverNotified: true,
    acknowledged: false,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
];

// GET /api/family/caregivers
router.get('/caregivers', authenticateToken, async (req, res, next) => {
  try {
    res.json({ success: true, count: inMemoryCaregivers.length, caregivers: inMemoryCaregivers });
  } catch (error) {
    next(error);
  }
});

// GET /api/family/activity
router.get('/activity', authenticateToken, async (req, res, next) => {
  try {
    res.json({ success: true, count: inMemoryActivity.length, activities: inMemoryActivity });
  } catch (error) {
    next(error);
  }
});

// GET /api/family/alerts
router.get('/alerts', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;

    if (isMongoConnected()) {
      const dbAlerts = await Alert.find({ patientId }).sort({ createdAt: -1 }).limit(20).lean();
      return res.json({ success: true, count: dbAlerts.length, alerts: dbAlerts });
    }

    const filtered = inMemoryAlerts.filter((a) => a.patientId === patientId);
    res.json({ success: true, count: filtered.length, alerts: filtered });
  } catch (error) {
    next(error);
  }
});

// POST /api/family/alerts
router.post('/alerts', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { type, severity = 'medium', message } = req.body;

    if (!type || !message) {
      return res.status(400).json({ success: false, error: 'Alert type and message are required.' });
    }

    const alertData = {
      patientId,
      type,
      severity,
      message,
      caregiverNotified: true,
      acknowledged: false,
      createdAt: new Date(),
    };

    if (isMongoConnected()) {
      const doc = await Alert.create(alertData);
      return res.json({ success: true, message: 'Caregiver alert sent successfully.', alert: doc });
    }

    const doc = { ...alertData, _id: `alert_${uuidv4().slice(0, 8)}` };
    inMemoryAlerts.unshift(doc);

    // Also add to activity feed
    inMemoryActivity.unshift({
      id: `act_${Date.now()}`,
      patientId,
      type: 'caregiver_alert',
      icon: 'alert-triangle',
      title: `Caregiver Alert: ${severity.toUpperCase()}`,
      description: message,
      actor: req.user.name || 'Caregiver',
      timestamp: new Date().toISOString(),
      status: 'active',
    });

    res.json({ success: true, message: 'Caregiver alert dispatched.', alert: doc });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/family/alerts/:id/acknowledge
router.patch('/alerts/:id/acknowledge', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoConnected()) {
      const updated = await Alert.findByIdAndUpdate(
        id,
        { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: req.user.name || 'Sarah Vance' },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, error: 'Alert not found' });
      return res.json({ success: true, alert: updated });
    }

    const alert = inMemoryAlerts.find((a) => a._id === id);
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = req.user.name || 'Sarah Vance';

    res.json({ success: true, message: 'Alert acknowledged.', alert });
  } catch (error) {
    next(error);
  }
});

export default router;
