import mongoose from '../config/mongodb.js';

let PatientModel = null;

if (mongoose) {
  const PatientSchema = new mongoose.Schema(
    {
      patientId: { type: String, required: true, unique: true, index: true },
      name: { type: String, required: true },
      age: { type: Number },
      gender: { type: String },
      phone: { type: String },
      emergencyContacts: [
        {
          name: { type: String, required: true },
          phone: { type: String, required: true },
          relationship: { type: String, default: 'Family' },
          isPrimary: { type: Boolean, default: false },
        },
      ],
      authorizedCaregivers: [{ type: String }],
      allergies: [{ type: String }],
      chronicConditions: [{ type: String }],
      preferredLanguage: { type: String, default: 'English' },
    },
    { timestamps: true }
  );

  PatientModel = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
} else {
  PatientModel = {
    findOne: async () => null,
    find: async () => [],
    create: async (d) => ({ ...d, _id: `patient_${Date.now()}` }),
  };
}

export const Patient = PatientModel;
export default Patient;
