import { callNvidiaMistral } from '../config/nvidia.js';
import { defaultToolRegistry } from './registry.js';
import { HEALTHCARE_AGENT_SYSTEM_PROMPT } from './prompts.js';

export class HealthcareAgentOrchestrator {
  constructor(toolRegistry = defaultToolRegistry) {
    this.toolRegistry = toolRegistry;
  }

  /**
   * Primary entry point to process a user turn
   */
  async processMessage({ messages, context }) {
    if (!context || !context.patientId) {
      throw new Error('Agent execution requires a valid patient authorization context.');
    }

    // Build system message with patient specifics
    const systemMessage = {
      role: 'system',
      content: `${HEALTHCARE_AGENT_SYSTEM_PROMPT}

### CURRENT PATIENT PROFILE:
- Patient ID: ${context.patientId}
- Name: ${context.user?.name || 'Eleanor Vance'}
- Active Role: ${context.user?.role || 'patient'}
- Emergency Contacts Configured: Yes (Daughter: Sarah Vance)
`,
    };

    const fullMessages = [systemMessage, ...messages];
    const tools = this.toolRegistry.getDefinitions();

    // Call Mistral model via NVIDIA NIM
    const assistantMessage = await callNvidiaMistral({
      messages: fullMessages,
      tools,
      toolChoice: 'auto',
      temperature: 0.2,
    });

    const toolExecutionResults = [];

    // Check if model requested tool call(s)
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`[Agent Orchestrator] LLM invoked ${assistantMessage.tool_calls.length} tool(s).`);

      const toolMessages = [];

      for (const call of assistantMessage.tool_calls) {
        const toolName = call.function.name;
        const toolArgs = call.function.arguments;
        const toolDef = this.toolRegistry.getTool(toolName);

        // Consequential action confirmation check
        if (toolDef && toolDef.requiresConfirmation && !context.confirmedActions?.includes(toolName)) {
          // If consequential action requires confirmation and is not pre-confirmed
          // We can return a confirmation request or allow execution if user explicitly stated confirmation in message
          const lastUserText = messages[messages.length - 1]?.content?.toLowerCase() || '';
          const hasExplicitConfirm = lastUserText.includes('confirm') || lastUserText.includes('yes proceed') || lastUserText.includes('yes please');

          if (!hasExplicitConfirm) {
            return {
              content: `This action (${toolName}) is consequential and requires your confirmation before proceeding. Would you like me to proceed with this request?`,
              toolCalls: [
                {
                  id: call.id,
                  name: toolName,
                  args: toolArgs,
                  status: 'requires_confirmation',
                },
              ],
              requiresConfirmation: true,
              pendingAction: {
                toolName,
                args: toolArgs,
              },
            };
          }
        }

        // Execute via Tool Registry
        const result = await this.toolRegistry.executeTool(toolName, toolArgs, context);
        toolExecutionResults.push({
          toolName,
          result,
        });

        toolMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: toolName,
          content: JSON.stringify(result),
        });
      }

      // Re-invoke LLM with tool execution results for natural language clinical summary
      const sanitizedAssistantMessage = {
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: assistantMessage.tool_calls,
      };

      const followUpMessages = [
        ...fullMessages,
        sanitizedAssistantMessage,
        ...toolMessages,
      ];

      const finalResponse = await callNvidiaMistral({
        messages: followUpMessages,
        temperature: 0.2,
      });

      return {
        content: finalResponse.content || this.generateFallbackToolSummary(toolExecutionResults),
        toolCalls: toolExecutionResults,
        requiresConfirmation: false,
      };
    }

    // Direct conversational response without tools
    return {
      content: assistantMessage.content || "I am here to assist with your healthcare needs. How can I help today?",
      toolCalls: [],
      requiresConfirmation: false,
    };
  }

  generateFallbackToolSummary(toolResults) {
    return toolResults
      .map((tr) => {
        if (tr.result.success) {
          return tr.result.message || `Completed ${tr.toolName} successfully.`;
        }
        return `Failed to execute ${tr.toolName}: ${tr.result.error || 'Unknown error'}`;
      })
      .join('\n');
  }
}

export const defaultOrchestrator = new HealthcareAgentOrchestrator();
export default defaultOrchestrator;
