import mongoose from '../config/mongodb.js';

let AppointmentModel = null;

if (mongoose) {
  const AppointmentSchema = new mongoose.Schema(
    {
      patientId: { type: String, required: true, index: true },
      doctorName: { type: String, required: true },
      specialty: { type: String, default: 'General Physician' },
      clinicLocation: { type: String },
      appointmentDate: { type: Date, required: true },
      appointmentTime: { type: String, required: true },
      reason: { type: String },
      status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
        default: 'scheduled',
      },
      notes: { type: String },
    },
    { timestamps: true }
  );

  AppointmentModel = mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);
} else {
  AppointmentModel = {
    create: async (d) => ({ ...d, _id: `appt_${Date.now()}` }),
  };
}

export const Appointment = AppointmentModel;
export default Appointment;
