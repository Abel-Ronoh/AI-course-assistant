const toggleBtn = document.getElementById('chatbot-toggle');
    const chatbot = document.getElementById('chatbot-container');

    toggleBtn.addEventListener('click', () => {
      if (chatbot.style.display === 'none' || chatbot.style.display === '') {
        chatbot.style.display = 'block';
        toggleBtn.textContent = 'X';
        toggleBtn.style.width = '50px';
        toggleBtn.style.height = '50px';
      } else {
        chatbot.style.display = 'none';
        toggleBtn.textContent = 'AI assistant';
        toggleBtn.style.width = '120px';
        toggleBtn.style.height = '120px';
      }
    });