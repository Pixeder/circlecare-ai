import { getNvidiaClient } from "../config/nvidia.js";
import { config } from "../config/env.js";
import { defaultToolRegistry } from "../agent/registry.js";
import { defaultOrchestrator } from "../agent/orchestrator.js";

async function testNvidiaLive() {
  console.log("==============================================");
  console.log(" NVIDIA NIM Live API Integration Verification ");
  console.log("==============================================\n");

  console.log("Base URL:", config.nvidia.baseURL);
  console.log("Model:", config.nvidia.model);
  console.log("API Key Present:", Boolean(config.nvidia.apiKey));
  console.log("DEV_MOCK_LLM:", config.nvidia.mockLLM);

  const client = getNvidiaClient();
  if (!client) {
    console.error("FAILED: NVIDIA client could not be initialized.");
    process.exit(1);
  }

  // 1. Test basic chat completion
  console.log("\n--- Test 1: Direct Basic Chat Completion ---");
  try {
    const res = await client.chat.completions.create({
      model: config.nvidia.model,
      messages: [
        {
          role: "system",
          content:
            "You are a healthcare assistant. Reply in one concise sentence.",
        },
        {
          role: "user",
          content: "Hello, please confirm you are live and functioning.",
        },
      ],
      reasoning_effort: "low",
      temperature: 0.1,
      max_tokens: 60,
    });

    const reply = res.choices[0]?.message?.content;
    console.log("SUCCESS: Received response from NVIDIA NIM:");
    console.log(">", reply?.trim());
  } catch (err) {
    console.error("FAILED: NVIDIA NIM Direct Call failed:");
    console.error("Error Code:", err.status || err.code);
    console.error("Error Message:", err.message);
    if (err.response?.data) {
      console.error("Response Data:", JSON.stringify(err.response.data));
    }
    process.exit(1);
  }

  // 2. Test Tool Calling with get_medications
  console.log("\n--- Test 2: Live Tool-Calling Interaction ---");
  try {
    const userPrompt = "What medications should I take today?";
    console.log(`User prompt: "${userPrompt}"`);

    const tools = defaultToolRegistry.getDefinitions();
    const toolRes = await client.chat.completions.create({
      model: config.nvidia.model,
      messages: [
        {
          role: "system",
          content:
            "You are CareCircle AI. You do NOT have direct database access. Use the provided tools to retrieve patient data.",
        },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: "auto",
      temperature: 0.1,
    });

    const msg = toolRes.choices[0]?.message;
    console.log(
      "Model message finish reason:",
      toolRes.choices[0]?.finish_reason,
    );

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      console.log(
        `SUCCESS: Model invoked ${msg.tool_calls.length} tool call(s):`,
      );
      msg.tool_calls.forEach((tc) => {
        console.log(`- Tool: ${tc.function.name}`);
        console.log(`  Arguments: ${tc.function.arguments}`);
      });

      // Now execute the tool
      const toolCall = msg.tool_calls[0];
      const execResult = await defaultToolRegistry.executeTool(
        toolCall.function.name,
        toolCall.function.arguments,
        {
          patientId: "patient_elderly_001",
          user: { name: "Eleanor Vance", role: "patient" },
        },
      );

      console.log("Tool execution result success:", execResult.success);

      // Now send tool result back to model for final grounded response
      const secondTurn = await client.chat.completions.create({
        model: config.nvidia.model,
        messages: [
          {
            role: "system",
            content:
              "You are CareCircle AI. Summarize the tool result for the patient gently.",
          },
          { role: "user", content: userPrompt },
          msg,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(execResult),
          },
        ],
        temperature: 0.1,
      });

      console.log("\nFinal grounded response from NVIDIA Mistral Large:");
      console.log(">", secondTurn.choices[0]?.message?.content);
    } else {
      console.log("Model returned direct content without tools:", msg.content);
    }
  } catch (err) {
    console.error("FAILED Tool Calling test:", err.message);
    if (err.status) console.error("Status:", err.status);
    process.exit(1);
  }

  console.log("\n==============================================");
  console.log(" NVIDIA NIM LIVE INTEGRATION: VERIFIED SUCCESS ");
  console.log("==============================================");
}

testNvidiaLive().catch((e) => {
  console.error("Unhandled failure:", e);
  process.exit(1);
});
