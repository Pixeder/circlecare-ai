import { Patient } from '../models/Patient.js';
import { Prescription } from '../models/Prescription.js';
import { Medication } from '../models/Medication.js';
import { Appointment } from '../models/Appointment.js';
import { isMongoConnected } from './mongodb.js';

export async function seedSampleDataIfEmpty() {
  if (!isMongoConnected()) return;

  try {
    const patientId = 'patient_elderly_001';

    // 1. Seed Patient
    const existingPatient = await Patient.findOne({ patientId });
    if (!existingPatient) {
      await Patient.create({
        patientId,
        name: 'Eleanor Vance',
        age: 74,
        gender: 'Female',
        phone: '+1-555-0133',
        emergencyContacts: [
          { name: 'Sarah Vance', phone: '+1-555-0192', relationship: 'Daughter (Primary)', isPrimary: true },
          { name: 'Dr. Robert Miller', phone: '+1-555-0144', relationship: 'Primary Cardiologist', isPrimary: false },
        ],
        authorizedCaregivers: ['caregiver_001', 'caregiver_sarah'],
        allergies: ['Penicillin', 'Sulfa drugs'],
        chronicConditions: ['Essential Hypertension', 'Type 2 Diabetes Mellitus'],
        preferredLanguage: 'English',
      });
      console.log('[Seed] Patient Eleanor Vance seeded in MongoDB.');
    }

    // 2. Seed Prescription
    const existingRx = await Prescription.findOne({ patientId });
    if (!existingRx) {
      await Prescription.create({
        prescriptionId: 'RX-9942',
        patientId,
        imageUrl: 'https://res.cloudinary.com/carecircle-demo/image/upload/v1/sample_rx_dr_sharma.jpg',
        cloudinaryPublicId: 'sample_rx_001',
        doctorName: 'Dr. S. Sharma, MD',
        clinicName: 'Senior Geriatric Care Clinic',
        prescribedDate: new Date('2026-11-12'),
        rawExtractedText: 'Metformin 500mg twice daily with meals. Amlodipine 5mg once daily in morning.',
        extractedMedications: [
          {
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily with meals',
            duration: '30 days',
            instructions: 'Take with food to minimize GI distress',
            confidence: 0.98,
            uncertain: false,
            isVerified: true,
          },
          {
            name: 'Amlodipine',
            dosage: '5mg',
            frequency: 'Once daily in the morning',
            duration: 'Ongoing',
            instructions: 'Take with full glass of water',
            confidence: 0.95,
            uncertain: false,
            isVerified: true,
          },
        ],
        uncertainFields: [],
        status: 'verified',
        verifiedAt: new Date('2026-11-12T10:15:00Z'),
        verifiedBy: 'Sarah Vance (Caregiver)',
      });
      console.log('[Seed] Prescription RX-9942 seeded in MongoDB.');
    }

    // 3. Seed Medications
    const existingMeds = await Medication.find({ patientId });
    if (!existingMeds || existingMeds.length === 0) {
      await Medication.create([
        {
          patientId,
          prescriptionId: 'RX-9942',
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily with meals',
          timing: ['08:00 AM', '08:00 PM'],
          durationDays: 30,
          instructions: 'Take with food to protect stomach',
          stockRemaining: 18,
          refillThreshold: 5,
          status: 'active',
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: 'Sarah Vance (Caregiver)',
        },
        {
          patientId,
          prescriptionId: 'RX-9942',
          name: 'Amlodipine',
          dosage: '5mg',
          frequency: 'Once daily in the morning',
          timing: ['08:00 AM'],
          durationDays: 30,
          instructions: 'Take with full glass of water for blood pressure',
          stockRemaining: 4, // LOW STOCK!
          refillThreshold: 5,
          status: 'active',
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: 'Sarah Vance (Caregiver)',
        },
      ]);
      console.log('[Seed] Active medications seeded in MongoDB.');
    }

    // 4. Seed Appointment
    const existingAppt = await Appointment.findOne({ patientId });
    if (!existingAppt) {
      await Appointment.create({
        appointmentId: 'APPT-101',
        patientId,
        doctorName: 'Dr. Robert Miller, FACC',
        specialty: 'Cardiology',
        appointmentDate: new Date('2026-11-20T10:30:00Z'),
        appointmentTime: '10:30 AM',
        clinicLocation: 'Senior Wellness Clinic, Suite 204',
        reason: 'Hypertension Follow-up & Lab Review',
        notes: 'Bring current blood pressure log and medication list.',
        status: 'scheduled',
      });
      console.log('[Seed] Upcoming Cardiology appointment seeded in MongoDB.');
    }
  } catch (err) {
    console.warn('[Seed] Notice during sample seeding:', err.message);
  }
}

export default { seedSampleDataIfEmpty };
