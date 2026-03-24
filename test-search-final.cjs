
require('dotenv').config();
const OpenAI = require('openai');

async function testSearchFinal() {
    console.log('--- Testing Volcengine Web Search (Final Check) ---');
    const apiKey = process.env.VOLCENGINE_API_KEY;
    const baseURL = process.env.VOLCENGINE_BASE_URL;
    const model = process.env.VOLCENGINE_BROWSING_MODEL_ID;

    console.log(`Model: ${model}`);

    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
    });

    try {
        const query = "2026马斯克最新访谈";
        console.log(`Query: "${query}"`);
        
        const completion = await client.chat.completions.create({
            model: model,
            messages: [
                { role: 'user', content: query }
            ],
            // 关键：通过 extra_body 传递非标准 tool
            extra_body: {
                tools: [{ type: 'web_search' }]
            },
            temperature: 0.1,
        });

        const msg = completion.choices[0].message;
        console.log('\n--- Content ---');
        console.log(msg.content);
        
        console.log('\n--- Tool Calls ---');
        console.log(JSON.stringify(msg.tool_calls || [], null, 2));

    } catch (error) {
        console.error('Request Failed:', error);
    }
}

testSearchFinal();
