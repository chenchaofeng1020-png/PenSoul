const API_BASE = 'http://localhost:3002/api/smart-estimation';

async function parseJsonResponse(response, fallbackMessage) {
  if (!response.ok) {
    let errorMessage = fallbackMessage;

    try {
      const data = await response.json();
      errorMessage = data?.error || errorMessage;
    } catch (error) {
      console.error('[SmartEstimationApi] Failed to parse error response:', error);
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function clarifySmartEstimation(payload) {
  const response = await fetch(`${API_BASE}/clarify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, '智能人天评估引导失败');
}

export async function generateSmartEstimationReport(payload) {
  const response = await fetch(`${API_BASE}/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, '生成智能人天评估结果失败');
}

export async function reviseSmartEstimationReport(payload) {
  const response = await fetch(`${API_BASE}/revise-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, '修订智能人天评估结果失败');
}
