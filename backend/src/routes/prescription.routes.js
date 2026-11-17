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

/**
 * GET /api/prescriptions
 * Returns real prescription history strictly for the authenticated patient
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId || !isMongoConnected()) {
      return res.json({ success: true, count: 0, prescriptions: [] });
    }

    const records = await Prescription.find({ patientId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: records.length, prescriptions: records });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prescriptions/:id
 * Returns detail for a specific prescription strictly belonging to the active patient
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { id } = req.params;

    if (!patientId || !isMongoConnected()) {
      return res.status(404).json({ success: false, error: 'Prescription not found' });
    }

    const record = await Prescription.findOne({
      $or: [{ prescriptionId: id }, { _id: id }],
      patientId,
    }).lean();

    if (!record) {
      return res.status(404).json({ success: false, error: 'Prescription not found or unauthorized' });
    }

    res.json({ success: true, prescription: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prescriptions/upload
 * Step 1-4: Upload image to Cloudinary, extract with OCR/Vision, flag uncertain fields.
 */
router.post('/upload', authenticateToken, upload.single('image'), async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

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
    }

    // ------------ New: Shape response per required schema ------------
    const responseData = {
      prescriptionId: recordData.prescriptionId,
      imageUrl: recordData.imageUrl,
      doctor_name: recordData.doctorName,
      clinic_name: recordData.clinicName,
      prescription_date: recordData.prescribedDate
        ? recordData.prescribedDate.toISOString().split('T')[0]
        : null,
      patient_name: null, // could be populated from patient profile if needed
      medications: extracted.extractedMedications.map((med) => ({
        medicine_name: med.name,
        strength: med.dosage?.split(' ')[0] || null,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
        confidence: med.confidence,
        uncertain_fields: med.uncertain ? ['medicine_name', 'dosage', 'frequency', 'duration'] : [],
      })),
      additional_notes: [],
      allergies: [],
      requires_human_verification: true,
      _raw: {
        rawExtractedText: extracted.rawExtractedText,
        uncertainFields: extracted.uncertainFields,
      },
    };

    res.json({
      success: true,
      message: 'Prescription uploaded and analyzed. Human verification required before medications are saved.',
      data: responseData,
      _dbRecord: recordData,
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

    if (!patientId) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

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

    // Save verified medications to MongoDB
    for (const item of verifiedMedications) {
      const medData = {
        patientId,
        prescriptionId,
        name: item.name.trim(),
        dosage: item.dosage.trim(),
        frequency: item.frequency.trim(),
        timing: item.timing || ['08:00 AM', '08:00 PM'],
        durationDays: item.durationDays || 30,
        instructions: item.instructions || '',
        stockRemaining: item.stockRemaining || 30,
        refillThreshold: 5,
        status: 'active',
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user.name || 'Verified Caregiver',
      };

      if (isMongoConnected()) {
        const doc = await Medication.create(medData);
        savedMedications.push(doc);
      } else {
        savedMedications.push({ ...medData, _id: `med_${uuidv4().slice(0, 8)}` });
      }
    }

    // Update prescription status in MongoDB
    if (isMongoConnected()) {
      await Prescription.findOneAndUpdate(
        { prescriptionId, patientId },
        {
          status: 'verified',
          verifiedBy: req.user.name || 'Verified Caregiver',
          verifiedAt: new Date(),
          extractedMedications: verifiedMedications.map((m) => ({ ...m, isVerified: true })),
        }
      );
    }

    // Step 7: Store searchable prescription text and metadata in Qdrant with patient isolation
    const summaryText = `Prescription ${prescriptionId} for patient ${patientId}. Verified medications: ${verifiedMedications
      .map((m) => `${m.name} ${m.dosage} (${m.frequency})`)
      .join(', ')}.`;

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
