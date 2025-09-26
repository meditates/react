const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Lightweight in-memory session store
// For production, replace with Redis
const sessions = new Map();

// Define minimal required fields for completion
const actionRequiredFields = {
  create_book: ['title', 'isbn', 'author'],
  // For update we prefer id, but will support title-based disambiguation flow
  update_book: ['id'],
};

// Define all known fields tracked in session state
const actionAllFields = {
  create_book: ['title', 'isbn', 'author', 'description', 'published_date', 'publisher', 'image'],
  update_book: ['id', 'title', 'isbn', 'author', 'description', 'published_date', 'publisher', 'image'],
};

// Initialize state object per action
function initializeStateForAction(action) {
  const fields = actionAllFields[action] || [];
  const state = { action };
  for (const field of fields) state[field] = null;
  return state;
}

// Utilities to evaluate completion
function isStateComplete(state) {
  // Special handling for update: require id AND at least one updatable field present
  if (state.action === 'update_book') {
    const hasId = state.id !== null && state.id !== undefined;
    const updatableKeys = ['title','isbn','author','description','published_date','publisher','image'];
    const hasAnyUpdate = updatableKeys.some((k) => state[k] !== null && state[k] !== undefined);
    return hasId && hasAnyUpdate;
  }
  const fields = actionRequiredFields[state.action] || [];
  return fields.every((f) => state[f] !== null && state[f] !== undefined);
}

// Identify missing required fields for current action
function getMissingRequiredFields(state) {
  const required = actionRequiredFields[state.action] || [];
  return required.filter((f) => state[f] === null || state[f] === undefined || state[f] === '');
}

// Gemini function calling integration (with fallback)
const { GoogleGenAI } = require('@google/genai');
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({}) : null;

function getToolSpecForAction() {
  return [
    {
      name: 'create_book',
      description: 'Create a new book in the catalog',
      parameters: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          isbn: { type: 'STRING' },
          author: { type: 'STRING' },
          description: { type: 'STRING' },
          published_date: { type: 'STRING' },
          publisher: { type: 'STRING' },
          image: { type: 'STRING' },
        },
      },
    },
    {
      name: 'update_book',
      description: 'Update an existing book by id',
      parameters: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          isbn: { type: 'STRING' },
          author: { type: 'STRING' },
          description: { type: 'STRING' },
          published_date: { type: 'STRING' },
          publisher: { type: 'STRING' },
          image: { type: 'STRING' },
        },
      },
    },
  ];
}

function enrichUpdatesFromMessage(rawMessage, updates) {
  // Map common synonyms and spaced keys to schema keys
  const tryMatch = (regex) => {
    const m = rawMessage.match(regex);
    return m ? m[1].trim() : undefined;
  };
  // Normalize common typos / synonyms
  if (updates.isbn == null && /\bisdn\b/i.test(rawMessage)) {
    const v = (() => {
      const m = rawMessage.match(/isdn[:=]\s*([^,\s]+)/i);
      return m ? m[1].trim() : undefined;
    })();
    if (v) updates.isbn = v;
  }
  // Chinese pattern: "把<field>改成<value>" or "把 <field> 改为 <value>" (legacy support)
  const zhChange = rawMessage.match(/把\s*([a-zA-Z_\u4e00-\u9fa5]+)\s*改[为成]\s*([^，。,\n]+)/);
  if (zhChange) {
    let key = zhChange[1].trim().toLowerCase();
    const value = zhChange[2].trim();
    // map common Chinese field aliases
    const alias = {
      '书名': 'title',
      '标题': 'title',
      '作者': 'author',
      'isbn': 'isbn',
      'isdn': 'isbn',
      '出版社': 'publisher',
      '出版日期': 'published_date',
      '描述': 'description',
      '简介': 'description',
      '封面': 'image'
    };
    key = alias[key] || key;
    if (key in updates || ['title','isbn','author','description','published_date','publisher','image','id'].includes(key)) {
      updates[key] = value;
    }
  }
  if (updates.published_date == null) {
    const v = tryMatch(/published[ _-]?date[:=]\s*([^,]+)\b/i);
    if (v) updates.published_date = v;
  }
  if (updates.publisher == null) {
    const v = tryMatch(/publisher[:=]\s*([^,]+)\b/i);
    if (v) updates.publisher = v;
  }
  // Handle "change publisher to value" format
  if (updates.publisher == null) {
    const v = tryMatch(/change\s+publisher\s+to\s+([^,]+)\b/i);
    if (v) updates.publisher = v;
  }
  if (updates.description == null) {
    const v = tryMatch(/(?:description|desc)[:=]\s*([^,]+)\b/i);
    if (v) updates.description = v;
  }
  // Handle "change X to Y" format for other fields
  if (updates.title == null) {
    const v = tryMatch(/change\s+title\s+to\s+([^,]+)\b/i);
    if (v) updates.title = v;
  }
  if (updates.author == null) {
    const v = tryMatch(/change\s+author\s+to\s+([^,]+)\b/i);
    if (v) updates.author = v;
  }
  if (updates.isbn == null) {
    const v = tryMatch(/change\s+isbn\s+to\s+([^,]+)\b/i);
    if (v) updates.isbn = v;
  }
  if (updates.description == null) {
    const v = tryMatch(/change\s+description\s+to\s+([^,]+)\b/i);
    if (v) updates.description = v;
  }
  if (updates.published_date == null) {
    const v = tryMatch(/change\s+(?:published[ _-]?date|date)\s+to\s+([^,]+)\b/i);
    if (v) updates.published_date = v;
  }
  return updates;
}

async function extractFieldsWithLLM({ message, state }) {
  if (!genAI) {
    const updates = {};
    const lower = message.toLowerCase();
    // Parse patterns like: "change book <title>", "update book <title>", "update the book <title>"
    // But avoid matching generic words like "wanted", "needed", etc.
    const changeBookMatch = message.match(/^(?:change|update)\s+(?:the\s+)?book\s+([^,]+?)(?:\s*,\s*|$)/i);
    if (changeBookMatch && changeBookMatch[1]) {
      const title = changeBookMatch[1].trim();
      // Only set as title if it's not a generic word
      if (!/^(wanted|needed|required|desired)$/i.test(title)) {
        updates.title = title;
        updates.action = 'update_book';
      }
    }
    
    // Parse patterns like: "change author of <title>", "update author of <title>"
    const changeAuthorMatch = message.match(/^(?:change|update)\s+author\s+of\s+(.+)/i);
    if (changeAuthorMatch && changeAuthorMatch[1]) {
      updates.title = changeAuthorMatch[1].trim();
      updates.action = 'update_book';
    }
    const getValue = (key) => {
      const regex = new RegExp(`${key}[:=]\\s*([^,]+)`, 'i');
      const match = message.match(regex);
      return match ? match[1].trim() : undefined;
    };
    // Extract fields using common patterns
    const patterns = [
      { key: 'isbn', regex: /(?:isbn|ISBN)[:=]\s*([^,\s]+)/i },
      { key: 'author', regex: /(?:author|Author)[:=]\s*([^,\s]+)/i },
      { key: 'title', regex: /(?:title|Title)[:=]\s*([^,\s]+)/i },
      { key: 'description', regex: /(?:description|Description|desc|Desc)[:=]\s*([^,\s]+)/i },
      { key: 'publisher', regex: /(?:publisher|Publisher)[:=]\s*([^,\s]+)/i },
      { key: 'published_date', regex: /(?:published_date|publishedDate|date|Date)[:=]\s*([^,\s]+)/i }
    ];
    
    // Handle patterns like "I want to change the author to Sarah"
    const changeAuthorToMatch = message.match(/I\s+want\s+to\s+change\s+the\s+author\s+to\s+([^,\s]+)/i);
    if (changeAuthorToMatch && changeAuthorToMatch[1]) {
      updates.author = changeAuthorToMatch[1].trim();
      updates.action = 'update_book';
    }
    
    for (const pattern of patterns) {
      if (updates[pattern.key] == null) {
        const match = message.match(pattern.regex);
        if (match) {
          updates[pattern.key] = match[1].trim();
        }
      }
    }
    // infer title when user sends only a name without key=value
    if (!/\w+\s*[:=]/.test(message) && !lower.includes('create') && !lower.includes('update') && message.trim().length > 0) {
      updates.title = message.trim();
      updates.action = 'update_book';
    }
    const candidateKeys = Object.keys(state).filter((k) => k !== 'action');
    for (const key of candidateKeys) {
      const value = getValue(key);
      if (value) updates[key] = value;
    }
    if (lower.includes('create')) updates.action = 'create_book';
    if (lower.includes('update') || lower.includes('edit')) updates.action = 'update_book';
    return { tool: null, params: enrichUpdatesFromMessage(message, updates) };
  }

  try {
    console.log('Extracting fields with LLM');
    const system = 'You are a book management assistant. Extract structured fields from user messages and return them in JSON format.';
    const prompt = `${system}\n\nCurrent state: ${JSON.stringify(state)}\n\nUser said: ${message}\n\nPlease extract the relevant fields and return them as JSON. If the user wants to create a book, include action: "create_book". If they want to update a book, include action: "update_book".`;
    
    console.log('Sending request to Gemini API...');
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    console.log('Gemini API response received');
    const text = response.text || '';
    console.log('Response text:', text);
    
    // Try to parse JSON from the response
    try {
      // Look for JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Parsed JSON from response:', parsed);
        // Only enrich if LLM didn't extract much useful info
        const hasUsefulData = Object.keys(parsed).length > 1 || (parsed.title || parsed.author || parsed.isbn);
        const updates = hasUsefulData ? parsed : enrichUpdatesFromMessage(message, parsed);
        console.log('Returning parsed result:', { tool: null, params: updates });
        return { tool: null, params: updates };
      }
    } catch (parseErr) {
      console.log('Failed to parse JSON from response:', parseErr.message);
    }
    
    // Fallback to pattern matching
    const updates = {};
    const lower = text.toLowerCase();
    
    // Basic pattern matching as fallback
    if (lower.includes('create')) updates.action = 'create_book';
    if (lower.includes('update') || lower.includes('edit')) updates.action = 'update_book';
    
    console.log('Returning pattern-based result:', { tool: null, params: enrichUpdatesFromMessage(message, updates) });
    return { tool: null, params: enrichUpdatesFromMessage(message, updates) };
  } catch (err) {
    console.error('LLM extraction failed, falling back:', err);
    const fallback = {};
    const lower = message.toLowerCase();
    
    // Parse patterns like: "change book <title>", "update book <title>", "update the book <title>"
    // But avoid matching generic words like "wanted", "needed", etc.
    const changeBookMatch = message.match(/^(?:change|update)\s+(?:the\s+)?book\s+([^,]+?)(?:\s*,\s*|$)/i);
    if (changeBookMatch && changeBookMatch[1]) {
      const title = changeBookMatch[1].trim();
      // Only set as title if it's not a generic word
      if (!/^(wanted|needed|required|desired)$/i.test(title)) {
        fallback.title = title;
        fallback.action = 'update_book';
      }
    }
    
    // Parse patterns like: "change author of <title>", "update author of <title>"
    const changeAuthorMatch = message.match(/^(?:change|update)\s+author\s+of\s+(.+)/i);
    if (changeAuthorMatch && changeAuthorMatch[1]) {
      fallback.title = changeAuthorMatch[1].trim();
      fallback.action = 'update_book';
    }
    
    // Handle patterns like "I want to change the author to Sarah"
    const changeAuthorToMatch = message.match(/I\s+want\s+to\s+change\s+the\s+author\s+to\s+([^,\s]+)/i);
    if (changeAuthorToMatch && changeAuthorToMatch[1]) {
      fallback.author = changeAuthorToMatch[1].trim();
      fallback.action = 'update_book';
    }
    
    // Extract fields using common patterns
    const patterns = [
      { key: 'isbn', regex: /(?:isbn|ISBN)[:=]\s*([^,\s]+)/i },
      { key: 'author', regex: /(?:author|Author)[:=]\s*([^,\s]+)/i },
      { key: 'title', regex: /(?:title|Title)[:=]\s*([^,\s]+)/i },
      { key: 'description', regex: /(?:description|Description|desc|Desc)[:=]\s*([^,\s]+)/i },
      { key: 'publisher', regex: /(?:publisher|Publisher)[:=]\s*([^,\s]+)/i },
      { key: 'published_date', regex: /(?:published_date|publishedDate|date|Date)[:=]\s*([^,\s]+)/i },
      // Add "change X to Y" patterns
      { key: 'title', regex: /change\s+title\s+to\s+([^,\s]+)/i },
      { key: 'author', regex: /change\s+author\s+to\s+([^,\s]+)/i },
      { key: 'isbn', regex: /change\s+isbn\s+to\s+([^,\s]+)/i },
      { key: 'description', regex: /change\s+description\s+to\s+([^,\s]+)/i },
      { key: 'publisher', regex: /change\s+publisher\s+to\s+([^,\s]+)/i },
      { key: 'published_date', regex: /change\s+(?:published[ _-]?date|date)\s+to\s+([^,\s]+)/i }
    ];
    
    for (const pattern of patterns) {
      if (fallback[pattern.key] == null) {
        const match = message.match(pattern.regex);
        if (match) {
          fallback[pattern.key] = match[1].trim();
        }
      }
    }
    
    // infer action
    if (/\bcreate\b/.test(lower)) fallback.action = 'create_book';
    if (/\b(update|edit|change)\b/.test(lower)) fallback.action = 'update_book';
    
    return { tool: null, params: enrichUpdatesFromMessage(message, fallback) };
  }
}

// Tools that call backend APIs directly
const Book = require('../../models/Book');

// Helper function to safely parse date strings
function safeParseDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  
  // Try to parse the date
  const parsed = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(parsed.getTime())) {
    return null; // Invalid date
  }
  
  // Additional validation: check if the parsed date matches the input
  // This catches cases like "7/33/2022" where JS might interpret it differently
  const inputParts = dateString.split(/[\/\-]/);
  if (inputParts.length === 3) {
    const [month, day, year] = inputParts;
    const expectedDate = new Date(year, month - 1, day);
    if (expectedDate.getMonth() !== month - 1 || expectedDate.getDate() !== parseInt(day) || expectedDate.getFullYear() !== parseInt(year)) {
      return null; // Date doesn't match input format
    }
  }
  
  return parsed;
}

async function executeToolIfReady(state) {
  if (!isStateComplete(state)) return { executed: false, result: null };

  if (state.action === 'create_book') {
    const payload = {};
    for (const [k, v] of Object.entries(state)) {
      if (k === 'action' || v == null) continue;
      // Coerce date string if present with validation
      if (k === 'published_date' && typeof v === 'string') {
        const parsedDate = safeParseDate(v);
        if (parsedDate) {
          payload[k] = parsedDate;
        } else {
          // If date is invalid, skip it and let user know
          continue;
        }
      } else {
        payload[k] = v;
      }
    }
    const created = await Book.create(payload);
    return { executed: true, result: created };
  }

  if (state.action === 'update_book') {
    const { id } = state;
    const payload = {};
    for (const [k, v] of Object.entries(state)) {
      if (k === 'action' || k === 'id' || v == null) continue;
      if (k === 'published_date' && typeof v === 'string') {
        const parsedDate = safeParseDate(v);
        if (parsedDate) {
          payload[k] = parsedDate;
        } else {
          // If date is invalid, skip it and let user know
          continue;
        }
      } else {
        payload[k] = v;
      }
    }
    const updated = await Book.findByIdAndUpdate(id, payload, { new: true });
    return { executed: true, result: updated };
  }

  return { executed: false, result: null };
}

// Helpers for title-based lookup when id is not provided
async function findCandidatesByTitle(title) {
  if (!title || typeof title !== 'string') return [];
  try {
    // Try exact first
    const exact = await Book.find({ title: title }).limit(5).lean();
    if (exact.length > 0) return exact;
    // Fuzzy (case-insensitive contains)
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const fuzzy = await Book.find({ title: { $regex: regex } }).limit(5).lean();
    return fuzzy;
  } catch (err) {
    console.error('findCandidatesByTitle error:', err);
    return [];
  }
}

function parseSelectFromMessage(message) {
  if (!message) return null;
  // Accept: "select 2", "select <id>" (Chinese variants still supported for backward compatibility)
  const trimmed = String(message).trim();
  const indexMatch = trimmed.match(/^(?:select|选择)\s*(\d+)$/i);
  if (indexMatch) {
    return { type: 'index', value: Number(indexMatch[1]) };
  }
  const idMatch = trimmed.match(/^(?:select|选择)\s*([a-fA-F0-9]{24})$/);
  if (idMatch) {
    return { type: 'id', value: idMatch[1] };
  }
  return null;
}

// Build a preview for update operation comparing current db doc and payload
async function buildUpdatePreview(state) {
  if (state.action !== 'update_book' || !state.id) return null;
  const current = await Book.findById(state.id).lean();
  if (!current) return { current: null, changes: {} };
  const changes = {};
  const candidateKeys = ['title','isbn','author','description','published_date','publisher','image'];
  for (const key of candidateKeys) {
    if (state[key] != null) {
      const incoming = key === 'published_date' && typeof state[key] === 'string' ? safeParseDate(state[key]) : state[key];
      const before = current[key] instanceof Date ? current[key].toISOString() : current[key];
      const after = incoming instanceof Date ? incoming.toISOString() : incoming;
      if (String(before) !== String(after)) {
        changes[key] = { before: before ?? null, after: after ?? null };
      }
    }
  }
  return { current: { _id: current._id, title: current.title, isbn: current.isbn, author: current.author }, changes };
}

function parseConfirmFromMessage(message) {
  if (!message) return null;
  const t = String(message).trim().toLowerCase();
  if (t === 'confirm') return 'confirm';
  if (t === 'cancel') return 'cancel';
  return null;
}

// Start a session
router.post('/start', (req, res) => {
  const { action } = req.body || {};
  const sessionId = uuidv4();
  const state = initializeStateForAction(action || 'create_book');
  sessions.set(sessionId, { state, history: [], candidates: null, pendingUpdate: null });
  res.json({ session_id: sessionId, state });
});

// Get current state
router.get('/state/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session_id: sessionId, state: session.state, candidates: session.candidates || null, pending: !!session.pendingUpdate });
});

// Process a message (text from STT)
router.post('/message', async (req, res) => {
  try {
    const { session_id: sessionId, message } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'session_id required' });
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Extract fields using LLM placeholder
    const extraction = await extractFieldsWithLLM({ message, state: session.state });

    // Possibly switch action and reinitialize fields while preserving overlaps
    if (extraction.params && extraction.params.action && extraction.params.action !== session.state.action) {
      const nextState = initializeStateForAction(extraction.params.action);
      // try to carry over overlapping fields
      for (const key of Object.keys(session.state)) {
        if (key in nextState && key !== 'action' && session.state[key] != null) {
          nextState[key] = session.state[key];
        }
      }
      session.state = nextState;
    }

    // Apply extracted updates
    for (const [k, v] of Object.entries(extraction.params || {})) {
      if (k === 'action') continue;
      if (k in session.state) {
        session.state[k] = v;
      }
    }

    session.history.push({ role: 'user', content: message });

    // Handle title-based selection flow for updates
    let infoMessage = null;

    // For create flow: if required fields are not complete, prompt for the missing ones
    if (session.state.action === 'create_book' && !isStateComplete(session.state)) {
      const missing = getMissingRequiredFields(session.state);
      const fieldMap = { title: 'title', isbn: 'ISBN', author: 'author' };
      const missingReadable = missing.map((m) => fieldMap[m] || m).join(', ');
      return res.json({
        session_id: sessionId,
        state: session.state,
        executed: false,
        result: null,
        candidates: null,
        message: `I need some information to help you create a book. Please provide: ${missingReadable}. You can say something like: "title=The Three-Body Problem, author=Liu Cixin, isbn=9787229030933".`
      });
    }

    // Check for invalid dates in the current state
    if (session.state.published_date && typeof session.state.published_date === 'string') {
      const parsedDate = safeParseDate(session.state.published_date);
      if (!parsedDate) {
        return res.json({
          session_id: sessionId,
          state: session.state,
          executed: false,
          result: null,
          candidates: session.candidates || null,
          message: `Sorry, invalid date format: "${session.state.published_date}". Please use a valid format, e.g.: 2022-07-15 or 7/15/2022.`
        });
      }
    }
    // If update flow without id but with title -> search
    if (session.state.action === 'update_book' && !session.state.id && session.state.title) {
      const candidates = await findCandidatesByTitle(session.state.title);
      session.candidates = candidates;
      // Auto-select if exactly 1
      if (candidates.length === 1) {
        session.state.id = String(candidates[0]._id);
        session.candidates = null;
        infoMessage = `Found the book! Please tell me what information you'd like to update, e.g.: "change ISBN to 123456" or "update author to John Smith".`;
      } else if (candidates.length > 1) {
        infoMessage = `Found ${candidates.length} similar books. Please select the one you want to update by sending "select 1", "select 2", etc.`;
      } else {
        infoMessage = 'Sorry, no matching book title found. Please provide a more accurate title or check for spelling errors.';
      }
    }

    // If update flow without id and without title -> ask for book title
    if (session.state.action === 'update_book' && !session.state.id && !session.state.title) {
      // Check if user provided field updates but no book title
      const hasFieldUpdates = Object.keys(session.state).some(key => 
        key !== 'action' && session.state[key] !== null && session.state[key] !== undefined
      );
      
      if (hasFieldUpdates) {
        infoMessage = 'I can see you want to make changes, but I need to know which book you want to update. Please tell me the book title, e.g.: "update The Three-Body Problem" or "change author of Harry Potter".';
      } else {
        infoMessage = 'I can help you update a book! Please tell me the title of the book you want to update, e.g.: "update The Three-Body Problem" or "change author of Harry Potter".';
      }
    }

    // If user sends a select command and we have candidates, apply it
    if (!session.state.id && session.candidates && session.candidates.length > 0) {
      const sel = parseSelectFromMessage(message);
      if (sel) {
        if (sel.type === 'index') {
          const idx = sel.value - 1;
          if (idx >= 0 && idx < session.candidates.length) {
            session.state.id = String(session.candidates[idx]._id);
            session.candidates = null;
          } else {
            infoMessage = 'Invalid selection. Please try again.';
          }
        } else if (sel.type === 'id') {
          const found = session.candidates.find((c) => String(c._id) === sel.value);
          if (found) {
            session.state.id = String(found._id);
            session.candidates = null;
            infoMessage = 'Great! Book selected. Please tell me what information you would like to update.';
          } else {
            infoMessage = 'Sorry, ID not found in candidates. Please try again.';
          }
        }
      }
    }

    // Confirmation flow for updates
    // 1) If user responds confirm/cancel and we have a pendingUpdate, act on it
    const confirmCmd = parseConfirmFromMessage(message);
    if (confirmCmd && session.pendingUpdate && session.state.action === 'update_book') {
      if (confirmCmd === 'confirm') {
        const updated = await Book.findByIdAndUpdate(session.pendingUpdate.id, session.pendingUpdate.payload, { new: true });
        session.pendingUpdate = null;
        return res.json({
          session_id: sessionId,
          state: session.state,
          executed: true,
          result: updated,
          candidates: null,
          message: 'Confirmed! Update saved successfully.'
        });
      } else {
        session.pendingUpdate = null;
        return res.json({
          session_id: sessionId,
          state: session.state,
          executed: false,
          result: null,
          candidates: session.candidates || null,
          message: 'Update canceled.'
        });
      }
    }

    // 2) If state is ready to execute and is update, require confirmation only when there are actual diffs
    if (session.state.action === 'update_book' && isStateComplete(session.state)) {
      // Build payload same as execute path
      const payload = {};
      for (const [k, v] of Object.entries(session.state)) {
        if (k === 'action' || k === 'id' || v == null) continue;
        if (k === 'published_date' && typeof v === 'string') {
          const parsedDate = safeParseDate(v);
          if (parsedDate) payload[k] = parsedDate;
        } else {
          payload[k] = v;
        }
      }
      const preview = await buildUpdatePreview(session.state);
      const hasChanges = preview && preview.changes && Object.keys(preview.changes).length > 0;
      if (!hasChanges) {
        return res.json({
          session_id: sessionId,
          state: session.state,
          executed: false,
          result: null,
          candidates: session.candidates || null,
          confirmation_needed: false,
          preview,
          message: infoMessage || 'No changes detected. Please tell me what information you would like to update, e.g.: "change ISBN to 123456".'
        });
      }
      session.pendingUpdate = { id: session.state.id, payload };
      return res.json({
        session_id: sessionId,
        state: session.state,
        executed: false,
        result: null,
        candidates: session.candidates || null,
        confirmation_needed: true,
        preview,
        message: infoMessage || 'Please confirm the above changes (send "confirm" to proceed, "cancel" to abort).'
      });
    }

    // 3) Otherwise, execute when ready (create flow)
    const wasCreate = session.state.action === 'create_book';
    const { executed, result } = await executeToolIfReady(session.state);

    // After successful create: switch to update mode and store the created id
    if (wasCreate && executed && result && result._id) {
      const newState = initializeStateForAction('update_book');
      newState.id = String(result._id);
      session.state = newState;
      return res.json({
        session_id: sessionId,
        state: session.state,
        executed: true,
        result,
        candidates: null,
        message: 'Great! Book created successfully. You can now continue adding other fields (e.g., description=..., publisher=..., published_date=YYYY-MM-DD), and I will update this book directly.'
      });
    }

    return res.json({
      session_id: sessionId,
      state: session.state,
      executed,
      result,
      candidates: session.candidates || null,
      message: infoMessage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


