import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import csv from 'csvtojson';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: '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'
});

// Replace this with your published Google Sheet CSV URL
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

// Store conversation history per session
const conversations = {};

app.post('/ask', async (req, res) => {
  const { sessionId, question, context = '' } = req.body;

  if (!sessionId || !question) {
    return res.status(400).json({ error: 'Missing sessionId or question' });
  }

  // Load fresh course data on each request
  const courses = await getCoursesFromGoogleSheet();

  // Format course descriptions for GPT
  const courseDescriptions = courses.map(c =>
    `Course: ${c.course_name}\nLevel: ${c.qualification_level}\nDuration: ${c.duration}\nFee: ${c.fee}\nMinimum Grade: ${c.min_grade}\nDescription: ${c.description}`
  ).join("\n\n");

  // Start new conversation
  if (!conversations[sessionId]) {
    conversations[sessionId] = [
      {
        role: 'system',
        content: `You are a helpful and friendly course advisor for Zetech University.

When a student asks for course recommendations or suggestions, always format your response as a numbered list using the following structure (one line per course):

<number>. <Course Name>: <Short Description>

Do not add extra formatting like HTML or Markdown. Keep the descriptions short and easy to read.

Example:
1. Diploma in IT: Covers software, hardware, and networking basics.
2. Bachelor of Commerce: Offers a foundation in accounting, finance, and management.

Only use courses provided.
Use first person perspective, "we",
Only use this format when listing actual courses. Otherwise, answer normally.\n\n${courseDescriptions}`

}
    ];

    if (context) {
      conversations[sessionId].push({
        role: 'user',
        content: `Student context: ${context}`
      });
    }
  }

  // Append latest user question
  conversations[sessionId].push({
    role: 'user',
    content: question
  });

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: conversations[sessionId],
      temperature: 0.7,
    });

    const reply = chatCompletion.choices[0].message.content;

    conversations[sessionId].push({
      role: 'assistant',
      content: reply
    });

    res.json({ reply });

  } catch (err) {
    console.error('GPT error:', err);
    res.status(500).json({ error: 'Failed to get response from GPT' });
  }
});

app.listen(3000, () => console.log('✅ Server running at http://localhost:3000'));
