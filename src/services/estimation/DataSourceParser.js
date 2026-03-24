/**
 * 数据源解析器
 * 解析各种格式的需求文档，提取功能列表
 */

import { FunctionItem } from '../../utils/estimationTypes.js';

export class DataSourceParser {
  constructor() {
    this.parsers = {
      'text/markdown': this.parseMarkdown.bind(this),
      'text/plain': this.parseText.bind(this),
      'text/csv': this.parseCSV.bind(this),
      'application/json': this.parseJSON.bind(this),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': this.parseExcel.bind(this),
      'application/vnd.ms-excel': this.parseExcel.bind(this)
    };
  }

  /**
   * 解析数据源
   * @param {Array} sources - 数据源列表
   * @returns {Array<FunctionItem>} 功能列表
   */
  async parseSources(sources) {
    const allFunctions = [];
    
    for (const source of sources) {
      try {
        const functions = await this.parseSource(source);
        allFunctions.push(...functions);
      } catch (error) {
        console.error(`[DataSourceParser] Failed to parse source ${source.file_name}:`, error);
      }
    }

    // 去重（根据功能名称）
    const uniqueFunctions = this.deduplicateFunctions(allFunctions);
    
    // 分配 ID
    return uniqueFunctions.map((f, idx) => ({
      ...f,
      id: `func_${Date.now()}_${idx}`
    }));
  }

  /**
   * 解析单个数据源
   */
  async parseSource(source) {
    const { content, file_type, file_name } = source;

    console.log(`[DataSourceParser] Parsing source: ${file_name}, type: ${file_type}`);

    if (!content) {
      console.warn(`[DataSourceParser] Empty content for ${file_name}`);
      return [];
    }

    // 根据文件类型选择解析器
    const mimeType = this.getMimeType(file_type, file_name);
    console.log(`[DataSourceParser] MIME type: ${mimeType}`);

    const parser = this.parsers[mimeType] || this.parseText;
    console.log(`[DataSourceParser] Using parser: ${parser.name || 'parseText'}`);

    const result = parser(content, file_name);
    console.log(`[DataSourceParser] Parsed ${result.length} functions`);

    return result;
  }

  /**
   * 获取 MIME 类型
   */
  getMimeType(fileType, fileName) {
    // 扩展名到 MIME 类型的映射
    const extToMime = {
      'md': 'text/markdown',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'json': 'application/json',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel'
    };

    // 如果 fileType 是扩展名（如 'csv'），转换为 MIME 类型
    if (fileType && extToMime[fileType.toLowerCase()]) {
      return extToMime[fileType.toLowerCase()];
    }

    // 如果 fileType 已经是 MIME 类型，直接返回
    if (fileType && fileType.includes('/')) {
      return fileType;
    }

    // 从文件名推断
    const ext = fileName?.split('.').pop()?.toLowerCase();
    return extToMime[ext] || 'text/plain';
  }

  /**
   * 解析 Markdown 格式
   * 支持从标题和列表中提取功能点，支持多行描述
   */
  parseMarkdown(content, fileName) {
    const functions = [];
    const lines = content.split('\n');
    let currentModule = '';
    let currentFunction = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 识别模块标题（## 或 ### 开头）
      const moduleMatch = line.match(/^#{2,3}\s+(.+)$/);
      if (moduleMatch) {
        // 保存上一个功能
        if (currentFunction) {
          functions.push(currentFunction);
          currentFunction = null;
        }
        currentModule = moduleMatch[1].trim();
        continue;
      }

      // 识别功能点（- 或 * 或 数字. 开头）
      const funcMatch = line.match(/^[-*\d]+\.?\s+(.+)$/);
      if (funcMatch) {
        // 保存上一个功能
        if (currentFunction) {
          functions.push(currentFunction);
        }

        const funcText = funcMatch[1].trim();
        const parsed = this.parseFunctionText(funcText);

        if (parsed.name) {
          currentFunction = {
            ...parsed,
            module: parsed.module || currentModule || this.extractModuleFromFileName(fileName)
          };
        }
      } else if (currentFunction && line && !line.match(/^#{1,3}\s+/)) {
        // 当前行不是新标题、不是空行，可能是多行描述的延续
        // 检查是否是缩进的描述行（以空格开头或以-、*、数字开头的子项）
        const originalLine = lines[i];
        if (originalLine.match(/^(\s+)[-*\d]/) || originalLine.match(/^\s+/)) {
          // 这是子项或缩进描述，追加到当前功能的描述
          if (currentFunction.description) {
            currentFunction.description += '\n' + line;
          } else {
            currentFunction.description = line;
          }
        } else if (!line.match(/^[-*\d]+\.?\s+/) && line.length > 0) {
          // 非列表项的普通文本，也追加到描述
          if (currentFunction.description) {
            currentFunction.description += '\n' + line;
          } else {
            currentFunction.description = line;
          }
        }
      }
    }

    // 保存最后一个功能
    if (currentFunction) {
      functions.push(currentFunction);
    }

    return functions;
  }

  /**
   * 解析纯文本格式，支持多行描述
   */
  parseText(content, fileName) {
    const functions = [];
    const lines = content.split('\n');
    let currentModule = '';
    let currentFunction = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 尝试识别模块标题（以【】或[]或：结尾的行）
      const moduleMatch = trimmed.match(/^【(.+)】$/) ||
                         trimmed.match(/^\[(.+)\]$/) ||
                         trimmed.match(/^(.+)[:：]$/);

      if (moduleMatch && !trimmed.includes('.') && trimmed.length < 50) {
        // 保存上一个功能
        if (currentFunction) {
          functions.push(currentFunction);
          currentFunction = null;
        }
        currentModule = moduleMatch[1].trim();
        continue;
      }

      // 识别功能点（以 - 或 * 或 数字. 开头）
      const funcMatch = trimmed.match(/^[-*\d]+\.?\s+(.+)$/);
      if (funcMatch) {
        // 保存上一个功能
        if (currentFunction) {
          functions.push(currentFunction);
        }

        const funcText = funcMatch[1].trim();
        const parsed = this.parseFunctionText(funcText);

        if (parsed.name && parsed.name.length > 0) {
          currentFunction = {
            ...parsed,
            module: parsed.module || currentModule || this.extractModuleFromFileName(fileName)
          };
        }
      } else if (currentFunction && trimmed.length > 0) {
        // 当前行不是新功能点，可能是多行描述的延续
        // 检查是否是缩进的描述行
        if (line.match(/^(\s+)[-*\d]/) || line.match(/^\s+/)) {
          // 这是子项或缩进描述，追加到当前功能的描述
          if (currentFunction.description) {
            currentFunction.description += '\n' + trimmed;
          } else {
            currentFunction.description = trimmed;
          }
        } else if (!trimmed.match(/^[-*\d]+\.?\s+/)) {
          // 非列表项的普通文本，也追加到描述
          if (currentFunction.description) {
            currentFunction.description += '\n' + trimmed;
          } else {
            currentFunction.description = trimmed;
          }
        }
      } else if (!currentFunction && trimmed.length > 2 && trimmed.length < 100 && !trimmed.includes('http')) {
        // 如果没有列表标记，但看起来像功能描述（非URL、长度适中），也尝试解析
        const parsed = this.parseFunctionText(trimmed);
        if (parsed.name && parsed.name.length > 2) {
          currentFunction = {
            ...parsed,
            module: parsed.module || currentModule || this.extractModuleFromFileName(fileName)
          };
        }
      }
    }

    // 保存最后一个功能
    if (currentFunction) {
      functions.push(currentFunction);
    }

    console.log(`[DataSourceParser] Parsed ${functions.length} functions from text`);
    return functions;
  }

  /**
   * 解析 CSV 格式
   * 支持标准CSV和特殊格式（如模块,功能点,功能说明）
   * 支持多行字段（被双引号包裹的字段可以包含换行符）
   */
  parseCSV(content, fileName) {
    const functions = [];

    // 首先处理多行字段 - 将跨行的引号字段合并为单行
    const normalizedContent = this.normalizeCSVContent(content);
    const lines = normalizedContent.split('\n');
    


    if (lines.length < 2) return functions;

    // 解析表头
    const headers = this.parseCSVLine(lines[0]);
    console.log('[DataSourceParser] CSV headers:', headers);

    // 查找列索引 - 扩大关键词范围
    const nameIdx = this.findColumnIndex(headers, [
      '功能', '功能名称', 'name', '功能点', '需求', '需求名称', '功能描述',
      'feature', 'function', 'title', '标题', '名称', '需求点'
    ]);
    const moduleIdx = this.findColumnIndex(headers, [
      '模块', '所属模块', 'module', '分类', 'category', '类别', '分组', 'group'
    ]);
    const descIdx = this.findColumnIndex(headers, [
      '描述', '说明', 'description', '需求描述', '功能描述', '详情', 'detail', '备注', 'note', '功能说明'
    ]);

    console.log('[DataSourceParser] Column indexes:', { nameIdx, moduleIdx, descIdx });

    // 如果没有找到功能名称列，尝试根据表头顺序推断
    // 常见顺序：模块,功能,描述 或 功能,描述
    let effectiveNameIdx = nameIdx;
    let effectiveModuleIdx = moduleIdx;
    let effectiveDescIdx = descIdx;

    if (effectiveNameIdx < 0) {
      // 默认使用第二列（如果表头有3列以上）或第一列
      effectiveNameIdx = headers.length >= 3 ? 1 : 0;
    }
    if (effectiveModuleIdx < 0 && headers.length >= 3) {
      // 如果有3列以上，第一列可能是模块
      effectiveModuleIdx = 0;
    }
    if (effectiveDescIdx < 0) {
      // 使用最后一列作为描述
      effectiveDescIdx = headers.length - 1;
    }

    console.log('[DataSourceParser] Effective indexes:', { effectiveNameIdx, effectiveModuleIdx, effectiveDescIdx });

    // 解析数据行
    let lastModule = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过完全空行
      if (!line) continue;

      const values = this.parseCSVLine(line);

      // 检查功能名称列是否有值
      const nameValue = values[effectiveNameIdx]?.trim();
      const moduleValue = effectiveModuleIdx >= 0 ? values[effectiveModuleIdx]?.trim() : '';
      const descValue = effectiveDescIdx >= 0 ? values[effectiveDescIdx]?.trim() || '' : '';

      if (nameValue) {
        // 创建新功能
        const functionItem = {
          name: nameValue,
          module: moduleValue || lastModule, // 如果模块为空，使用上一个模块
          description: descValue
        };

        functions.push(functionItem);

        // 记住当前模块（用于后续空模块的行）
        if (moduleValue) {
          lastModule = moduleValue;
        }
      }
    }

    // 如果没有模块列，尝试从文件名提取
    if (effectiveModuleIdx < 0) {
      const moduleFromFile = this.extractModuleFromFileName(fileName);
      functions.forEach(f => {
        if (!f.module) f.module = moduleFromFile;
      });
    }

    console.log(`[DataSourceParser] Parsed ${functions.length} functions from CSV`);
    return functions;
  }

  /**
   * 标准化 CSV 内容 - 处理多行字段
   * RFC 4180 标准：引号内的换行符是字段的一部分
   * 将多行字段合并为单行，使用 \\n 作为占位符保留内部的换行符
   */
  normalizeCSVContent(content) {
    // 规范化换行符为 \n
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    let result = '';
    let inQuotes = false;
    let currentLine = '';
    
    const lines = normalized.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 逐字符处理
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          // 检查是否是转义的引号 ""
          if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
            currentLine += '""';  // 保留转义的引号
            j++; // 跳过下一个引号
          } else {
            // 切换引号状态
            inQuotes = !inQuotes;
            currentLine += char;
          }
        } else {
          currentLine += char;
        }
      }
      
      if (inQuotes) {
        // 仍在引号内，说明字段跨行了，使用占位符保留换行符
        currentLine += '\\n';
      } else {
        // 引号已关闭，这是一行完整的记录
        result += currentLine + '\n';
        currentLine = '';
      }
    }

    // 处理最后可能未完成的行
    if (currentLine) {
      result += currentLine;
    }

    return result.trim();
  }

  /**
   * 解析 CSV 行（处理引号）
   * 注意：多行字段中的换行符已被替换为 \\n 占位符
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());

    // 清理字段：移除包裹的引号，保留内部内容，并将 \\n 转换回真正的换行符
    return values.map(v => {
      // 如果字段以 " 开头和结尾，移除它们
      if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
        v = v.slice(1, -1);
      }
      // 将转义的引号 "" 替换为单个 "
      v = v.replace(/""/g, '"');
      // 将 \\n 占位符转换回真正的换行符
      v = v.replace(/\\n/g, '\n');
      return v;
    });
  }

  /**
   * 查找列索引
   */
  findColumnIndex(headers, possibleNames) {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();
      if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 解析 JSON 格式
   */
  parseJSON(content, fileName) {
    try {
      const data = JSON.parse(content);
      
      // 支持数组格式
      if (Array.isArray(data)) {
        return data.map(item => ({
          name: item.name || item.functionName || item.title || '',
          description: item.description || item.desc || '',
          module: item.module || item.category || this.extractModuleFromFileName(fileName)
        })).filter(f => f.name);
      }
      
      // 支持对象格式（包含 functions 数组）
      if (data.functions && Array.isArray(data.functions)) {
        return data.functions.map(item => ({
          name: item.name || item.functionName || '',
          description: item.description || '',
          module: item.module || data.module || this.extractModuleFromFileName(fileName)
        })).filter(f => f.name);
      }
      
      return [];
    } catch (error) {
      console.error('[DataSourceParser] JSON parse error:', error);
      return [];
    }
  }

  /**
   * 解析 Excel 格式
   * 处理前端传来的 Excel base64 数据或尝试解析为 CSV
   */
  parseExcel(content, fileName) {
    // 检查是否是前端传来的标记格式 [EXCEL:filename:base64]
    const excelMatch = content.match(/^\[EXCEL:([^:]+):(.+)\]$/);

    if (excelMatch) {
      // 目前无法在前端直接解析 Excel 二进制数据
      // 返回提示信息，建议用户使用 CSV 格式
      console.warn('[DataSourceParser] Excel binary data not supported, please convert to CSV');
      return [{
        name: '⚠️ 请转换为 CSV 格式',
        description: 'Excel 文件 (.xlsx/.xls) 需要转换为 CSV 格式才能解析。请在 Excel 中选择"另存为" -> "CSV UTF-8 (逗号分隔)"',
        module: '系统提示'
      }];
    }

    // 如果内容看起来像 CSV，尝试用 CSV 解析器
    if (content.includes(',') && content.includes('\n')) {
      return this.parseCSV(content, fileName);
    }

    return [];
  }

  /**
   * 解析功能文本
   * 支持格式："功能名称 - 描述" 或 "功能名称：描述"
   */
  parseFunctionText(text) {
    // 尝试匹配 "功能名 - 描述" 或 "功能名：描述"
    const match = text.match(/^(.+?)[\-:：]\s*(.+)$/);
    
    if (match) {
      return {
        name: match[1].trim(),
        description: match[2].trim()
      };
    }
    
    // 尝试匹配 "【模块】功能名"
    const moduleMatch = text.match(/^【(.+)】\s*(.+)$/);
    if (moduleMatch) {
      return {
        name: moduleMatch[2].trim(),
        module: moduleMatch[1].trim()
      };
    }
    
    // 纯功能名
    return {
      name: text.trim(),
      description: ''
    };
  }

  /**
   * 从文件名提取模块名
   */
  extractModuleFromFileName(fileName) {
    if (!fileName) return '未分类';
    
    // 移除扩展名
    const name = fileName.replace(/\.[^/.]+$/, '');
    
    // 移除常见后缀
    return name
      .replace(/[_-]?(需求|文档|清单|功能|列表|说明)$/i, '')
      .replace(/[_-]/g, ' ')
      .trim() || '未分类';
  }

  /**
   * 功能去重
   */
  deduplicateFunctions(functions) {
    const seen = new Set();
    return functions.filter(f => {
      const key = `${f.module}_${f.name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 预览解析结果
   */
  previewParse(sources) {
    return this.parseSources(sources);
  }
}

// 导出单例
export const dataSourceParser = new DataSourceParser();
export default DataSourceParser;
