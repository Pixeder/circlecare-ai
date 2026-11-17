import { readPrescriptionTool } from './prescriptionTools.js';
import {
  getMedicationsTool,
  createMedicationTool,
  logDoseTool,
  checkMedicineStockTool,
} from './medicationTools.js';
import {
  searchMedicalHistoryTool,
  generateDoctorBriefTool,
} from './medicalHistoryTools.js';
import { createAppointmentTool } from './appointmentTools.js';
import { sendCaregiverAlertTool } from './alertTools.js';
import { triggerSosTool } from './emergencyTools.js';

export const allTools = [
  readPrescriptionTool,
  createMedicationTool,
  getMedicationsTool,
  logDoseTool,
  searchMedicalHistoryTool,
  createAppointmentTool,
  checkMedicineStockTool,
  sendCaregiverAlertTool,
  generateDoctorBriefTool,
  triggerSosTool,
];

export const toolMap = new Map();
allTools.forEach((tool) => {
  toolMap.set(tool.definition.function.name, tool);
});

export function getToolDefinitions() {
  return allTools.map((t) => t.definition);
}

export function getTool(name) {
  return toolMap.get(name);
}

export default { allTools, toolMap, getToolDefinitions, getTool };
