import { updatePersona, createPersona, getPersonas } from '../../api.js';

/**
 * MACC Agent Skill: extract_style_dna
 * Owner: Agent K (老K)
 * Description: Extracts style characteristics from text using AI analysis.
 */
export class StyleExtractor {
  constructor() {
    this.name = 'extract_style_dna';
    this.version = '3.0.0';
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

    // 1. Call AI for real style analysis
    const analysisResult = await this._analyzeWithAI(text);
    console.log(`[Skill: ${this.name}] AI Analysis complete:`, analysisResult);

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

  /**
   * Call AI to analyze text style
   * @param {string} text - Sample text to analyze
   * @returns {Promise<Object>} - Structured style DNA
   */
  async _analyzeWithAI(text) {
    const systemPrompt = `你是一位专业的写作风格分析专家。你的任务是深入分析用户提供的文本样本，提取其独特的写作风格DNA。

请从以下几个维度进行分析，并以JSON格式返回结果：

{
  "overview": "风格概述与作者画像（markdown格式，包含：一、风格概述 - 核心特征、与其他风格的区别；二、作者画像 - 基础特征、知识结构、关注焦点、经历痕迹、性格特质）",
  "methodology": "创作方法论（markdown格式，包含：2.1 创作路径还原 - 识别的创作阶段、原文例证；2.2 构思模式提取 - 选题策略、切入角度）",
  "mindset": "思维内核（markdown格式，包含：3.1 认知底层 - 核心世界观、看待事物的基本态度、思考问题的出发点、价值判断标准、知识体系特征）",
  "expression": "表达特征（markdown格式，包含：4.1 语言质感 - 整体语言风格定位、词汇选择偏好、句子长短和复杂度、语言的韵律节奏、原文例证；4.2 语气人格 - 基础语气类型）",
  "habits": "创作习惯（markdown格式，包含：5.1 结构模式 - 开篇模式、主体展开逻辑、收尾方式）",
  "signature": "独特标记（markdown格式，包含：6.1 词汇指纹 - 高频特色词汇及作用、情感表达词、逻辑连接词、强调词汇）",
  "tone": "语气风格关键词（如：专业通俗化、幽默风趣、严肃正式等）",
  "pacing": "节奏特点（如：张弛有度、紧凑激烈、舒缓平和等）",
  "vocabulary_complexity": "词汇复杂度（如：高、中偏高、中等、通俗）",
  "sentence_structure": "句式特点（如：长短结合、以短句为主、复杂长句等）",
  "keywords_detected": ["检测到的特色关键词1", "关键词2", "关键词3"]
}

分析要求：
1. 基于文本的实际特点进行分析，不要编造
2. 每个维度都要有具体的原文例证支撑
3. 使用markdown格式让内容层次清晰
4. 语言风格关键词等字段要简洁准确
5. 如果某些维度在文本中表现不明显，如实说明`;

    try {
      const response = await fetch('/api/agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          user_message: `请分析以下文本的写作风格：\n\n---\n${text}\n---`,
          model_config: {
            model: 'gpt-4o',
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.status}`);
      }

      const result = await response.json();
      const content = result.reply;

      // Try to parse JSON from the response
      // The AI might return JSON directly or wrap it in markdown code blocks
      let parsedData;
      try {
        // First try direct JSON parse
        parsedData = JSON.parse(content);
      } catch (e) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1].trim());
        } else {
          // If no JSON found, create a structured response from the text
          parsedData = this._parseTextResponse(content);
        }
      }

      // Ensure all required fields exist
      return {
        overview: parsedData.overview || '暂无风格概述',
        methodology: parsedData.methodology || '暂无创作方法论',
        mindset: parsedData.mindset || '暂无思维内核分析',
        expression: parsedData.expression || '暂无表达特征分析',
        habits: parsedData.habits || '暂无创作习惯分析',
        signature: parsedData.signature || '暂无独特标记',
        tone: parsedData.tone || '未识别',
        pacing: parsedData.pacing || '未识别',
        vocabulary_complexity: parsedData.vocabulary_complexity || '中等',
        sentence_structure: parsedData.sentence_structure || '未识别',
        keywords_detected: parsedData.keywords_detected || []
      };
    } catch (error) {
      console.error('[StyleExtractor] AI analysis error:', error);
      throw new Error('风格分析失败，请稍后重试');
    }
  }

  /**
   * Parse text response when JSON parsing fails
   * @param {string} text - Raw text response
   * @returns {Object} - Structured style DNA
   */
  _parseTextResponse(text) {
    // Simple heuristic parsing as fallback
    const sections = text.split(/#{1,3}\s+/).filter(Boolean);

    return {
      overview: sections.find(s => s.includes('风格') || s.includes('概述')) || text.substring(0, 500),
      methodology: sections.find(s => s.includes('方法') || s.includes('创作')) || '暂无',
      mindset: sections.find(s => s.includes('思维') || s.includes('认知')) || '暂无',
      expression: sections.find(s => s.includes('表达') || s.includes('语言')) || '暂无',
      habits: sections.find(s => s.includes('习惯') || s.includes('结构')) || '暂无',
      signature: sections.find(s => s.includes('标记') || s.includes('特色')) || '暂无',
      tone: '未识别',
      pacing: '未识别',
      vocabulary_complexity: '中等',
      sentence_structure: '未识别',
      keywords_detected: []
    };
  }
}

export const styleExtractor = new StyleExtractor();
