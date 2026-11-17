import { Appointment } from '../models/Appointment.js';
import { isMongoConnected } from '../config/mongodb.js';

const inMemoryAppointments = [];

export const createAppointmentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'create_appointment',
      description: 'Schedules a healthcare or clinic consultation appointment for the patient. Consequential action: requires explicit confirmation.',
      parameters: {
        type: 'object',
        properties: {
          doctorName: { type: 'string', description: 'Name of the physician or clinic' },
          specialty: { type: 'string', description: 'Medical specialty (e.g. Geriatrics, Cardiology)' },
          appointmentDate: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          appointmentTime: { type: 'string', description: 'Time of appointment (e.g. 10:30 AM)' },
          clinicLocation: { type: 'string', description: 'Clinic address or Telehealth link' },
          reason: { type: 'string', description: 'Reason for visit' },
        },
        required: ['doctorName', 'appointmentDate', 'appointmentTime'],
      },
    },
  },
  requiresConfirmation: true, // Consequential!
  async execute({ context, args }) {
    const { patientId } = context;
    const { doctorName, specialty, appointmentDate, appointmentTime, clinicLocation, reason } = args;

    const appointmentData = {
      patientId,
      doctorName,
      specialty: specialty || 'General Physician',
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      clinicLocation: clinicLocation || 'Senior Wellness Clinic, Suite 204',
      reason: reason || 'Routine Geriatric Checkup',
      status: 'scheduled',
    };

    if (isMongoConnected()) {
      const doc = await Appointment.create(appointmentData);
      return {
        success: true,
        appointmentId: doc._id,
        doctorName: doc.doctorName,
        date: appointmentDate,
        time: appointmentTime,
        message: `Appointment successfully scheduled with ${doctorName} on ${appointmentDate} at ${appointmentTime}.`,
      };
    }

    const mockId = `appt_${Date.now()}`;
    inMemoryAppointments.push({ ...appointmentData, _id: mockId });

    return {
      success: true,
      appointmentId: mockId,
      doctorName,
      date: appointmentDate,
      time: appointmentTime,
      message: `Appointment scheduled with ${doctorName} on ${appointmentDate} at ${appointmentTime} (simulated store).`,
    };
  },
};
