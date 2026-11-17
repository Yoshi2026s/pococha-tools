'use strict';
const OWNER = 'Yoshi2026s';
const REPO = 'pococha-tools';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const FILE = '/contents/tools.json';
let token = null;
let snapshot = null;
let busy = false;
const message = document.querySelector('#admin-status');
function say(text, error = false) { message.textContent = text; message.classList.toggle('error', error); }
async function api(url, options = {}) {
  const response = await fetch(url, {...options, cache:'no-store', headers:{
    Accept:'application/vnd.github+json', Authorization:`Bearer ${token}`,
    'X-GitHub-Api-Version':'2022-11-28', ...options.headers
  }});
  if (!response.ok) {
    const texts = {401:'認証に失敗しました。トークンと有効期限を確認してください。',403:'権限が不足しています。対象リポジトリのContents: Read and writeを確認してください。',404:'リポジトリまたは設定ファイルにアクセスできません。トークンの対象リポジトリを確認してください。',409:'別の変更が保存されています。最新版を読み直してから再操作してください。',422:'保存できませんでした。GitHubのブランチ保護などの設定を確認してください。',429:'GitHubの制限に達しました。しばらくしてから再操作してください。'};
    throw new Error(texts[response.status] || `GitHubとの通信に失敗しました（${response.status}）。`);
  }
  return response.json();
}
function decode(content) { return new TextDecoder('utf-8', {fatal:true}).decode(Uint8Array.from(atob(content.replace(/\s/g,'')), c => c.charCodeAt(0))); }
function encode(content) { return btoa(Array.from(new TextEncoder().encode(content), b => String.fromCharCode(b)).join('')); }
async function read() {
  const file = await api(`${API}${FILE}?ref=main`);
  const data = JSON.parse(decode(file.content));
  if (!Array.isArray(data.tools) || !data.tools.every(t => typeof t.id === 'string' && typeof t.public === 'boolean')) throw new Error('設定ファイルの形式が正しくありません。GitHubで確認してください。');
  return {sha:file.sha, data};
}
function render() {
  const list = document.querySelector('#admin-list'); list.replaceChildren();
  for (const tool of snapshot.data.tools) {
    const row = document.createElement('div'); row.className = 'admin-row';
    const label = document.createElement('div');
    const title = document.createElement('h3'); title.textContent = `${tool.icon} ${tool.name}`;
    const state = document.createElement('small'); state.textContent = tool.public ? '広場に掲載中' : '広場では非表示';
    label.append(title, state);
    const button = document.createElement('button'); button.className = 'toggle'; button.type = 'button';
    button.setAttribute('role','switch'); button.setAttribute('aria-checked', String(tool.public));
    button.setAttribute('aria-label', `${tool.name}の一般公開`);
    button.textContent = tool.public ? '● 一般公開' : '○ 非公開';
    button.addEventListener('click', () => toggle(tool.id)); row.append(label, button); list.append(row);
  }
}
async function toggle(id) {
  if (busy || !token || !snapshot) return;
  busy = true; document.querySelectorAll('#dashboard button').forEach(b => b.disabled = true);
  const original = snapshot;
  const changed = structuredClone(original.data);
  const tool = changed.tools.find(t => t.id === id); tool.public = !tool.public;
  say(`${tool.name}を保存しています…`);
  try {
    const result = await api(`${API}${FILE}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
      message:`Set ${id} listing to ${tool.public ? 'public' : 'hidden'}`,
      content:encode(JSON.stringify(changed,null,2)+'\n'), sha:original.sha, branch:'main'
    })});
    snapshot = {data:changed, sha:result.content.sha}; render();
    say(`${tool.name}を${tool.public ? '一般公開' : '非公開'}に保存しました。公開ページへの反映には通常1〜数分かかります。`);
  } catch (error) {
    // A lost response may follow a successful commit. Re-read before allowing another write.
    snapshot = null;
    try { snapshot = await read(); render(); say(`${error.message || '通信が切断されました。'} 最新の保存状態を再取得しました。状態を確認してください。`, true); }
    catch { logout(); say('保存結果を確認できませんでした。再認証して最新の状態を確認してください。', true); }
  } finally {busy = false; document.querySelectorAll('#dashboard button').forEach(b => b.disabled = false);}
}
function logout() {
  token = null; snapshot = null;
  document.querySelector('#token').value = '';
  document.querySelector('#login-panel').hidden = false;
  document.querySelector('#dashboard').hidden = true;
  document.querySelector('#admin-list').replaceChildren(); say('ログアウトしました。');
}
document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return; busy = true;
  const input = document.querySelector('#token'); token = input.value.trim(); input.value = '';
  document.querySelector('#login').disabled = true; say('GitHubで管理者権限を確認しています…');
  try {
    const user = await api('https://api.github.com/user');
    if (user.login.toLowerCase() !== OWNER.toLowerCase()) throw new Error('この管理画面はYoshi2026s専用です。');
    const repo = await api(API);
    if (repo.permissions?.admin !== true) throw new Error('リポジトリの管理者権限を確認できません。');
    snapshot = await read(); render();
    document.querySelector('#login-panel').hidden = true;
    document.querySelector('#dashboard').hidden = false;
    say('Yoshi2026sとして認証しました。各ボタンで一般公開・非公開を切り替えられます。');
  } catch (error) {logout(); say(error.message || '通信に失敗しました。接続を確認してください。', true);}
  finally {busy = false; document.querySelector('#login').disabled = false;}
});
document.querySelector('#logout').addEventListener('click', logout);
window.addEventListener('pagehide', logout);
