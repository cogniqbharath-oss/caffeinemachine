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
    updateActiveLink();
  });

  // ── Mobile nav toggle ─────────────────────────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  // Initial call for active link
  updateActiveLink();
});

// ── Active nav link on scroll ─────────────────────────────────────────────────
function updateActiveLink() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-link');
  let current = '';

  sections.forEach(s => {
    const sectionTop = s.offsetTop;
    if (window.scrollY >= sectionTop - 120) {
      current = s.id;
    }
  });

  links.forEach(l => {
    l.classList.remove('active');
    if (l.getAttribute('href') === '#' + current) {
      l.classList.add('active');
    }
  });
}

// ── Menu tabs logic ───────────────────────────────────────────────────────────
document.querySelectorAll('.menu-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    const targetPanel = document.getElementById('panel-' + tab.dataset.tab);
    if (targetPanel) {
      targetPanel.classList.add('active');
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
const minimize = document.getElementById('chatbotMinimize');
const badge = document.getElementById('chatBadge');
const input = document.getElementById('chatInput');
const sendBtn = document.getElementById('chatSendBtn');
const messages = document.getElementById('chatbotMessages');

let isChatOpen = false;
let conversationHistory = [];

const SYSTEM_PROMPT = `You are a friendly, knowledgeable AI barista assistant for Caffeine Machine, a specialty coffee shop in Las Vegas, NV. 
Your goal is to provide a premium, helpful experience. Keep responses under 100 words. Always mention Coffee Flights if relevant.
Brand Colors: Dark Blue, Teal, White.`;

if (toggle) {
  toggle.addEventListener('click', () => {
    isChatOpen = !isChatOpen;
    panel.classList.toggle('open', isChatOpen);
    if (badge) badge.style.display = 'none';
    if (isChatOpen) setTimeout(() => input.focus(), 400);
  });
}

if (minimize) {
  minimize.addEventListener('click', () => {
    isChatOpen = false;
    panel.classList.remove('open');
  });
}

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
  // Simple Mock/Fallback for demo purposes, or integrate with real API
  setTimeout(() => {
    const response = "That's a great question! ☕ Our Coffee Flights are the best way to experience our flavors. Is there anything else you'd like to know about our Southwest Las Vegas location?";
    appendMsg(response, 'bot');
  }, 1000);
}

function formatBotText(text) {
  return text.replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
