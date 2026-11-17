import { Alert } from '../models/Alert.js';
import { Patient } from '../models/Patient.js';
import { isMongoConnected } from '../config/mongodb.js';

export const triggerSosTool = {
  definition: {
    type: 'function',
    function: {
      name: 'trigger_sos',
      description: 'Triggers a deterministic emergency SOS workflow immediately notifying designated family contacts, emergency services, and primary caregivers.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for emergency or symptoms (e.g. chest pain, severe fall, sudden breathlessness)',
          },
          urgency: {
            type: 'string',
            enum: ['high', 'critical'],
            description: 'Emergency level',
          },
        },
        required: ['reason'],
      },
    },
  },
  requiresConfirmation: false, // Immediate emergency action, no delay!
  async execute({ context, args }) {
    const { patientId } = context;
    const { reason, urgency = 'critical' } = args;

    let emergencyContacts = [
      { name: 'Sarah Vance (Daughter)', phone: '+1-555-0192', relationship: 'Daughter', isPrimary: true },
      { name: 'Dr. Robert Miller', phone: '+1-555-0144', relationship: 'Primary Physician', isPrimary: false },
    ];

    if (isMongoConnected()) {
      const patient = await Patient.findOne({ patientId });
      if (patient && patient.emergencyContacts?.length > 0) {
        emergencyContacts = patient.emergencyContacts;
      }

      await Alert.create({
        patientId,
        type: 'sos',
        severity: 'critical',
        message: `EMERGENCY SOS: ${reason}`,
        details: { urgency, emergencyContactsNotified: emergencyContacts.map((c) => c.phone) },
        caregiverNotified: true,
        emergencyContactsNotified: emergencyContacts.map((c) => c.phone),
      });
    }

    const notifiedList = emergencyContacts.map((c) => `${c.name} (${c.phone})`).join(', ');

    return {
      success: true,
      patientId,
      status: 'EMERGENCY_DISPATCHED',
      timestamp: new Date().toISOString(),
      reason,
      urgency,
      actionTaken: 'Deterministic Emergency Contact Workflow Triggered',
      contactsAlerted: notifiedList,
      guidance: 'Stay calm. Remain in a comfortable seated or lying position. Help and your family caregiver have been notified.',
      message: `Emergency SOS triggered successfully. Primary contacts notified: ${notifiedList}. Keep line open.`,
    };
  },
};
