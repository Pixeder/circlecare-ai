import http from 'http';
import { config } from './src/config/env.js';
import { connectMongoDB } from './src/config/mongodb.js';
import { initQdrantCollection } from './src/config/qdrant.js';
import { initFirebase } from './src/config/firebase.js';
import { defaultOrchestrator } from './src/agent/orchestrator.js';
import { defaultToolRegistry } from './src/agent/registry.js';
import { allTools } from './src/tools/index.js';
import { isMongoConnected } from './src/config/mongodb.js';
import { isQdrantConnected } from './src/config/qdrant.js';
import { isCloudinaryConfigured } from './src/config/cloudinary.js';
import { seedSampleDataIfEmpty } from './src/config/seedSampleData.js';
import { extractPrescriptionData } from './src/services/visionService.js';
import { storeMedicalMemory } from './src/services/vectorService.js';
import { getMedicationsTool, logDoseTool, checkMedicineStockTool } from './src/tools/medicationTools.js';

// Try loading Express if installed
let expressApp = null;
try {
  const expressMod = await import('express');
  const corsMod = await import('cors');
  const express = expressMod.default;
  const cors = corsMod.default;

  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Import routes
  const authRoutes = (await import('./src/routes/auth.routes.js')).default;
  const healthRoutes = (await import('./src/routes/health.routes.js')).default;
  const agentRoutes = (await import('./src/routes/agent.routes.js')).default;
  const prescriptionRoutes = (await import('./src/routes/prescription.routes.js')).default;
  const medicationRoutes = (await import('./src/routes/medication.routes.js')).default;
  const appointmentRoutes = (await import('./src/routes/appointment.routes.js')).default;
  const medicalHistoryRoutes = (await import('./src/routes/medicalHistory.routes.js')).default;
  const familyRoutes = (await import('./src/routes/family.routes.js')).default;
  const emergencyRoutes = (await import('./src/routes/emergency.routes.js')).default;
  const patientRoutes = (await import('./src/routes/patient.routes.js')).default;

  app.use('/api/auth', authRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/agent', agentRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);
  app.use('/api/medications', medicationRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/medical-history', medicalHistoryRoutes);
  app.use('/api/family', familyRoutes);
  app.use('/api/emergency', emergencyRoutes);
  app.use('/api/patient', patientRoutes);

  expressApp = app;
} catch {
  // Express not yet installed; standalone native HTTP router used below
}

/**
 * Built-in native HTTP server handler for zero-dependency operation
 */
async function handleNativeRequest(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-patient-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Helper to read JSON body
  const readJson = () =>
    new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
    });

  const sendJson = (status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  };

  const context = {
    patientId: req.headers['x-patient-id'] || 'patient_elderly_001',
    user: {
      uid: req.headers['x-patient-id'] || 'patient_elderly_001',
      name: 'Eleanor Vance',
      role: 'patient',
    },
    confirmedActions: [],
  };

  try {
    // 1. Health check
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJson(200, {
        status: 'healthy',
        service: 'CareCircle AI Healthcare Agent API',
        timestamp: new Date().toISOString(),
        components: {
          mongodb: isMongoConnected() ? 'connected' : 'offline/mock-fallback',
          qdrant: isQdrantConnected() ? 'connected' : 'offline/memory-fallback',
          cloudinary: isCloudinaryConfigured ? 'configured' : 'mock-fallback',
          nvidiaNIM: {
            model: config.nvidia.model,
            endpoint: config.nvidia.baseURL,
            active: Boolean(config.nvidia.apiKey),
          },
          firebase: {
            devBypassAuth: config.firebase.devBypassAuth,
          },
        },
        registeredToolsCount: allTools.length,
        registeredTools: allTools.map((t) => t.definition.function.name),
      });
    }

    // 2. Agent Chat
    if (req.method === 'POST' && pathname === '/api/agent/chat') {
      const body = await readJson();
      const { message, messages = [], confirmedActions = [] } = body;
      const conversationHistory = [...messages];
      if (message) conversationHistory.push({ role: 'user', content: message });

      const response = await defaultOrchestrator.processMessage({
        messages: conversationHistory,
        context: { ...context, confirmedActions },
      });

      return sendJson(200, { success: true, data: response });
    }

    // 3. Agent Tools List
    if (req.method === 'GET' && pathname === '/api/agent/tools') {
      const tools = defaultToolRegistry.getDefinitions();
      return sendJson(200, {
        success: true,
        totalTools: tools.length,
        tools: tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
          requiresConfirmation: defaultToolRegistry.getTool(t.function.name)?.requiresConfirmation || false,
        })),
      });
    }

    // 4. Medications List
    if (req.method === 'GET' && pathname === '/api/medications') {
      const result = await getMedicationsTool.execute({ context, args: { status: 'active' } });
      return sendJson(200, result);
    }

    // 5. Log Dose
    if (req.method === 'POST' && pathname === '/api/medications/log-dose') {
      const body = await readJson();
      const result = await logDoseTool.execute({ context, args: body });
      return sendJson(200, result);
    }

    // 6. Check Stock
    if (req.method === 'GET' && pathname === '/api/medications/stock') {
      const result = await checkMedicineStockTool.execute({ context, args: {} });
      return sendJson(200, result);
    }

    // 7. Prescription Upload / Analyze
    if (req.method === 'POST' && pathname === '/api/prescriptions/upload') {
      const extracted = await extractPrescriptionData(null);
      const prescriptionId = `RX-${Date.now().toString().slice(-6)}`;
      return sendJson(200, {
        success: true,
        message: 'Prescription uploaded and analyzed. Human verification required before medications are saved.',
        data: {
          prescriptionId,
          patientId: context.patientId,
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample_prescription.jpg',
          doctorName: extracted.doctorName,
          clinicName: extracted.clinicName,
          prescribedDate: extracted.prescribedDate,
          rawExtractedText: extracted.rawExtractedText,
          extractedMedications: extracted.extractedMedications,
          uncertainFields: extracted.uncertainFields,
          status: 'pending_verification',
        },
      });
    }

    // 8. Prescription Verify
    if (req.method === 'POST' && pathname === '/api/prescriptions/verify') {
      const body = await readJson();
      const { prescriptionId, verifiedMedications } = body;

      const summaryText = `Prescription ${prescriptionId} for patient ${context.patientId}. Verified medications: ${verifiedMedications
        ?.map((m) => `${m.name} ${m.dosage} (${m.frequency})`)
        .join(', ')}.`;

      const vectorResult = await storeMedicalMemory({
        patientId: context.patientId,
        text: summaryText,
        recordType: 'prescription',
        sourceRef: `Verified Prescription #${prescriptionId}`,
        metadata: { prescriptionId, count: verifiedMedications?.length || 0 },
      });

      return sendJson(200, {
        success: true,
        message: 'Prescription verified. Verified medications scheduled and indexed in Qdrant vector memory.',
        data: {
          prescriptionId,
          savedMedicationsCount: verifiedMedications?.length || 0,
          savedMedications: verifiedMedications || [],
          vectorMemoryIndexed: vectorResult.success,
          vectorPointId: vectorResult.pointId,
        },
      });
    }

    return sendJson(404, { success: false, error: 'Endpoint not found' });
  } catch (err) {
    console.error('[HTTP Handler Error]', err);
    return sendJson(500, { success: false, error: err.message });
  }
}

process.on('uncaughtException', (err) => {
  console.error('[Process Uncaught Exception]', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Process Unhandled Rejection]', reason?.message || reason);
});

// Server startup
async function startServer() {
  console.log('--- Initializing CareCircle AI Healthcare Platform ---');

  await connectMongoDB();
  if (process.env.SEED_DEMO_DATA === 'true') {
    await seedSampleDataIfEmpty();
  }
  await initQdrantCollection();
  initFirebase();

  const PORT = config.port;

  const server = expressApp
    ? expressApp.listen(PORT)
    : http.createServer(handleNativeRequest).listen(PORT);

  server.on('error', (err) => {
    console.error('[Server Error]', err.message);
  });

  server.on('listening', () => {
    console.log(`[CareCircle Backend] Server running on http://localhost:${PORT} (${expressApp ? 'Express' : 'Native HTTP Engine'})`);
    console.log(`[CareCircle Backend] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[CareCircle Backend] Agent tools: http://localhost:${PORT}/api/agent/tools`);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Fatal Error]', err);
  process.exit(1);
});
