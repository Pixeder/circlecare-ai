import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Wrench, Mic, MicOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendAgentChat } from '../services/api';

export default function AgentChat({ onToolActionCompleted }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello Eleanor! I am your CareCircle AI healthcare companion powered by Mistral Large. I can check your medication schedule, log your pills, search your medical history, or alert your daughter Sarah. How can I assist you right now?",
      toolCalls: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const chatBottomRef = useRef(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend = input, confirmedList = []) => {
    const text = textToSend.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setLoading(true);
    setPendingConfirmation(null);

    try {
      const response = await sendAgentChat(text, newHistory, confirmedList);
      const agentData = response.data;

      const assistantMsg = {
        role: 'assistant',
        content: agentData.content,
        toolCalls: agentData.toolCalls || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (agentData.requiresConfirmation && agentData.pendingAction) {
        setPendingConfirmation(agentData.pendingAction);
      }

      if (agentData.toolCalls && agentData.toolCalls.length > 0 && onToolActionCompleted) {
        onToolActionCompleted(agentData.toolCalls);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I encountered an issue connecting with the healthcare agent: ${err.message}. Please ensure the backend server is running.`,
          toolCalls: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPending = () => {
    if (!pendingConfirmation) return;
    const toolName = pendingConfirmation.toolName;
    handleSend(`Yes, I confirm proceeding with ${toolName}`, [toolName]);
    setPendingConfirmation(null);
  };

  // Voice recognition toggle for elderly accessibility
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    if (!isListening) {
      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsListening(false);
    }
  };

  const quickPills = [
    'What medicines should I take today?',
    'Which medicines are running low?',
    'Show my previous prescriptions.',
    'Prepare a summary for my next doctor visit.',
    'Schedule an appointment for next Monday.',
    'Notify my caregiver that I missed my medication.',
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[680px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">CareCircle AI Healthcare Assistant</h2>
            <p className="text-xs text-slate-500">NVIDIA NIM • Tool-Augmented Healthcare Agent</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-semibold text-emerald-700">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div key={index} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Tool calls execution chip */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="space-y-1">
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg border border-slate-200 font-mono"
                      >
                        <Wrench className="w-3 h-3 text-emerald-600" />
                        <span>Executed: {tc.toolName}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-3 text-slate-500 text-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bot className="w-5 h-5 animate-spin" />
            </div>
            <span>Agent is consulting medical tools & reasoning...</span>
          </div>
        )}

        {/* Confirmation Banner for Consequential Actions */}
        {pendingConfirmation && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Consequential Action Confirmation Needed</span>
            </div>
            <p className="text-xs text-amber-800">
              The agent wants to execute <strong>{pendingConfirmation.toolName}</strong>. Do you authorize this action?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmPending}
                className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-700 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Authorize & Proceed
              </button>
              <button
                onClick={() => setPendingConfirmation(null)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Quick Prompt Pills */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap bg-slate-50/50">
        <span className="text-slate-400 font-medium">Try:</span>
        {quickPills.map((pill, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(pill)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 transition shrink-0"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200 flex items-center space-x-2 bg-white rounded-b-2xl"
      >
        <button
          type="button"
          onClick={toggleVoice}
          className={`p-2.5 rounded-xl border transition ${
            isListening
              ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
          }`}
          title="Voice input"
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask CareCircle (e.g., 'What are my meds today?' or 'I took my Metformin')"
          className="flex-1 py-2.5 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
