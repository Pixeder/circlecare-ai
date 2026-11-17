import { Alert } from '../models/Alert.js';
import { isMongoConnected } from '../config/mongodb.js';

const inMemoryAlerts = [];

export const sendCaregiverAlertTool = {
  definition: {
    type: 'function',
    function: {
      name: 'send_caregiver_alert',
      description: 'Sends an urgent notification or care update to the patient’s designated family caregivers. Consequential action: requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['missed_medication', 'refill_needed', 'vital_anomaly', 'general'],
            description: 'Category of the alert',
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Urgency of the alert',
          },
          message: {
            type: 'string',
            description: 'Concise, clear message explaining the situation to the caregiver',
          },
        },
        required: ['type', 'message'],
      },
    },
  },
  requiresConfirmation: true, // Consequential!
  async execute({ context, args }) {
    const { patientId } = context;
    const { type, severity = 'medium', message } = args;

    const alertData = {
      patientId,
      type,
      severity,
      message,
      caregiverNotified: true,
      status: 'active',
    };

    if (isMongoConnected()) {
      const doc = await Alert.create(alertData);
      return {
        success: true,
        alertId: doc._id,
        severity,
        message: `Caregiver alert dispatched: "${message}"`,
        timestamp: new Date().toISOString(),
      };
    }

    const mockId = `alert_${Date.now()}`;
    inMemoryAlerts.push({ ...alertData, _id: mockId });

    return {
      success: true,
      alertId: mockId,
      severity,
      message: `Caregiver alert dispatched (simulated): "${message}"`,
      timestamp: new Date().toISOString(),
    };
  },
};
