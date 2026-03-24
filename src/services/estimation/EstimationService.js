/**
 * 人天评估服务
 * 封装评估相关的 API 调用
 */

const API_BASE = 'http://localhost:3002/api/smart/estimation';

export const EstimationService = {
  async suggestUnits(functions, scopeConfig, model = 'glm-4-7-251222') {
    const response = await fetch(`${API_BASE}/units/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ functions, scopeConfig, model })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '生成交付项失败');
    }

    return response.json();
  },

  /**
   * 启动评估任务
   * @param {string} productId 
   * @param {Array} functions 
   * @param {Object} config 
   * @returns {Promise<{taskId, status, totalFunctions, totalBatches}>}
   */
  async startEstimation(productId, functions, config) {
    const response = await fetch(`${API_BASE}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, functions, config })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '启动评估失败');
    }

    return response.json();
  },

  /**
   * 查询评估进度
   * @param {string} taskId 
   * @returns {Promise<Object>}
   */
  async getProgress(taskId) {
    const response = await fetch(`${API_BASE}/${taskId}/progress`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '查询进度失败');
    }

    return response.json();
  },

  /**
   * 取消评估任务
   * @param {string} taskId 
   * @returns {Promise<Object>}
   */
  async cancelEstimation(taskId) {
    const response = await fetch(`${API_BASE}/${taskId}/cancel`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '取消评估失败');
    }

    return response.json();
  },

  /**
   * 获取评估报告
   * @param {string} taskId 
   * @param {string} format - 'json' | 'markdown'
   * @returns {Promise<Object|string>}
   */
  async getReport(taskId, format = 'json') {
    const response = await fetch(`${API_BASE}/${taskId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取报告失败');
    }

    if (format === 'markdown') {
      return response.text();
    }

    return response.json();
  },

  /**
   * 轮询进度直到完成
   * @param {string} taskId 
   * @param {Function} onProgress - 进度回调
   * @param {Function} onComplete - 完成回调
   * @param {Function} onError - 错误回调
   * @returns {Promise<Object>}
   */
  async pollUntilComplete(taskId, onProgress, onComplete, onError) {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const data = await this.getProgress(taskId);

          if (onProgress) {
            onProgress(data);
          }

          if (data.status === 'completed') {
            if (onComplete) {
              onComplete(data);
            }
            resolve(data);
          } else if (data.status === 'error') {
            const error = new Error(data.error || '评估出错');
            if (onError) {
              onError(error);
            }
            reject(error);
          } else if (data.status === 'cancelled') {
            const error = new Error('评估已取消');
            if (onError) {
              onError(error);
            }
            reject(error);
          } else {
            // 继续轮询
            setTimeout(poll, 1000);
          }
        } catch (error) {
          if (onError) {
            onError(error);
          }
          reject(error);
        }
      };

      poll();
    });
  }
};

export default EstimationService;
