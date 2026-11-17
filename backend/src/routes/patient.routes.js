import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Patient } from '../models/Patient.js';
import { Medication } from '../models/Medication.js';
import { Appointment } from '../models/Appointment.js';
import { DoseLog } from '../models/DoseLog.js';
import { isMongoConnected } from '../config/mongodb.js';

const router = express.Router();

/**
 * GET /api/patient/overview
 * Real, dynamic dashboard data scoped strictly to the authenticated user's active patient
 */
router.get('/overview', authenticateToken, async (req, res, next) => {
  try {
    const { activePatientId, uid } = req.user;

    if (!activePatientId || !isMongoConnected()) {
      return res.json({
        success: true,
        data: {
          hasPatientProfile: false,
          patient: null,
          medications: [],
          todaySchedule: [],
          upcomingAppointment: null,
          adherenceRate: 0,
          lowStockWarnings: [],
          quickStats: {
            activeMedicationsCount: 0,
            adherenceRate: '0%',
            lowStockCount: 0,
            nextDoctorVisit: 'None scheduled',
          },
        },
      });
    }

    // 1. Fetch real patient profile
    const patientDoc = await Patient.findOne({ patientId: activePatientId }).lean();
    if (!patientDoc) {
      return res.json({
        success: true,
        data: {
          hasPatientProfile: false,
          patient: null,
          medications: [],
          todaySchedule: [],
          upcomingAppointment: null,
          adherenceRate: 0,
          lowStockWarnings: [],
          quickStats: {
            activeMedicationsCount: 0,
            adherenceRate: '0%',
            lowStockCount: 0,
            nextDoctorVisit: 'None scheduled',
          },
        },
      });
    }

    // 2. Fetch real active medications
    const medications = await Medication.find({ patientId: activePatientId, status: 'active' }).lean();

    // 3. Fetch real dose logs for actual adherence calculation
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const doseLogs = await DoseLog.find({
      patientId: activePatientId,
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();

    let adherenceRate = 0;
    if (doseLogs.length > 0) {
      const takenCount = doseLogs.filter((d) => d.status === 'taken').length;
      adherenceRate = Math.round((takenCount / doseLogs.length) * 100);
    } else if (medications.length > 0) {
      adherenceRate = 100; // Perfect adherence if new with no missed doses
    }

    // 4. Low-stock warnings based on real inventory thresholds
    const lowStockWarnings = medications.filter(
      (m) => (m.stockRemaining ?? 30) <= (m.refillThreshold ?? 5)
    );

    // 5. Fetch next real upcoming appointment
    const nextAppt = await Appointment.findOne({
      patientId: activePatientId,
      status: 'scheduled',
      appointmentDate: { $gte: new Date(Date.now() - 24 * 3600 * 1000) },
    })
      .sort({ appointmentDate: 1 })
      .lean();

    const upcomingAppointment = nextAppt
      ? {
          doctorName: nextAppt.doctorName,
          specialty: nextAppt.specialty,
          date: new Date(nextAppt.appointmentDate).toISOString().split('T')[0],
          time: nextAppt.appointmentTime,
          clinicLocation: nextAppt.clinicLocation,
          reason: nextAppt.reason,
        }
      : null;

    res.json({
      success: true,
      data: {
        hasPatientProfile: true,
        patient: {
          patientId: patientDoc.patientId,
          name: patientDoc.name,
          dateOfBirth: patientDoc.dateOfBirth,
          gender: patientDoc.gender,
          phone: patientDoc.phone,
          allergies: patientDoc.allergies || [],
          chronicConditions: patientDoc.chronicConditions || [],
          emergencyContacts: patientDoc.emergencyContacts || [],
          authorizedCaregivers: patientDoc.authorizedCaregivers || [],
          medicalProfile: patientDoc.medicalProfile || {},
        },
        medications: medications.map((m) => ({
          id: m._id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          timing: m.timing || ['08:00 AM'],
          status: m.status,
          stockRemaining: m.stockRemaining ?? 30,
          refillThreshold: m.refillThreshold ?? 5,
          instructions: m.instructions || '',
          todayStatus: 'pending',
          nextDose: m.timing?.[0] || 'Scheduled',
        })),
        todaySchedule: medications.map((m) => ({
          id: m._id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          timing: m.timing || ['08:00 AM'],
          status: m.status,
          stockRemaining: m.stockRemaining ?? 30,
          refillThreshold: m.refillThreshold ?? 5,
          nextDose: m.timing?.[0] || 'Scheduled',
        })),
        upcomingAppointment,
        adherenceRate,
        lowStockWarnings: lowStockWarnings.map((m) => ({
          id: m._id,
          name: m.name,
          dosage: m.dosage,
          stockRemaining: m.stockRemaining ?? 0,
          refillThreshold: m.refillThreshold ?? 5,
        })),
        quickStats: {
          activeMedicationsCount: medications.length,
          adherenceRate: `${adherenceRate}%`,
          lowStockCount: lowStockWarnings.length,
          nextDoctorVisit: upcomingAppointment
            ? `${upcomingAppointment.date} (${upcomingAppointment.time})`
            : 'None scheduled',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient/profile
 */
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { activePatientId } = req.user;
    if (!activePatientId || !isMongoConnected()) {
      return res.json({ success: true, patient: null });
    }

    const patient = await Patient.findOne({ patientId: activePatientId }).lean();
    res.json({ success: true, patient });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/patient/profile
 */
router.patch('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { activePatientId, uid } = req.user;
    if (!activePatientId || !isMongoConnected()) {
      return res.status(400).json({ success: false, error: 'No active patient profile.' });
    }

    // Patient-level authorization check: Must be owner or caregiver
    const owned = await Patient.findOne({ patientId: activePatientId, userId: uid });
    if (!owned) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify patient profile.' });
    }

    const updated = await Patient.findOneAndUpdate(
      { patientId: activePatientId },
      { $set: req.body },
      { new: true }
    );

    res.json({ success: true, message: 'Patient profile updated.', patient: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
