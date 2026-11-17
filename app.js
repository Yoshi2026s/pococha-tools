'use strict';
const grid = document.querySelector('#grid');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
let tools = [];
let category = 'すべて';
function normalized(text) { return text.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
function render() {
  grid.replaceChildren();
  const query = normalized(search.value.trim());
  const visible = tools.filter(t => t.public === true && (category === 'すべて' || t.category === category) && normalized(t.name + t.description + t.category).includes(query));
  document.querySelector('#count').textContent = `${visible.length}件`;
  status.textContent = visible.length ? '' : '表示できるツールがありません。カテゴリや検索条件を変えてみてください。';
  for (const tool of visible) {
    // Only HTTPS destinations are eligible. No remote HTML is inserted.
    try { if (new URL(tool.url).protocol !== 'https:') continue; } catch { continue; }
    const card = document.createElement('a');
    card.className = 'card'; card.dataset.id = tool.id;
    card.href = tool.url; card.target = '_blank'; card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', `${tool.icon} ${tool.name}（新しいタブで開く）`);
    const preview = document.createElement('div'); preview.className = 'card-preview';
    if (typeof tool.thumbnail === 'string' && /^assets\/thumbnails\/[a-z]+(?:-demo)?\.webp$/.test(tool.thumbnail)) {
      const image = document.createElement('img');
      image.src = tool.thumbnail; image.alt = tool.thumbnailDemo ? `${tool.name}のデモ画面（名前は架空）` : `${tool.name}の画面の一部`;
      image.width = 800; image.height = 450; image.loading = grid.children.length === 0 ? 'eager' : 'lazy'; image.decoding = 'async';
      image.addEventListener('error', () => {image.hidden = true; preview.classList.add('preview-unavailable');});
      preview.append(image);
      if (tool.thumbnailDemo === true) {
        const note = document.createElement('span'); note.className = 'preview-note';
        note.textContent = '架空名のデモ画面'; preview.append(note);
      }
    }
    const content = document.createElement('div'); content.className = 'card-content';
    const top = document.createElement('div'); top.className = 'card-top';
    const icon = document.createElement('span'); icon.className = 'tool-icon'; icon.textContent = tool.icon; icon.setAttribute('aria-hidden', 'true');
    const badge = document.createElement('span'); badge.className = 'category'; badge.textContent = tool.category;
    top.append(icon, badge);
    const title = document.createElement('h3'); title.textContent = tool.name;
    const desc = document.createElement('p'); desc.textContent = tool.description;
    const bottom = document.createElement('div'); bottom.className = 'card-bottom';
    const label = document.createElement('span'); label.textContent = 'ツールを開く';
    const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    bottom.append(label, arrow); content.append(top, title, desc, bottom); card.append(preview, content); grid.append(card);
  }
}
async function load() {
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
