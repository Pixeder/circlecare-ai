import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Appointment } from '../models/Appointment.js';
import { isMongoConnected } from '../config/mongodb.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/appointments
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    if (!patientId || !isMongoConnected()) {
      return res.json({ success: true, count: 0, appointments: [] });
    }

    const records = await Appointment.find({ patientId }).sort({ appointmentDate: 1 }).lean();
    res.json({ success: true, count: records.length, appointments: records });
  } catch (error) {
    next(error);
  }
});

// POST /api/appointments
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { doctorName, specialty, appointmentDate, appointmentTime, clinicLocation, reason, notes } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, error: 'No active patient profile selected.' });
    }

    if (!doctorName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        error: 'Doctor name, appointment date, and appointment time are required.',
      });
    }

    const newAppt = {
      appointmentId: `APPT-${Date.now().toString().slice(-4)}`,
      patientId,
      doctorName: doctorName.trim(),
      specialty: specialty || 'General Physician',
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      clinicLocation: clinicLocation || 'Senior Wellness Clinic',
      reason: reason || 'Routine Consultation',
      notes: notes || '',
      status: 'scheduled',
      createdAt: new Date(),
    };

    if (isMongoConnected()) {
      const doc = await Appointment.create(newAppt);
      return res.json({ success: true, message: 'Appointment created successfully.', appointment: doc });
    }

    const record = { ...newAppt, _id: `appt_${uuidv4().slice(0, 8)}` };
    res.json({ success: true, message: 'Appointment created.', appointment: record });
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

    if (!patientId || !isMongoConnected()) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const updated = await Appointment.findOneAndUpdate(
      { $or: [{ _id: id }, { appointmentId: id }], patientId },
      { ...(status && { status }), ...(notes !== undefined && { notes }) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Appointment not found or unauthorized' });
    res.json({ success: true, appointment: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;
    const { id } = req.params;

    if (!patientId || !isMongoConnected()) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const deleted = await Appointment.findOneAndDelete({
      $or: [{ _id: id }, { appointmentId: id }],
      patientId,
    });
    if (!deleted) return res.status(404).json({ success: false, error: 'Appointment not found or unauthorized' });
    res.json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
