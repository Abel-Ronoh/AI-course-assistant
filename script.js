let dummyCart = JSON.parse(localStorage.getItem('basket')) || [];
updateBasketCount();
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let userGrades = {};
let allCourses = [];
let currentStep = null;

window.addEventListener('storage', function(e) {
  if (e.key === 'basket') {
    // Reload the basket count from localStorage
    dummyCart = JSON.parse(localStorage.getItem('basket')) || [];
    updateBasketCount();
  }
});

// Load course data
fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTNFxMs_mv_qiqPT5vW0fwiLla3f-jc1guyHjhznezAj8ov7YrfgWs5fgGeMzAG877lGYCh9Y5L6ckW/pub?output=csv')
  .then(res => res.text())
  .then(csv => {
    // Simple CSV to JSON (for demo; use PapaParse for robust parsing)
    const [header, ...rows] = csv.trim().split('\n');
    const keys = header.split(',');
    allCourses = rows.map(row => {
      const values = row.split(',');
      const obj = {};
      keys.forEach((k, i) => obj[k.trim()] = values[i]?.trim());
      return obj;
    });
  });

// Utility: Append message to chat
function appendMessage(content, type = 'bot') {
  const msg = document.createElement('div');
  msg.classList.add('message', type);
  msg.textContent = content;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Utility: Button choices
function appendOptions(options, callback) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message', 'bot');
  const container = document.createElement('div');
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.className = 'option-button';
    btn.onclick = () => {
      appendMessage(opt, 'user');
      chatBox.removeChild(wrapper);
      callback(opt);
    };
    container.appendChild(btn);
  });
  wrapper.appendChild(container);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Start grade entry
function promptGradeEntry() {
  appendMessage("I can help you find a course that fits your KCSE grades. Would you like to enter your grades?");
  appendOptions(["Yes", "No"], (answer) => {
    if (answer === "Yes") askGrade("mean");
    else appendMessage("No problem! You can still ask me about any course you'd like.");
  });
}

function askGrade(subject) {
  const subjectName = subject === "mean" ? "your KCSE mean grade" : `your grade in ${capitalize(subject)}`;
  appendMessage(`Please enter ${subjectName}:`);
  currentStep = subject;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function gradeToScore(grade) {
  const scale = {
    "A": 12, "A-": 11, "B+": 10, "B": 9, "B-": 8,
    "C+": 7, "C": 6, "C-": 5, "D+": 4, "D": 3, "D-": 2, "E": 1
  };
  return scale[grade?.toUpperCase()] || 0;
}

// Show matched courses (only those the user qualifies for)
function showRecommendedCourses() {
  if (!allCourses.length) {
    appendMessage("Courses are still loading. Try again shortly.");
    return;
  }

  // Filter courses based on user grades
  const matches = allCourses.filter(course => {
    // Check mean grade
    if (userGrades.mean && gradeToScore(userGrades.mean) < gradeToScore(course.min_grade)) return false;

    // Check subject requirements (if present)
    // Assume subject requirements are in columns like 'math_req', 'english_req', etc.
    for (const key in userGrades) {
      if (key === "mean") continue;
      const reqKey = key + "_req";
      if (course[reqKey] && course[reqKey].trim() !== "" && course[reqKey].trim().toUpperCase() !== "N/A" && course[reqKey].trim() !== "-") {
        if (gradeToScore(userGrades[key]) < gradeToScore(course[reqKey])) {
          return false;
        }
      }
    }
    return true;
  });

  if (!matches.length) {
    appendMessage("Sorry, based on your KCSE grades, there are no courses you currently qualify for.");
    currentStep = null;
    return;
  }

  appendMessage("Based on your KCSE grades, you qualify for the following courses:");
  matches.forEach(displayCourseCard);
  appendMessage("Click 'More Description' or 'Add to Cart' for more options.");
  currentStep = null; // Allow normal conversation after showing courses
}

// Display individual course card
function displayCourseCard(course) {
  const card = document.createElement('div');
  card.className = 'course-card';

  const title = document.createElement('h4');
  title.textContent = `🎓 ${course.course_name}`;

  const meta = document.createElement('p');
  meta.textContent = `📚 ${course.qualification_level} | ⏳ ${course.duration} | 💰 ${course.fee}`;

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'More Description';
  toggleBtn.className = 'toggle-btn';

  const desc = document.createElement('p');
  desc.textContent = course.description;
  desc.style.display = 'none';

  toggleBtn.onclick = () => {
    desc.style.display = desc.style.display === 'none' ? 'block' : 'none';
    toggleBtn.textContent = desc.style.display === 'none' ? 'More Description' : 'Hide Description';
  };

  const cartBtn = document.createElement('button');
  cartBtn.textContent = 'Add to Cart';
  cartBtn.className = 'cart-btn';
  cartBtn.onclick = () => addToCart(course);

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(toggleBtn);
  card.appendChild(desc);
  card.appendChild(cartBtn);

  chatBox.appendChild(card);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Add course to cart and save in localStorage
function addToCart(course) {
  dummyCart.push(course);
  localStorage.setItem('basket', JSON.stringify(dummyCart));
  appendMessage(`✅ "${course.course_name}" added to your cart.`);
  updateBasketCount(); // This updates the badge on the chat page immediately
}

// For GPT dynamic response
function displayDynamicCourseCard(course) {
  const card = document.createElement('div');
  card.className = 'course-card';

  const title = document.createElement('h4');
  title.textContent = `🎓 ${course.course_name}`;

  const summary = document.createElement('p');
  summary.textContent = 'Click below to see more.';

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'More Description';
  toggleBtn.className = 'toggle-btn';

  const desc = document.createElement('p');
  desc.textContent = course.description;
  desc.style.display = 'none';

  toggleBtn.onclick = () => {
    desc.style.display = desc.style.display === 'none' ? 'block' : 'none';
    toggleBtn.textContent = desc.style.display === 'none' ? 'More Description' : 'Hide Description';
  };

  const cartBtn = document.createElement('button');
  cartBtn.textContent = 'Add to Cart';
  cartBtn.className = 'cart-btn';
  cartBtn.onclick = () => {
    dummyCart.push(course);
    localStorage.setItem('basket', JSON.stringify(dummyCart));
    appendMessage(`✅ "${course.course_name}" added to your cart.`);
  };

  card.appendChild(title);
  card.appendChild(summary);
  card.appendChild(toggleBtn);
  card.appendChild(desc);
  card.appendChild(cartBtn);

  chatBox.appendChild(card);
  chatBox.scrollTop = chatBox.scrollHeight;
}


function showLoadingAnimation() {
  // Remove any existing loading animation
  removeLoadingAnimation();
  const loadingMsg = document.createElement('div');
  loadingMsg.classList.add('message', 'bot', 'loading-animation');
  loadingMsg.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
  chatBox.appendChild(loadingMsg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeLoadingAnimation() {
  const loading = chatBox.querySelector('.loading-animation');
  if (loading) loading.remove();
}

// GPT handling
function handleFreeQuestion(userText) {
  const context = JSON.stringify(userGrades);

  showLoadingAnimation();

  fetch('http://localhost:3000/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'user123',
      question: userText,
      context: context
    })
  })
    .then(res => res.json())
    .then(data => {
      removeLoadingAnimation();
      const reply = data.reply || "I'm not sure. Try rephrasing?";

      const courseLines = reply.split("\n").filter(line => /^\d+\.\s/.test(line));

      if (courseLines.length > 0) {
        appendMessage("Based on your budget, here are some course suggestions:");

        courseLines.forEach(line => {
          const match = line.match(/^(\d+)\.\s(.+?):\s(.+)$/);
          if (match) {
            const title = match[2].trim();
            const summary = match[3].trim();
            const courseObj = { course_name: title, description: summary };

            displayDynamicCourseCard(courseObj);
          }
        });

        appendMessage("Click 'More Description' or 'Add to Cart' to explore.");
      } else {
        appendMessage(reply);
      }
    })
    .catch(err => {
      removeLoadingAnimation();
      console.error(err);
      appendMessage("Sorry, I couldn't reach the course advisor right now.");
    });
}

// Input and send handlers
sendBtn.addEventListener('click', () => {
  const text = userInput.value.trim();
  if (!text) return;
  appendMessage(text, 'user');
  userInput.value = '';

  if (["mean", "math", "english", "kiswahili", "chemistry", "physics"].includes(currentStep)) {
    userGrades[currentStep] = text.toUpperCase();
    if (currentStep === "mean") askGrade("math");
    else if (currentStep === "math") askGrade("english");
    else if (currentStep === "english") askGrade("kiswahili");
    else if (currentStep === "kiswahili") askGrade("chemistry");
    else if (currentStep === "chemistry") askGrade("physics");
    else if (currentStep === "physics") {
      showRecommendedCourses();
      currentStep = null; // Allow normal conversation after showing courses
    }
    return;
  }

  // After grade entry, allow normal LLM conversation
  handleFreeQuestion(text);
});

userInput.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' && e.ctrlKey) || (e.key === 'Enter' && !e.shiftKey)) {
    e.preventDefault();
    sendBtn.click();
  }
});

window.onload = () => {
  appendMessage("Hello! I'm your Zetech course assistant. Ask me about any course, or let me help you find one that fits your KCSE grades.");
  promptGradeEntry();
};

// Basket sliding logic
function openBasket() {
  document.getElementById('basketSlide').classList.add('active');
  document.getElementById('chatContainer').style.transform = 'translateX(-100%)';
}

function closeBasket() {
  document.getElementById('basketSlide').classList.remove('active');
  document.getElementById('chatContainer').style.transform = 'translateX(0)';
}

function updateBasketCount() {
  const count = dummyCart.length;
  const badge = document.getElementById('basket-count');
  if (badge) badge.textContent = count;
}