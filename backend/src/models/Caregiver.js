import mongoose from '../config/mongodb.js';

let CaregiverModel = null;

if (mongoose) {
  const CaregiverSchema = new mongoose.Schema(
    {
      patientId: { type: String, required: true, index: true },
      caregiverUid: { type: String, required: true, index: true },
      caregiverEmail: { type: String, required: true, lowercase: true, trim: true },
      caregiverName: { type: String, default: '' },
      relationship: { type: String, default: 'Family Caregiver' },
      permissions: {
        type: [String],
        default: ['read_medications', 'log_dose', 'view_prescriptions', 'emergency_alert'],
      },
      invitationStatus: {
        type: String,
        enum: ['pending', 'accepted', 'revoked'],
        default: 'accepted',
      },
      invitedBy: { type: String },
    },
    { timestamps: true }
  );

  CaregiverModel = mongoose.models.Caregiver || mongoose.model('Caregiver', CaregiverSchema);
} else {
  CaregiverModel = {
    findOne: async () => null,
    find: async () => [],
    create: async (d) => ({ ...d, _id: `cg_${Date.now()}` }),
    findOneAndUpdate: async () => null,
    deleteOne: async () => null,
  };
}

export const Caregiver = CaregiverModel;
export default Caregiver;
