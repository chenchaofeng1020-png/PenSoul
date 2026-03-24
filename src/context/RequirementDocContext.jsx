/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  generateRequirementOutline,
  generateRequirementTasks,
  reviseRequirementDocument,
  writeRequirementSection
} from '../services/requirementDocApi';

const RequirementDocContext = createContext();

const DOC_STATES = {
  IDLE: 'idle',
  COLLECTING: 'collecting',
  TEMPLATE_SELECTING: 'template_selecting',
  OUTLINE_CONFIRMING: 'outline_confirming',
  TASK_CONFIRMING: 'task_confirming',
  WRITING: 'writing',
  EDITING: 'editing',
  COMPLETED: 'completed'
};

const initialState = {
  mode: DOC_STATES.IDLE,
  docId: null,
  productId: null,
  sourceIds: [],
  title: '需求文档',
  rawRequirement: '',
  clarifications: [],
  templateId: null,
  templateStructure: null,
  outline: null,
  tasks: [],
  currentTaskIndex: 0,
  document: null,
  isGeneratingOutline: false,
  isWriting: false,
  isRevising: false,
  activeRevisionSectionIndex: null,
  error: null
};

function buildDraftDocument(outline, title = '需求文档') {
  if (!outline?.sections) {
    return null;
  }

  return {
    title,
    sections: outline.sections.map((section, index) => ({
      id: `section-${index + 1}`,
      title: section.title,
      subsections: section.subsections || [],
      content: '',
      flowchart: section.needFlowchart ? '' : undefined,
      prototype: section.needPrototype ? '' : undefined
    }))
  };
}

function normalizeSectionPatch(currentSection, patch = {}) {
  return {
    ...currentSection,
    title: patch.title || currentSection.title,
    content: patch.content ?? currentSection.content,
    flowchart: patch.flowchart ?? currentSection.flowchart,
    prototype: patch.prototype ?? currentSection.prototype
  };
}

function requirementDocReducer(state, action) {
  switch (action.type) {
    case 'START_COLLECTING':
      return {
        ...initialState,
        mode: DOC_STATES.COLLECTING,
        docId: action.payload?.docId || `doc_${Date.now()}`,
        productId: action.payload?.productId || null,
        sourceIds: action.payload?.sourceIds || [],
        title: action.payload?.title || '需求文档'
      };

    case 'UPDATE_REQUIREMENT_CONTEXT':
      return {
        ...state,
        productId: action.payload?.productId ?? state.productId,
        sourceIds: action.payload?.sourceIds ?? state.sourceIds
      };

    case 'SET_RAW_REQUIREMENT':
      return {
        ...state,
        rawRequirement: action.payload
      };

    case 'START_OUTLINE_GENERATION':
      return {
        ...state,
        isGeneratingOutline: true,
        error: null
      };

    case 'ADD_CLARIFICATION':
      return {
        ...state,
        clarifications: [...state.clarifications, action.payload]
      };

    case 'SET_OUTLINE':
      return {
        ...state,
        outline: action.payload,
        title: action.payload?.documentTitle || state.title,
        document: buildDraftDocument(action.payload, action.payload?.documentTitle || state.title),
        isGeneratingOutline: false,
        mode: DOC_STATES.OUTLINE_CONFIRMING,
        error: null
      };

    case 'REQUEST_TASKS':
      return {
        ...state,
        mode: DOC_STATES.TASK_CONFIRMING,
        tasks: [],
        isGeneratingOutline: false,
        error: null
      };

    case 'SET_TASKS':
      return {
        ...state,
        tasks: action.payload,
        mode: DOC_STATES.TASK_CONFIRMING,
        error: null
      };

    case 'START_WRITING':
      return {
        ...state,
        mode: DOC_STATES.WRITING,
        isWriting: true,
        isRevising: false,
        activeRevisionSectionIndex: null,
        currentTaskIndex: 0,
        document: state.document || buildDraftDocument(state.outline, state.title),
        tasks: state.tasks.map(task => ({
          ...task,
          status: 'pending'
        })),
        error: null
      };

    case 'MARK_TASK_WRITING':
      return {
        ...state,
        currentTaskIndex: action.payload,
        tasks: state.tasks.map((task, index) => (
          index === action.payload
            ? { ...task, status: 'writing' }
            : task
        ))
      };

    case 'UPDATE_SECTION_CONTENT':
      return {
        ...state,
        document: state.document ? {
          ...state.document,
          sections: state.document.sections.map((section, index) => (
            index === action.payload.index
              ? {
                  ...section,
                  content: action.payload.content
                }
              : section
          ))
        } : state.document
      };

    case 'COMPLETE_TASK':
      return {
        ...state,
        currentTaskIndex: action.payload.index + 1,
        tasks: state.tasks.map((task, index) => (
          index === action.payload.index
            ? {
                ...task,
                status: 'completed',
                content: action.payload.content
              }
            : task
        )),
        document: state.document ? {
          ...state.document,
          sections: state.document.sections.map((section, index) => (
            index === action.payload.index
              ? {
                  ...section,
                  content: action.payload.content
                }
              : section
          ))
        } : state.document
      };

    case 'FINISH_WRITING':
      return {
        ...state,
        mode: DOC_STATES.EDITING,
        isWriting: false,
        isRevising: false,
        activeRevisionSectionIndex: null
      };

    case 'BEGIN_REVISION':
      return {
        ...state,
        mode: DOC_STATES.EDITING,
        isRevising: true,
        activeRevisionSectionIndex: action.payload?.index ?? null,
        error: null
      };

    case 'APPLY_SECTION_REVISION':
      return {
        ...state,
        mode: DOC_STATES.EDITING,
        isRevising: false,
        activeRevisionSectionIndex: null,
        document: state.document ? {
          ...state.document,
          sections: state.document.sections.map((section, index) => (
            index === action.payload.index
              ? normalizeSectionPatch(section, action.payload.section)
              : section
          ))
        } : state.document
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isGeneratingOutline: false,
        isWriting: false,
        isRevising: false,
        activeRevisionSectionIndex: null,
        mode: state.document ? DOC_STATES.EDITING : state.mode
      };

    case 'COMPLETE':
      return {
        ...state,
        mode: DOC_STATES.COMPLETED,
        isWriting: false
      };

    case 'HYDRATE_SNAPSHOT':
      return {
        ...initialState,
        ...action.payload,
        isGeneratingOutline: false,
        isWriting: false,
        isRevising: false,
        activeRevisionSectionIndex: null,
        error: null
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function RequirementDocProvider({ children }) {
  const [state, dispatch] = useReducer(requirementDocReducer, initialState);

  const startCollecting = useCallback((payload = {}) => {
    dispatch({ type: 'START_COLLECTING', payload });
  }, []);

  const requestOutline = useCallback(async ({ requirement, clarifications, templateStructure = null }) => {
    dispatch({ type: 'START_OUTLINE_GENERATION' });

    const data = await generateRequirementOutline({
      productId: state.productId,
      sourceIds: state.sourceIds,
      requirement,
      clarifications,
      templateStructure
    });

    dispatch({ type: 'SET_OUTLINE', payload: data.outline });
    return data.outline;
  }, [state.productId, state.sourceIds]);

  const confirmOutline = useCallback(async () => {
    if (!state.outline) {
      return [];
    }

    dispatch({ type: 'REQUEST_TASKS' });

    try {
      const data = await generateRequirementTasks({ outline: state.outline });
      dispatch({ type: 'SET_TASKS', payload: data.tasks });
      return data.tasks;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [state.outline]);

  const startWriting = useCallback(async () => {
    if (!state.outline || !state.tasks.length) {
      return null;
    }

    dispatch({ type: 'START_WRITING' });

    try {
      const completedSections = [];

      for (let index = 0; index < state.tasks.length; index += 1) {
        const task = state.tasks[index];

        dispatch({ type: 'MARK_TASK_WRITING', payload: index });

        let sectionContent = '';
        await writeRequirementSection({
          productId: state.productId,
          sourceIds: state.sourceIds,
          requirement: state.rawRequirement,
          clarifications: state.clarifications,
          outline: state.outline,
          currentSection: task.section,
          completedSections
        }, {
          onChunk(nextContent) {
            sectionContent = nextContent;
            dispatch({
              type: 'UPDATE_SECTION_CONTENT',
              payload: {
                index,
                content: nextContent
              }
            });
          }
        });

        completedSections.push(sectionContent);
        dispatch({
          type: 'COMPLETE_TASK',
          payload: {
            index,
            content: sectionContent
          }
        });
      }

      dispatch({ type: 'FINISH_WRITING' });
      return true;
    } catch (error) {
      console.error('Requirement doc writing error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [state.clarifications, state.outline, state.productId, state.rawRequirement, state.sourceIds, state.tasks]);

  const reviseDocument = useCallback(async ({
    instruction,
    quoteText = '',
    targetSectionIndex = null,
    targetSectionTitle = ''
  }) => {
    if (!state.document) {
      throw new Error('当前还没有可修改的文档初稿');
    }

    dispatch({
      type: 'BEGIN_REVISION',
      payload: { index: targetSectionIndex }
    });

    try {
      const result = await reviseRequirementDocument({
        productId: state.productId,
        sourceIds: state.sourceIds,
        requirement: state.rawRequirement,
        clarifications: state.clarifications,
        document: state.document,
        instruction,
        quoteText,
        targetSectionIndex,
        targetSectionTitle
      });

      dispatch({
        type: 'APPLY_SECTION_REVISION',
        payload: {
          index: result.targetSectionIndex,
          section: result.updatedSection
        }
      });

      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [state.clarifications, state.document, state.productId, state.rawRequirement, state.sourceIds]);

  const restoreSnapshot = useCallback((snapshot) => {
    dispatch({ type: 'HYDRATE_SNAPSHOT', payload: snapshot });
  }, []);

  const value = useMemo(() => ({
    state,
    dispatch,
    DOC_STATES,
    actions: {
      startCollecting,
      requestOutline,
      confirmOutline,
      startWriting,
      reviseDocument,
      restoreSnapshot
    }
  }), [confirmOutline, requestOutline, restoreSnapshot, reviseDocument, startCollecting, startWriting, state]);

  return (
    <RequirementDocContext.Provider value={value}>
      {children}
    </RequirementDocContext.Provider>
  );
}

export function useRequirementDoc() {
  const context = useContext(RequirementDocContext);
  if (!context) {
    throw new Error('useRequirementDoc must be used within RequirementDocProvider');
  }
  return context;
}

export { DOC_STATES };
