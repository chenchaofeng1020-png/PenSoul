
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VOLCENGINE_API_KEY;
const baseURL = process.env.VOLCENGINE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const model = process.env.VOLCENGINE_MODEL_ID;

console.log("Testing Volcengine Connection:");
console.log("API Key:", apiKey ? "Set (Hidden)" : "Missing");
console.log("Base URL:", baseURL);
console.log("Model ID:", model);

const client = new OpenAI({ apiKey, baseURL });

async function test() {
  try {
    console.log("Sending request...");
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "user", content: "Hello, are you there?" }
      ],
      tools: [{ type: 'web_search' }] // Try with tools
    });
    console.log("Success!");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
