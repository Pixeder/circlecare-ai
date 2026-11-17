import mongoose from '../config/mongodb.js';

let DoseLogModel = null;

if (mongoose) {
  const DoseLogSchema = new mongoose.Schema(
    {
      patientId: { type: String, required: true, index: true },
      medicationId: { type: String, required: true },
      medicationName: { type: String, required: true },
      scheduledTime: { type: Date, default: Date.now },
      takenTime: { type: Date },
      status: {
        type: String,
        enum: ['taken', 'skipped', 'missed', 'delayed'],
        default: 'taken',
      },
      notes: { type: String },
      loggedBy: { type: String, default: 'patient' },
    },
    { timestamps: true }
  );

  DoseLogModel = mongoose.models.DoseLog || mongoose.model('DoseLog', DoseLogSchema);
} else {
  DoseLogModel = {
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    create: async (d) => ({ ...d, _id: `dose_${Date.now()}` }),
  };
}

export const DoseLog = DoseLogModel;
export default DoseLog;
