'use strict';
const grid = document.querySelector('#grid');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
const jump = document.querySelector('#tool-jump');
const dialog = document.querySelector('#preview-dialog');
const viewerImage = document.querySelector('#viewer-image');
const viewerCanvas = document.querySelector('#viewer-canvas');
const zoomLevels = [1, 1.5, 2, 3];
let viewer = null;
let zoomIndex = 0;
let returnFocus = null;
let tools = [];
let category = 'すべて';
const galleryObservers = [];
// The sticky bar can grow with the device width or enlarged text.
if (typeof ResizeObserver !== 'undefined') {
  const toolbar = document.querySelector('.toolbar');
  const toolbarObserver = new ResizeObserver(() => {
    document.documentElement.style.setProperty('--toolbar-height', `${toolbar.getBoundingClientRect().height}px`);
  });
  toolbarObserver.observe(toolbar);
}
function normalized(text) { return text.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
function publicTools() {
  return tools.filter(tool => {
    try { return tool.public === true && new URL(tool.url).protocol === 'https:'; } catch { return false; }
  });
}
function setZoom(index) {
  zoomIndex = Math.max(0, Math.min(zoomLevels.length - 1, index));
  const scale = zoomLevels[zoomIndex];
  viewerCanvas.classList.toggle('is-zoomed', scale > 1);
  viewerImage.style.setProperty('--preview-zoom', scale);
  document.querySelector('#viewer-zoom-level').textContent = `${scale * 100}%`;
  document.querySelector('#viewer-zoom-out').disabled = zoomIndex === 0;
  document.querySelector('#viewer-zoom-in').disabled = zoomIndex === zoomLevels.length - 1;
  viewerCanvas.scrollTo({left:0, top:0, behavior:'auto'});
}
function showViewerImage(index) {
  if (!viewer) return;
  viewer.index = Math.max(0, Math.min(viewer.pictures.length - 1, index));
  const picture = viewer.pictures[viewer.index];
  viewerImage.src = picture.src;
  viewerImage.alt = `${viewer.tool.name}：${picture.caption || '画面プレビュー'}${viewer.tool.thumbnailDemo ? '（名前・記録は架空）' : ''}`;
  document.querySelector('#viewer-title').textContent = viewer.tool.name;
  document.querySelector('#viewer-caption').textContent = `${viewer.index + 1} / ${viewer.pictures.length}　${picture.caption || '画面プレビュー'}`;
  document.querySelector('#viewer-previous').disabled = viewer.index === 0;
  document.querySelector('#viewer-next').disabled = viewer.index === viewer.pictures.length - 1;
  document.querySelector('#viewer-demo').hidden = viewer.tool.thumbnailDemo !== true;
  setZoom(0);
  viewer.go(viewer.index);
}
function openViewer(tool, pictures, index, go, trigger) {
  viewer = {tool, pictures, index, go};
  returnFocus = trigger;
  viewerImage.hidden = false;
  showViewerImage(index);
  dialog.showModal();
  document.body.classList.add('viewer-open');
  document.documentElement.classList.add('viewer-open');
}
document.querySelector('#viewer-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  document.body.classList.remove('viewer-open');
  document.documentElement.classList.remove('viewer-open');
  viewerImage.removeAttribute('src');
  viewer = null;
  const target = returnFocus?.();
  if (target?.isConnected) target.focus({preventScroll:true});
  returnFocus = null;
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    const focusable = Array.from(dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (first && event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (last && !event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    return;
  }
  // While zoomed, arrow keys remain available for panning the image.
  if (!viewer || zoomIndex > 0) return;
  if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
    event.preventDefault();
    showViewerImage(event.key === 'Home' ? 0 : event.key === 'End' ? viewer.pictures.length - 1 : viewer.index + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
document.querySelector('#viewer-previous').addEventListener('click', () => { if (viewer) showViewerImage(viewer.index - 1); });
document.querySelector('#viewer-next').addEventListener('click', () => { if (viewer) showViewerImage(viewer.index + 1); });
document.querySelector('#viewer-zoom-out').addEventListener('click', () => setZoom(zoomIndex - 1));
document.querySelector('#viewer-zoom-in').addEventListener('click', () => setZoom(zoomIndex + 1));
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
  const imageButtons = [];
  const slides = [];
  pictures.forEach((picture, index) => {
    const slide = document.createElement('figure'); slide.className = 'gallery-slide';
    slide.setAttribute('role', 'group'); slide.setAttribute('aria-roledescription','スライド');
    slide.setAttribute('aria-label', `${index + 1} / ${pictures.length}`);
    const image = document.createElement('img'); image.src = picture.src;
    image.alt = `${tool.name}：${picture.caption || '画面プレビュー'}${tool.thumbnailDemo ? '（名前・記録は架空）' : ''}`;
    image.width = 800; image.height = 450; image.loading = eager && index === 0 ? 'eager' : 'lazy'; image.decoding = 'async'; image.draggable = false;
    image.addEventListener('error', () => {image.hidden = true; slide.classList.add('preview-unavailable');});
    const open = document.createElement('button'); open.type = 'button'; open.className = 'preview-open';
    open.setAttribute('aria-label', `${tool.name}の画像 ${index + 1} / ${pictures.length} を拡大：${picture.caption || '画面プレビュー'}`);
    open.addEventListener('click', () => openViewer(tool, pictures, index, go, () => imageButtons[selected]));
    open.append(image); slide.append(open); track.append(slide); imageButtons.push(open); slides.push(slide);
  });
  const expand = document.createElement('button'); expand.type = 'button'; expand.className = 'gallery-expand'; expand.textContent = '⛶ 拡大';
  expand.setAttribute('aria-label', `${tool.name}の選択中の画像を拡大`);
  expand.addEventListener('click', () => openViewer(tool, pictures, selected, go, () => expand));
  viewport.append(track, counter, expand);
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
    slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', String(i !== selected));
      imageButtons[i].tabIndex = i === selected ? 0 : -1;
    });
  }
  function go(index) {
    const target = Math.max(0, Math.min(pictures.length - 1, index));
    const moveFocus = imageButtons.includes(document.activeElement);
    track.scrollTo({left:target * track.clientWidth, behavior:'auto'});
    update(target);
    if (moveFocus) imageButtons[target].focus({preventScroll:true});
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
    } else if ((event.key === 'Enter' || event.key === ' ') && event.target === track) {
      event.preventDefault(); openViewer(tool, pictures, selected, go, () => track);
    }
  });
  // Preserve the selected slide if a phone rotates or the card changes width.
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      if (track.isConnected && track.clientWidth) {
        observedWidth = track.clientWidth;
        track.scrollTo({left:selected * observedWidth,behavior:'auto'});
      }
    });
    observer.observe(track); galleryObservers.push(observer);
  }
  middle.append(caption, dots); controls.append(previous, middle, next); preview.append(viewport, controls);
  if (pictures.length < 2) { previous.hidden = true; next.hidden = true; dots.hidden = true; controls.className += ' single'; }
  update(0); return preview;
}

function render() {
  galleryObservers.splice(0).forEach(observer => observer.disconnect());
  grid.replaceChildren();
  const query = normalized(search.value.trim());
  const visible = publicTools().filter(t => (category === 'すべて' || t.category === category) && normalized(t.name + t.description + t.category).includes(query));
  document.querySelector('#count').textContent = `${visible.length}件`;
  status.textContent = visible.length ? '' : '表示できるツールがありません。カテゴリや検索条件を変えてみてください。';
  for (const tool of visible) {
    // Only HTTPS destinations are eligible. No remote HTML is inserted.
    try { if (new URL(tool.url).protocol !== 'https:') continue; } catch { continue; }
    const card = document.createElement('article');
    card.className = 'card'; card.dataset.id = tool.id;
    card.id = `tool-${tool.id}`;
    const preview = makePreview(tool, grid.children.length === 0);
    const content = document.createElement('div'); content.className = 'card-content';
    const top = document.createElement('div'); top.className = 'card-top';
    const icon = document.createElement('span'); icon.className = 'tool-icon'; icon.textContent = tool.icon; icon.setAttribute('aria-hidden', 'true');
    const badge = document.createElement('span'); badge.className = 'category'; badge.textContent = tool.category;
    const title = document.createElement('h3');
    const titleLink = document.createElement('a'); titleLink.href = tool.url; titleLink.target = '_blank'; titleLink.rel = 'noopener noreferrer'; titleLink.textContent = tool.name; titleLink.setAttribute('aria-label', `${tool.name}（新しいタブで開く）`); title.append(titleLink);
    top.append(icon, title, badge);
    const desc = document.createElement('p'); desc.textContent = tool.description;
    const bottom = document.createElement('a'); bottom.className = 'card-bottom'; bottom.href = tool.url; bottom.target = '_blank'; bottom.rel = 'noopener noreferrer'; bottom.setAttribute('aria-label', `${tool.name}を開く（新しいタブ）`);
    const label = document.createElement('span'); label.textContent = 'ツールを開く';
    const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    const footer = document.createElement('div'); footer.className = 'card-footer';
    bottom.append(label, arrow); footer.append(bottom); content.append(top, desc); card.append(content, preview, footer); grid.append(card);
  }
}
async function load() {
  if (dialog.open) dialog.close();
  galleryObservers.splice(0).forEach(observer => observer.disconnect());
  tools = []; grid.replaceChildren(); updateJump();
  document.querySelector('#count').textContent = '';
  document.querySelector('#retry').hidden = true;
  status.textContent = 'ツールを読み込んでいます…';
  try {
    const response = await fetch(`tools.json?t=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (!Array.isArray(data.tools)) throw new Error();
    tools = data.tools; updateJump(); render();
  } catch {
    status.textContent = 'ツール一覧を読み込めませんでした。通信を確認して、もう一度お試しください。';
    document.querySelector('#retry').hidden = false;
  }
}
function updateJump() {
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'ツールへ移動';
  jump.replaceChildren(placeholder);
  const published = publicTools();
  published.forEach(tool => {
    const option = document.createElement('option'); option.value = tool.id; option.textContent = `${tool.icon} ${tool.name}`; jump.append(option);
  });
  jump.disabled = published.length === 0;
  jump.value = '';
}
function setCategory(value) {
  category = value;
  document.querySelectorAll('.filter').forEach(button => {
    const active = button.dataset.category === category;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
}
jump.addEventListener('change', () => {
  const id = jump.value;
  if (!publicTools().some(tool => tool.id === id)) return;
  search.value = ''; setCategory('すべて'); render();
  const card = Array.from(grid.children).find(element => element.dataset.id === id);
  if (card) {
    card.scrollIntoView({behavior:'auto', block:'start'});
    const title = card.querySelector('h3'); title.tabIndex = -1; title.focus({preventScroll:true});
  }
  jump.value = '';
});
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  setCategory(button.dataset.category);
  render();
}));
search.addEventListener('input', render);
document.querySelector('#retry').addEventListener('click', load);
window.addEventListener('pageshow', event => { if (event.persisted) load(); });
load();
