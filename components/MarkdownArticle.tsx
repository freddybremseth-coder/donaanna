import React from 'react';

function inlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

const MarkdownArticle: React.FC<{ markdown: string }> = ({ markdown }) => {
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const items = listItems;
    listItems = [];
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-6 list-disc space-y-2 pl-6 text-lg leading-8 text-white/72">
        {items.map((item, index) => (
          <li key={index}>{inlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    flushList();

    if (line.startsWith('### ')) {
      blocks.push(<h3 key={blocks.length} className="mt-10 font-serif text-3xl text-white">{inlineMarkdown(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      blocks.push(<h2 key={blocks.length} className="mt-12 font-serif text-4xl text-white">{inlineMarkdown(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      blocks.push(<h1 key={blocks.length} className="mt-10 font-serif text-5xl text-white">{inlineMarkdown(line.slice(2))}</h1>);
    } else {
      blocks.push(<p key={blocks.length} className="my-5 text-lg leading-8 text-white/72">{inlineMarkdown(line)}</p>);
    }
  }

  flushList();

  return <div>{blocks}</div>;
};

export default MarkdownArticle;
