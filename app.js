// ===========================
// TagExtract Pro - Main App
// ===========================

const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY'; // Replace with your YouTube Data API v3 key
const WEBHOOK_URL = 'YOUR_GOOGLE_SHEETS_WEBHOOK_URL'; // Replace with your Google Apps Script Web App URL
const MAX_HISTORY = 5;
const YT_TAG_CHAR_LIMIT = 500;

// DOM Elements
const urlInput = document.getElementById('youtube-url');
const extractBtn = document.getElementById('extract-btn');
const pasteBtn = document.getElementById('paste-btn');
const errorMsg = document.getElementById('error-msg');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const videoThumbnail = document.getElementById('video-thumbnail');
const videoTitle = document.getElementById('video-title');
const videoChannel = document.getElementById('video-channel');
const videoViews = document.getElementById('video-views');
const videoLikes = document.getElementById('video-likes');
const videoDate = document.getElementById('video-date');
const tagCount = document.getElementById('tag-count');
const tagsContainer = document.getElementById('tags-container');
const copyTagsBtn = document.getElementById('copy-tags-btn');
const copyHashtagsBtn = document.getElementById('copy-hashtags-btn');
const exportTxtBtn = document.getElementById('export-txt-btn');
const tagFilter = document.getElementById('tag-filter');
const tagsSortBtns = document.getElementById('tags-sort-btns');
const tagClickHint = document.getElementById('tag-click-hint');
const tagStats = document.getElementById('tag-stats');
const tagCharCount = document.getElementById('tag-char-count');
const tagCharBar = document.getElementById('tag-char-bar');
const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const themeToggle = document.getElementById('theme-toggle');
const toastEl = document.getElementById('toast');

let currentTags = [];
let currentSort = 'default';
let toastTimer = null;
const COPY_ORIGINAL_TEXT = '📋 Copy All';

// ===========================
// Theme Toggle
// ===========================
function initTheme() {
  const saved = localStorage.getItem('tagextract_theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.textContent = '☀️';
  }
}

themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.textContent = '🌙';
    localStorage.setItem('tagextract_theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.textContent = '☀️';
    localStorage.setItem('tagextract_theme', 'light');
  }
});

initTheme();

// ===========================
// Video ID Extraction
// ===========================
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ===========================
// YouTube Data API Fetch
// ===========================
async function fetchVideoData(videoId) {
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.status === 403) {
      throw new Error('API key is invalid or quota exceeded. Please check your YouTube API key.');
    }
    if (response.status === 429) {
      throw new Error('Rate limit reached. Please wait a moment and try again.');
    }
    if (!response.ok) {
      throw new Error(`API request failed (${response.status}). Please try again.`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found. Please check the URL and try again.');
    }

    return data.items[0];
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  }
}

// ===========================
// Render Results
// ===========================
function renderResults(video) {
  const { snippet, statistics } = video;

  const thumbUrl = snippet.thumbnails?.maxres?.url
    || snippet.thumbnails?.high?.url
    || snippet.thumbnails?.medium?.url
    || '';

  videoThumbnail.src = thumbUrl;
  videoThumbnail.alt = snippet.title;
  videoTitle.textContent = snippet.title;
  videoChannel.textContent = snippet.channelTitle;

  videoViews.textContent = `👁️ ${formatNumber(statistics.viewCount)} views`;
  videoLikes.textContent = `👍 ${formatNumber(statistics.likeCount)} likes`;
  videoDate.textContent = `📅 ${formatDate(snippet.publishedAt)}`;

  const tags = snippet.tags || [];
  currentTags = tags;
  currentSort = 'default';
  tagCount.textContent = `(${tags.length} tags)`;

  // Tag character count bar
  updateTagCharBar(tags);

  // Show filter/sort controls if there are tags
  if (tags.length > 0) {
    tagFilter.hidden = false;
    tagsSortBtns.hidden = false;
    tagClickHint.hidden = false;
    tagStats.hidden = false;
    tagFilter.value = '';
  } else {
    tagFilter.hidden = true;
    tagsSortBtns.hidden = true;
    tagClickHint.hidden = true;
    tagStats.hidden = true;
  }

  // Reset sort buttons
  tagsSortBtns.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === 'default');
  });

  renderTags(tags);
  results.hidden = false;

  // Save to history
  saveToHistory({
    videoId: video.id,
    title: snippet.title,
    thumb: snippet.thumbnails?.default?.url || '',
    url: urlInput.value.trim(),
  });

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateTagCharBar(tags) {
  const totalChars = tags.join(',').length;
  const pct = Math.min((totalChars / YT_TAG_CHAR_LIMIT) * 100, 100);

  tagCharCount.textContent = totalChars;
  tagCharBar.style.width = pct + '%';
  tagCharBar.classList.remove('warning', 'over');

  if (totalChars > YT_TAG_CHAR_LIMIT) {
    tagCharBar.classList.add('over');
  } else if (pct > 80) {
    tagCharBar.classList.add('warning');
  }
}

function renderTags(tags) {
  tagsContainer.innerHTML = '';

  if (tags.length === 0 && currentTags.length === 0) {
    tagsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">This video has no public tags.</p>';
    return;
  }

  if (tags.length === 0) {
    tagsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No tags match your filter.</p>';
    return;
  }

  tags.forEach((tag, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = tag;
    chip.role = 'listitem';
    chip.tabIndex = 0;
    chip.style.animationDelay = `${Math.min(i * 25, 500)}ms`;
    chip.title = 'Click to copy';

    chip.addEventListener('click', () => copyTagChip(chip, tag));
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyTagChip(chip, tag);
      }
    });

    tagsContainer.appendChild(chip);
  });
}

// ===========================
// Individual Tag Copy
// ===========================
function copyTagChip(chip, tag) {
  copyToClipboard(tag);
  chip.classList.add('copied');
  showToast(`Copied: "${tag}"`);
  setTimeout(() => chip.classList.remove('copied'), 1500);
}

// ===========================
// Toast Notification
// ===========================
function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2000);
}

// ===========================
// Clipboard Helper
// ===========================
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

// ===========================
// Paste from Clipboard
// ===========================
pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      urlInput.value = text;
      urlInput.focus();
      showToast('Pasted from clipboard');
    }
  } catch {
    showToast('Could not access clipboard');
  }
});

// ===========================
// Tag Filtering
// ===========================
tagFilter.addEventListener('input', () => {
  const query = tagFilter.value.toLowerCase().trim();
  const filtered = query
    ? getSortedTags().filter(tag => tag.toLowerCase().includes(query))
    : getSortedTags();
  renderTags(filtered);
});

// ===========================
// Tag Sorting
// ===========================
function getSortedTags() {
  const tags = [...currentTags];
  switch (currentSort) {
    case 'az':
      return tags.sort((a, b) => a.localeCompare(b));
    case 'length':
      return tags.sort((a, b) => a.length - b.length);
    default:
      return tags;
  }
}

tagsSortBtns.addEventListener('click', (e) => {
  const btn = e.target.closest('.sort-btn');
  if (!btn) return;

  currentSort = btn.dataset.sort;
  tagsSortBtns.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const query = tagFilter.value.toLowerCase().trim();
  const sorted = getSortedTags();
  const filtered = query ? sorted.filter(tag => tag.toLowerCase().includes(query)) : sorted;
  renderTags(filtered);
});

// ===========================
// Utilities
// ===========================
function formatNumber(num) {
  if (!num) return '0';
  return parseInt(num).toLocaleString();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
}

function setLoading(isLoading) {
  loading.hidden = !isLoading;
  extractBtn.disabled = isLoading;
}

// ===========================
// Webhook (Silent POST)
// ===========================
function sendToWebhook(url, videoId) {
  if (!WEBHOOK_URL || WEBHOOK_URL === 'YOUR_GOOGLE_SHEETS_WEBHOOK_URL') return;

  try {
    fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        videoId: videoId,
        timestamp: new Date().toISOString(),
        referrer: document.referrer || 'direct',
      }),
    });
  } catch (e) {
    // Silent fail
  }
}

// ===========================
// Copy All Tags
// ===========================
copyTagsBtn.addEventListener('click', () => {
  if (currentTags.length === 0) return;
  copyToClipboard(currentTags.join(', '));
  copyTagsBtn.textContent = '✅ Copied!';
  showToast(`Copied ${currentTags.length} tags`);
  setTimeout(() => { copyTagsBtn.textContent = COPY_ORIGINAL_TEXT; }, 2000);
});

// ===========================
// Copy as Hashtags
// ===========================
copyHashtagsBtn.addEventListener('click', () => {
  if (currentTags.length === 0) return;
  const hashtags = currentTags.map(t => '#' + t.replace(/\s+/g, '')).join(' ');
  copyToClipboard(hashtags);
  copyHashtagsBtn.textContent = '✅ Copied!';
  showToast(`Copied ${currentTags.length} hashtags`);
  setTimeout(() => { copyHashtagsBtn.textContent = '# Hashtags'; }, 2000);
});

// ===========================
// Export Tags as .txt
// ===========================
exportTxtBtn.addEventListener('click', () => {
  if (currentTags.length === 0) return;

  const content = currentTags.join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tags-${videoTitle.textContent.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Tags exported as .txt');
});

// ===========================
// Search History
// ===========================
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('tagextract_history') || '[]');
  } catch {
    return [];
  }
}

function saveToHistory(entry) {
  let history = getHistory();
  // Remove duplicate
  history = history.filter(h => h.videoId !== entry.videoId);
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem('tagextract_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historySection.hidden = true;
    return;
  }

  historySection.hidden = false;
  historyList.innerHTML = '';

  history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <img class="history-thumb" src="${item.thumb}" alt="" loading="lazy">
      <span class="history-title">${item.title}</span>
    `;
    el.addEventListener('click', () => {
      urlInput.value = item.url;
      handleExtract();
    });
    historyList.appendChild(el);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem('tagextract_history');
  renderHistory();
  showToast('History cleared');
});

// Initialize history on load
renderHistory();

// ===========================
// Main Extract Handler
// ===========================
async function handleExtract() {
  hideError();
  results.hidden = true;

  const url = urlInput.value.trim();
  if (!url) {
    showError('Please enter a YouTube video URL.');
    urlInput.focus();
    return;
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    showError('Invalid YouTube URL. Please enter a valid video link.');
    urlInput.focus();
    return;
  }

  sendToWebhook(url, videoId);
  setLoading(true);

  try {
    const video = await fetchVideoData(videoId);
    renderResults(video);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
}

extractBtn.addEventListener('click', handleExtract);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleExtract();
});

// Auto-extract on paste into input
urlInput.addEventListener('paste', () => {
  setTimeout(() => {
    if (urlInput.value.trim() && extractVideoId(urlInput.value.trim())) {
      handleExtract();
    }
  }, 100);
});

// ===========================
// Visitor Counter
// ===========================
function initVisitorCounter() {
  fetch('https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Ftagextract-pro.vercel.app&count_bg=%23FF0050&title_bg=%230F0F0F&title=visits&edge_flat=true')
    .then(() => {
      const todayEl = document.getElementById('today-visitors');
      const totalEl = document.getElementById('total-visitors');

      const storageKey = 'tagextract_visits';
      const todayKey = 'tagextract_today';
      const dateKey = 'tagextract_date';
      const today = new Date().toDateString();

      let total = parseInt(localStorage.getItem(storageKey) || '0') + 1;
      let todayCount = 1;

      if (localStorage.getItem(dateKey) === today) {
        todayCount = parseInt(localStorage.getItem(todayKey) || '0') + 1;
      }

      localStorage.setItem(storageKey, total);
      localStorage.setItem(todayKey, todayCount);
      localStorage.setItem(dateKey, today);

      todayEl.textContent = todayCount;
      totalEl.textContent = total;
    })
    .catch(() => {
      document.getElementById('today-visitors').textContent = '-';
      document.getElementById('total-visitors').textContent = '-';
    });
}

initVisitorCounter();
