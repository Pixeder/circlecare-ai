import { config } from './env.js';

let OpenAI = null;
try {
  const mod = await import('openai');
  OpenAI = mod.default;
} catch {
  // Package not yet installed or offline
}

let openaiClient = null;

export function getNvidiaClient() {
  if (openaiClient) return openaiClient;

  const apiKey = config.nvidia.apiKey || process.env.NVIDIA_NIM_API_KEY;

  if (!OpenAI || !apiKey || apiKey === 'nvapi-placeholder-or-live-key' || config.nvidia.mockLLM) {
    console.warn('[NVIDIA NIM] Using simulated client (no valid key provided or DEV_MOCK_LLM=true).');
    return null;
  }

  try {
    openaiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: config.nvidia.baseURL,
    });
    console.log(`[NVIDIA NIM] Initialized with endpoint ${config.nvidia.baseURL} and model ${config.nvidia.model}`);
    return openaiClient;
  } catch (err) {
    console.warn(`[NVIDIA NIM] Failed to create OpenAI client: ${err.message}`);
    return null;
  }
}

/**
 * Chat completion wrapper supporting Mistral Large tool calling
 */
export async function callNvidiaMistral({
  messages,
  tools = undefined,
  toolChoice = 'auto',
  temperature = 0.2,
  responseFormat = undefined,
}) {
  const client = getNvidiaClient();

  // If no live client or simulated mode requested, provide mock assistant response / tool calling
  if (!client) {
    return generateSimulatedResponse(messages, tools);
  }

  try {
    const payload = {
      model: config.nvidia.model,
      messages,
      temperature,
      max_tokens: 2048,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = toolChoice;
    }

    if (responseFormat) {
      payload.response_format = responseFormat;
    }

    const response = await client.chat.completions.create(payload, { timeout: 45000 });
    return response.choices[0].message;
  } catch (error) {
    console.error(`[NVIDIA NIM Error] ${error.message}`);
    // If live call fails (e.g. rate limit, quota, invalid token), gracefully fall back in dev mode
    if (config.nodeEnv === 'development' || config.firebase.devBypassAuth) {
      console.warn('[NVIDIA NIM] Falling back to intelligent local mock response for development continuity.');
      return generateSimulatedResponse(messages, tools);
    }
    throw error;
  }
}

/**
 * Intelligent simulation helper for local testing and offline verification
 */
function generateSimulatedResponse(messages, tools) {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content?.toLowerCase() || '';

  // 1. SOS trigger check
  if (
    lastUserMessage.includes('sos') ||
    lastUserMessage.includes('emergency') ||
    lastUserMessage.includes('help me') ||
    lastUserMessage.includes('fell')
  ) {
    if (tools?.some((t) => t.function.name === 'trigger_sos')) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'trigger_sos',
              arguments: JSON.stringify({
                reason: 'Patient reported a fall or triggered emergency SOS',
                urgency: 'critical',
              }),
            },
          },
        ],
      };
    }
  }

  // 2. Medication creation check (Consequential tool call requiring confirmation!)
  if (
    (lastUserMessage.includes('add') || lastUserMessage.includes('create') || lastUserMessage.includes('schedule')) &&
    (lastUserMessage.includes('medication') || lastUserMessage.includes('medicine') || lastUserMessage.includes('lisinopril'))
  ) {
    if (tools?.some((t) => t.function.name === 'create_medication')) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'create_medication',
              arguments: JSON.stringify({
                name: 'Lisinopril',
                dosage: '10mg',
                frequency: 'Once daily in the morning',
                timing: ['08:00'],
                instructions: 'Take in the morning for blood pressure',
              }),
            },
          },
        ],
      };
    }
  }

  // 3. Search medical history / previous prescriptions check
  if (
    lastUserMessage.includes('previous') ||
    lastUserMessage.includes('past') ||
    lastUserMessage.includes('history') ||
    lastUserMessage.includes('record') ||
    lastUserMessage.includes('hypertension notes')
  ) {
    if (tools?.some((t) => t.function.name === 'search_medical_history')) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'search_medical_history',
              arguments: JSON.stringify({
                query: 'previous prescriptions and hypertension records',
                limit: 3,
              }),
            },
          },
        ],
      };
    }
  }

  // 4. Medication list check
  if (
    lastUserMessage.includes('medicine') ||
    lastUserMessage.includes('medication') ||
    lastUserMessage.includes('what pills') ||
    lastUserMessage.includes('what should i take') ||
    lastUserMessage.includes('today')
  ) {
    if (tools?.some((t) => t.function.name === 'get_medications')) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'get_medications',
              arguments: JSON.stringify({ status: 'active' }),
            },
          },
        ],
      };
    }
  }

  // 5. Log dose check
  if (
    lastUserMessage.includes('took my') ||
    lastUserMessage.includes('taken my') ||
    lastUserMessage.includes('drank my pill')
  ) {
    if (tools?.some((t) => t.function.name === 'log_dose')) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'log_dose',
              arguments: JSON.stringify({
                medicationName: 'Metformin',
                status: 'taken',
                notes: 'Logged via voice assistant interaction',
              }),
            },
          },
        ],
      };
    }
  }

  // Default conversational response
  return {
    role: 'assistant',
    content:
      "Hello! I am your CareCircle AI healthcare assistant. I can help you check your medications, log your doses, review your prescription schedule, or connect with your caregiver. How can I support your health today?",
  };
}

export default { getNvidiaClient, callNvidiaMistral };
