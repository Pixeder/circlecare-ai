import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { defaultOrchestrator } from '../agent/orchestrator.js';
import { defaultToolRegistry } from '../agent/registry.js';

const router = express.Router();

/**
 * POST /api/agent/chat
 * Primary conversational interface with Mistral Large tool calling
 */
router.post('/chat', authenticateToken, async (req, res, next) => {
  try {
    const { message, messages = [], confirmedActions = [] } = req.body;

    const conversationHistory = [...messages];
    if (message) {
      conversationHistory.push({
        role: 'user',
        content: message,
      });
    }

    if (conversationHistory.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message or conversation history is required.',
      });
    }

    const context = {
      patientId: req.user.activePatientId,
      user: req.user,
      confirmedActions,
    };

    const agentResponse = await defaultOrchestrator.processMessage({
      messages: conversationHistory,
      context,
    });

    res.json({
      success: true,
      data: agentResponse,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/agent/tools
 * Tool registry inspection endpoint
 */
router.get('/tools', (req, res) => {
  const tools = defaultToolRegistry.getDefinitions();
  res.json({
    success: true,
    totalTools: tools.length,
    tools: tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
      requiresConfirmation: defaultToolRegistry.getTool(t.function.name)?.requiresConfirmation || false,
    })),
  });
});

export default router;
