import express from 'express';
import { isMongoConnected } from '../config/mongodb.js';
import { isQdrantConnected } from '../config/qdrant.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { config } from '../config/env.js';
import { allTools } from '../tools/index.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
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
});

export default router;
