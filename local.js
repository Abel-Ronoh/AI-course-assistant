import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fetch from 'node-fetch';
import csv from 'csvtojson';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Load courses once at startup
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTNFxMs_mv_qiqPT5vW0fwiLla3f-jc1guyHjhznezAj8ov7YrfgWs5fgGeMzAG877lGYCh9Y5L6ckW/pub?output=csv';

// Fetch and parse course data from Google Sheets
async function getCoursesFromGoogleSheet() {
  try {
    const response = await fetch(sheetUrl);
    const csvText = await response.text();
    const courses = await csv().fromString(csvText);
    return courses;
  } catch (err) {
    console.error('Error fetching Google Sheet:', err);
    return [];
  }
}
// Conversation history store (per session)
const conversations = {};
(async () => {
const courses = await getCoursesFromGoogleSheet();
// Generate course summary for prompt injection
const courseSummaries = courses.map(course => 
  `- ${course.course_name} (${course.qualification_level}) — ${course.duration}, Fee: ${course.fee}. Minimum Grade: ${course.min_grade}. Description: ${course.description}`
).join('\n');

// System prompt
const systemPrompt = `
You are a friendly, empathetic course advisor for Zetech University.  
You only assist users with questions related to Zetech University's certificate, diploma, and degree courses.  
Use short, direct, helpful replies and list the relevant course information clearly when needed.  
If a user provides KCSE grades or financial budget, suggest matching courses based on their qualifications.  
Here are the available courses:  
${courseSummaries}  
Always encourage the user politely to reach out to Zetech University for official application.  
`;

// POST /ask with sessionId, question, context (optional)
app.post('/ask', async (req, res) => {
  const { sessionId, question, context = '' } = req.body;

  if (!sessionId || !question) {
    return res.status(400).json({ error: 'Missing sessionId or question' });
  }

  // Initialize session conversation
  if (!conversations[sessionId]) {
    conversations[sessionId] = [
      { role: 'system', content: systemPrompt }
    ];

    if (context) {
      conversations[sessionId].push({
        role: 'user',
        content: `Student context: ${context}`
      });
    }
  }

  // Add latest user message
  conversations[sessionId].push({
    role: 'user',
    content: question
  });

  try {
    // Call to local Ollama server (adjust port/model as needed)
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen:1.8b',
        messages: conversations[sessionId],
        stream: false
      })
    });

    const data = await ollamaRes.json();
    const reply = data.message.content;

    // Save assistant reply in session history
    conversations[sessionId].push({
      role: 'assistant',
      content: reply
    });

    res.json({ reply });

  } catch (err) {
    console.error('LLM error:', err.message);
    res.status(500).json({ error: 'Failed to get response from the local LLM' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Local LLM Course Advisor running at http://localhost:${PORT}`);
});
})();







app.get('/ask-stream', async (req, res) => {
  const { sessionId, question, context = '' } = req.query;
  if (!sessionId || !question) {
    res.status(400).end();
    return;
  }

  // Set headers for SSE
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  // Prepare conversation as before...
  if (!conversations[sessionId]) {
    conversations[sessionId] = [
      { role: 'system', content: systemPrompt }
    ];
    if (context) {
      conversations[sessionId].push({
        role: 'user',
        content: `Student context: ${context}`
      });
    }
  }
  conversations[sessionId].push({
    role: 'user',
    content: question
  });

  try {
    // Stream from Ollama
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen:1.8b',
        messages: conversations[sessionId],
        stream: true
      })
    });

    if (!ollamaRes.body) throw new Error('No stream from LLM');

    let reply = '';
    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Ollama streams JSON lines, parse and extract content
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message && data.message.content) {
            reply += data.message.content;
            res.write(`data: ${data.message.content}\n\n`);
          }
        } catch (e) { /* ignore parse errors */ }
      }
    }

    // Save full reply
    conversations[sessionId].push({
      role: 'assistant',
      content: reply
    });
    res.write('event: end\ndata: END\n\n');
    res.end();
  } catch (err) {
    res.write('event: error\ndata: ERROR\n\n');
    res.end();
  }
});