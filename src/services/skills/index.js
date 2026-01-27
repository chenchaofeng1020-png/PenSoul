import { styleExtractor } from './core/StyleExtractor.js';

export const SkillRegistry = {
  'extract_style_dna': styleExtractor
};

export async function executeSkill(skillName, params) {
  const skill = SkillRegistry[skillName];
  if (!skill) {
    throw new Error(`Skill ${skillName} not found.`);
  }
  return await skill.execute(params);
}
