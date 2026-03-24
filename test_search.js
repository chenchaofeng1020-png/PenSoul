
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VOLCENGINE_API_KEY;
const baseURL = process.env.VOLCENGINE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const model = process.env.VOLCENGINE_BROWSING_MODEL_ID || process.env.VOLCENGINE_MODEL_ID;

console.log("Testing Volcengine Web Search:");
console.log("Model ID:", model);

const client = new OpenAI({ apiKey, baseURL });

async function searchTest() {
  try {
    console.log("Searching: '总结一下马斯克2026年1月最新采访的内容'...");
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "user", content: "请全网搜索并总结：马斯克2026年1月最新采访的内容" }
      ],
      extra_body: {
        tools: [{ type: 'web_search' }]
      },
      temperature: 0.1,
    });
    
    console.log("\n=== Result ===");
    console.log(completion.choices[0].message.content);
    console.log("\n=== Sources ===");
    // Attempt to extract sources if present in tool_calls or citations (structure varies)
    console.log("Tool Calls:", JSON.stringify(completion.choices[0].message.tool_calls, null, 2));
    
  } catch (error) {
    console.error("Error:", error);
  }
}

searchTest();
