import { useEffect, useState, useRef } from 'react';

export const LoadingIndicator: React.FC = () => {
  const [activeCount, setActiveCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    (XMLHttpRequest.prototype as any).open = function (this: XMLHttpRequest, ...args: any[]) {
      this.addEventListener('loadend', () => {
        countRef.current = Math.max(0, countRef.current - 1);
        setActiveCount(countRef.current);
      });
      return origOpen.apply(this, args as any);
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
      countRef.current++;
      setActiveCount(countRef.current);
      return origSend.call(this, body);
    };

    return () => {
      XMLHttpRequest.prototype.open = origOpen;
      XMLHttpRequest.prototype.send = origSend;
    };
  }, []);

  if (activeCount === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-white/90 backdrop-blur-sm shadow-lg rounded-full px-3 py-2 border border-gray-200"
      role="status"
      aria-label="Loading content"
    >
      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-gray-600 font-medium">Loading...</span>
    </div>
  );
};
