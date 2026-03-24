/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  generateSmartEstimationReport,
  reviseSmartEstimationReport
} from '../services/smartEstimationApi';

const SmartEstimationContext = createContext();

const SMART_ESTIMATION_STATES = {
  IDLE: 'idle',
  COLLECTING: 'collecting',
  READY: 'ready',
  GENERATING: 'generating',
  EDITING: 'editing',
  COMPLETED: 'completed'
};

const initialState = {
  mode: SMART_ESTIMATION_STATES.IDLE,
  sessionId: null,
  productId: null,
  sourceIds: [],
  title: 'AI智能人天评估',
  rawRequirement: '',
  clarifications: [],
  parsedFunctions: [],
  selectedFunctionKeys: [],
  detectedFunctions: [],
  missingInformation: [],
  report: null,
  isGenerating: false,
  isRevising: false,
  savedNoteId: null,
  error: null
};

function smartEstimationReducer(state, action) {
  switch (action.type) {
    case 'START_COLLECTING':
      return {
        ...initialState,
        mode: SMART_ESTIMATION_STATES.COLLECTING,
        sessionId: action.payload?.sessionId || `smart_estimation_${Date.now()}`,
        productId: action.payload?.productId || null,
        sourceIds: action.payload?.sourceIds || [],
        title: action.payload?.title || 'AI智能人天评估'
      };

    case 'UPDATE_CONTEXT':
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

    case 'ADD_CLARIFICATION':
      return {
        ...state,
        clarifications: [...state.clarifications, action.payload]
      };

    case 'SET_PARSED_FUNCTIONS': {
      const parsedFunctions = Array.isArray(action.payload) ? action.payload : [];
      const validKeys = parsedFunctions.map(item => item.selectionKey);
      const retainedKeys = state.selectedFunctionKeys.filter(key => validKeys.includes(key));
      const nextSelectedKeys = retainedKeys.length > 0 || parsedFunctions.length === 0
        ? retainedKeys
        : validKeys;

      return {
        ...state,
        parsedFunctions,
        selectedFunctionKeys: nextSelectedKeys
      };
    }

    case 'SET_SELECTED_FUNCTION_KEYS':
      return {
        ...state,
        selectedFunctionKeys: Array.isArray(action.payload) ? action.payload : []
      };

    case 'MARK_READY':
      return {
        ...state,
        mode: SMART_ESTIMATION_STATES.READY,
        detectedFunctions: action.payload?.detectedFunctions || state.detectedFunctions,
        missingInformation: action.payload?.missingInformation || []
      };

    case 'START_GENERATING':
      return {
        ...state,
        mode: SMART_ESTIMATION_STATES.GENERATING,
        isGenerating: true,
        error: null
      };

    case 'SET_REPORT':
      return {
        ...state,
        mode: SMART_ESTIMATION_STATES.COMPLETED,
        report: action.payload,
        isGenerating: false,
        isRevising: false,
        error: null,
        title: action.payload?.title || state.title
      };

    case 'BEGIN_REVISION':
      return {
        ...state,
        mode: SMART_ESTIMATION_STATES.EDITING,
        isRevising: true,
        error: null
      };

    case 'MARK_SAVED':
      return {
        ...state,
        savedNoteId: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isGenerating: false,
        isRevising: false,
        mode: state.report ? SMART_ESTIMATION_STATES.COMPLETED : SMART_ESTIMATION_STATES.COLLECTING
      };

    case 'HYDRATE_SNAPSHOT':
      return {
        ...initialState,
        ...action.payload,
        isGenerating: false,
        isRevising: false,
        error: null
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function SmartEstimationProvider({ children }) {
  const [state, dispatch] = useReducer(smartEstimationReducer, initialState);

  const startCollecting = useCallback((payload = {}) => {
    dispatch({ type: 'START_COLLECTING', payload });
  }, []);

  const generateReport = useCallback(async ({ requirement, clarifications, selectedFunctions = [] }) => {
    dispatch({ type: 'START_GENERATING' });

    try {
      const data = await generateSmartEstimationReport({
        productId: state.productId,
        sourceIds: state.sourceIds,
        requirement,
        clarifications,
        selectedFunctions
      });
      dispatch({ type: 'SET_REPORT', payload: data.report });
      return data.report;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [state.productId, state.sourceIds]);

  const reviseReport = useCallback(async ({ instruction }) => {
    if (!state.report) {
      throw new Error('当前还没有可修订的评估结果');
    }

    dispatch({ type: 'BEGIN_REVISION' });

    try {
      const data = await reviseSmartEstimationReport({
        productId: state.productId,
        sourceIds: state.sourceIds,
        requirement: state.rawRequirement,
        clarifications: state.clarifications,
        selectedFunctions: state.parsedFunctions.filter(item => state.selectedFunctionKeys.includes(item.selectionKey)),
        report: state.report,
        instruction
      });
      dispatch({ type: 'SET_REPORT', payload: data.report });
      return data.report;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [state.clarifications, state.parsedFunctions, state.productId, state.rawRequirement, state.report, state.selectedFunctionKeys, state.sourceIds]);

  const restoreSnapshot = useCallback((snapshot) => {
    dispatch({ type: 'HYDRATE_SNAPSHOT', payload: snapshot });
  }, []);

  const value = useMemo(() => ({
    state,
    dispatch,
    SMART_ESTIMATION_STATES,
    actions: {
      startCollecting,
      generateReport,
      reviseReport,
      restoreSnapshot
    }
  }), [generateReport, restoreSnapshot, reviseReport, startCollecting, state]);

  return (
    <SmartEstimationContext.Provider value={value}>
      {children}
    </SmartEstimationContext.Provider>
  );
}

export function useSmartEstimation() {
  const context = useContext(SmartEstimationContext);
  if (!context) {
    throw new Error('useSmartEstimation must be used within SmartEstimationProvider');
  }
  return context;
}

export { SMART_ESTIMATION_STATES };
