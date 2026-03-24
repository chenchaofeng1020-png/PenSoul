import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MermaidRenderer } from './MermaidRenderer';

function splitTableRow(line) {
  const normalized = String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '');
  return normalized.split('|').map(cell => cell.trim());
}

function isTableSeparatorLine(line) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line || '');
}

function parseMarkdownTable(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    return null;
  }

  const header = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow).filter(row => row.some(Boolean));

  if (!header.length || !rows.length) {
    return null;
  }

  return { header, rows };
}

function buildSegments(rawContent) {
  const lines = String(rawContent || '').split('\n');
  const segments = [];
  let markdownBuffer = [];
  let index = 0;

  const flushMarkdown = () => {
    const content = markdownBuffer.join('\n').trim();
    if (content) {
      segments.push({ type: 'markdown', content });
    }
    markdownBuffer = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (/^```mermaid\s*$/i.test(trimmed)) {
      flushMarkdown();
      index += 1;
      const mermaidLines = [];
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        mermaidLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      segments.push({ type: 'mermaid', content: mermaidLines.join('\n').trim() });
      continue;
    }

    const nextLine = lines[index + 1];
    if (line.includes('|') && isTableSeparatorLine(nextLine)) {
      flushMarkdown();
      const tableLines = [line, nextLine];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        segments.push({ type: 'table', ...table });
      } else {
        markdownBuffer.push(...tableLines);
      }
      continue;
    }

    markdownBuffer.push(line);
    index += 1;
  }

  flushMarkdown();
  return segments;
}

function normalizeSectionMarkdown(content, sectionTitle = '') {
  if (!content) {
    return '';
  }

  const normalizedTitle = String(sectionTitle || '').replace(/\s+/g, '').trim();
  const lines = String(content).split('\n');
  const firstMeaningfulIndex = lines.findIndex(line => line.trim());

  if (firstMeaningfulIndex === -1) {
    return String(content).trim();
  }

  const normalizedHeading = lines[firstMeaningfulIndex]
    .trim()
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, '')
    .trim();

  if (normalizedTitle && normalizedHeading === normalizedTitle) {
    lines.splice(firstMeaningfulIndex, 1);
  }

  return lines.join('\n').trim();
}

function isWireframePrototypeBlock(content = '', className = '') {
  const normalized = String(content || '');
  const language = String(className || '');
  const lineCount = normalized.split('\n').filter(line => line.trim()).length;
  const hasWireframeGlyphs = /[+|┌┐└┘├┤┬┴│─]/.test(normalized);
  const hasLongHorizontalRules = /[-─=]{8,}/.test(normalized);
  const hasPrototypeKeywords = (
    normalized.includes('页面标题') ||
    normalized.includes('主内容区') ||
    normalized.includes('筛选区') ||
    normalized.includes('底部/弹窗/抽屉入口') ||
    normalized.includes('导航栏') ||
    normalized.includes('搜索栏') ||
    normalized.includes('功能入口') ||
    normalized.includes('Tab Bar') ||
    normalized.includes('布局结构') ||
    normalized.includes('页面原型') ||
    normalized.includes('原型草图')
  );

  return (
    (/language-text/.test(language) || language === '') &&
    lineCount >= 4 &&
    (
      hasPrototypeKeywords ||
      (hasWireframeGlyphs && hasLongHorizontalRules)
    )
  );
}

function PrototypeWireframe({ content }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">页面原型</span>
      </div>
      <div className="bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] p-4">
        <pre className="overflow-x-auto rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-[12px] leading-6 text-slate-800 shadow-inner">
          {content}
        </pre>
      </div>
    </div>
  );
}

function extractCodeBlockMetaFromPre(children) {
  const child = Array.isArray(children) ? children[0] : children;

  if (!child?.props) {
    return { className: '', content: '' };
  }

  return {
    className: String(child.props.className || ''),
    content: String(child.props.children || '').replace(/\n$/, '')
  };
}

export function StructuredMarkdownContent({ content, sectionTitle = '', dense = false }) {
  const normalizedContent = normalizeSectionMarkdown(content, sectionTitle);
  const segments = buildSegments(normalizedContent);

  return (
    <div className="space-y-4">
      {segments.map((segment, index) => {
        if (segment.type === 'mermaid') {
          return (
            <MermaidRenderer
              key={`mermaid-${index}`}
              code={segment.content}
              title="图示"
            />
          );
        }

        if (segment.type === 'table') {
          return (
            <div key={`table-${index}`} className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {segment.header.map((cell, cellIndex) => (
                      <th
                        key={`th-${cellIndex}`}
                        className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap"
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {segment.rows.map((row, rowIndex) => (
                    <tr key={`tr-${rowIndex}`} className="align-top">
                      {segment.header.map((_, cellIndex) => (
                        <td key={`td-${rowIndex}-${cellIndex}`} className="px-3 py-2 leading-6 text-slate-700">
                          {row[cellIndex] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <div
            key={`markdown-${index}`}
            className={[
              'prose max-w-none text-slate-700 prose-headings:text-slate-900 prose-headings:font-semibold prose-strong:text-slate-900 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-blockquote:border-slate-300 prose-blockquote:text-slate-600',
              dense
                ? 'prose-sm prose-h2:mt-0 prose-h2:mb-3 prose-h2:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-sm prose-p:my-2 prose-p:leading-7 prose-ul:my-3 prose-ul:pl-5 prose-ol:my-3 prose-ol:pl-5 prose-li:my-1 prose-li:leading-7'
                : 'prose-sm prose-h2:mt-0 prose-h2:mb-3 prose-h2:text-base prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-sm prose-p:my-2 prose-p:leading-7 prose-ul:my-3 prose-ul:pl-5 prose-ol:my-3 prose-ol:pl-5 prose-li:my-1 prose-li:leading-7'
            ].join(' ')}
          >
            <ReactMarkdown
              components={{
                pre({ children }) {
                  const { className, content } = extractCodeBlockMetaFromPre(children);

                  if (isWireframePrototypeBlock(content, className)) {
                    return <PrototypeWireframe content={content} />;
                  }

                  return <pre>{children}</pre>;
                },
                code({ inline, className, children, ...props }) {
                  const codeContent = String(children || '').replace(/\n$/, '');

                  if (!inline && isWireframePrototypeBlock(codeContent, className)) {
                    return (
                      <code className="hidden" {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {segment.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
