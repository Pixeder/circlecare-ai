import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Appointment } from '../models/Appointment.js';
import { isMongoConnected } from '../config/mongodb.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const inMemoryAppointments = [
  {
    _id: 'appt_sample_01',
    appointmentId: 'APPT-101',
    patientId: 'patient_elderly_001',
    doctorName: 'Dr. Robert Miller, FACC',
    specialty: 'Cardiology',
    appointmentDate: new Date('2026-11-20T10:30:00Z'),
    appointmentTime: '10:30 AM',
    clinicLocation: 'Senior Wellness Clinic, Suite 204',
    reason: 'Hypertension Follow-up & Lab Review',
    status: 'scheduled',
    notes: 'Bring current blood pressure log and medication list.',
    createdAt: new Date('2026-11-10T09:00:00Z'),
  },
  {
    _id: 'appt_sample_02',
    appointmentId: 'APPT-102',
    patientId: 'patient_elderly_001',
    doctorName: 'Dr. S. Sharma, MD',
    specialty: 'Geriatrics & Primary Care',
    appointmentDate: new Date('2026-12-05T14:00:00Z'),
    appointmentTime: '2:00 PM',
    clinicLocation: 'Senior Geriatric Care Clinic',
    reason: 'Routine Geriatric Comprehensive Exam',
    status: 'scheduled',
    notes: 'Routine 6-month wellness review.',
    createdAt: new Date('2026-11-12T11:00:00Z'),
  },
];

// GET /api/appointments
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;

    if (isMongoConnected()) {
      const records = await Appointment.find({ patientId }).sort({ appointmentDate: 1 }).lean();
      return res.json({ success: true, count: records.length, appointments: records });
    }

    const filtered = inMemoryAppointments.filter((a) => a.patientId === patientId);
    res.json({ success: true, count: filtered.length, appointments: filtered });
  } catch (error) {
    next(error);
  }
});

// POST /api/appointments
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { doctorName, specialty, appointmentDate, appointmentTime, clinicLocation, reason, notes } = req.body;

    if (!doctorName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        error: 'Doctor name, appointment date, and appointment time are required.',
      });
    }

    const newAppt = {
      appointmentId: `APPT-${Date.now().toString().slice(-4)}`,
      patientId,
      doctorName,
      specialty: specialty || 'General Physician',
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      clinicLocation: clinicLocation || 'Senior Wellness Clinic, Suite 204',
      reason: reason || 'Consultation',
      notes: notes || '',
      status: 'scheduled',
      createdAt: new Date(),
    };

    if (isMongoConnected()) {
      const doc = await Appointment.create(newAppt);
      return res.json({ success: true, message: 'Appointment created successfully.', appointment: doc });
    }

    const record = { ...newAppt, _id: `appt_${uuidv4().slice(0, 8)}` };
    inMemoryAppointments.push(record);
    res.json({ success: true, message: 'Appointment created (in-memory store).', appointment: record });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (isMongoConnected()) {
      const updated = await Appointment.findOneAndUpdate(
        { $or: [{ _id: id }, { appointmentId: id }], patientId },
        { ...(status && { status }), ...(notes !== undefined && { notes }) },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, error: 'Appointment not found' });
      return res.json({ success: true, appointment: updated });
    }

    const appt = inMemoryAppointments.find((a) => (a._id === id || a.appointmentId === id) && a.patientId === patientId);
    if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });
    if (status) appt.status = status;
    if (notes !== undefined) appt.notes = notes;

    res.json({ success: true, appointment: appt });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { id } = req.params;

    if (isMongoConnected()) {
      const deleted = await Appointment.findOneAndDelete({
        $or: [{ _id: id }, { appointmentId: id }],
        patientId,
      });
      if (!deleted) return res.status(404).json({ success: false, error: 'Appointment not found' });
      return res.json({ success: true, message: 'Appointment cancelled successfully.' });
    }

    const idx = inMemoryAppointments.findIndex((a) => (a._id === id || a.appointmentId === id) && a.patientId === patientId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Appointment not found' });
    inMemoryAppointments.splice(idx, 1);

    res.json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
