import { allTools, toolMap, getToolDefinitions } from '../tools/index.js';

export class ToolRegistry {
  constructor() {
    this.tools = toolMap;
  }

  /**
   * Returns tool definitions compatible with OpenAI / Mistral tool calling standard
   */
  getDefinitions() {
    return getToolDefinitions();
  }

  /**
   * Checks if tool exists
   */
  hasTool(name) {
    return this.tools.has(name);
  }

  /**
   * Retrieves tool metadata
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * Validates arguments against required schema parameters
   */
  validateArgs(tool, args) {
    const params = tool.definition.function.parameters;
    if (!params || !params.required) return { valid: true };

    const missing = [];
    for (const req of params.required) {
      if (args[req] === undefined || args[req] === null || args[req] === '') {
        missing.push(req);
      }
    }

    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required parameter(s): ${missing.join(', ')} for tool '${tool.definition.function.name}'`,
      };
    }

    return { valid: true };
  }

  /**
   * Executes a tool with context and argument validation
   */
  async executeTool(name, rawArgs, context) {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' is not registered in the CareCircle Healthcare Agent registry.`,
      };
    }

    // Parse string arguments if received as JSON string from LLM
    let parsedArgs = rawArgs;
    if (typeof rawArgs === 'string') {
      try {
        parsedArgs = JSON.parse(rawArgs);
      } catch (err) {
        return {
          success: false,
          error: `Invalid JSON format in tool arguments for '${name}': ${err.message}`,
        };
      }
    }

    // Strict parameter validation
    const validation = this.validateArgs(tool, parsedArgs);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Enforce patient-level authorization context
    if (!context || !context.patientId) {
      return {
        success: false,
        error: 'Security constraint violation: patientId missing from agent authorization context.',
      };
    }

    try {
      const result = await tool.execute({ context, args: parsedArgs });
      return {
        ...result,
        _executedTool: name,
        _requiresConfirmation: tool.requiresConfirmation || false,
      };
    } catch (executionError) {
      console.error(`[Tool Execution Error: ${name}]`, executionError);
      return {
        success: false,
        error: `Execution failure in tool '${name}': ${executionError.message}`,
      };
    }
  }
}

export const defaultToolRegistry = new ToolRegistry();
export default defaultToolRegistry;
