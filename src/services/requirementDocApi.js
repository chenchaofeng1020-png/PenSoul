const API_BASE = 'http://localhost:3002/api/requirement-doc';

async function parseJsonResponse(response, fallbackMessage) {
  if (!response.ok) {
    let errorMessage = fallbackMessage;

    try {
      const data = await response.json();
      errorMessage = data?.error || errorMessage;
    } catch (error) {
      console.error('[RequirementDocApi] Failed to parse error response:', error);
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function clarifyRequirement(payload) {
  const response = await fetch(`${API_BASE}/clarify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, '需求澄清失败');
}

export async function generateRequirementOutline(payload) {
  const response = await fetch(`${API_BASE}/generate-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, '生成大纲失败');
}

export async function generateRequirementTasks(payload) {
  const response = await fetch(`${API_BASE}/generate-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, '生成任务失败');
}

export async function reviseRequirementDocument(payload) {
  const response = await fetch(`${API_BASE}/revise-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, '修订文档失败');
}

export async function writeRequirementSection(payload, options = {}) {
  const { onChunk } = options;
  const response = await fetch(`${API_BASE}/write-section`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('撰写章节失败');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('章节流式响应不可用');
  }

  const decoder = new TextDecoder();
  let sectionContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('data: ')) {
        continue;
      }

      const dataStr = trimmedLine.slice(6);
      if (dataStr === '[DONE]') {
        return sectionContent;
      }

      try {
        const data = JSON.parse(dataStr);
        if (data.content) {
          sectionContent += data.content;
          onChunk?.(sectionContent, data.content);
        }
      } catch (error) {
        console.error('[RequirementDocApi] Failed to parse stream chunk:', error);
      }
    }
  }

  return sectionContent;
}
