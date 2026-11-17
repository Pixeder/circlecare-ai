import { Medication } from '../models/Medication.js';
import { DoseLog } from '../models/DoseLog.js';
import { isMongoConnected } from '../config/mongodb.js';

// In-memory mock store for development when DB is not running
const inMemoryMedications = [
  {
    _id: 'med_001',
    patientId: 'patient_elderly_001',
    name: 'Metformin',
    genericName: 'Metformin Hydrochloride',
    dosage: '500mg',
    frequency: 'Twice daily with meals (08:00, 20:00)',
    timing: ['08:00', '20:00'],
    durationDays: 30,
    instructions: 'Take with food to minimize GI distress. Do not skip meals.',
    stockRemaining: 18,
    refillThreshold: 5,
    status: 'active',
    isVerified: true,
  },
  {
    _id: 'med_002',
    patientId: 'patient_elderly_001',
    name: 'Amlodipine',
    genericName: 'Amlodipine Besylate',
    dosage: '5mg',
    frequency: 'Once daily in morning (08:00)',
    timing: ['08:00'],
    durationDays: 60,
    instructions: 'Take in the morning with a glass of water for blood pressure management.',
    stockRemaining: 4, // Below threshold -> trigger warning!
    refillThreshold: 5,
    status: 'active',
    isVerified: true,
  },
];

const inMemoryDoseLogs = [];

export const getMedicationsTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_medications',
      description: 'Retrieves the list of scheduled medications, dosages, timings, instructions, and stock for the patient.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'completed', 'discontinued', 'all'],
            description: 'Filter medications by status. Defaults to active.',
          },
        },
      },
    },
  },
  requiresConfirmation: false,
  async execute({ context, args }) {
    const { patientId } = context;
    const status = args.status || 'active';

    let meds = [];
    if (isMongoConnected()) {
      const query = { patientId };
      if (status !== 'all') query.status = status;
      meds = await Medication.find(query).lean();
    } else {
      meds = inMemoryMedications.filter(
        (m) => m.patientId === patientId && (status === 'all' || m.status === status)
      );
    }

    return {
      success: true,
      patientId,
      totalCount: meds.length,
      medications: meds.map((m) => ({
        id: m._id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        timing: m.timing,
        instructions: m.instructions,
        stockRemaining: m.stockRemaining,
        refillNeeded: m.stockRemaining <= m.refillThreshold,
        status: m.status,
      })),
      timestamp: new Date().toISOString(),
    };
  },
};

export const createMedicationTool = {
  definition: {
    type: 'function',
    function: {
      name: 'create_medication',
      description: 'Saves a new verified medication to the patient schedule. Consequential action: must only be called after human verification of the prescription.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Medicine brand or chemical name' },
          dosage: { type: 'string', description: 'Verified dosage (e.g. 500mg)' },
          frequency: { type: 'string', description: 'Frequency (e.g. Once daily after breakfast)' },
          timing: {
            type: 'array',
            items: { type: 'string' },
            description: 'Times of day (e.g. ["08:00", "20:00"])',
          },
          durationDays: { type: 'number', description: 'Duration in days' },
          instructions: { type: 'string', description: 'Patient guidance (e.g. Take with food)' },
          stockRemaining: { type: 'number', description: 'Starting pill stock count' },
          prescriptionId: { type: 'string', description: 'ID of verified source prescription' },
        },
        required: ['name', 'dosage', 'frequency'],
      },
    },
  },
  requiresConfirmation: true, // Consequential!
  async execute({ context, args }) {
    const { patientId, user } = context;

    // Safety guardrail: Never invent missing medicine names or dosages
    if (!args.name || !args.dosage || !args.frequency) {
      return {
        success: false,
        error: 'Incomplete medication parameters. Strict clinical safety prevents saving medications with unspecified name, dosage, or frequency.',
      };
    }

    const newMed = {
      patientId,
      name: args.name,
      dosage: args.dosage,
      frequency: args.frequency,
      timing: args.timing || ['08:00'],
      durationDays: args.durationDays || 30,
      instructions: args.instructions || '',
      stockRemaining: args.stockRemaining || 30,
      refillThreshold: 5,
      status: 'active',
      isVerified: true,
      verifiedBy: user?.name || 'Human Caregiver',
      verifiedAt: new Date(),
    };

    if (isMongoConnected()) {
      const doc = await Medication.create(newMed);
      return {
        success: true,
        medicationId: doc._id,
        message: `Medication '${doc.name}' (${doc.dosage}) successfully added to patient's active schedule.`,
      };
    }

    newMed._id = `med_${Date.now()}`;
    inMemoryMedications.push(newMed);
    return {
      success: true,
      medicationId: newMed._id,
      message: `Medication '${newMed.name}' (${newMed.dosage}) added to active schedule (memory store).`,
    };
  },
};

export const logDoseTool = {
  definition: {
    type: 'function',
    function: {
      name: 'log_dose',
      description: 'Records whether a scheduled medicine dose was taken, skipped, or missed by the patient, updating remaining stock.',
      parameters: {
        type: 'object',
        properties: {
          medicationName: { type: 'string', description: 'Name of the medicine' },
          status: {
            type: 'string',
            enum: ['taken', 'skipped', 'missed', 'delayed'],
            description: 'Status of the dose intake',
          },
          notes: { type: 'string', description: 'Optional feedback or side-effect notes' },
        },
        required: ['medicationName', 'status'],
      },
    },
  },
  requiresConfirmation: false,
  async execute({ context, args }) {
    const { patientId, user } = context;
    const { medicationName, status, notes } = args;

    let med = null;
    if (isMongoConnected()) {
      med = await Medication.findOne({
        patientId,
        name: new RegExp(`^${medicationName}$`, 'i'),
        status: 'active',
      });
      if (med && status === 'taken' && med.stockRemaining > 0) {
        med.stockRemaining -= 1;
        await med.save();
      }

      await DoseLog.create({
        patientId,
        medicationId: med?._id || 'unknown',
        medicationName,
        status,
        notes: notes || '',
        takenTime: status === 'taken' ? new Date() : null,
        loggedBy: user?.role || 'patient',
      });
    } else {
      med = inMemoryMedications.find(
        (m) => m.patientId === patientId && m.name.toLowerCase() === medicationName.toLowerCase()
      );
      if (med && status === 'taken' && med.stockRemaining > 0) {
        med.stockRemaining -= 1;
      }
      inMemoryDoseLogs.push({
        patientId,
        medicationName,
        status,
        notes,
        takenTime: new Date(),
      });
    }

    const remainingStock = med ? med.stockRemaining : 'N/A';
    const alertRefill = med && med.stockRemaining <= med.refillThreshold;

    return {
      success: true,
      patientId,
      medicationName,
      status,
      remainingStock,
      alertRefill,
      message: `Dose of ${medicationName} recorded as '${status}'. Remaining pills: ${remainingStock}.${
        alertRefill ? ' Warning: Stock is low. Caregiver notification recommended.' : ''
      }`,
    };
  },
};

export const checkMedicineStockTool = {
  definition: {
    type: 'function',
    function: {
      name: 'check_medicine_stock',
      description: 'Checks pill inventory levels for all active medications and highlights any requiring pharmacy refills.',
      parameters: {
        type: 'object',
        properties: {
          medicationName: {
            type: 'string',
            description: 'Optional specific medication to check. Omit to check all.',
          },
        },
      },
    },
  },
  requiresConfirmation: false,
  async execute({ context, args }) {
    const { patientId } = context;
    let meds = [];

    if (isMongoConnected()) {
      const query = { patientId, status: 'active' };
      if (args.medicationName) {
        query.name = new RegExp(args.medicationName, 'i');
      }
      meds = await Medication.find(query).lean();
    } else {
      meds = inMemoryMedications.filter(
        (m) =>
          m.patientId === patientId &&
          m.status === 'active' &&
          (!args.medicationName || m.name.toLowerCase().includes(args.medicationName.toLowerCase()))
      );
    }

    const stockSummary = meds.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      stockRemaining: m.stockRemaining,
      refillThreshold: m.refillThreshold,
      needsRefill: m.stockRemaining <= m.refillThreshold,
      daysRemaining: Math.floor(m.stockRemaining / 1), // approx 1/day
    }));

    const criticalRefills = stockSummary.filter((s) => s.needsRefill);

    return {
      success: true,
      patientId,
      totalMedsChecked: stockSummary.length,
      items: stockSummary,
      criticalRefillsCount: criticalRefills.length,
      message:
        criticalRefills.length > 0
          ? `Attention: ${criticalRefills.map((c) => c.name).join(', ')} is low in stock and needs refill.`
          : 'All medications are adequately stocked.',
    };
  },
};
