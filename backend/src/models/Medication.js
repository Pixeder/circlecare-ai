import mongoose from '../config/mongodb.js';

let MedicationModel = null;

if (mongoose) {
  const MedicationSchema = new mongoose.Schema(
    {
      patientId: { type: String, required: true, index: true },
      prescriptionId: { type: String, ref: 'Prescription' },
      name: { type: String, required: true },
      genericName: { type: String },
      dosage: { type: String, required: true },
      frequency: { type: String, required: true },
      timing: [{ type: String }],
      durationDays: { type: Number },
      instructions: { type: String },
      stockRemaining: { type: Number, default: 30 },
      refillThreshold: { type: Number, default: 5 },
      status: {
        type: String,
        enum: ['active', 'completed', 'discontinued'],
        default: 'active',
      },
      isVerified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      verifiedBy: { type: String },
    },
    { timestamps: true }
  );

  MedicationModel = mongoose.models.Medication || mongoose.model('Medication', MedicationSchema);
} else {
  MedicationModel = {
    find: () => ({ lean: async () => [] }),
    findOne: async () => null,
    create: async (d) => ({ ...d, _id: `med_${Date.now()}` }),
  };
}

export const Medication = MedicationModel;
export default Medication;
