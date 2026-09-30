// frontend/src/components/common/AIMarkdownRenderer.tsx
import React, { useState } from 'react';
import { Copy, Check, Terminal, Lightbulb, BookOpen, CheckCircle, HelpCircle } from 'lucide-react';

interface AIMarkdownRendererProps {
  content: string;
}

export const AIMarkdownRenderer: React.FC<AIMarkdownRendererProps> = ({ content }) => {
  // Split into code blocks vs non-code blocks
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="ai-markdown-content space-y-3 text-xs leading-relaxed text-slate-800">
      {segments.map((segment, segIdx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          return <CodeBlock key={segIdx} rawBlock={segment} />;
        }
        return <TextAndTableSegment key={segIdx} rawText={segment} />;
      })}
    </div>
  );
};

/**
 * Fenced Code Block with Copy action and language badge
 */
const CodeBlock: React.FC<{ rawBlock: string }> = ({ rawBlock }) => {
  const [copied, setCopied] = useState(false);

  const clean = rawBlock.slice(3, -3).trim();
  const firstLineBreak = clean.indexOf('\n');
  let language = '';
  let code = clean;

  if (firstLineBreak !== -1) {
    const potentialLang = clean.slice(0, firstLineBreak).trim();
    if (/^[a-zA-Z0-9_+#-]+$/.test(potentialLang)) {
      language = potentialLang;
      code = clean.slice(firstLineBreak + 1);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3.5 py-1.5 text-[11px] text-slate-400">
        <div className="flex items-center space-x-1.5 font-mono">
          <Terminal className="h-3.5 w-3.5 text-brand-400" />
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            {language || 'code'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[11.5px] leading-relaxed text-slate-100 select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * Handles regular markdown text, headers, lists, callout sections, and tables
 */
const TextAndTableSegment: React.FC<{ rawText: string }> = ({ rawText }) => {
  const lines = rawText.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];

  const flushTable = (keyPrefix: number) => {
    if (tableBuffer.length > 0) {
      elements.push(<MarkdownTable key={`table-${keyPrefix}`} rows={tableBuffer} />);
      tableBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');

    if (isTableRow) {
      tableBuffer.push(line.trim());
      continue;
    } else {
      flushTable(i);
    }

    // Skip empty consecutive lines
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-1.5" />);
      continue;
    }

    // Heading 3: "### Heading Name"
    if (line.startsWith('### ')) {
      const headingText = line.replace('### ', '').trim();
      elements.push(<SectionHeading key={`h3-${i}`} title={headingText} />);
      continue;
    }

    // Heading 2: "## Heading Name"
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="font-bold text-slate-900 text-sm mt-3 mb-1 border-b border-slate-100 pb-1">
          {renderFormattedInline(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    // Heading 1: "# Heading Name"
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="font-bold text-slate-900 text-base mt-3 mb-1.5">
          {renderFormattedInline(line.replace('# ', ''))}
        </h2>
      );
      continue;
    }

    // Bullet item: "* " or "- "
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const itemText = line.trim().slice(2);
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start space-x-2 my-1 pl-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
          <div className="flex-1 text-slate-700 leading-relaxed">
            {renderFormattedInline(itemText)}
          </div>
        </div>
      );
      continue;
    }

    // Numbered item: "1. ", "2. ", etc.
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start space-x-2 my-1 pl-1">
          <span className="font-bold text-brand-600 shrink-0 text-[11px] mt-0.5">
            {numMatch[1]}.
          </span>
          <div className="flex-1 text-slate-700 leading-relaxed">
            {renderFormattedInline(numMatch[2])}
          </div>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-slate-700 leading-relaxed my-0.5">
        {renderFormattedInline(line)}
      </p>
    );
  }

  flushTable(lines.length);

  return <>{elements}</>;
};

/**
 * Section headings with distinct icons and pedagogical badges
 */
const SectionHeading: React.FC<{ title: string }> = ({ title }) => {
  const lower = title.toLowerCase();

  if (lower.includes('short answer')) {
    return (
      <div className="flex items-center space-x-2 mt-3 mb-1 text-brand-700 font-bold text-xs uppercase tracking-wide">
        <Lightbulb className="h-4 w-4 text-brand-600 shrink-0" />
        <span>Short Answer</span>
      </div>
    );
  }

  if (lower.includes('key difference') || lower.includes('comparison')) {
    return (
      <div className="flex items-center space-x-2 mt-3.5 mb-1.5 text-indigo-700 font-bold text-xs uppercase tracking-wide">
        <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
        <span>Key Difference</span>
      </div>
    );
  }

  if (lower.includes('exam point') || lower.includes('exam tip')) {
    return (
      <div className="flex items-center space-x-2 mt-3 mb-1 text-amber-700 font-bold text-xs uppercase tracking-wide">
        <CheckCircle className="h-4 w-4 text-amber-600 shrink-0" />
        <span>Important Exam Points</span>
      </div>
    );
  }

  if (lower.includes('quick revision') || lower.includes('summary')) {
    return (
      <div className="flex items-center space-x-2 mt-3 mb-1 text-emerald-700 font-bold text-xs uppercase tracking-wide">
        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Quick Revision</span>
      </div>
    );
  }

  return (
    <h4 className="font-bold text-slate-900 text-xs mt-3 mb-1 flex items-center space-x-1.5">
      <span className="h-2 w-1 bg-brand-500 rounded-full" />
      <span>{title}</span>
    </h4>
  );
};

/**
 * Markdown Table component with responsive container and alternating rows
 */
const MarkdownTable: React.FC<{ rows: string[] }> = ({ rows }) => {
  if (rows.length < 2) return null;

  const parseCells = (row: string) => {
    return row
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim());
  };

  const headerCells = parseCells(rows[0]);
  // Row 1 is usually the separator line |---|---|
  const dataRows = rows.slice(2).map(parseCells);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11.5px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-800 font-bold">
              {headerCells.map((h, idx) => (
                <th key={idx} className="px-3.5 py-2 text-xs font-semibold">
                  {renderFormattedInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dataRows.map((r, rIdx) => (
              <tr
                key={rIdx}
                className={rIdx % 2 === 0 ? 'bg-white hover:bg-slate-50/80 transition' : 'bg-slate-50/50 hover:bg-slate-100/60 transition'}
              >
                {r.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-slate-700">
                    {renderFormattedInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and clean arrows
 */
function renderFormattedInline(text: string): React.ReactNode {
  // Normalize math arrows if any: $\rightarrow$ or -> to →
  let cleaned = text.replace(/\$\\rightarrow\$/g, '→').replace(/->/g, '→');

  // Tokenize bold, italic, code
  const tokens = cleaned.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return tokens.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10.5px] text-brand-700 border border-slate-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
