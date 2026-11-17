import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { searchMedicalMemory } from '../services/vectorService.js';
import { generateDoctorBriefTool } from '../tools/medicalHistoryTools.js';
import { Prescription } from '../models/Prescription.js';
import { isMongoConnected } from '../config/mongodb.js';

const router = express.Router();

const staticRecords = [
  {
    recordId: 'REC-2026-01',
    patientId: 'patient_elderly_001',
    date: '2026-11-12T09:00:00Z',
    type: 'prescription',
    title: 'Geriatric Prescription #RX-9942',
    provider: 'Dr. S. Sharma, MD',
    facility: 'Senior Geriatric Care Clinic',
    summary: 'Metformin 500mg twice daily with meals. Amlodipine 5mg once daily in morning. Blood pressure monitoring advised.',
    verified: true,
  },
  {
    recordId: 'REC-2026-02',
    patientId: 'patient_elderly_001',
    date: '2026-10-15T14:30:00Z',
    type: 'clinical_note',
    title: 'Cardiology Progress Consultation',
    provider: 'Dr. Robert Miller, FACC',
    facility: 'Senior Cardiology Associates',
    summary: 'Patient Eleanor Vance reviewed for mild essential hypertension. BP 128/82. Recommended continuation of Amlodipine 5mg.',
    verified: true,
  },
  {
    recordId: 'REC-2026-03',
    patientId: 'patient_elderly_001',
    date: '2026-09-02T11:00:00Z',
    type: 'lab_report',
    title: 'Comprehensive Metabolic & Lipid Panel',
    provider: 'Quest Geriatric Diagnostics',
    facility: 'Outpatient Lab Services',
    summary: 'HbA1c 6.4% (well-controlled on Metformin). Total Cholesterol 185 mg/dL. Renal function panel normal.',
    verified: true,
  },
];

// GET /api/medical-history/records
router.get('/records', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;

    let prescriptionRecords = [];
    if (isMongoConnected()) {
      const dbPrescriptions = await Prescription.find({ patientId }).lean();
      prescriptionRecords = dbPrescriptions.map((p) => ({
        recordId: p.prescriptionId,
        patientId: p.patientId,
        date: p.prescribedDate || p.createdAt,
        type: 'prescription',
        title: `Prescription #${p.prescriptionId}`,
        provider: p.doctorName || 'Attending Physician',
        facility: p.clinicName || 'Clinic',
        summary: p.rawExtractedText || 'Prescription instructions',
        verified: p.status === 'verified',
      }));
    }

    const allRecords = [...prescriptionRecords, ...staticRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json({ success: true, count: allRecords.length, records: allRecords });
  } catch (error) {
    next(error);
  }
});

// GET /api/medical-history/search?query=...
router.get('/search', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const query = req.query.query || 'prescriptions and hypertension';
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
    const context = { patientId: req.user.activePatientId, user: req.user };
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
    const context = { patientId: req.user.activePatientId, user: req.user };
    const { focusArea } = req.body;
    const result = await generateDoctorBriefTool.execute({ context, args: { focusArea } });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
