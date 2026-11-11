import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Send, Sparkles, AlertCircle, CheckCircle2, XCircle, ArrowRight, CornerDownLeft } from 'lucide-react';
import api from '../../services/api';

export default function AIPilotPage() {
  const location = useLocation();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your PayPilot AI Assistant, powered by Google Gemini. I have real-time visibility into your clients, invoices, receivables, and verified revenue. How can I assist your business today?',
      proposedAction: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    // Check if a prompt was passed in query params
    const params = new URLSearchParams(location.search);
    const initialPrompt = params.get('prompt');
    if (initialPrompt) {
      sendMessage(initialPrompt);
    }
  }, [location.search]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await api.post('/api/ai/chat', { message: text });
      const assistantMessage = {
        role: 'assistant',
        content: response.reply,
        proposedAction: response.proposed_action || null,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an error communicating with the AI service: ' + (err.message || 'Service unavailable'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action, messageIndex) => {
    setExecuting(true);
    try {
      const result = await api.post('/api/ai/actions/execute', action);
      
      // Update message state
      const updated = [...messages];
      updated[messageIndex].proposedAction = {
        ...action,
        executed: true,
        resultMessage: result.message || 'Action executed successfully.',
      };
      setMessages(updated);
    } catch (err) {
      alert('Failed to execute proposed action: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="secondary-page" style={{ maxWidth: '960px', margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: 0 }}>AI Pilot <span>Assistant</span></h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
          Grounded conversational intelligence with verified financial actions.
        </p>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, background: 'var(--bg-card, #FFFFFF)', borderRadius: '18px', border: '1px solid var(--border-color, #E2E8F0)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--aurora-gradient)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                  <Bot size={19} />
                </div>
              )}

              <div
                style={{
                  background: msg.role === 'user' ? 'var(--primary-gradient)' : 'var(--bg-secondary, #F8FAFC)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-main, #0F172A)',
                  padding: '14px 18px',
                  borderRadius: '14px',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-color, #E2E8F0)',
                  boxShadow: msg.role === 'user' ? '0 4px 14px rgba(79, 70, 229, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                {msg.content}

                {/* If AI proposed a mutating action */}
                {msg.proposedAction && (
                  <div style={{ marginTop: '14px', background: '#FFF1F2', borderRadius: '12px', padding: '14px', border: '1px solid #FECDD3', color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E11D48', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                      <Sparkles size={14} /> Action Proposal: {msg.proposedAction.title || 'Financial Action'}
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#475569' }}>
                      {msg.proposedAction.description}
                    </p>

                    {msg.proposedAction.executed ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-success, #10B981)', fontSize: '12px', fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> {msg.proposedAction.resultMessage || 'Executed'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleExecuteAction(msg.proposedAction, idx)}
                          disabled={executing}
                          className="primary-button"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                        >
                          Confirm & Execute
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#4F46E5', fontSize: '13px', padding: '8px 12px' }}>
              <Bot size={18} /> Analyzing business intelligence with Gemini...
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Suggestion Chips */}
        <div style={{ padding: '12px 18px', background: 'var(--bg-secondary, #F8FAFC)', borderTop: '1px solid var(--border-color, #E2E8F0)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            'Show all my overdue invoices',
            'How much revenue did I receive this month?',
            'Which clients have not paid?',
            'Summarize my business performance',
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => sendMessage(prompt)}
              style={{
                whiteSpace: 'nowrap',
                padding: '7px 15px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '12px',
                color: '#4338CA',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-color, #4F46E5)';
                e.currentTarget.style.background = '#EEF2FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color, #CBD5E1)';
                e.currentTarget.style.background = '#FFFFFF';
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          style={{ padding: '16px 18px', borderTop: '1px solid var(--border-color, #E2E8F0)', background: '#FFFFFF', display: 'flex', gap: '10px' }}
        >
          <input
            type="text"
            placeholder="Ask AI about invoices, client revenue, or prepare reminders..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="primary-button"
            style={{ padding: '0 22px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={16} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}

