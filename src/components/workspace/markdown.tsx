'use client';

import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

function CodeBlock({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'text';
  const codeText = extractText(children);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="code-block-wrapper group">
      <div className="code-block-header">
        <span className="font-mono uppercase tracking-wide">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
          type="button"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="code-block-content scrollbar-thin">
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return '';
}

const Markdown = memo(function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose-chat', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }], rehypeKatex]}
        components={{
          code({ className: cls, children, ...rest }) {
            // Inline code is anything without a language- class
            const isBlock = /language-/.test(cls || '') || String(children).includes('\n');
            if (!isBlock) {
              return (
                <code className={cls} {...rest}>
                  {children}
                </code>
              );
            }
            return <CodeBlock className={cls} {...rest}>{children}</CodeBlock>;
          },
          pre({ children }) {
            // The CodeBlock renders its own container — unwrap the default <pre>
            return <>{children}</>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default Markdown;
