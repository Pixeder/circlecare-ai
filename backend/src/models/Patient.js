import mongoose from '../config/mongodb.js';

let PatientModel = null;

if (mongoose) {
  const PatientSchema = new mongoose.Schema(
    {
      patientId: { type: String, required: true, unique: true, index: true },
      userId: { type: String, required: true, index: true }, // Owner Firebase UID
      name: { type: String, required: true, trim: true },
      dateOfBirth: { type: String, default: '' },
      gender: { type: String, default: '' },
      phone: { type: String, default: '' },
      emergencyContacts: [
        {
          name: { type: String, required: true },
          phone: { type: String, required: true },
          relationship: { type: String, default: 'Family' },
          isPrimary: { type: Boolean, default: false },
        },
      ],
      authorizedCaregivers: [{ type: String }], // Array of caregiver Firebase UIDs / emails
      allergies: [{ type: String }],
      chronicConditions: [{ type: String }],
      preferredLanguage: { type: String, default: 'English' },
      medicalProfile: {
        bloodType: { type: String, default: 'Unknown' },
        heightCm: { type: Number, default: null },
        weightKg: { type: Number, default: null },
        notes: { type: String, default: '' },
      },
    },
    { timestamps: true }
  );

  PatientModel = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
} else {
  PatientModel = {
    findOne: async () => null,
    find: async () => [],
    create: async (d) => ({ ...d, _id: `patient_${Date.now()}` }),
    findOneAndUpdate: async () => null,
    deleteOne: async () => null,
  };
}

export const Patient = PatientModel;
export default Patient;
