import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiService } from '../services/aiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Square, 
  RotateCcw, 
  Copy, 
  Check, 
  Sparkles, 
  Database, 
  ListTodo, 
  Users, 
  AlertCircle, 
  HelpCircle,
  Cpu
} from 'lucide-react';

const STARTER_PROMPTS = [
  {
    title: 'Pending Tasks',
    desc: 'Count and breakdown of all pending items',
    prompt: 'How many tasks are currently pending?',
    icon: ListTodo
  },
  {
    title: 'Executive Summary',
    desc: 'Progress report and completion rates',
    prompt: 'Give me a summary of task progress and completion rates for our team.',
    icon: Sparkles
  },
  {
    title: 'Team Workload',
    desc: 'Analyze tasks assigned per user',
    prompt: 'Which users have the most assigned tasks and what is their current workload?',
    icon: Users
  },
  {
    title: 'Overdue Insights',
    desc: 'Detect delayed tasks and bottlenecks',
    prompt: 'Give me insights about overdue or incomplete tasks requiring attention.',
    icon: AlertCircle
  }
];

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm **Synthie AI**, your intelligent assistant for this Task Management System.\n\nI have direct access to your **PostgreSQL database** to generate reports, calculate metrics, and answer questions based on your team's real-time tasks.\n\nHow can I assist you today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('meta/llama-3.1-8b-instruct');
  const [models, setModels] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load current user from token / localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // Fetch available models from backend
    aiService.getModels()
      .then(res => {
        if (res?.data?.models) {
          setModels(res.data.models);
        }
      })
      .catch(() => {
        // Fallback models
        setModels([
          { id: 'meta/llama-3.1-8b-instruct', name: 'Meta Llama 3.1 8B (Fast NIM)' },
          { id: 'meta/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B (High Intelligence)' },
          { id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash' },
          { id: 'gpt-4o-mini', name: 'OpenAI GPT-4o Mini' }
        ]);
      });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSendMessage = async (textToSend) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isStreaming) return;

    setInput('');

    // Add user message & empty assistant placeholder
    const newMessages = [
      ...messages,
      { role: 'user', content: messageContent }
    ];

    setMessages([
      ...newMessages,
      { role: 'assistant', content: '' }
    ]);

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    let accumulatedText = '';

    await aiService.streamChat({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      model: selectedModel,
      signal: abortControllerRef.current.signal,
      onChunk: (chunk) => {
        accumulatedText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: accumulatedText
          };
          return updated;
        });
      },
      onDone: () => {
        setIsStreaming(false);
      },
      onError: (err) => {
        setIsStreaming(false);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: accumulatedText || `⚠️ **Error:** ${err.message || 'Failed to generate response. Please try again.'}`
          };
          return updated;
        });
      }
    });
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    if (isStreaming) handleStopGeneration();
    setMessages([
      {
        role: 'assistant',
        content: `Conversation reset. How can I help you with your tasks or database reports today?`
      }
    ]);
  };

  const handleRetryLast = () => {
    if (isStreaming || messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Task Assistant</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
              <Database className="h-3 w-3 mr-1" />
              PostgreSQL Grounded
            </Badge>
            {user.role && (
              <Badge variant="secondary" className="uppercase text-xs font-semibold">
                {user.role}
              </Badge>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Real-time multi-tenant data analysis, task intelligence, and workflow synthesis.
          </p>
        </div>

        {/* Model Selector & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1 text-xs border">
            <Cpu className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isStreaming}
              className="bg-transparent text-gray-700 dark:text-gray-200 font-medium focus:outline-none cursor-pointer"
            >
              {models.map(m => (
                <option key={m.id} value={m.id} className="bg-white dark:bg-gray-800">
                  {m.name || m.id}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            disabled={isStreaming || messages.length <= 1}
            title="Start new conversation"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Chat Card */}
      <Card className="h-[calc(100vh-250px)] flex flex-col shadow-sm border">
        {/* Chat Messages Scrollable Box */}
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-3.5 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className={`h-8 w-8 shrink-0 ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
              }`}>
                <AvatarFallback>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>

              <div className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 border rounded-tl-none'
              }`}>
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                ) : (
                  <div className="prose dark:prose-invert prose-sm max-w-none text-sm leading-relaxed">
                    {message.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-3 border rounded-lg">
                              <table className="w-full text-left text-xs border-collapse divide-y divide-gray-200 dark:divide-gray-700" {...props} />
                            </div>
                          ),
                          th: ({ node, ...props }) => (
                            <th className="bg-gray-100 dark:bg-gray-900 px-3 py-2 font-semibold text-gray-700 dark:text-gray-200" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-800" {...props} />
                          ),
                          code: ({ node, inline, ...props }) => (
                            inline ? (
                              <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                            ) : (
                              <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs my-2">
                                <code {...props} />
                              </pre>
                            )
                          )
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="flex items-center gap-1.5 py-1 text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-150" />
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-300" />
                        <span className="text-xs ml-1 font-medium">Analyzing database...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Actions */}
                {message.role === 'assistant' && message.content && !isStreaming && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-3 right-2 flex items-center gap-1 bg-white dark:bg-gray-900 border rounded-md shadow-sm px-1 py-0.5">
                    <button
                      onClick={() => handleCopy(message.content, index)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-700"
                      title="Copy response"
                    >
                      {copiedIndex === index ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                    {index === messages.length - 1 && (
                      <button
                        onClick={handleRetryLast}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-700"
                        title="Regenerate response"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Starter Suggestion Chips (when conversation is fresh) */}
        {messages.length <= 1 && !isStreaming && (
          <div className="px-4 py-2 border-t bg-gray-50/50 dark:bg-gray-900/30">
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Suggested queries based on your database:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {STARTER_PROMPTS.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="text-left p-2.5 rounded-lg border bg-white dark:bg-gray-800 hover:border-blue-500 hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-xs text-gray-800 dark:text-gray-200 group-hover:text-blue-600">
                      <IconComponent className="h-3.5 w-3.5 text-blue-500" />
                      {item.title}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4 border-t flex gap-2 bg-white dark:bg-gray-900 rounded-b-xl"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about tasks, workloads, deadlines, or system reports..."
            disabled={isStreaming}
            className="flex-1 focus-visible:ring-blue-500"
          />

          {isStreaming ? (
            <Button
              type="button"
              onClick={handleStopGeneration}
              variant="destructive"
              className="gap-1.5"
            >
              <Square className="h-4 w-4 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 px-4"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
};

export default AIChat;