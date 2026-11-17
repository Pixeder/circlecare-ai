import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { searchMedicalMemory } from '../services/vectorService.js';
import { generateDoctorBriefTool } from '../tools/medicalHistoryTools.js';
import { Prescription } from '../models/Prescription.js';
import { isMongoConnected } from '../config/mongodb.js';

const router = express.Router();

// GET /api/medical-history/records
router.get('/records', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId || !isMongoConnected()) {
      return res.json({ success: true, count: 0, records: [] });
    }

    const dbPrescriptions = await Prescription.find({ patientId }).sort({ createdAt: -1 }).lean();
    const records = dbPrescriptions.map((p) => ({
      recordId: p.prescriptionId,
      patientId: p.patientId,
      date: p.prescribedDate || p.createdAt,
      type: 'prescription',
      title: `Prescription #${p.prescriptionId}`,
      provider: p.doctorName || 'Attending Physician',
      facility: p.clinicName || 'Clinic',
      summary: (p.extractedMedications || []).map((m) => `${m.name} ${m.dosage} (${m.frequency})`).join(', ') || p.rawExtractedText,
      verified: p.status === 'verified',
    }));

    res.json({ success: true, count: records.length, records });
  } catch (error) {
    next(error);
  }
});

// GET /api/medical-history/search?query=...
router.get('/search', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

    const query = req.query.query || '';
    if (!query.trim()) {
      return res.json({ success: true, query: '', resultsCount: 0, records: [] });
    }

    const limit = parseInt(req.query.limit, 10) || 5;
    const memories = await searchMedicalMemory({ patientId, query, limit });

    res.json({
      success: true,
      query,
      patientId,
      resultsCount: memories.length,
      records: memories,
      disclaimer: 'Strict patient-isolated Qdrant vector memory retrieval.',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/medical-history/doctor-brief
router.get('/doctor-brief', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

    const context = { patientId, user: req.user };
    const focusArea = req.query.focusArea || 'General Geriatric Review';
    const result = await generateDoctorBriefTool.execute({ context, args: { focusArea } });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/medical-history/doctor-brief
router.post('/doctor-brief', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

    const context = { patientId, user: req.user };
    const { focusArea } = req.body;
    const result = await generateDoctorBriefTool.execute({ context, args: { focusArea } });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
