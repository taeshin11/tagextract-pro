// ===========================
// TagExtract Pro - Main App
// ===========================

const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY'; // Replace with your YouTube Data API v3 key
const WEBHOOK_URL = 'YOUR_GOOGLE_SHEETS_WEBHOOK_URL'; // Replace with your Google Apps Script Web App URL

// DOM Elements
const urlInput = document.getElementById('youtube-url');
const extractBtn = document.getElementById('extract-btn');
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

let currentTags = [];

// ===========================
// Video ID Extraction
// ===========================
function extractVideoId(url) {
  const patterns = [
    // Standard: youtube.com/watch?v=ID
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    // Short: youtu.be/ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed: youtube.com/embed/ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Shorts: youtube.com/shorts/ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    // Live: youtube.com/live/ID
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    // Just the ID itself
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
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found. Please check the URL and try again.');
  }

  return data.items[0];
}

// ===========================
// Render Results
// ===========================
function renderResults(video) {
  const { snippet, statistics } = video;

  // Video info
  videoThumbnail.src = snippet.thumbnails?.maxres?.url
    || snippet.thumbnails?.high?.url
    || snippet.thumbnails?.medium?.url
    || '';
  videoThumbnail.alt = snippet.title;
  videoTitle.textContent = snippet.title;
  videoChannel.textContent = snippet.channelTitle;

  // Stats
  videoViews.textContent = `👁️ ${formatNumber(statistics.viewCount)} views`;
  videoLikes.textContent = `👍 ${formatNumber(statistics.likeCount)} likes`;
  videoDate.textContent = `📅 ${formatDate(snippet.publishedAt)}`;

  // Tags
  const tags = snippet.tags || [];
  currentTags = tags;
  tagCount.textContent = `(${tags.length} tags)`;
  tagsContainer.innerHTML = '';

  if (tags.length === 0) {
    tagsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">This video has no public tags.</p>';
  } else {
    tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = tag;
      tagsContainer.appendChild(chip);
    });
  }

  results.hidden = false;
}

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
    // Silent fail — do not interrupt user experience
  }
}

// ===========================
// Copy All Tags
// ===========================
copyTagsBtn.addEventListener('click', async () => {
  if (currentTags.length === 0) return;

  const tagString = currentTags.join(', ');

  try {
    await navigator.clipboard.writeText(tagString);
    const original = copyTagsBtn.textContent;
    copyTagsBtn.textContent = '✅ Copied!';
    setTimeout(() => { copyTagsBtn.textContent = original; }, 2000);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = tagString;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copyTagsBtn.textContent = '✅ Copied!';
    setTimeout(() => { copyTagsBtn.textContent = '📋 Copy All Tags'; }, 2000);
  }
});

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

  // Silent webhook POST
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

// Event listeners
extractBtn.addEventListener('click', handleExtract);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleExtract();
});

// ===========================
// Visitor Counter
// ===========================
function initVisitorCounter() {
  const counterUrl = 'https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Ftagextract-pro.vercel.app&count_bg=%23FF0050&title_bg=%230F0F0F&icon=youtube.svg&icon_color=%23FF0050&title=today%2Ftotal&edge_flat=true';

  // Use the hits API JSON endpoint for numeric counts
  fetch('https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Ftagextract-pro.vercel.app&count_bg=%23FF0050&title_bg=%230F0F0F&title=visits&edge_flat=true')
    .then(() => {
      // The badge API doesn't return JSON easily, so we use a simple counter approach
      // Display incrementing counters from the badge image
      const todayEl = document.getElementById('today-visitors');
      const totalEl = document.getElementById('total-visitors');

      // Fallback: use localStorage for approximate display
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

// Initialize counter on page load
initVisitorCounter();
