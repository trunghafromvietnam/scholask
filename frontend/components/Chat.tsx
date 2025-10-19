"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowUp, Copy, RotateCcw, Bot, Check } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useConnectivity } from "@/lib/net";
import { ask } from "@/lib/api";

type MessageSource = { i: number; text?: string; url?: string };
type Message = { id: string; role: 'user' | 'assistant'; content: string; sources?: MessageSource[] };

export default function Chat({ school }: { school: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status, baseUrl, canSend, enqueue, readQueue, clearQueue, setQueueKey } = useConnectivity();
  useEffect(() => { setQueueKey(`chat:${school}`); }, [school, setQueueKey]);


  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const prettySchool = useMemo(() =>
    school.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    [school]
  );
  const initialGreeting = `Hi! How can I help you with ${prettySchool} today?`;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const handleSend = useCallback(async (questionToSend: string) => {
    const userMessage = questionToSend.trim();
    if (!userMessage || isLoading) return;

    setError(null);
    const newMessage = { id: `user-${Date.now()}`, role: 'user' as const, content: userMessage };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    if (!canSend) {
      enqueue(userMessage); // chỉ enqueue string
      const info = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: "_(Queued. Will send when connection is back.)_",
      };
      setMessages(prev => [...prev, info]);
      return; // không set isLoading
    }

    setIsLoading(true);
    try {
      const response = await ask(school, userMessage, baseUrl);
      if (!response || typeof response.answer !== 'string') throw new Error("Invalid response.");

      if (response.answer.includes("Sorry, I'm having trouble") || response.answer.includes("Failed to process")) {
        setError(response.answer);
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: response.answer,
        sources: response.sources
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e:any) {
      console.error("Chat API Error:", e);
      setError("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [school, isLoading, canSend, baseUrl, enqueue]);

  useEffect(() => {
    async function flush() {
      if (!canSend || !baseUrl) return;

      const qs = readQueue();  // đọc toàn bộ queue (mình đã setQueueKey theo school ở effect trên)
      if (!qs.length) return;

      clearQueue(); // xoá queue trước để tránh vòng lặp vô tận
      for (const q of qs) {
        try {
          const response = await ask(school, q, baseUrl);
          const answer = response?.answer ?? "";
          const sources = response?.sources ?? [];
          if (answer) {
            setMessages(prev => [
              ...prev,
              { id: `assistant-${Date.now()}`, role: 'assistant', content: answer, sources }
            ]);
          }
        } catch (e) {
          console.error("Flush failed:", e);
          // Nếu call lỗi giữa chừng, re-queue lại câu chưa gửi và dừng. Lần poll sau sẽ thử lại.
          enqueue(q);
          break;
        }
      }
    }
    flush();
  }, [canSend, baseUrl, school, readQueue, clearQueue, enqueue]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSend(input);
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    const maxHeight = 120;
    target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
    setInput(target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.14))] relative bg-white overflow-hidden">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto pb-32 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-transparent ${
          messages.length === 0 ? 'flex items-center justify-center' : ''
        }`}
      >
        <div className="w-full max-w-4xl mx-auto">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center text-center px-4"
              >
                <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Bot size={32} className="text-blue-600"/>
                </div>
                <div className="text-3xl font-semibold text-gray-800 mb-3 h-10 overflow-hidden">
                  {typeof window !== 'undefined' ? (
                    <TypeAnimation 
                      sequence={[initialGreeting, 5000]} 
                      wrapper="h1" 
                      speed={65} 
                      cursor={false} 
                      repeat={0} 
                    />
                  ) : (
                    <h1>{initialGreeting}</h1>
                  )}
                </div>
                <p className="text-gray-500 text-lg mb-12">
                  Ask me anything about {prettySchool}
                </p>
                
                {/* Centered Input when no messages */}
                <div className="w-full max-w-3xl">
                  <form onSubmit={handleSubmit} className="relative">
                    <div className="relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${prettySchool}...`}
                        rows={1}
                        className="w-full resize-none outline-none border border-gray-300 bg-white rounded-2xl py-4 px-5 pr-16 text-base placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 overflow-y-auto max-h-32 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                        style={{ boxSizing: 'border-box' }}
                        disabled={isLoading}
                        aria-label="Chat input"
                      />
                      
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isLoading || !input.trim()
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
                        }`}
                        title="Send message"
                        aria-label="Send message"
                      >
                        {isLoading ? (
                          <RotateCcw size={16} className="animate-spin" />
                        ) : (
                          <ArrowUp size={16} />
                        )}
                      </button>
                    </div>
                  </form>
                  
                  <p className="text-center text-sm text-gray-400 mt-4">
                    AI may produce inaccurate information about people, places, or facts.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="w-full py-6">
                {messages.map((msg) => (
                  <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  layout
                  className="w-full py-4"
                >
                  <div className="max-w-4xl mx-auto px-4 md:px-6">
                    <div className={`flex gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl ${
                        msg.role === 'user' 
                          ? 'bg-blue-50 text-white px-4 py-3 rounded-2xl rounded-tr-sm rounded-br-xl rounded-bl-2xl shadow-sm' 
                          : 'px-4 py-3'
                      }`}>
                        <div className={`w-full max-w-none markdown-body ${
                          msg.role === 'user' ? 'text-black' : 'text-gray-900'
                        }`}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            components={{ 
                              a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" className={
                                msg.role === 'user' 
                                  ? 'text-blue-200 hover:text-blue-100 underline' 
                                  : 'text-blue-600 hover:text-blue-700 underline'
                              }/>,
                              code: ({className, children, ...props}: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const isInline = !className?.includes('language-');
                                
                                return !isInline && match ? (
                                  <pre className={`${
                                    msg.role === 'user' 
                                      ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30' 
                                      : 'bg-gray-900 text-gray-100'
                                  } p-4 rounded-lg overflow-x-auto text-sm font-mono`}>
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                ) : (
                                  <code className={`${
                                    msg.role === 'user'
                                      ? 'bg-blue-600/30 text-blue-100'
                                      : 'bg-gray-100 text-gray-800'
                                  } px-1.5 py-0.5 rounded text-sm font-mono`} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              pre: ({children, ...props}: any) => <div {...props}>{children}</div>,
                              p: (props: any) => <p className="my-3 leading-relaxed" {...props} />,
                              h1: (props: any) => <h1 className="text-2xl font-bold my-4" {...props} />,
                              h2: (props: any) => <h2 className="text-xl font-bold my-3" {...props} />,
                              h3: (props: any) => <h3 className="text-lg font-bold my-3" {...props} />,
                              ul: (props: any) => <ul className="my-3 pl-6 list-disc" {...props} />,
                              ol: (props: any) => <ol className="my-3 pl-6 list-decimal" {...props} />,
                              li: (props: any) => <li className="my-1" {...props} />,
                              blockquote: (props: any) => <blockquote className={`${
                                msg.role === 'user'
                                  ? 'border-l-blue-300 bg-blue-600/20'
                                  : 'border-l-blue-400 bg-gray-50'
                              } border-l-4 pl-4 py-2 my-3 italic`} {...props} />,
                              table: (props: any) => <table className="w-full border-collapse border border-gray-300 my-3" {...props} />,
                              th: (props: any) => <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold" {...props} />,
                              td: (props: any) => <td className="border border-gray-300 px-3 py-2" {...props} />,
                              strong: (props: any) => <strong className="font-semibold" {...props} />,
                              em: (props: any) => <em className="italic" {...props} />
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                
                        {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-2 items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Sources:
                            </span>
                            {msg.sources.map((s, idx) => (
                              <span 
                                key={idx}
                                className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                                title={s.text || s.url || `Source ${s.i + 1}`}
                              >
                                #{s.i + 1}
                              </span>
                            ))}
                          </div>
                        )}
                
                        {/* Copy Button for assistant messages */}
                        {msg.role === 'assistant' && msg.content && !isLoading && (
                          <button
                            onClick={() => handleCopyToClipboard(msg.content, msg.id)}
                            className={`mt-3 w-8 h-8 border rounded-lg flex items-center justify-center transition-all shadow-sm hover:bg-gray-50 ${
                              copiedMessageId === msg.id 
                                ? "bg-green-50 border-green-200 text-green-600" 
                                : "bg-white border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-300"
                            }`}
                          >
                            {copiedMessageId === msg.id ? (
                              <Check size={14} className="text-green-600" />
                            ) : (
                              <Copy size={14} className="text-gray-600" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div 
                    layout 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="w-full bg-white py-4"
                  >
                    <div className="max-w-4xl mx-auto px-4 md:px-6">
                      <div className="flex gap-6 justify-start">
                        <div className="max-w-3xl">
                          <div className="flex items-center gap-3 text-gray-500">
                            <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce delay-300"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {error && (
                  <motion.div 
                    layout 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm mx-auto max-w-3xl my-4 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Input Area when conversation started */}
      {messages.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-white/80 backdrop-blur-sm pt-8 pb-4">
          <div className="max-w-3xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${prettySchool}...`}
                rows={1}
                className="w-full resize-none outline-none border border-gray-300 bg-white rounded-2xl py-4 px-5 pr-16 text-base placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 overflow-hidden disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                style={{ boxSizing: 'border-box' }}
                disabled={isLoading}
                aria-label="Chat input"
              />
              
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isLoading || !input.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
                }`}
                title="Send message"
                aria-label="Send message"
              >
                {isLoading ? (
                  <RotateCcw size={16} className="animate-spin" />
                ) : (
                  <ArrowUp size={16} />
                )}
              </button>
            </div>
          </form>
            
            <p className="text-center text-sm text-gray-400 mt-3">
              AI may produce inaccurate information about people, places, or facts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
