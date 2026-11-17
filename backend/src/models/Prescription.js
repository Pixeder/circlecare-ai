import mongoose from '../config/mongodb.js';

let PrescriptionModel = null;

if (mongoose) {
  const ExtractedMedItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dosage: { type: String, default: 'Unspecified' },
    frequency: { type: String, default: 'Unspecified' },
    duration: { type: String, default: 'Unspecified' },
    instructions: { type: String, default: '' },
    confidence: { type: Number, default: 0.0 },
    uncertain: { type: Boolean, default: false },
    uncertainReason: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
  });

  const PrescriptionSchema = new mongoose.Schema(
    {
      prescriptionId: { type: String, required: true, unique: true, index: true },
      patientId: { type: String, required: true, index: true },
      imageUrl: { type: String, required: true },
      cloudinaryPublicId: { type: String },
      doctorName: { type: String },
      clinicName: { type: String },
      prescribedDate: { type: Date },
      rawExtractedText: { type: String },
      extractedMedications: [ExtractedMedItemSchema],
      uncertainFields: [
        {
          field: { type: String },
          extractedValue: { type: String },
          reason: { type: String },
        },
      ],
      status: {
        type: String,
        enum: ['uploaded', 'pending_verification', 'verified', 'rejected'],
        default: 'pending_verification',
      },
      verifiedBy: { type: String },
      verifiedAt: { type: Date },
      qdrantPointId: { type: String },
    },
    { timestamps: true }
  );

  PrescriptionModel = mongoose.models.Prescription || mongoose.model('Prescription', PrescriptionSchema);
} else {
  PrescriptionModel = {
    findOne: async () => null,
    findOneAndUpdate: async () => null,
    create: async (d) => ({ ...d, _id: `rx_${Date.now()}` }),
  };
}

export const Prescription = PrescriptionModel;
export default Prescription;
