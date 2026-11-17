import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Alert } from '../models/Alert.js';
import { Caregiver } from '../models/Caregiver.js';
import { DoseLog } from '../models/DoseLog.js';
import { Prescription } from '../models/Prescription.js';
import { isMongoConnected } from '../config/mongodb.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/family/caregivers
router.get('/caregivers', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId || !isMongoConnected()) {
      return res.json({ success: true, count: 0, caregivers: [] });
    }

    const caregivers = await Caregiver.find({ patientId }).lean();
    res.json({
      success: true,
      count: caregivers.length,
      caregivers: caregivers.map((c) => ({
        caregiverId: c._id,
        name: c.caregiverName || c.caregiverEmail.split('@')[0],
        email: c.caregiverEmail,
        relationship: c.relationship,
        accessLevel: c.permissions?.join(', ') || 'Standard',
        status: c.invitationStatus,
        lastActive: 'Active',
        avatar: '👤',
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family/activity
router.get('/activity', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId || !isMongoConnected()) {
      return res.json({ success: true, count: 0, activities: [] });
    }

    const [doseLogs, prescriptions, alerts] = await Promise.all([
      DoseLog.find({ patientId }).sort({ createdAt: -1 }).limit(10).lean(),
      Prescription.find({ patientId }).sort({ createdAt: -1 }).limit(5).lean(),
      Alert.find({ patientId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const activities = [];

    doseLogs.forEach((d) => {
      activities.push({
        id: `act_dose_${d._id}`,
        patientId,
        type: 'medication_dose',
        title: `Dose ${d.status === 'taken' ? 'Logged' : 'Skipped'}: ${d.medicationName}`,
        description: d.notes || `${d.medicationName} marked as ${d.status}.`,
        actor: d.loggedBy || 'Patient',
        timestamp: d.createdAt,
        status: d.status,
      });
    });

    prescriptions.forEach((p) => {
      activities.push({
        id: `act_rx_${p._id}`,
        patientId,
        type: 'prescription_verified',
        title: `Prescription #${p.prescriptionId} ${p.status === 'verified' ? 'Verified' : 'Uploaded'}`,
        description: `Prescribed by ${p.doctorName || 'Doctor'}. ${p.extractedMedications?.length || 0} medication(s).`,
        actor: p.verifiedBy || 'Caregiver',
        timestamp: p.createdAt,
        status: p.status,
      });
    });

    alerts.forEach((a) => {
      activities.push({
        id: `act_alert_${a._id}`,
        patientId,
        type: 'caregiver_alert',
        title: `Alert: ${a.type?.toUpperCase()}`,
        description: a.message,
        actor: 'CareCircle System',
        timestamp: a.createdAt,
        status: a.severity,
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, count: activities.length, activities: activities.slice(0, 15) });
  } catch (error) {
    next(error);
  }
});

// GET /api/family/alerts
router.get('/alerts', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId || !isMongoConnected()) {
      return res.json({ success: true, count: 0, alerts: [] });
    }

    const alerts = await Alert.find({ patientId }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    next(error);
  }
});

// POST /api/family/alerts
router.post('/alerts', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { type, severity = 'medium', message } = req.body;

    if (!patientId || !isMongoConnected()) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

    if (!type || !message) {
      return res.status(400).json({ success: false, error: 'Alert category and message are required.' });
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

    const doc = await Alert.create(alertData);
    res.json({ success: true, message: 'Caregiver alert dispatched and logged.', alert: doc });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/family/alerts/:id/acknowledge
router.patch('/alerts/:id/acknowledge', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const patientId = req.user.activePatientId;

    if (!isMongoConnected()) {
      return res.json({ success: true, message: 'Alert acknowledged.' });
    }

    const updated = await Alert.findOneAndUpdate(
      { _id: id, patientId },
      {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user.name || req.user.email,
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, error: 'Alert not found or unauthorized' });
    res.json({ success: true, message: 'Alert acknowledged.', alert: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
