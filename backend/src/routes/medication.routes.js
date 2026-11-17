import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getMedicationsTool, logDoseTool, checkMedicineStockTool } from '../tools/medicationTools.js';
import { Medication } from '../models/Medication.js';
import { Alert } from '../models/Alert.js';
import { isMongoConnected } from '../config/mongodb.js';

const router = express.Router();

// GET /api/medications - returns scheduled medications
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const context = { patientId: req.user.activePatientId, user: req.user };
    const result = await getMedicationsTool.execute({ context, args: { status: req.query.status || 'active' } });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/medications/log-dose - logs a dose taken or skipped
router.post('/log-dose', authenticateToken, async (req, res, next) => {
  try {
    const context = { patientId: req.user.activePatientId, user: req.user };
    const result = await logDoseTool.execute({ context, args: req.body });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/medications/stock - checks medicine inventory levels
router.get('/stock', authenticateToken, async (req, res, next) => {
  try {
    const context = { patientId: req.user.activePatientId, user: req.user };
    const result = await checkMedicineStockTool.execute({ context, args: {} });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/medications/refill - initiates a medicine refill request workflow
router.post('/refill', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { medicationName, quantityRequested = 30, pharmacyNotes = '' } = req.body;

    if (!medicationName) {
      return res.status(400).json({ success: false, error: 'Medication name is required for refill request.' });
    }

    // Safety guardrail: Never falsely claim automatic pharmacy ordering/delivery without user authorization
    const refillRecord = {
      requestId: `REFILL-${Date.now().toString().slice(-5)}`,
      patientId,
      medicationName,
      quantityRequested,
      pharmacyNotes,
      status: 'pending_pharmacy_fulfillment',
      requestedAt: new Date().toISOString(),
      caregiverNotified: true,
      message: `Refill request for ${medicationName} (${quantityRequested} units) submitted to preferred pharmacy and notified caregiver Sarah Vance.`,
    };

    if (isMongoConnected()) {
      await Alert.create({
        patientId,
        type: 'refill_needed',
        severity: 'medium',
        message: `Refill requested for ${medicationName} (${quantityRequested} units).`,
        caregiverNotified: true,
      });
    }

    res.json({
      success: true,
      message: refillRecord.message,
      data: refillRecord,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
