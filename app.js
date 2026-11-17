'use strict';
const grid = document.querySelector('#grid');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
let tools = [];
let category = 'すべて';
const galleryObservers = [];
function normalized(text) { return text.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
function makePreview(tool, eager) {
  const allowed = path => typeof path === 'string' && /^assets\/thumbnails\/[a-z0-9-]+\.webp$/.test(path);
  let pictures = Array.isArray(tool.previews) ? tool.previews.filter(p => p && allowed(p.src)).slice(0, 10) : [];
  if (!pictures.length && allowed(tool.thumbnail)) pictures = [{src:tool.thumbnail, caption:'画面プレビュー'}];
  const preview = document.createElement('div'); preview.className = 'card-preview';
  if (!pictures.length) return preview;
  preview.setAttribute('role', 'group'); preview.setAttribute('aria-roledescription', 'カルーセル');
  preview.setAttribute('aria-label', `${tool.name}の画面プレビュー ${pictures.length}枚`);
  const viewport = document.createElement('div'); viewport.className = 'gallery-viewport';
  const track = document.createElement('div'); track.className = 'gallery-track'; track.tabIndex = 0;
  track.setAttribute('aria-label', `${tool.name}の画像。左右にスワイプ、または左右矢印キーで切り替え`);
  const counter = document.createElement('span'); counter.className = 'gallery-count'; counter.setAttribute('aria-hidden','true');
  pictures.forEach((picture, index) => {
    const slide = document.createElement('figure'); slide.className = 'gallery-slide';
    slide.setAttribute('role', 'group'); slide.setAttribute('aria-roledescription','スライド');
    slide.setAttribute('aria-label', `${index + 1} / ${pictures.length}`);
    const image = document.createElement('img'); image.src = picture.src;
    image.alt = `${tool.name}：${picture.caption || '画面プレビュー'}${tool.thumbnailDemo ? '（名前・記録は架空）' : ''}`;
    image.width = 800; image.height = 450; image.loading = eager && index === 0 ? 'eager' : 'lazy'; image.decoding = 'async';
    image.addEventListener('error', () => {image.hidden = true; slide.classList.add('preview-unavailable');});
    slide.append(image); track.append(slide);
  });
  viewport.append(track, counter);
  if (tool.thumbnailDemo === true) {
    const note = document.createElement('span'); note.className = 'preview-note'; note.textContent = '架空名のデモ画面'; viewport.append(note);
  }
  const controls = document.createElement('div'); controls.className = 'gallery-controls';
  const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'gallery-arrow'; previous.textContent = '‹';
  previous.setAttribute('aria-label', `${tool.name}の前の画像`);
  const next = document.createElement('button'); next.type = 'button'; next.className = 'gallery-arrow'; next.textContent = '›';
  next.setAttribute('aria-label', `${tool.name}の次の画像`);
  const middle = document.createElement('div'); middle.className = 'gallery-middle';
  const caption = document.createElement('p'); caption.className = 'gallery-caption'; caption.setAttribute('aria-live','polite'); caption.setAttribute('aria-atomic','true');
  const dots = document.createElement('div'); dots.className = 'gallery-dots'; dots.setAttribute('aria-hidden','true');
  const dotItems = pictures.map(() => { const dot = document.createElement('span'); dots.append(dot); return dot; });
  let selected = 0;
  let observedWidth = 0;
  function update(index) {
    selected = Math.max(0, Math.min(pictures.length - 1, index));
    counter.textContent = `${selected + 1} / ${pictures.length}`;
    caption.textContent = `${selected + 1} / ${pictures.length}　${pictures[selected].caption || '画面プレビュー'}`;
    previous.disabled = selected === 0; next.disabled = selected === pictures.length - 1;
    dotItems.forEach((dot, i) => dot.classList.toggle('active', i === selected));
  }
  function go(index) {
    const target = Math.max(0, Math.min(pictures.length - 1, index));
    track.scrollTo({left:target * track.clientWidth, behavior:'instant'});
    update(target);
  }
  previous.addEventListener('click', () => go(selected - 1));
  next.addEventListener('click', () => go(selected + 1));
  track.addEventListener('scroll', () => {
    const width = track.clientWidth;
    if (width && (!observedWidth || observedWidth === width)) update(Math.round(track.scrollLeft / width));
  }, {passive:true});
  track.addEventListener('keydown', event => {
    if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); go(event.key === 'Home' ? 0 : event.key === 'End' ? pictures.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  // Preserve the selected slide if a phone rotates or the card changes width.
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      if (track.isConnected && track.clientWidth) {
        observedWidth = track.clientWidth;
        track.scrollTo({left:selected * observedWidth,behavior:'instant'});
      }
    });
    observer.observe(track); galleryObservers.push(observer);
  }
  middle.append(caption, dots); controls.append(previous, middle, next); preview.append(viewport, controls);
  if (pictures.length < 2) controls.hidden = true;
  update(0); return preview;
}

function render() {
  galleryObservers.splice(0).forEach(observer => observer.disconnect());
  grid.replaceChildren();
  const query = normalized(search.value.trim());
  const visible = tools.filter(t => t.public === true && (category === 'すべて' || t.category === category) && normalized(t.name + t.description + t.category).includes(query));
  document.querySelector('#count').textContent = `${visible.length}件`;
  status.textContent = visible.length ? '' : '表示できるツールがありません。カテゴリや検索条件を変えてみてください。';
  for (const tool of visible) {
    // Only HTTPS destinations are eligible. No remote HTML is inserted.
    try { if (new URL(tool.url).protocol !== 'https:') continue; } catch { continue; }
    const card = document.createElement('article');
    card.className = 'card'; card.dataset.id = tool.id;
    const preview = makePreview(tool, grid.children.length === 0);
    const content = document.createElement('div'); content.className = 'card-content';
    const top = document.createElement('div'); top.className = 'card-top';
    const icon = document.createElement('span'); icon.className = 'tool-icon'; icon.textContent = tool.icon; icon.setAttribute('aria-hidden', 'true');
    const badge = document.createElement('span'); badge.className = 'category'; badge.textContent = tool.category;
    top.append(icon, badge);
    const title = document.createElement('h3');
    const titleLink = document.createElement('a'); titleLink.href = tool.url; titleLink.target = '_blank'; titleLink.rel = 'noopener noreferrer'; titleLink.textContent = tool.name; titleLink.setAttribute('aria-label', `${tool.name}（新しいタブで開く）`); title.append(titleLink);
    const desc = document.createElement('p'); desc.textContent = tool.description;
    const bottom = document.createElement('a'); bottom.className = 'card-bottom'; bottom.href = tool.url; bottom.target = '_blank'; bottom.rel = 'noopener noreferrer'; bottom.setAttribute('aria-label', `${tool.name}を開く（新しいタブ）`);
    const label = document.createElement('span'); label.textContent = 'ツールを開く';
    const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    bottom.append(label, arrow); content.append(top, title, desc, bottom); card.append(preview, content); grid.append(card);
  }
}
async function load() {
  galleryObservers.splice(0).forEach(observer => observer.disconnect());
  tools = []; grid.replaceChildren();
  document.querySelector('#count').textContent = '';
  document.querySelector('#retry').hidden = true;
  status.textContent = 'ツールを読み込んでいます…';
  try {
    const response = await fetch(`tools.json?t=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (!Array.isArray(data.tools)) throw new Error();
    tools = data.tools; render();
  } catch {
    status.textContent = 'ツール一覧を読み込めませんでした。通信を確認して、もう一度お試しください。';
    document.querySelector('#retry').hidden = false;
  }
}
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.category;
  document.querySelectorAll('.filter').forEach(b => {b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button));});
  render();
}));
search.addEventListener('input', render);
document.querySelector('#retry').addEventListener('click', load);
window.addEventListener('pageshow', event => { if (event.persisted) load(); });
load();
