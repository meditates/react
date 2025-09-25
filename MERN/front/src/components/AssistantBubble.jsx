import React, { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8082';

export default function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [preview, setPreview] = useState(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Start a session on mount
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/assistant/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_book' }),
        });
        const data = await res.json();
        setSessionId(data.session_id);
      } catch (e) {
        // no-op
      }
    })();
  }, []);

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    console.log('SpeechRecognition available:', !!SpeechRecognition);
    
    if (!SpeechRecognition) {
      console.log('Speech recognition not supported in this browser');
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInput((prev) => transcript);
      };
      
      recognition.onend = () => {
        console.log('Recognition ended');
        setListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        setListening(false);
        setMessages((m) => [...m, { role: 'assistant', content: `Speech recognition error: ${event.error}` }]);
      };
      
      recognitionRef.current = recognition;
      console.log('Speech recognition initialized successfully');
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  }, []);

  const toggleListening = () => {
    const recog = recognitionRef.current;
    console.log('toggleListening called, recog:', recog, 'listening:', listening);
    
    if (!recog) {
      console.log('Speech recognition not available');
      setMessages((m) => [...m, { role: 'assistant', content: 'Speech recognition unavailable. Please check browser support or use text input.' }]);
      return;
    }
    
    if (listening) {
      console.log('Stopping recognition');
      recog.stop();
      setListening(false);
    } else {
      console.log('Starting recognition');
      setInput('');
      try {
        recog.start();
        setListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        setMessages((m) => [...m, { role: 'assistant', content: 'Failed to start speech recognition. Try again or use text input.' }]);
      }
    }
  };

  const postMessage = async (text) => {
    // Ensure session exists
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        const res = await fetch(`${API_BASE}/api/assistant/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_book' }),
        });
        if (!res.ok) throw new Error('failed to start session');
        const data = await res.json();
        currentSessionId = data.session_id;
        setSessionId(currentSessionId);
      } catch (e) {
        setMessages((m) => [...m, { role: 'assistant', content: 'Cannot connect to backend. Session creation failed. Ensure server runs on 8082.' }]);
        return null;
      }
    }
    try {
      const res = await fetch(`${API_BASE}/api/assistant/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSessionId, message: text }),
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      // Show backend info message if any
      if (data.message) {
        setMessages((m) => [...m, { role: 'assistant', content: data.message }]);
      }
      // Candidates handling
      if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 1) {
        setCandidates(data.candidates);
      } else {
        setCandidates(null);
      }
      // Confirmation handling
      setNeedsConfirm(!!data.confirmation_needed);
      setPreview(data.preview || null);
      if (data.executed) {
        setMessages((m) => [...m, { role: 'assistant', content: 'Saved to database.' }]);
        // Notify other parts of app
        const isUpdate = data && data.state && data.state.action === 'update_book';
        const detail = { type: isUpdate ? 'updated' : 'created', book: data.result };
        try { window.dispatchEvent(new CustomEvent('books:changed', { detail })); } catch {}
      }
      return data;
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Request failed: cannot reach backend or invalid response.' }]);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    await postMessage(text);
  };

  const selectCandidate = async (index) => {
    const text = `select ${index + 1}`;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    await postMessage(text);
  };

  const confirm = async () => {
    setMessages((m) => [...m, { role: 'user', content: 'confirm' }]);
    const data = await postMessage('confirm');
    if (data && data.executed) {
      setNeedsConfirm(false);
      setPreview(null);
    }
  };

  const cancelConfirm = async () => {
    setMessages((m) => [...m, { role: 'user', content: 'cancel' }]);
    await postMessage('cancel');
    setNeedsConfirm(false);
    setPreview(null);
  };

  const newChat = async () => {
    const recog = recognitionRef.current;
    if (recog && listening) {
      try { recog.stop(); } catch {}
    }
    setListening(false);
    setMessages([]);
    setInput('');
    setCandidates(null);
    setPreview(null);
    setNeedsConfirm(false);
    try {
      const res = await fetch(`${API_BASE}/api/assistant/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_book' }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
    } catch (e) {
      setSessionId(null);
      setMessages((m) => [...m, { role: 'assistant', content: 'Failed to create a new session. Please verify the server is running.' }]);
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1000 }}>
        {open && (
          <div style={{
            width: 320,
            height: 420,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
            padding: 12,
            marginBottom: 12,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span> book assistant </span>
              <button onClick={newChat} className="btn btn-sm btn-outline-secondary">New Chat</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, background: '#f9fafb', borderRadius: 8 }}>
              {messages.map((m, idx) => (
                <div key={idx} style={{ marginBottom: 6, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: m.role === 'user' ? '#3b82f6' : '#e5e7eb',
                    color: m.role === 'user' ? 'white' : '#111827'
                  }}>{m.content}</span>
                </div>
              ))}
              {candidates && Array.isArray(candidates) && candidates.length > 1 && (
                <div style={{ marginTop: 8 }}>
                  {candidates.map((c, i) => (
                    <div key={c._id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 8,
                      marginBottom: 6
                    }}>
                      <div style={{ fontSize: 12 }}>
                        <div><b>{i + 1}.</b> {c.title}</div>
                        <div style={{ color: '#6b7280' }}>Author: {c.author} · ISBN: {c.isbn}</div>
                        <div style={{ color: '#9ca3af' }}>ID: {c._id}</div>
                      </div>
                      <button onClick={() => selectCandidate(i)} className="btn btn-sm btn-primary">Select</button>
                    </div>
                  ))}
                </div>
              )}
              {needsConfirm && preview && (
                <div style={{ marginTop: 8, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Please confirm changes:</div>
                  {Object.keys(preview.changes || {}).length === 0 ? (
                    <div style={{ color: '#6b7280' }}>No differences detected, but you can still confirm to proceed.</div>
                  ) : (
                    <div style={{ fontSize: 12 }}>
                      {Object.entries(preview.changes).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: 4 }}>
                          <span style={{ color: '#6b7280' }}>{k}</span>: <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>{String(v.before)}</span> → <span>{String(v.after)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={confirm} className="btn btn-sm btn-primary">Confirm</button>
                    <button onClick={cancelConfirm} className="btn btn-sm btn-outline-secondary">Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button 
                onClick={toggleListening} 
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  border: '1px solid #6b7280',
                  background: listening ? '#ef4444' : 'white',
                  color: listening ? 'white' : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!listening) {
                    e.target.style.background = '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (!listening) {
                    e.target.style.background = 'white';
                  }
                }}
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"Create a book, or update a book by title (e.g., The Three-Body Problem)\nAfter selecting, enter changes (e.g., isbn=111), then send 'confirm'"}
                rows={2}
                style={{ flex: 1, resize: 'none' }}
              />
              <button onClick={sendMessage} className="btn btn-primary btn-sm">Send</button>
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn btn-primary"
          style={{ width: 56, height: 56, borderRadius: 28 }}
        >
          {open ? '×' : 'Chat'}
        </button>
      </div>
    </>
  );
}


