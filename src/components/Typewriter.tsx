import { useState, useEffect } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export default function Typewriter({ text, speed = 20, onComplete, className = '' }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, isComplete, onComplete]);

  const skipAnimation = () => {
    setDisplayedText(text);
    setCurrentIndex(text.length);
    setIsComplete(true);
    onComplete?.();
  };

  // Parse markdown-like formatting
  const formatText = (input: string) => {
    const lines = input.split('\n');
    
    return lines.map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-bold text-amber-300 mt-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-white">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <p key={i} className="italic text-gray-400">{line.replace(/\*/g, '')}</p>;
      }
      if (line.startsWith('- ')) {
        return <p key={i} className="text-gray-300 pl-3">• {line.replace('- ', '')}</p>;
      }
      if (line.trim() === '') return <br key={i} />;
      
      // Handle inline formatting
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-gray-400 italic">$1</em>');
      
      return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className={className} onClick={!isComplete ? skipAnimation : undefined}>
      <div className="text-gray-200 text-sm leading-relaxed space-y-2">
        {formatText(displayedText)}
        {!isComplete && (
          <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
        )}
      </div>
      {!isComplete && (
        <div className="text-xs text-gray-500 mt-2 italic">
          Click to skip animation...
        </div>
      )}
    </div>
  );
}
