import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Medication } from '../models/Medication.js';
import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { isMongoConnected } from '../config/mongodb.js';

const router = express.Router();

// GET /api/patient/overview
router.get('/overview', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.activePatientId;

    let patientProfile = {
      patientId: 'patient_elderly_001',
      name: 'Eleanor Vance',
      age: 74,
      gender: 'Female',
      bloodType: 'O+',
      primaryCondition: 'Essential Hypertension, Type 2 Diabetes',
      allergies: ['Penicillin', 'Sulfa drugs'],
      primaryCaregiver: {
        name: 'Sarah Vance',
        relationship: 'Daughter',
        phone: '+1-555-0192',
      },
      primaryPhysician: {
        name: 'Dr. S. Sharma, MD',
        clinic: 'Senior Geriatric Care Clinic',
      },
    };

    let medications = [
      {
        id: 'med_01',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily with meals',
        timing: ['08:00 AM', '08:00 PM'],
        status: 'active',
        stockRemaining: 24,
        refillThreshold: 5,
        todayStatus: 'taken', // Morning dose taken
        nextDose: '8:00 PM (Dinner)',
      },
      {
        id: 'med_02',
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily in the morning',
        timing: ['08:00 AM'],
        status: 'active',
        stockRemaining: 4, // LOW STOCK!
        refillThreshold: 5,
        todayStatus: 'taken',
        nextDose: 'Tomorrow at 8:00 AM',
      },
    ];

    let upcomingAppointment = {
      doctorName: 'Dr. Robert Miller, FACC',
      specialty: 'Cardiology',
      date: '2026-11-20',
      time: '10:30 AM',
      clinicLocation: 'Senior Wellness Clinic, Suite 204',
      reason: 'Hypertension Follow-up & Lab Review',
    };

    let adherencePercentage = 94;
    let lowStockMeds = medications.filter((m) => m.stockRemaining <= m.refillThreshold);

    if (isMongoConnected()) {
      try {
        const dbPatient = await Patient.findOne({ patientId }).lean();
        if (dbPatient) {
          patientProfile = { ...patientProfile, ...dbPatient };
        }

        const dbMeds = await Medication.find({ patientId, status: 'active' }).lean();
        if (dbMeds && dbMeds.length > 0) {
          medications = dbMeds.map((m) => ({
            id: m._id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            timing: m.timing || ['08:00 AM'],
            status: m.status,
            stockRemaining: m.stockRemaining ?? 30,
            refillThreshold: m.refillThreshold ?? 5,
            todayStatus: 'pending',
            nextDose: m.timing?.[0] || 'Scheduled',
          }));
          lowStockMeds = medications.filter((m) => m.stockRemaining <= m.refillThreshold);
        }

        const dbAppt = await Appointment.findOne({ patientId, status: 'scheduled' })
          .sort({ appointmentDate: 1 })
          .lean();
        if (dbAppt) {
          upcomingAppointment = {
            doctorName: dbAppt.doctorName,
            specialty: dbAppt.specialty,
            date: new Date(dbAppt.appointmentDate).toISOString().split('T')[0],
            time: dbAppt.appointmentTime,
            clinicLocation: dbAppt.clinicLocation,
            reason: dbAppt.reason,
          };
        }
      } catch (err) {
        console.warn('[PatientOverview] MongoDB query warning:', err.message);
      }
    }

    res.json({
      success: true,
      data: {
        patient: patientProfile,
        medications,
        todaySchedule: medications,
        upcomingAppointment,
        adherenceRate: adherencePercentage,
        lowStockWarnings: lowStockMeds,
        quickStats: {
          activeMedicationsCount: medications.length,
          adherenceRate: `${adherencePercentage}%`,
          lowStockCount: lowStockMeds.length,
          nextDoctorVisit: upcomingAppointment ? `${upcomingAppointment.date} (${upcomingAppointment.time})` : 'None scheduled',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/patient/profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    res.json({
      success: true,
      patient: {
        patientId: 'patient_elderly_001',
        name: 'Eleanor Vance',
        age: 74,
        gender: 'Female',
        dob: '1952-04-18',
        phone: '+1-555-0133',
        address: '42 Maplewood Lane, Apt 3B, Boston, MA',
        allergies: ['Penicillin', 'Sulfa drugs'],
        chronicConditions: ['Essential Hypertension', 'Type 2 Diabetes Mellitus'],
        preferredLanguage: 'English',
        emergencyContacts: [
          { name: 'Sarah Vance', phone: '+1-555-0192', relationship: 'Daughter (Primary)' },
          { name: 'Dr. Robert Miller', phone: '+1-555-0144', relationship: 'Physician' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
