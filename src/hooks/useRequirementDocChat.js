import { useState, useCallback } from 'react';
import { useRequirementDoc, DOC_STATES } from '../context/RequirementDocContext';
import {
  clarifyRequirement,
  generateRequirementOutline,
  generateRequirementTasks,
  writeRequirementSection
} from '../services/requirementDocApi';

export function useRequirementDocChat() {
  const { state, dispatch } = useRequirementDoc();
  const [isLoading, setIsLoading] = useState(false);

  const generateOutline = useCallback(async () => {
    try {
      const data = await generateRequirementOutline({
        requirement: state.rawRequirement,
        clarifications: state.clarifications,
        templateStructure: state.templateStructure
      });
      dispatch({ type: 'SET_OUTLINE', payload: data.outline });

      return '大纲已生成，请确认';
    } catch (error) {
      console.error('Generate outline error:', error);
      throw error;
    }
  }, [state.rawRequirement, state.clarifications, state.templateStructure, dispatch]);

  const generateTasks = useCallback(async () => {
    try {
      const data = await generateRequirementTasks({
        outline: state.outline
      });
      dispatch({ type: 'SET_TASKS', payload: data.tasks });

      return '任务已拆解，请确认后开始撰写';
    } catch (error) {
      console.error('Generate tasks error:', error);
      throw error;
    }
  }, [state.outline, dispatch]);

  const startWriting = useCallback(async () => {
    try {
      const sections = [];
      const completedSections = [];

      for (let i = 0; i < state.tasks.length; i++) {
        const task = state.tasks[i];
        
        // 更新任务状态为writing
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            index: i,
            updates: { status: 'writing' }
          }
        });

        // 撰写章节
        const sectionContent = await writeRequirementSection({
          requirement: state.rawRequirement,
          clarifications: state.clarifications,
          outline: state.outline,
          currentSection: task.section,
          completedSections
        });

        // 提取流程图和页面原型草图
        const flowchartMatch = sectionContent.match(/```mermaid\n([\s\S]*?)\n```/);
        const prototypeMatch = sectionContent.match(/```text\n([\s\S]*?)\n```/);

        sections.push({
          title: task.section,
          content: sectionContent,
          flowchart: flowchartMatch ? flowchartMatch[1] : null,
          prototype: prototypeMatch ? prototypeMatch[1] : null
        });

        completedSections.push(sectionContent);

        // 更新任务状态为completed
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            index: i,
            updates: { 
              status: 'completed',
              content: sectionContent
            }
          }
        });
      }

      // 设置完整文档
      dispatch({
        type: 'SET_DOCUMENT',
        payload: { sections }
      });

      return '文档撰写完成！';
    } catch (error) {
      console.error('Start writing error:', error);
      throw error;
    }
  }, [state.tasks, state.rawRequirement, state.clarifications, state.outline, dispatch]);

  const handleDocumentEdit = useCallback(async () => {
    // TODO: 实现文档编辑逻辑
    return '文档编辑功能开发中...';
  }, []);

  const handleUserInput = useCallback(async (userInput) => {
    if (!userInput.trim()) return;

    setIsLoading(true);

    try {
      // 阶段1: 需求收集
      if (state.mode === DOC_STATES.COLLECTING) {
        if (!state.rawRequirement) {
          dispatch({ type: 'SET_RAW_REQUIREMENT', payload: userInput });
        }

        const data = await clarifyRequirement({
          docId: state.docId,
          requirement: state.rawRequirement || userInput,
          clarifications: state.clarifications,
          userInput
        });

        if (data.isComplete) {
          dispatch({
            type: 'ADD_CLARIFICATION',
            payload: {
              question: '需求是否完整？',
              answer: userInput
            }
          });
          await generateOutline();
        } else {
          dispatch({
            type: 'ADD_CLARIFICATION',
            payload: {
              question: userInput,
              answer: data.response
            }
          });
        }

        return data.response;
      }

      if (state.mode === DOC_STATES.TEMPLATE_SELECTING) {
        await generateOutline();
        return '模板已选择，正在生成大纲...';
      }

      if (state.mode === DOC_STATES.OUTLINE_CONFIRMING) {
        if (userInput.includes('确认') || userInput.includes('没问题') || userInput.includes('可以')) {
          dispatch({ type: 'CONFIRM_OUTLINE' });
          await generateTasks();
          return '大纲已确认，正在拆解任务...';
        }

        return '请点击右侧的编辑按钮修改大纲，或输入具体修改意见';
      }

      if (state.mode === DOC_STATES.TASK_CONFIRMING) {
        if (userInput.includes('确认') || userInput.includes('开始') || userInput.includes('没问题')) {
          dispatch({ type: 'START_WRITING' });
          await startWriting();
          return '开始撰写文档...';
        }

        return '请确认任务列表，或输入修改意见';
      }

      if (state.mode === DOC_STATES.EDITING) {
        return handleDocumentEdit(userInput);
      }
    } catch (error) {
      console.error('Requirement doc chat error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, generateOutline, generateTasks, handleDocumentEdit, startWriting, state]);

  return {
    handleUserInput,
    isLoading,
    generateOutline,
    generateTasks,
    startWriting
  };
}
