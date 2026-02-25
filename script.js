/* ===== CAFFEINE MACHINE – script.js ===== */

// ── Intersection Observer for Reveals ──────────────────────────────────────────
const revealCallback = (entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      observer.unobserve(entry.target);
    }
  });
};

const revealObserver = new IntersectionObserver(revealCallback, {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px'
});

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Reveals
  const revealElements = document.querySelectorAll('.reveal');
  revealElements.forEach(el => revealObserver.observe(el));

  // ── Navbar scroll effect ──────────────────────────────────────────────────────
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
});

// ── Contact form submit ───────────────────────────────────────────────────────
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('submitContactBtn');
    const originalText = btn.textContent;
    btn.textContent = '🕊️ Sending...';
    btn.disabled = true;

    setTimeout(() => {
      const successMsg = document.getElementById('formSuccess');
      if (successMsg) successMsg.classList.add('visible');
      contactForm.reset();
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1500);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CHATBOT LOGIC
// ══════════════════════════════════════════════════════════════════════════════
const toggle = document.getElementById('chatbotToggle');
const panel = document.getElementById('chatbotPanel');
const badge = document.getElementById('chatBadge');
const input = document.getElementById('chatInput');
const sendBtn = document.getElementById('chatSendBtn');
const messages = document.getElementById('chatbotMessages');
const micBtn = document.getElementById('chatMicBtn');

let isChatOpen = false;
let conversationHistory = [];
let recognition;
let isRecording = false;

const SYSTEM_PROMPT = `You are a friendly barista at Caffeine Machine in Las Vegas. 
Talk like a real person—keep it simple, warm, and natural. Use a few emojis, be helpful, and keep answers short (under 2 sentences).
If someone asks about drinks, recommend a "Coffee Flight"!`;

// ── Open / Close ─────────────────────────────────────────────────────────────
if (toggle) {
  toggle.addEventListener('click', () => {
    isChatOpen = !isChatOpen;
    panel.classList.toggle('open', isChatOpen);
    if (badge) badge.style.display = 'none';
    if (isChatOpen) setTimeout(() => input.focus(), 400);
  });
}

// ── Voice-to-Text (STT) ──────────────────────────────────────────────────────
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('active');
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('active');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    handleSend();
  };
}

if (micBtn) {
  micBtn.addEventListener('click', () => {
    if (!recognition) return alert("Speech recognition is not supported in this browser.");
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
}

// ── Text-to-Speech (TTS) ──────────────────────────────────────────────────────
function speak(text) {
  if ('speechSynthesis' in window) {
    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for more natural barista vibe
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
    if (naturalVoice) utterance.voice = naturalVoice;

    window.speechSynthesis.speak(utterance);
  }
}

// ── Messaging Logic ──────────────────────────────────────────────────────────
const handleSend = () => {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  appendMsg(text, 'user');
  getBotResponse(text);
};

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (input) input.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });

function appendMsg(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}`;
  msgDiv.innerHTML = `<div class="msg-bubble">${sender === 'bot' ? formatBotText(text) : escapeHtml(text)}</div>`;
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

async function getBotResponse(userText) {
  try {
    const res = await fetch('https://green-grass-4b15.cogniq-bharath.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: conversationHistory,
        systemPrompt: SYSTEM_PROMPT
      })
    });

    const data = await res.json();
    if (data.reply) {
      appendMsg(data.reply, 'bot');
      speak(data.reply); // Speak the response!
      conversationHistory.push({ role: 'user', parts: [{ text: userText }] });
      conversationHistory.push({ role: 'model', parts: [{ text: data.reply }] });
    } else {
      throw new Error(data.error || 'No reply');
    }
  } catch (err) {
    console.error('Chat Error:', err);
    const errorMsg = "☕ Sorry, my steam wand is acting up. Please try again in a moment!";
    appendMsg(errorMsg, 'bot');
    speak(errorMsg);
  }
}

function formatBotText(text) {
  return text.replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
