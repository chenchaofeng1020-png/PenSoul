/**
 * AI工作台对话记录本地缓存工具
 * 使用 localStorage 存储对话历史
 */

const STORAGE_KEY_PREFIX = 'macc_chat_history_';
const ARCHIVE_STORAGE_KEY_PREFIX = 'macc_chat_history_archive_';
const REQUIREMENT_DOC_ARCHIVE_STORAGE_KEY_PREFIX = 'macc_requirement_doc_archive_';
const SMART_ESTIMATION_STORAGE_KEY_PREFIX = 'macc_smart_estimation_';
const MAX_MESSAGES = 100; // 最多保存100条消息
const MAX_ARCHIVED_SESSIONS = 20;
const EXPIRE_DAYS = 7; // 7天过期

// 检查 localStorage 是否可用
function isLocalStorageAvailable() {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    console.error('[ChatStorage] localStorage is not available:', e);
    return false;
  }
}

/**
 * 获取存储key
 * @param {string} productId 
 * @returns {string}
 */
function getStorageKey(productId) {
  return `${STORAGE_KEY_PREFIX}${productId}`;
}

function getArchiveStorageKey(productId) {
  return `${ARCHIVE_STORAGE_KEY_PREFIX}${productId}`;
}

function getRequirementDocArchiveStorageKey(productId) {
  return `${REQUIREMENT_DOC_ARCHIVE_STORAGE_KEY_PREFIX}${productId}`;
}

function getSmartEstimationStorageKey(productId) {
  return `${SMART_ESTIMATION_STORAGE_KEY_PREFIX}${productId}`;
}

/**
 * 保存对话记录
 * @param {string} productId 
 * @param {array} messages 
 */
export function saveChatHistory(productId, messages) {
  if (!isLocalStorageAvailable()) {
    console.warn('[ChatStorage] localStorage not available, cannot save');
    return;
  }
  
  if (!productId) {
    console.log('[ChatStorage] Skip save: productId is empty');
    return;
  }
  
  if (!messages || !Array.isArray(messages)) {
    console.log('[ChatStorage] Skip save: messages is not an array', messages);
    return;
  }
  
  try {
    // 限制消息数量
    const trimmedMessages = messages.slice(-MAX_MESSAGES);
    
    const data = {
      productId,
      messages: trimmedMessages,
      lastUpdated: Date.now()
    };
    
    const key = getStorageKey(productId);
    const jsonData = JSON.stringify(data);
    
    // 检查数据大小（localStorage 通常有 5MB 限制）
    if (jsonData.length > 4 * 1024 * 1024) { // 4MB 警告
      console.warn('[ChatStorage] Data size is large:', jsonData.length, 'bytes');
    }
    
    localStorage.setItem(key, jsonData);
    console.log('[ChatStorage] Saved to localStorage:', key, 'messages:', trimmedMessages.length, 'size:', jsonData.length, 'bytes');
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[ChatStorage] localStorage quota exceeded. Consider clearing old data.');
      // 尝试清理过期数据
      cleanupExpiredChatHistory();
    } else {
      console.error('[ChatStorage] Failed to save chat history:', e);
    }
  }
}

/**
 * 读取对话记录
 * @param {string} productId 
 * @returns {array|null}
 */
export function loadChatHistory(productId) {
  if (!isLocalStorageAvailable()) {
    console.warn('[ChatStorage] localStorage not available');
    return null;
  }
  
  if (!productId) {
    console.log('[ChatStorage] Skip load: productId is empty');
    return null;
  }
  
  try {
    const key = getStorageKey(productId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      console.log('[ChatStorage] No stored data found for:', key);
      return null;
    }
    
    const data = JSON.parse(stored);
    
    // 验证数据格式
    if (!data || !Array.isArray(data.messages)) {
      console.warn('[ChatStorage] Invalid data format for:', key);
      localStorage.removeItem(key);
      return null;
    }
    
    console.log('[ChatStorage] Loaded from localStorage:', key, 'messages:', data.messages.length);
    
    // 检查是否过期
    if (data.lastUpdated) {
      const daysSinceUpdate = (Date.now() - data.lastUpdated) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > EXPIRE_DAYS) {
        console.log('[ChatStorage] Data expired for:', key, 'days:', daysSinceUpdate);
        localStorage.removeItem(key);
        return null;
      }
    }
    
    return data.messages;
  } catch (e) {
    console.error('[ChatStorage] Failed to load chat history:', e);
    // 解析失败，删除损坏的数据
    try {
      localStorage.removeItem(getStorageKey(productId));
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * 清空对话记录
 * @param {string} productId 
 */
export function clearChatHistory(productId) {
  if (!productId) return;
  
  try {
    localStorage.removeItem(getStorageKey(productId));
  } catch (e) {
    console.error('Failed to clear chat history:', e);
  }
}

export function archiveChatHistory(productId, messages, metadata = {}) {
  if (!isLocalStorageAvailable() || !productId || !Array.isArray(messages) || messages.length === 0) {
    return;
  }

  try {
    const archiveKey = getArchiveStorageKey(productId);
    const existing = localStorage.getItem(archiveKey);
    const sessions = existing ? JSON.parse(existing) : [];
    const trimmedMessages = messages.slice(-MAX_MESSAGES);
    const latestSession = sessions[0];

    const isDuplicateLatest = latestSession
      && latestSession.messageCount === trimmedMessages.length
      && latestSession.messages?.[0]?.content === trimmedMessages[0]?.content
      && latestSession.messages?.[latestSession.messages.length - 1]?.content === trimmedMessages[trimmedMessages.length - 1]?.content;

    if (isDuplicateLatest) {
      return;
    }

    const nextSessions = [
      {
        id: `session_${Date.now()}`,
        productId,
        createdAt: Date.now(),
        messageCount: trimmedMessages.length,
        reason: metadata.reason || 'manual',
        title: metadata.title || '',
        messages: trimmedMessages
      },
      ...sessions
    ].slice(0, MAX_ARCHIVED_SESSIONS);

    localStorage.setItem(archiveKey, JSON.stringify(nextSessions));
  } catch (error) {
    console.error('[ChatStorage] Failed to archive chat history:', error);
  }
}

export function loadArchivedChatHistory(productId) {
  if (!isLocalStorageAvailable() || !productId) {
    return [];
  }

  try {
    const archiveKey = getArchiveStorageKey(productId);
    const stored = localStorage.getItem(archiveKey);
    if (!stored) {
      return [];
    }

    const sessions = JSON.parse(stored);
    if (!Array.isArray(sessions)) {
      localStorage.removeItem(archiveKey);
      return [];
    }

    return sessions.filter(session => {
      const daysSinceCreate = session?.createdAt
        ? (Date.now() - session.createdAt) / (1000 * 60 * 60 * 24)
        : 0;
      return Array.isArray(session?.messages) && session.messages.length > 0 && daysSinceCreate <= EXPIRE_DAYS;
    });
  } catch (error) {
    console.error('[ChatStorage] Failed to load archived chat history:', error);
    return [];
  }
}

function hasRequirementDocSnapshotContent(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }

  return Boolean(
    snapshot.rawRequirement
    || snapshot.outline?.sections?.length
    || snapshot.document?.sections?.some(section =>
      section?.content || section?.flowchart || section?.prototype
    )
  );
}

export function archiveRequirementDocSession(productId, session, metadata = {}) {
  if (!isLocalStorageAvailable() || !productId || !session?.docState) {
    return;
  }

  const serializedState = JSON.parse(JSON.stringify(session.docState));
  if (!hasRequirementDocSnapshotContent(serializedState)) {
    return;
  }

  try {
    const archiveKey = getRequirementDocArchiveStorageKey(productId);
    const existing = localStorage.getItem(archiveKey);
    const sessions = existing ? JSON.parse(existing) : [];
    const trimmedMessages = Array.isArray(session.messages) ? session.messages.slice(-MAX_MESSAGES) : [];
    const latestSession = sessions[0];
    const now = Date.now();

    const isDuplicateLatest = latestSession
      && latestSession.title === (metadata.title || serializedState.title || '需求文档草稿')
      && latestSession.docState?.document?.sections?.length === serializedState.document?.sections?.length
      && now - (latestSession.updatedAt || latestSession.createdAt || 0) < 3000;

    if (isDuplicateLatest) {
      return;
    }

    const nextSessions = [
      {
        id: `requirement_doc_${now}`,
        type: 'requirement_doc',
        productId,
        createdAt: now,
        updatedAt: now,
        title: metadata.title || serializedState.title || '需求文档草稿',
        reason: metadata.reason || 'manual_close',
        messageCount: trimmedMessages.length,
        messages: trimmedMessages,
        docState: serializedState
      },
      ...sessions
    ].slice(0, MAX_ARCHIVED_SESSIONS);

    localStorage.setItem(archiveKey, JSON.stringify(nextSessions));
  } catch (error) {
    console.error('[ChatStorage] Failed to archive requirement doc session:', error);
  }
}

export function loadArchivedRequirementDocSessions(productId) {
  if (!isLocalStorageAvailable() || !productId) {
    return [];
  }

  try {
    const archiveKey = getRequirementDocArchiveStorageKey(productId);
    const stored = localStorage.getItem(archiveKey);
    if (!stored) {
      return [];
    }

    const sessions = JSON.parse(stored);
    if (!Array.isArray(sessions)) {
      localStorage.removeItem(archiveKey);
      return [];
    }

    return sessions.filter(session => {
      const lastTouchedAt = session?.updatedAt || session?.createdAt || 0;
      const daysSinceUpdate = lastTouchedAt
        ? (Date.now() - lastTouchedAt) / (1000 * 60 * 60 * 24)
        : 0;

      return session?.type === 'requirement_doc'
        && hasRequirementDocSnapshotContent(session?.docState)
        && daysSinceUpdate <= EXPIRE_DAYS;
    });
  } catch (error) {
    console.error('[ChatStorage] Failed to load requirement doc sessions:', error);
    return [];
  }
}

export function saveSmartEstimationSession(productId, session) {
  if (!isLocalStorageAvailable() || !productId || !session?.estimationState) {
    return;
  }

  try {
    localStorage.setItem(getSmartEstimationStorageKey(productId), JSON.stringify({
      productId,
      updatedAt: Date.now(),
      messages: Array.isArray(session.messages) ? session.messages.slice(-MAX_MESSAGES) : [],
      estimationState: session.estimationState
    }));
  } catch (error) {
    console.error('[ChatStorage] Failed to save smart estimation session:', error);
  }
}

export function loadSmartEstimationSession(productId) {
  if (!isLocalStorageAvailable() || !productId) {
    return null;
  }

  try {
    const stored = localStorage.getItem(getSmartEstimationStorageKey(productId));
    if (!stored) {
      return null;
    }

    const session = JSON.parse(stored);
    const lastTouchedAt = session?.updatedAt || 0;
    const daysSinceUpdate = lastTouchedAt
      ? (Date.now() - lastTouchedAt) / (1000 * 60 * 60 * 24)
      : 0;

    if (daysSinceUpdate > EXPIRE_DAYS) {
      localStorage.removeItem(getSmartEstimationStorageKey(productId));
      return null;
    }

    return session;
  } catch (error) {
    console.error('[ChatStorage] Failed to load smart estimation session:', error);
    return null;
  }
}

export function clearSmartEstimationSession(productId) {
  if (!productId) {
    return;
  }

  try {
    localStorage.removeItem(getSmartEstimationStorageKey(productId));
  } catch (error) {
    console.error('[ChatStorage] Failed to clear smart estimation session:', error);
  }
}

/**
 * 清理所有过期的对话记录
 */
export function cleanupExpiredChatHistory() {
  try {
    const keys = Object.keys(localStorage);
    const chatKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
    
    chatKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.lastUpdated) {
            const daysSinceUpdate = (Date.now() - data.lastUpdated) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate > EXPIRE_DAYS) {
              localStorage.removeItem(key);
            }
          }
        }
      } catch {
        // 解析失败，删除该key
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Failed to cleanup chat history:', e);
  }
}

/**
 * 获取所有产品的对话记录统计
 * @returns {array}
 */
export function getChatHistoryStats() {
  try {
    const keys = Object.keys(localStorage);
    const chatKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
    
    return chatKeys.map(key => {
      try {
        const stored = localStorage.getItem(key);
        const data = JSON.parse(stored);
        return {
          productId: data.productId,
          messageCount: data.messages?.length || 0,
          lastUpdated: data.lastUpdated
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (e) {
    console.error('Failed to get chat history stats:', e);
    return [];
  }
}
