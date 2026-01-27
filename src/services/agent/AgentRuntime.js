import { chatWithAgent } from '../api.js';

/**
 * MACC Agent Runtime
 * Responsible for orchestrating the agent loop, injecting context, and handling tool calls.
 */
export class AgentRuntime {
  constructor(config = {}) {
    this.model = config.model || 'gpt-3.5-turbo';
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Run the agent conversation loop
   * @param {Object} params
   * @param {string} params.systemPrompt - The base personality and instruction
   * @param {string} params.userMessage - The user's input
   * @param {Object} [params.context] - Additional context (e.g., current persona DNA)
   * @param {Object} [params.context.persona] - The active persona object
   * @returns {Promise<Object>} The agent's response
   */
  async run({ systemPrompt, userMessage, context = {} }) {
    // 1. Enrich System Prompt with Persona DNA if available
    let finalSystemPrompt = systemPrompt;
    
    if (context.persona) {
        finalSystemPrompt += `\n\n=== CURRENT PERSONA CONTEXT ===\n`;
        finalSystemPrompt += `Name: ${context.persona.name}\n`;
        if (context.persona.role_definition) {
             finalSystemPrompt += `Role Definition: ${context.persona.role_definition}\n`;
        }
        
        // Inject Style DNA
        if (context.persona.style_dna && Object.keys(context.persona.style_dna).length > 0) {
            const dna = context.persona.style_dna;
            finalSystemPrompt += `\n[Style DNA Constraints]\n`;
            if (dna.tone) finalSystemPrompt += `- Tone: ${dna.tone}\n`;
            if (dna.methodology) {
                const methods = Array.isArray(dna.methodology) ? dna.methodology.join(', ') : dna.methodology;
                finalSystemPrompt += `- Methodology: ${methods}\n`;
            }
            if (dna.forbidden_words) {
                const forbidden = Array.isArray(dna.forbidden_words) ? dna.forbidden_words.join(', ') : dna.forbidden_words;
                finalSystemPrompt += `- Forbidden Words: ${forbidden}\n`;
            }
            if (dna.keywords_detected) {
                 const keywords = Array.isArray(dna.keywords_detected) ? dna.keywords_detected.join(', ') : dna.keywords_detected;
                 finalSystemPrompt += `- Keywords to Use: ${keywords}\n`;
            }
            finalSystemPrompt += `Please strictly adhere to the above style constraints.\n`;
        }
        finalSystemPrompt += `===============================\n`;
    }

    console.log('[AgentRuntime] Final System Prompt:', finalSystemPrompt);

    // 2. Call LLM
    try {
        const response = await chatWithAgent({
            system_prompt: finalSystemPrompt,
            user_message: userMessage,
            model_config: {
                model: this.model,
                temperature: this.temperature
            }
        });
        
        return response;
    } catch (error) {
        console.error('[AgentRuntime] Error calling agent:', error);
        throw error;
    }
  }
}

export const agentRuntime = new AgentRuntime();
