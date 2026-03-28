// ===========================
// TagExtract Pro - Main App
// ===========================

const YOUTUBE_API_KEY = 'AIzaSyBymKS3QiRbD7y3R_BA41h9uhv-F2aEd1s';
const WEBHOOK_URL = 'YOUR_GOOGLE_SHEETS_WEBHOOK_URL'; // Replace with your Google Apps Script Web App URL
const MAX_HISTORY = 5;
const YT_TAG_CHAR_LIMIT = 500;

// DOM Elements
const urlInput = document.getElementById('youtube-url');
const urlInput2 = document.getElementById('youtube-url-2');
const compareInput = document.getElementById('compare-input');
const extractBtn = document.getElementById('extract-btn');
const pasteBtn = document.getElementById('paste-btn');
const errorMsg = document.getElementById('error-msg');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const compareResults = document.getElementById('compare-results');
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
const shareBtn = document.getElementById('share-btn');
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
const keywordsSection = document.getElementById('keywords-section');
const keywordsContainer = document.getElementById('keywords-container');
const keywordCount = document.getElementById('keyword-count');
const copyKeywordsBtn = document.getElementById('copy-keywords-btn');

let currentTags = [];
let currentKeywords = [];
let currentSort = 'default';
let currentMode = 'single';
let currentView = 'chips';
let currentVideoId = '';
let currentVideoData = null;
let bulkData = [];
let toastTimer = null;

const bulkInput = document.getElementById('bulk-input');
const bulkUrls = document.getElementById('bulk-urls');
const bulkResults = document.getElementById('bulk-results');
const bulkResultsList = document.getElementById('bulk-results-list');
const exportCsvBtn = document.getElementById('export-csv-btn');
const seoScoreSection = document.getElementById('seo-score-section');
const seoRing = document.getElementById('seo-ring');
const seoRingValue = document.getElementById('seo-ring-value');
const seoChecklist = document.getElementById('seo-checklist');
const viewToggle = document.getElementById('view-toggle');
const socialShare = document.getElementById('social-share');
const basketSection = document.getElementById('tag-basket-section');
const basketContainer = document.getElementById('basket-container');
const basketCount = document.getElementById('basket-count');
const copyBasketBtn = document.getElementById('copy-basket-btn');
const clearBasketBtn = document.getElementById('clear-basket-btn');

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
// Mode Tabs (Single / Compare)
// ===========================
document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;

    compareInput.hidden = currentMode !== 'compare';
    bulkInput.hidden = currentMode !== 'bulk';
    // In bulk mode, hide single search box; show it otherwise
    const mainSearchBox = document.querySelector('.search-box:not(.compare-search-box)');
    if (mainSearchBox) mainSearchBox.hidden = currentMode === 'bulk';
    results.hidden = true;
    compareResults.hidden = true;
    bulkResults.hidden = true;
    seoScoreSection.hidden = true;
    document.getElementById('tag-chart-section').hidden = true;
    keywordsSection.hidden = true;
    basketSection.hidden = getBasket().length > 0 ? false : true;
    socialShare.hidden = true;
    hideError();
  });
});

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
// Description Keyword Extraction
// ===========================
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','it','this','that','was','are','be','has','had','have','will',
  'can','do','does','did','not','no','so','if','its','my','your','our',
  'their','he','she','we','you','they','i','me','him','her','us','them',
  'what','which','who','when','where','how','all','each','every','both',
  'more','most','other','some','such','than','too','very','just','about',
  'also','been','being','between','into','through','during','before','after',
  'above','below','up','down','out','off','over','under','again','then',
  'here','there','these','those','am','as','would','could','should','may',
  'might','shall','like','get','got','go','going','make','know','see',
  'come','take','want','use','find','give','tell','work','call','try',
  'need','become','leave','keep','let','begin','show','hear','play','run',
  'move','live','believe','http','https','www','com','video','subscribe',
  'channel','check','link','follow','watch','click','new','one','two',
]);

function extractKeywords(description) {
  if (!description) return [];

  const words = description
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-zA-Z0-9\s\u3000-\u9FFF\uAC00-\uD7AF]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
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

  // Add "Watch on YouTube" link
  let ytLink = document.getElementById('yt-link');
  if (!ytLink) {
    ytLink = document.createElement('a');
    ytLink.id = 'yt-link';
    ytLink.className = 'yt-link';
    ytLink.target = '_blank';
    ytLink.rel = 'noopener';
    ytLink.textContent = '▶ Watch on YouTube';
    document.querySelector('.video-info')?.appendChild(ytLink);
  }
  ytLink.href = `https://www.youtube.com/watch?v=${video.id}`;

  const tags = snippet.tags || [];
  currentTags = tags;
  currentVideoId = video.id;
  currentSort = 'default';
  tagCount.textContent = `(${tags.length} tags)`;

  updateTagCharBar(tags);

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

  tagsSortBtns.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === 'default');
  });

  renderTags(tags);
  results.hidden = false;
  compareResults.hidden = true;
  bulkResults.hidden = true;

  // Show view toggle & SEO score
  if (tags.length > 0) {
    viewToggle.hidden = false;
    currentView = 'chips';
    viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'chips'));
    tagsContainer.classList.remove('cloud-view');
  } else {
    viewToggle.hidden = true;
  }

  currentVideoData = video;
  renderSeoScore(video);
  renderTagCharts(tags);
  updateSocialLinks();

  // Description keywords
  const keywords = extractKeywords(snippet.description);
  currentKeywords = keywords;
  if (keywords.length > 0) {
    keywordsSection.hidden = false;
    keywordCount.textContent = `(${keywords.length})`;
    keywordsContainer.innerHTML = '';
    keywords.forEach((kw, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip keyword';
      chip.textContent = `${kw.word} (${kw.count})`;
      chip.tabIndex = 0;
      chip.title = 'Click to copy';
      chip.style.animationDelay = `${Math.min(i * 25, 500)}ms`;
      chip.addEventListener('click', () => {
        copyToClipboard(kw.word);
        chip.classList.add('copied');
        showToast(`Copied: "${kw.word}"`);
        setTimeout(() => chip.classList.remove('copied'), 1500);
      });
      keywordsContainer.appendChild(chip);
    });
  } else {
    keywordsSection.hidden = true;
  }

  // Save to history
  saveToHistory({
    videoId: video.id,
    title: snippet.title,
    thumb: snippet.thumbnails?.default?.url || '',
    url: urlInput.value.trim(),
  });

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===========================
// Compare Mode
// ===========================
async function handleCompare() {
  hideError();
  results.hidden = true;
  compareResults.hidden = true;

  const url1 = urlInput.value.trim();
  const url2 = urlInput2.value.trim();

  if (!url1 || !url2) {
    showError(t('errBothUrls'));
    return;
  }

  const id1 = extractVideoId(url1);
  const id2 = extractVideoId(url2);

  if (!id1 || !id2) {
    showError(t('errInvalid'));
    return;
  }

  setLoading(true);

  try {
    const [video1, video2] = await Promise.all([
      fetchVideoData(id1),
      fetchVideoData(id2),
    ]);

    const tags1 = video1.snippet.tags || [];
    const tags2 = video2.snippet.tags || [];
    const set1 = new Set(tags1.map(x => x.toLowerCase()));
    const set2 = new Set(tags2.map(x => x.toLowerCase()));

    const common = tags1.filter(x => set2.has(x.toLowerCase()));
    const only1 = tags1.filter(x => !set2.has(x.toLowerCase()));
    const only2 = tags2.filter(x => !set1.has(x.toLowerCase()));

    renderCompareColumn('compare-common', common, 'common');
    renderCompareColumn('compare-only1', only1, '');
    renderCompareColumn('compare-only2', only2, 'unique');

    compareResults.hidden = false;
    compareResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function renderCompareColumn(containerId, tags, extraClass) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (tags.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">None</p>`;
    return;
  }

  tags.forEach((tag, i) => {
    const chip = document.createElement('span');
    chip.className = `tag-chip ${extraClass}`;
    chip.textContent = tag;
    chip.style.animationDelay = `${Math.min(i * 25, 400)}ms`;
    chip.title = 'Click to copy';
    chip.addEventListener('click', () => {
      copyToClipboard(tag);
      chip.classList.add('copied');
      showToast(`Copied: "${tag}"`);
      setTimeout(() => chip.classList.remove('copied'), 1500);
    });
    container.appendChild(chip);
  });
}

// ===========================
// Render Tags
// ===========================
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
  tagsContainer.classList.remove('cloud-view');

  if (tags.length === 0 && currentTags.length === 0) {
    tagsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">${t('noTags')}</p>`;
    return;
  }

  if (tags.length === 0) {
    tagsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">${t('noMatch')}</p>`;
    return;
  }

  // Tag type legend
  const legend = document.createElement('div');
  legend.className = 'tag-legend';
  legend.innerHTML = `
    <span class="tag-legend-item"><span class="tag-legend-dot short"></span>Short (1 word)</span>
    <span class="tag-legend-item"><span class="tag-legend-dot medium"></span>Medium (2-3 words)</span>
    <span class="tag-legend-item"><span class="tag-legend-dot longtail"></span>Long-tail (4+ words)</span>
  `;
  tagsContainer.appendChild(legend);

  tags.forEach((tag, i) => {
    const chip = document.createElement('span');
    const wordCount = tag.trim().split(/\s+/).length;
    const typeClass = wordCount === 1 ? 'tag-short' : wordCount <= 3 ? 'tag-medium' : 'tag-longtail';
    chip.className = `tag-chip ${typeClass}`;
    chip.role = 'listitem';
    chip.tabIndex = 0;
    chip.style.animationDelay = `${Math.min(i * 25, 500)}ms`;
    chip.title = 'Click to copy, + to add to basket';

    const text = document.createTextNode(tag);
    chip.appendChild(text);

    // Add to basket button
    const addBtn = document.createElement('span');
    addBtn.className = 'tag-add-btn';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToBasket(tag);
    });
    chip.appendChild(addBtn);

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
  showToast(`${t('copied')} "${tag}"`);
  triggerConfetti();
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
// Tag Filtering (debounced)
// ===========================
let filterTimer = null;
tagFilter.addEventListener('input', () => {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    const query = tagFilter.value.toLowerCase().trim();
    const filtered = query
      ? getSortedTags().filter(tag => tag.toLowerCase().includes(query))
      : getSortedTags();
    if (currentView === 'cloud') {
      renderTagCloud(filtered);
    } else {
      renderTags(filtered);
    }
  }, 150);
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
  if (currentView === 'cloud') {
    renderTagCloud(filtered);
  } else {
    renderTags(filtered);
  }
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
  const span = copyTagsBtn.querySelector('[data-i18n]');
  if (span) span.textContent = t('copied');
  showToast(`Copied ${currentTags.length} tags`);
  setTimeout(() => { if (span) span.textContent = t('copyAll'); }, 2000);
});

// ===========================
// Copy as Hashtags
// ===========================
copyHashtagsBtn.addEventListener('click', () => {
  if (currentTags.length === 0) return;
  const hashtags = currentTags.map(tag => '#' + tag.replace(/\s+/g, '')).join(' ');
  copyToClipboard(hashtags);
  const span = copyHashtagsBtn.querySelector('[data-i18n]');
  if (span) span.textContent = t('copied');
  showToast(`Copied ${currentTags.length} hashtags`);
  setTimeout(() => { if (span) span.textContent = t('hashtags'); }, 2000);
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
// Share Results
// ===========================
shareBtn.addEventListener('click', () => {
  if (!currentVideoId) return;
  const shareUrl = `${window.location.origin}${window.location.pathname}?v=${currentVideoId}`;
  copyToClipboard(shareUrl);
  showToast(t('shareCopied'));
});

// ===========================
// Copy Keywords
// ===========================
copyKeywordsBtn.addEventListener('click', () => {
  if (currentKeywords.length === 0) return;
  const kwText = currentKeywords.map(kw => kw.word).join(', ');
  copyToClipboard(kwText);
  showToast(`Copied ${currentKeywords.length} keywords`);
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

    const img = document.createElement('img');
    img.className = 'history-thumb';
    img.alt = '';
    img.loading = 'lazy';
    // Only allow YouTube thumbnail URLs
    if (item.thumb && item.thumb.startsWith('https://i.ytimg.com/')) {
      img.src = item.thumb;
    }

    const span = document.createElement('span');
    span.className = 'history-title';
    span.textContent = item.title || '';

    el.appendChild(img);
    el.appendChild(span);
    el.addEventListener('click', () => {
      // Validate URL before using
      const vid = extractVideoId(item.url || '');
      if (vid) {
        urlInput.value = item.url;
        handleExtract();
      }
    });
    historyList.appendChild(el);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem('tagextract_history');
  renderHistory();
  showToast('History cleared');
});

renderHistory();

// ===========================
// Main Extract Handler
// ===========================
async function handleExtract() {
  hideError();
  results.hidden = true;
  compareResults.hidden = true;

  if (currentMode === 'compare') {
    return handleCompare();
  }

  if (currentMode === 'bulk') {
    return handleBulk();
  }

  const url = urlInput.value.trim();
  if (!url) {
    showError(t('errEmpty'));
    urlInput.focus();
    return;
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    showError(t('errInvalid'));
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
urlInput2.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleExtract();
});

// Auto-extract on paste into input
urlInput.addEventListener('paste', () => {
  if (currentMode === 'compare') return;
  setTimeout(() => {
    if (urlInput.value.trim() && extractVideoId(urlInput.value.trim())) {
      handleExtract();
    }
  }, 100);
});

// ===========================
// View Toggle (Chips / Cloud)
// ===========================
viewToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-btn');
  if (!btn) return;

  currentView = btn.dataset.view;
  viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const query = tagFilter.value.toLowerCase().trim();
  const sorted = getSortedTags();
  const filtered = query ? sorted.filter(tag => tag.toLowerCase().includes(query)) : sorted;

  if (currentView === 'cloud') {
    renderTagCloud(filtered);
  } else {
    renderTags(filtered);
  }
});

function renderTagCloud(tags) {
  tagsContainer.innerHTML = '';
  tagsContainer.classList.add('cloud-view');

  if (tags.length === 0) {
    tagsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">${t('noTags')}</p>`;
    return;
  }

  const maxLen = Math.max(...tags.map(t => t.length));
  const minLen = Math.min(...tags.map(t => t.length));

  tags.forEach((tag, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';

    const ratio = maxLen === minLen ? 0.5 : (tag.length - minLen) / (maxLen - minLen);
    const fontSize = 0.7 + ratio * 1.2;
    const opacity = 0.6 + ratio * 0.4;

    chip.textContent = tag;
    chip.style.fontSize = `${fontSize}rem`;
    chip.style.opacity = opacity;
    chip.style.animationDelay = `${Math.min(i * 20, 400)}ms`;
    chip.title = 'Click to copy';
    chip.addEventListener('click', () => copyTagChip(chip, tag));
    tagsContainer.appendChild(chip);
  });
}

// ===========================
// SEO Score Calculator
// ===========================
function calculateSeoScore(video) {
  const { snippet, statistics } = video;
  const tags = snippet.tags || [];
  const title = snippet.title || '';
  const description = snippet.description || '';
  const checks = [];
  let score = 0;

  // 1. Has tags
  const hasTags = tags.length > 0;
  checks.push({ label: `Has tags (${tags.length})`, pass: hasTags });
  if (hasTags) score += 15;

  // 2. Tag count 5+
  const enoughTags = tags.length >= 5;
  checks.push({ label: `5+ tags`, pass: enoughTags });
  if (enoughTags) score += 10;

  // 3. Tag count 15+
  const manyTags = tags.length >= 15;
  checks.push({ label: `15+ tags`, pass: manyTags });
  if (manyTags) score += 10;

  // 4. Tags within 500 char limit
  const charCount = tags.join(',').length;
  const withinLimit = charCount <= 500;
  checks.push({ label: `Tags within 500 chars (${charCount})`, pass: withinLimit });
  if (withinLimit) score += 10;

  // 5. Tags use >60% of limit (good utilization)
  const goodUtil = charCount >= 300 && charCount <= 500;
  checks.push({ label: `Good tag utilization (300-500 chars)`, pass: goodUtil });
  if (goodUtil) score += 10;

  // 6. Title length 30-70 chars
  const goodTitle = title.length >= 30 && title.length <= 70;
  checks.push({ label: `Title length 30-70 chars (${title.length})`, pass: goodTitle });
  if (goodTitle) score += 10;

  // 7. Description length > 200 chars
  const goodDesc = description.length >= 200;
  checks.push({ label: `Description 200+ chars (${description.length})`, pass: goodDesc });
  if (goodDesc) score += 10;

  // 8. Tags appear in title
  const titleLower = title.toLowerCase();
  const titleMatch = tags.some(t => titleLower.includes(t.toLowerCase()));
  checks.push({ label: `Tag matches in title`, pass: titleMatch });
  if (titleMatch) score += 10;

  // 9. Tags appear in description
  const descLower = description.toLowerCase();
  const descMatch = tags.some(t => descLower.includes(t.toLowerCase()));
  checks.push({ label: `Tag matches in description`, pass: descMatch });
  if (descMatch) score += 10;

  // 10. Has a mix of short and long tags
  const hasShort = tags.some(t => t.split(' ').length === 1);
  const hasLong = tags.some(t => t.split(' ').length >= 3);
  const mixedLen = hasShort && hasLong;
  checks.push({ label: `Mix of short & long-tail tags`, pass: mixedLen });
  if (mixedLen) score += 5;

  return { score, checks };
}

function renderSeoScore(video) {
  const { score, checks } = calculateSeoScore(video);

  seoRingValue.textContent = score;
  seoRing.className = 'seo-ring ' + (score >= 70 ? 'good' : score >= 40 ? 'ok' : 'bad');

  seoChecklist.innerHTML = '';
  checks.forEach(c => {
    const el = document.createElement('div');
    el.className = `seo-check ${c.pass ? 'pass' : 'fail'}`;
    el.textContent = `${c.pass ? '✓' : '✗'} ${c.label}`;
    seoChecklist.appendChild(el);
  });

  seoScoreSection.hidden = false;
}

// ===========================
// Bulk Extract Mode
// ===========================
async function handleBulk() {
  hideError();
  results.hidden = true;
  compareResults.hidden = true;
  bulkResults.hidden = true;

  const text = bulkUrls.value.trim();
  if (!text) {
    showError('Please enter at least one YouTube URL.');
    return;
  }

  const urls = text.split('\n').map(u => u.trim()).filter(Boolean);
  const ids = urls.map(u => ({ url: u, id: extractVideoId(u) })).filter(x => x.id);

  if (ids.length === 0) {
    showError(t('errInvalid'));
    return;
  }

  setLoading(true);
  bulkData = [];

  try {
    for (const { url, id } of ids) {
      try {
        const video = await fetchVideoData(id);
        bulkData.push({
          title: video.snippet.title,
          tags: video.snippet.tags || [],
          url: url,
          videoId: id,
        });
      } catch {
        bulkData.push({ title: `Error: ${url}`, tags: [], url, videoId: id });
      }
    }

    renderBulkResults();
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function renderBulkResults() {
  bulkResultsList.innerHTML = '';

  bulkData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bulk-result-card';

    const title = document.createElement('div');
    title.className = 'bulk-result-title';
    title.textContent = `${item.title} (${item.tags.length} tags)`;
    card.appendChild(title);

    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'bulk-result-tags';
    item.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = tag;
      chip.title = 'Click to copy';
      chip.addEventListener('click', () => {
        copyToClipboard(tag);
        chip.classList.add('copied');
        showToast(`Copied: "${tag}"`);
        setTimeout(() => chip.classList.remove('copied'), 1500);
      });
      tagsWrap.appendChild(chip);
    });
    card.appendChild(tagsWrap);
    bulkResultsList.appendChild(card);
  });

  bulkResults.hidden = false;
  bulkResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===========================
// CSV Export
// ===========================
exportCsvBtn.addEventListener('click', () => {
  if (bulkData.length === 0) return;

  const rows = [['Video Title', 'Video URL', 'Tags']];
  bulkData.forEach(item => {
    rows.push([
      `"${item.title.replace(/"/g, '""')}"`,
      item.url,
      `"${item.tags.join(', ').replace(/"/g, '""')}"`,
    ]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tagextract-bulk-results.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported as CSV');
});

// ===========================
// URL Parameter Support (?v=VIDEO_ID)
// ===========================
function checkUrlParam() {
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get('v');
  if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    urlInput.value = `https://www.youtube.com/watch?v=${videoId}`;
    handleExtract();
  } else {
    // Auto-focus input for immediate typing
    urlInput.focus();
  }
}

checkUrlParam();

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

// ===========================
// Tag Basket (collect tags across videos)
// ===========================
function getBasket() {
  try { return JSON.parse(localStorage.getItem('tagextract_basket') || '[]'); }
  catch { return []; }
}

function saveBasket(basket) {
  localStorage.setItem('tagextract_basket', JSON.stringify(basket));
  renderBasket();
}

function addToBasket(tag) {
  const basket = getBasket();
  if (basket.includes(tag)) {
    showToast(`"${tag}" already in basket`);
    return;
  }
  basket.push(tag);
  saveBasket(basket);
  showToast(`Added "${tag}" to basket`);
}

function renderBasket() {
  const basket = getBasket();
  if (basket.length === 0) {
    basketSection.hidden = true;
    return;
  }

  basketSection.hidden = false;
  basketCount.textContent = `(${basket.length})`;
  basketContainer.innerHTML = '';

  basket.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = tag;
    chip.title = 'Click to remove';
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', () => {
      const updated = getBasket().filter(t => t !== tag);
      saveBasket(updated);
      showToast(`Removed "${tag}" from basket`);
    });
    basketContainer.appendChild(chip);
  });
}

copyBasketBtn.addEventListener('click', () => {
  const basket = getBasket();
  if (basket.length === 0) return;
  copyToClipboard(basket.join(', '));
  showToast(`Copied ${basket.length} basket tags`);
});

clearBasketBtn.addEventListener('click', () => {
  localStorage.removeItem('tagextract_basket');
  renderBasket();
  showToast('Basket cleared');
});

renderBasket();

// ===========================
// Tag Analysis Charts
// ===========================
function renderTagCharts(tags) {
  const chartSection = document.getElementById('tag-chart-section');
  if (tags.length === 0) { chartSection.hidden = true; return; }
  chartSection.hidden = false;

  // Tag length distribution (buckets)
  const buckets = { '1-10': 0, '11-20': 0, '21-30': 0, '31-50': 0, '50+': 0 };
  tags.forEach(t => {
    const len = t.length;
    if (len <= 10) buckets['1-10']++;
    else if (len <= 20) buckets['11-20']++;
    else if (len <= 30) buckets['21-30']++;
    else if (len <= 50) buckets['31-50']++;
    else buckets['50+']++;
  });
  renderBarChart('tag-length-chart', buckets, 'accent');

  // Word count per tag
  const wordBuckets = { '1 word': 0, '2 words': 0, '3 words': 0, '4+ words': 0 };
  tags.forEach(t => {
    const wc = t.trim().split(/\s+/).length;
    if (wc === 1) wordBuckets['1 word']++;
    else if (wc === 2) wordBuckets['2 words']++;
    else if (wc === 3) wordBuckets['3 words']++;
    else wordBuckets['4+ words']++;
  });
  renderBarChart('tag-word-chart', wordBuckets, 'primary');
}

function renderBarChart(containerId, data, colorClass) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const max = Math.max(...Object.values(data), 1);

  Object.entries(data).forEach(([label, value]) => {
    const pct = (value / max) * 100;
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="bar-label">${label}</span>
      <div class="bar-track"><div class="bar-fill ${colorClass}" style="width:${pct}%"></div></div>
      <span class="bar-value">${value}</span>
    `;
    container.appendChild(row);
  });
}

// ===========================
// Scroll to Top Button
// ===========================
const scrollTopBtn = document.getElementById('scroll-top');

window.addEventListener('scroll', () => {
  scrollTopBtn.hidden = window.scrollY < 300;
}, { passive: true });

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===========================
// Keyboard Shortcuts
// ===========================
const shortcutsModal = document.getElementById('shortcuts-modal');
const closeShortcuts = document.getElementById('close-shortcuts');

document.addEventListener('keydown', (e) => {
  // Don't trigger when typing in inputs
  const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

  if (e.key === '?' && !inInput) {
    e.preventDefault();
    shortcutsModal.hidden = !shortcutsModal.hidden;
  }

  if (e.key === 'Escape') {
    if (!shortcutsModal.hidden) {
      shortcutsModal.hidden = true;
    } else if (!results.hidden) {
      results.hidden = true;
      seoScoreSection.hidden = true;
      document.getElementById('tag-chart-section').hidden = true;
      keywordsSection.hidden = true;
      socialShare.hidden = true;
    }
  }

  if (e.key === 't' && !inInput) {
    themeToggle.click();
  }
});

closeShortcuts.addEventListener('click', () => { shortcutsModal.hidden = true; });
shortcutsModal.addEventListener('click', (e) => {
  if (e.target === shortcutsModal) shortcutsModal.hidden = true;
});

// ===========================
// Confetti Effect (first copy celebration)
// ===========================
let hasConfettied = false;

function triggerConfetti() {
  if (hasConfettied) return;
  hasConfettied = true;

  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#ff0050', '#00d4ff', '#00e676', '#ffab40', '#e040fb'];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -14 - 4,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.3,
      life: 1,
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.life -= 0.015;

      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
    });

    ctx.globalAlpha = 1;
    frame++;
    if (alive && frame < 120) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  animate();
}

// ===========================
// Social Share Links
// ===========================
const shareTwitter = document.getElementById('share-twitter');
const shareFacebook = document.getElementById('share-facebook');
const shareWhatsapp = document.getElementById('share-whatsapp');

function updateSocialLinks() {
  if (!currentVideoId) return;
  const shareUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}?v=${currentVideoId}`);
  const text = encodeURIComponent(`Check out the tags for this YouTube video! - TagExtract Pro`);

  shareTwitter.href = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`;
  shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  shareWhatsapp.href = `https://wa.me/?text=${text}%20${shareUrl}`;
  socialShare.hidden = false;
}
