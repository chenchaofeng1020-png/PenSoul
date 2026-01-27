import { updatePersona, createPersona, getPersonas } from '../../api.js';
import { MOCK_STYLE_DATA } from './mockStyleData.js';

/**
 * MACC Agent Skill: extract_style_dna
 * Owner: Agent K (老K)
 * Description: Extracts style characteristics from text and updates/creates a persona.
 */
export class StyleExtractor {
  constructor() {
    this.name = 'extract_style_dna';
    this.version = '1.0.0';
  }

  /**
   * Execute the skill
   * @param {string} text - The sample text to analyze
   * @param {string} [personaId] - Optional ID of existing persona to update
   * @param {string} [personaName] - Optional name for new persona
   * @returns {Promise<Object>} - The result of the operation
   */
  async execute({ text, personaId, personaName }) {
    console.log(`[Skill: ${this.name}] Starting execution...`);
    
    if (!text || text.length < 10) {
      throw new Error('Input text is too short for style extraction.');
    }

    // 1. Simulate AI Analysis (In real implementation, this calls LLM)
    // This represents the "Atomic Logic" that is decoupled from the Agent
    const analysisResult = this._simulateAIAnalysis(text);
    console.log(`[Skill: ${this.name}] Analysis complete:`, analysisResult);

    // 2. Persist Result (Standardized Collaboration via DB)
    let persona;
    if (personaId) {
      console.log(`[Skill: ${this.name}] Updating existing persona: ${personaId}`);
      persona = await updatePersona(personaId, {
        style_dna: analysisResult,
        updated_at: new Date().toISOString()
      });
    } else {
      console.log(`[Skill: ${this.name}] Creating new persona: ${personaName || 'Unknown Style'}`);
      persona = await createPersona({
        name: personaName || `Style Model ${new Date().toLocaleTimeString()}`,
        style_dna: analysisResult,
        role_definition: `Based on analysis of provided text.`
      });
    }

    return {
      success: true,
      skill: this.name,
      data: persona
    };
  }

  _simulateAIAnalysis(text) {
    // In a real scenario, we would parse the text and generate these sections dynamically.
    // For now, we return the high-quality mock data provided by the user.
    // We can lightly customize it based on keywords if we wanted to be fancy, 
    // but the user wants to see THIS structure.
    
    return {
      overview: MOCK_STYLE_DATA.overview,
      methodology: MOCK_STYLE_DATA.methodology,
      mindset: MOCK_STYLE_DATA.mindset,
      expression: MOCK_STYLE_DATA.expression,
      habits: MOCK_STYLE_DATA.habits,
      signature: MOCK_STYLE_DATA.signature,
      // Keep legacy fields for compatibility if needed, but the new UI will use the markdown fields
      tone: '专业通俗化',
      pacing: '张弛有度',
      vocabulary_complexity: '中偏高',
      sentence_structure: '长短结合',
      keywords_detected: ['说实话', '你看', '但是', '逻辑']
    };
  }
}

export const styleExtractor = new StyleExtractor();
