import mongoose from '../config/mongodb.js';

let AlertModel = null;

if (mongoose) {
  const AlertSchema = new mongoose.Schema(
    {
      patientId: { type: String, required: true, index: true },
      type: {
        type: String,
        enum: ['sos', 'missed_medication', 'refill_needed', 'vital_anomaly', 'general'],
        required: true,
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      message: { type: String, required: true },
      details: { type: mongoose.Schema.Types.Mixed },
      caregiverNotified: { type: Boolean, default: false },
      emergencyContactsNotified: [{ type: String }],
      status: {
        type: String,
        enum: ['active', 'acknowledged', 'resolved'],
        default: 'active',
      },
      resolvedAt: { type: Date },
      resolvedBy: { type: String },
    },
    { timestamps: true }
  );

  AlertModel = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
} else {
  AlertModel = {
    create: async (d) => ({ ...d, _id: `alert_${Date.now()}` }),
  };
}

export const Alert = AlertModel;
export default Alert;
