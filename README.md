# 🎓 Zetech University AI Course Assistant

The **Zetech University AI Course Assistant** is an interactive web application designed to help potential students choose a course that best suits their academic interests, KCSE grades, and career goals.  
It combines **HTML, CSS, JavaScript**, and advanced AI models like the **OpenAI GPT API** and **Qwen 1.8B (via Ollama)** to provide personalized, friendly, and insightful course recommendations.

---

## 🚀 Features

- **AI-Powered Recommendations** – Suggests courses based on user inputs (grades, interests, career preferences).
- **Interactive Chat Interface** – Allows students to have a conversation with the assistant.
- **Dynamic Course Data** – Displays course details including:
  - Duration
  - Fees
  - Intake dates
  - Career prospects
- **Collapsible Course Cards** – Users can expand or hide descriptions.
- **Add to Comparison** – Option to save preferred courses for side-by-side comparison.
- **Empathetic Responses** – AI replies in a short, friendly, and supportive tone.
- **KCSE Grades Integration** – Users can input their mean grade and subject grades for tailored advice.
- **Dual AI Models** – Uses GPT API for natural language responses and Qwen 1.8B (via Ollama) for local/offline inference.

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **AI Models:**  
  - GPT API (cloud-based)
  - Qwen 1.8B via [Ollama](https://ollama.com/) (local inference)
- **Backend (optional):** JavaScript fetch calls to APIs
- **Hosting:** Local server / static hosting platforms

---

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/zetech-ai-course-assistant.git
   cd zetech-ai-course-assistant
2. **Set up GPT API key**
   Get your OpenAI API key from OpenAI.

    Create a .env file and add:
     ```bash
    apiKey: '', // Paste your API key here

3. **Install Ollama and Qwen 1.8B**

    Download Ollama.

    Run:
   
   ```bash
    ollama pull qwen:1.8b

4. **Run the app**
     ```bash
    node server.js
    ```
    OR

      ```bash
    node local.js
    ```
