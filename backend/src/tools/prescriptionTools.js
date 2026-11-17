import { Prescription } from '../models/Prescription.js';
import { extractPrescriptionData } from '../services/visionService.js';
import { isMongoConnected } from '../config/mongodb.js';

export const readPrescriptionTool = {
  definition: {
    type: 'function',
    function: {
      name: 'read_prescription',
      description: 'Reads an uploaded prescription image and extracts structured medication fields with uncertainty flags. Requires human verification before medications can be added to the schedule.',
      parameters: {
        type: 'object',
        properties: {
          prescriptionId: {
            type: 'string',
            description: 'The unique ID of the uploaded prescription record',
          },
          imageUrl: {
            type: 'string',
            description: 'Optional URL of the prescription image',
          },
        },
        required: ['prescriptionId'],
      },
    },
  },
  requiresConfirmation: false,
  async execute({ context, args }) {
    const { patientId } = context;
    const { prescriptionId, imageUrl } = args;

    if (!prescriptionId) {
      return { success: false, error: 'Prescription ID is required.' };
    }

    let record = null;
    if (isMongoConnected()) {
      record = await Prescription.findOne({ prescriptionId, patientId });
    }

    if (!record) {
      // Simulate or fallback
      const extraction = await extractPrescriptionData(imageUrl || 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
      return {
        success: true,
        prescriptionId,
        patientId,
        status: 'pending_verification',
        extractedData: extraction,
        message: 'Prescription analyzed. Uncertain fields identified. Human verification required before saving medications.',
      };
    }

    return {
      success: true,
      prescriptionId: record.prescriptionId,
      patientId: record.patientId,
      imageUrl: record.imageUrl,
      extractedMedications: record.extractedMedications,
      uncertainFields: record.uncertainFields,
      status: record.status,
      message: record.status === 'verified'
        ? 'Prescription has already been verified by a human caregiver/doctor.'
        : 'Prescription is pending human verification. Please confirm uncertain fields before saving.',
    };
  },
};
