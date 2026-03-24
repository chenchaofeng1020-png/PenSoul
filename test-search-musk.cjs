
require('dotenv').config();
const OpenAI = require('openai');

async function testSearchContent() {
    console.log('Testing specific search query...');
    const apiKey = process.env.VOLCENGINE_API_KEY;
    const baseURL = process.env.VOLCENGINE_BASE_URL;
    const model = process.env.VOLCENGINE_BROWSING_MODEL_ID;

    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
    });

    try {
        console.log('Searching: "总结一下马斯克2026年1月最新采访的内容"...');
        const completion = await client.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: '你是卓伟，今天是2026年1月28日。' },
                { role: 'user', content: '总结一下马斯克2026年1月最新采访的内容' }
            ],
            extra_body: {
                tools: [{ type: 'web_search' }]
            },
            temperature: 0.1,
        });

        console.log('\n=== Response ===');
        console.log(completion.choices[0].message.content);
        
        console.log('\n=== Tool Calls (if any) ===');
        console.log(JSON.stringify(completion.choices[0].message.tool_calls || [], null, 2));

    } catch (error) {
        console.error('Error during request:', error);
    }
}

testSearchContent();
