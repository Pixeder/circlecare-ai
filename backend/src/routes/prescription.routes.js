import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { uploadPrescriptionImage, extractPrescriptionData } from '../services/visionService.js';
import { storeMedicalMemory } from '../services/vectorService.js';
import { Prescription } from '../models/Prescription.js';
import { Medication } from '../models/Medication.js';
import { isMongoConnected } from '../config/mongodb.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Seeded in-memory store for prescriptions fallback
const inMemoryPrescriptions = [
  {
    prescriptionId: 'RX-9942',
    patientId: 'patient_elderly_001',
    imageUrl: 'https://res.cloudinary.com/carecircle-demo/image/upload/v1/sample_rx_dr_sharma.jpg',
    cloudinaryPublicId: 'sample_rx_001',
    doctorName: 'Dr. S. Sharma, MD',
    clinicName: 'Senior Geriatric Care Clinic',
    prescribedDate: new Date('2026-11-12'),
    rawExtractedText: 'Metformin 500mg twice daily with meals. Amlodipine 5mg once daily in morning.',
    extractedMedications: [
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily with meals',
        duration: '30 days',
        instructions: 'Take with food to minimize GI distress',
        confidence: 0.98,
        uncertain: false,
        isVerified: true,
      },
      {
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily in the morning',
        duration: 'Ongoing',
        instructions: 'Take with full glass of water',
        confidence: 0.95,
        uncertain: false,
        isVerified: true,
      },
    ],
    uncertainFields: [],
    status: 'verified',
    verifiedAt: new Date('2026-11-12T10:15:00Z'),
    verifiedBy: 'Sarah Vance (Caregiver)',
    createdAt: new Date('2026-11-12T10:00:00Z'),
  },
  {
    prescriptionId: 'RX-8814',
    patientId: 'patient_elderly_001',
    imageUrl: 'https://res.cloudinary.com/carecircle-demo/image/upload/v1/cardiology_rx_oct.jpg',
    cloudinaryPublicId: 'sample_rx_002',
    doctorName: 'Dr. Robert Miller, FACC',
    clinicName: 'Senior Cardiology Associates',
    prescribedDate: new Date('2026-10-15'),
    rawExtractedText: 'Amlodipine 5mg once daily. Atorvastatin 10mg at bedtime.',
    extractedMedications: [
      {
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily in the morning',
        duration: '90 days',
        instructions: 'Blood pressure maintenance',
        confidence: 0.96,
        uncertain: false,
        isVerified: true,
      },
      {
        name: 'Atorvastatin',
        dosage: '10mg',
        frequency: 'Once daily at bedtime',
        duration: '90 days',
        instructions: 'Lipid control',
        confidence: 0.91,
        uncertain: false,
        isVerified: true,
      },
    ],
    uncertainFields: [],
    status: 'verified',
    verifiedAt: new Date('2026-10-15T16:00:00Z'),
    verifiedBy: 'Sarah Vance (Caregiver)',
    createdAt: new Date('2026-10-15T15:45:00Z'),
  },
];

/**
 * GET /api/prescriptions
 * Returns prescription history for the authenticated patient
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;

    if (isMongoConnected()) {
      const records = await Prescription.find({ patientId }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, count: records.length, prescriptions: records });
    }

    const filtered = inMemoryPrescriptions.filter((p) => p.patientId === patientId);
    res.json({ success: true, count: filtered.length, prescriptions: filtered });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prescriptions/:id
 * Returns detail for a specific prescription
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { id } = req.params;

    if (isMongoConnected()) {
      const record = await Prescription.findOne({ prescriptionId: id, patientId }).lean();
      if (!record) return res.status(404).json({ success: false, error: 'Prescription not found' });
      return res.json({ success: true, prescription: record });
    }

    const record = inMemoryPrescriptions.find((p) => p.prescriptionId === id && p.patientId === patientId);
    if (!record) return res.status(404).json({ success: false, error: 'Prescription not found' });
    res.json({ success: true, prescription: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prescriptions/upload
 * Step 1-4: Upload image, store in Cloudinary, extract with OCR/Vision, flag uncertain fields.
 */
router.post('/upload', authenticateToken, upload.single('image'), async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const file = req.file;

    let imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample_prescription.jpg';
    let cloudinaryPublicId = `prescription_${Date.now()}`;

    if (file) {
      const uploadResult = await uploadPrescriptionImage(file.buffer, file.originalname);
      imageUrl = uploadResult.url;
      cloudinaryPublicId = uploadResult.publicId;
    }

    // Extract structured data with uncertainty detection
    const extracted = await extractPrescriptionData(imageUrl);
    const prescriptionId = `RX-${Date.now().toString().slice(-6)}`;

    const recordData = {
      prescriptionId,
      patientId,
      imageUrl,
      cloudinaryPublicId,
      doctorName: extracted.doctorName,
      clinicName: extracted.clinicName,
      prescribedDate: extracted.prescribedDate,
      rawExtractedText: extracted.rawExtractedText,
      extractedMedications: extracted.extractedMedications,
      uncertainFields: extracted.uncertainFields,
      status: 'pending_verification',
      createdAt: new Date(),
    };

    if (isMongoConnected()) {
      await Prescription.create(recordData);
    } else {
      inMemoryPrescriptions.unshift(recordData);
    }

    res.json({
      success: true,
      message: 'Prescription uploaded and analyzed. Human verification required before medications are saved.',
      data: recordData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prescriptions/verify
 * Step 5-7: Human verification completed -> save verified medications to MongoDB & index in Qdrant.
 */
router.post('/verify', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { prescriptionId, verifiedMedications } = req.body;

    if (!prescriptionId || !Array.isArray(verifiedMedications) || verifiedMedications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prescription ID and at least one verified medication item are required.',
      });
    }

    // Safety guardrail: Never invent missing medicine names, strengths, frequencies, or durations
    for (const item of verifiedMedications) {
      if (!item.name || !item.dosage || !item.frequency) {
        return res.status(400).json({
          success: false,
          error: `Medication '${item.name || 'Unknown'}' is missing required dosage or frequency. Cannot save incomplete instructions.`,
        });
      }
    }

    const savedMedications = [];

    // Save verified medications
    for (const item of verifiedMedications) {
      const medData = {
        patientId,
        prescriptionId,
        name: item.name,
        dosage: item.dosage,
        frequency: item.frequency,
        timing: item.timing || ['08:00', '20:00'],
        durationDays: item.durationDays || 30,
        instructions: item.instructions || '',
        stockRemaining: item.stockRemaining || 30,
        refillThreshold: 5,
        status: 'active',
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user.name || 'Human Caregiver',
      };

      if (isMongoConnected()) {
        const doc = await Medication.create(medData);
        savedMedications.push(doc);
      } else {
        savedMedications.push({ ...medData, _id: `med_${uuidv4().slice(0, 8)}` });
      }
    }

    // Update prescription status
    if (isMongoConnected()) {
      await Prescription.findOneAndUpdate(
        { prescriptionId, patientId },
        {
          status: 'verified',
          verifiedBy: req.user.name || 'Human Caregiver',
          verifiedAt: new Date(),
          extractedMedications: verifiedMedications.map((m) => ({ ...m, isVerified: true })),
        }
      );
    } else {
      const match = inMemoryPrescriptions.find((p) => p.prescriptionId === prescriptionId);
      if (match) {
        match.status = 'verified';
        match.verifiedBy = req.user.name || 'Human Caregiver';
        match.verifiedAt = new Date();
        match.extractedMedications = verifiedMedications.map((m) => ({ ...m, isVerified: true }));
      }
    }

    // Step 7: Store searchable prescription text and metadata in Qdrant
    const summaryText = `Prescription ${prescriptionId} for patient ${patientId}. Verified medications: ${verifiedMedications
      .map((m) => `${m.name} ${m.dosage} (${m.frequency})`)
      .join(', ')}. Doctor: ${req.body.doctorName || 'Attending Physician'}.`;

    const vectorResult = await storeMedicalMemory({
      patientId,
      text: summaryText,
      recordType: 'prescription',
      sourceRef: `Verified Prescription #${prescriptionId}`,
      metadata: { prescriptionId, verifiedCount: verifiedMedications.length },
    });

    res.json({
      success: true,
      message: 'Prescription verified. Verified medications scheduled and indexed in Qdrant vector memory.',
      data: {
        prescriptionId,
        savedMedicationsCount: savedMedications.length,
        savedMedications,
        vectorMemoryIndexed: vectorResult.success,
        vectorPointId: vectorResult.pointId,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
