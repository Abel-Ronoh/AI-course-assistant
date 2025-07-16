import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Load courses once at startup
const courses = JSON.parse(fs.readFileSync('./courses.json', 'utf-8'));

// Conversation history store (per session)
const conversations = {};

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
