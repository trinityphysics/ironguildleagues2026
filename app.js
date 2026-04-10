/* =============================================================
   IronGuild – Demonic Pact Leagues 2026
   app.js  –  Interactivity, Admin Panel, WOM API Integration
   ============================================================= */

'use strict';

// ──────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────

const WOM_GROUP_ID   = 5475;
const WOM_BASE       = 'https://api.wiseoldman.net/v2';
// Leagues points metric (WOM uses 'league_points' for current leagues event)
const WOM_METRIC     = 'league_points';

const STORAGE_KEY_CLAIMS  = 'ig_claims_2026';
const STORAGE_KEY_DRAGONS = 'ig_dragons_2026';
const STORAGE_KEY_ADMIN   = 'ig_admin_session';
const STORAGE_KEY_PASSWORD = 'ig_admin_pwd_2026';
const STORAGE_KEY_PRIZE_FUND = 'ig_prize_fund_2026';

const MAX_PRIZE_GP = 2_147_000_000;

// Default password – can be changed via the admin panel.
// This is stored hashed (SHA-256) in localStorage after first change.
const DEFAULT_PASSWORD = 'IronGuild2026!';

// ──────────────────────────────────────────────────
// Task Definitions
// ──────────────────────────────────────────────────

const TASKS = {
  'first-max': {
    icon: '🏆',
    title: 'First to MAX',
    brief: 'Be the first IronGuild member to achieve level 99 in every skill.',
    detail: `The ultimate test of dedication in Demonic Pact Leagues – be the very first IronGuild
member to achieve level 99 in ALL skills. This includes every skill available in the leagues
event. Grind hard, play smart, and claim immortality in the clan records.`,
    rewards: ['OSRS Bond'],
  },
  'first-dragon-tier': {
    icon: '🐉',
    title: 'First to Dragon Tier',
    brief: 'First to achieve the Dragon Tier rank and earn the dragon trophy.',
    detail: `Dragon Tier is the highest tier rank achievable in Demonic Pact Leagues. Be the first
IronGuild member to climb the ranks, complete the requirements, and earn the prestigious Dragon
Trophy alongside your rank. A feat of both speed and skill.`,
    rewards: ['Ingame Icon', 'Discord Role'],
  },
  'first-tier8-relic': {
    icon: '💎',
    title: 'First to Tier 8 Relic',
    brief: 'First to achieve the ultimate Tier 8 relic power.',
    detail: `Relics define your playstyle in Demonic Pact Leagues. The Tier 8 relic is the pinnacle
of relic power, unlocked through immense in-game progression. Be the first IronGuild member to
reach this milestone and shape your endgame experience with the most powerful relic available.`,
    rewards: ['OSRS Bond'],
  },
  'first-echo-items': {
    icon: '🔮',
    title: 'First to 3 Echo Items',
    brief: 'First to obtain echo items from three entirely different bosses.',
    detail: `Echo Items are rare, powerful drops available from the Demonic Pact Leagues bosses. To
claim this challenge, you must be the first IronGuild member to obtain Echo Items from THREE
DIFFERENT bosses — you can't farm the same boss three times. Show off your bossing breadth and
claim the prize.`,
    rewards: ['OSRS Bond'],
  },
  'first-pact-points': {
    icon: '⚡',
    title: 'First to 40 Pact Points',
    brief: 'First to accumulate 40 Pact Points in the combat tree.',
    detail: `Pact Points are earned by completing contracts and challenges within the Demonic Pact
Leagues combat system. Be the very first IronGuild member to rack up 40 Pact Points in your
combat tree. Focus on the most efficient contracts and power through to claim the reward.`,
    rewards: ['OSRS Bond'],
  },
  'first-max-combat': {
    icon: '⚔️',
    title: 'First to Max Combat',
    brief: 'First to 99 in Attack, Strength, Defence, HP, Prayer, Ranged & Magic.',
    detail: `The Combat Maxed title is earned by achieving level 99 in every combat skill –
Attack, Strength, Defence, Hitpoints, Prayer, Ranged, and Magic. Be the first IronGuild member
to achieve this in Demonic Pact Leagues and cement yourself as the clan's foremost combat expert.`,
    rewards: ['OSRS Bond'],
  },
};

// ──────────────────────────────────────────────────
// Utility – PBKDF2 password hashing via Web Crypto
// ──────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 200_000;

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function pbkdf2Hash(password, saltHex) {
  const enc      = new TextEncoder();
  const keyMat   = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits     = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBuf(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMat, 256
  );
  return bufToHex(bits);
}

async function hashPassword(password) {
  const saltArr = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bufToHex(saltArr);
  const hash    = await pbkdf2Hash(password, saltHex);
  return JSON.stringify({ salt: saltHex, hash });
}

async function verifyPassword(password, stored) {
  try {
    const { salt, hash } = JSON.parse(stored);
    const candidate      = await pbkdf2Hash(password, salt);
    return candidate === hash;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────
// Storage Helpers
// ──────────────────────────────────────────────────

function getClaims() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CLAIMS) || '{}');
  } catch { return {}; }
}

function saveClaims(claims) {
  localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(claims));
}

function getDragonMembers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_DRAGONS) || '[]');
  } catch { return []; }
}

function saveDragonMembers(members) {
  localStorage.setItem(STORAGE_KEY_DRAGONS, JSON.stringify(members));
}

function getPrizePledges() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PRIZE_FUND) || '[]');
  } catch { return []; }
}

function savePrizePledges(pledges) {
  localStorage.setItem(STORAGE_KEY_PRIZE_FUND, JSON.stringify(pledges));
}

function getApprovedPrizePledges() {
  return getPrizePledges().filter(p => p.status === 'approved');
}

function getApprovedPrizeFundTotal() {
  return getApprovedPrizePledges().reduce((sum, p) => sum + p.amount, 0);
}

// Returns array of { rsn, total } for each unique contributor (approved only)
function getApprovedContributors() {
  const approved = getApprovedPrizePledges();
  const map = {};
  for (const p of approved) {
    const key = p.rsn.toLowerCase();
    if (!map[key]) map[key] = { rsn: p.rsn, total: 0 };
    map[key].total += p.amount;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// Returns a Set of lowercase RSNs who have approved pledges
function getContributorRSNSet() {
  return new Set(getApprovedPrizePledges().map(p => p.rsn.toLowerCase()));
}

function isAdminLoggedIn() {
  return sessionStorage.getItem(STORAGE_KEY_ADMIN) === 'true';
}

function setAdminSession(val) {
  if (val) {
    sessionStorage.setItem(STORAGE_KEY_ADMIN, 'true');
  } else {
    sessionStorage.removeItem(STORAGE_KEY_ADMIN);
  }
}

async function getStoredPasswordHash() {
  const stored = localStorage.getItem(STORAGE_KEY_PASSWORD);
  // Validate that stored value is the expected PBKDF2 JSON format; if not
  // (e.g. leftover from an older SHA-256 format), regenerate from the default.
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.salt && parsed.hash) return stored;
    } catch { /* fall through to regenerate */ }
  }
  // Hash the default password with PBKDF2 on first load (or after format change) and persist it
  const hashed = await hashPassword(DEFAULT_PASSWORD);
  localStorage.setItem(STORAGE_KEY_PASSWORD, hashed);
  return hashed;
}

// ──────────────────────────────────────────────────
// Ember Particles
// ──────────────────────────────────────────────────

function spawnEmbers() {
  const container = document.getElementById('embers-container');
  if (!container) return;

  function createEmber() {
    const el = document.createElement('div');
    el.className = 'ember';
    const x   = Math.random() * 100;
    const dur  = 4 + Math.random() * 6;
    const size = 2 + Math.random() * 5;
    const drift = (Math.random() - 0.5) * 80;
    el.style.cssText = `
      left: ${x}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${dur}s;
      animation-delay: ${Math.random() * dur}s;
      --drift: ${drift}px;
      opacity: 0;
    `;
    container.appendChild(el);
    // Remove after two full cycles to avoid DOM bloat
    setTimeout(() => el.remove(), (dur * 2 + 2) * 1000);
  }

  // Initial batch
  for (let i = 0; i < 30; i++) createEmber();
  // Continuous spawn
  setInterval(() => createEmber(), 700);
}

// ──────────────────────────────────────────────────
// WOM API
// ──────────────────────────────────────────────────

let cachedLeaderboard = null;

async function fetchWOMLeaderboard() {
  try {
    const res  = await fetch(
      `${WOM_BASE}/groups/${WOM_GROUP_ID}/hiscores?metric=${WOM_METRIC}&limit=50`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error(`WOM API ${res.status}`);
    const data = await res.json();
    // WOM hiscores response: array of { player: { displayName }, data: { rank, level, experience } }
    cachedLeaderboard = (data || []).map((entry, idx) => ({
      rank:  idx + 1,
      name:  entry.player?.displayName || 'Unknown',
      points: entry.data?.experience ?? entry.data?.level ?? 0,
    }));
    return cachedLeaderboard;
  } catch (err) {
    console.warn('WOM API error:', err.message);
    return null;
  }
}

async function loadTop3Preview() {
  const top3TilePreview = document.getElementById('top3-tile-preview');

  const data = await fetchWOMLeaderboard();

  if (!data || data.length === 0) {
    const fallbackMsg = '<p style="color:var(--text-dim);font-size:0.82rem;text-align:center;">Could not load rankings – check Wise Old Man directly.</p>';
    if (top3TilePreview) top3TilePreview.innerHTML = fallbackMsg;
    return;
  }

  const top3 = data.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  const contributors = getContributorRSNSet();

  // Tile inner preview
  if (top3TilePreview) {
    top3TilePreview.innerHTML = top3.map((p, i) => {
      const isContributor = contributors.has(p.name.toLowerCase());
      return `
        <div class="top3-tile-card">
          <span class="rank">${medals[i]}</span>
          <span class="name">${escapeHtml(p.name)}${isContributor ? ' <span class="contributor-icon" title="Prize Fund Contributor" aria-label="Prize Fund Contributor">💰</span>' : ''}</span>
          <span class="pts">${p.points.toLocaleString()}</span>
        </div>
      `;
    }).join('');
  }
}

function buildLeaderboardTable(data) {
  if (!data || data.length === 0) {
    return '<p class="no-entries">No leaderboard data available. Try the Wise Old Man link below.</p>';
  }
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const contributors = getContributorRSNSet();
  const rows = data.map(p => {
    const isContributor = contributors.has(p.name.toLowerCase());
    const nameCell = escapeHtml(p.name) + (isContributor
      ? ' <span class="contributor-icon" title="Prize Fund Contributor" aria-label="Prize Fund Contributor">💰</span>'
      : '');
    return `
      <tr>
        <td>${medals[p.rank] ? `<span class="rank-medal">${medals[p.rank]}</span>` : `#${p.rank}`}</td>
        <td>${nameCell}</td>
        <td>${p.points.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  const total = getApprovedPrizeFundTotal();
  const fundBanner = total > 0
    ? `<div class="lb-fund-banner">💰 Clan Prize Fund: <strong>${total.toLocaleString()} GP</strong> &nbsp;·&nbsp; <span class="lb-fund-note">💰 = contributor</span></div>`
    : '';

  return `
    ${fundBanner}
    <table class="lb-table">
      <thead><tr><th>Rank</th><th>Player</th><th>Points</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ──────────────────────────────────────────────────
// Claims UI
// ──────────────────────────────────────────────────

function renderAllClaims() {
  const claims = getClaims();
  Object.keys(TASKS).forEach(id => {
    const badge    = document.getElementById(`badge-${id}`);
    const claimedEl = document.getElementById(`claimed-${id}`);
    const tile     = document.querySelector(`.task-tile[data-task-id="${id}"]`);

    if (claims[id]) {
      if (badge) {
        badge.textContent = 'Claimed!';
        badge.className   = 'tile-status-badge claimed-badge';
      }
      if (claimedEl) claimedEl.textContent = `🏅 Claimed by: ${claims[id]}`;
      if (tile)      tile.classList.add('claimed');
    } else {
      if (badge) {
        badge.textContent = 'Unclaimed';
        badge.className   = 'tile-status-badge';
      }
      if (claimedEl) claimedEl.textContent = '';
      if (tile)      tile.classList.remove('claimed');
    }
  });
}

// ──────────────────────────────────────────────────
// Dragon Members UI
// ──────────────────────────────────────────────────

function renderDragonTilePreview() {
  const members = getDragonMembers();
  const el = document.getElementById('dragon-tile-preview');
  if (!el) return;
  if (members.length === 0) {
    el.innerHTML = '<span class="dragon-count-label">No dragon members yet…</span>';
  } else {
    el.innerHTML = `<span class="dragon-count-label">🐉 ${members.length} Dragon Member${members.length !== 1 ? 's' : ''}</span>`;
  }
}

// ──────────────────────────────────────────────────
// Prize Fund UI
// ──────────────────────────────────────────────────

function renderPrizeFundTilePreview() {
  const el = document.getElementById('prize-fund-tile-preview');
  if (!el) return;
  const total = getApprovedPrizeFundTotal();
  const contributors = getApprovedContributors();
  el.innerHTML = `
    <span class="fund-total-label">💰 ${total.toLocaleString()} GP verified</span>
    ${contributors.length > 0
      ? `<span class="fund-contributors-count">${contributors.length} contributor${contributors.length !== 1 ? 's' : ''}</span>`
      : ''}
  `;
}

function renderPrizeFundModal() {
  const totalEl = document.getElementById('prize-fund-modal-total');
  const listEl  = document.getElementById('prize-fund-contributors-list');
  if (!totalEl || !listEl) return;

  const total = getApprovedPrizeFundTotal();
  const contributors = getApprovedContributors();
  const pendingCount = getPrizePledges().filter(p => p.status === 'pending').length;

  totalEl.textContent = `${total.toLocaleString()} GP`;

  if (contributors.length === 0) {
    listEl.innerHTML = '<p class="no-entries">No verified contributors yet. Be the first!</p>';
  } else {
    listEl.innerHTML = `
      <h4 class="contributors-heading">Verified Contributors</h4>
      <ul class="contributors-list">
        ${contributors.map(c => `
          <li class="contributor-item">
            <span class="contributor-icon">💰</span>
            <span class="contributor-name">${escapeHtml(c.rsn)}</span>
            <span class="contributor-amount">${c.total.toLocaleString()} GP</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  if (pendingCount > 0) {
    listEl.innerHTML += `<p class="pending-note">⏳ ${pendingCount} pledge${pendingCount !== 1 ? 's' : ''} awaiting admin verification.</p>`;
  }
}

function openPrizeFundModal() {
  const modal = document.getElementById('prize-fund-modal');
  renderPrizeFundModal();
  // Reset form
  const rsnInput    = document.getElementById('pledge-rsn-input');
  const amtInput    = document.getElementById('pledge-amount-input');
  const msgEl       = document.getElementById('pledge-submit-msg');
  if (rsnInput) rsnInput.value = '';
  if (amtInput) amtInput.value = '';
  if (msgEl) { msgEl.classList.add('hidden'); msgEl.textContent = ''; }
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closePrizeFundModal() {
  document.getElementById('prize-fund-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function renderAdminPendingPledges() {
  const list = document.getElementById('admin-pending-pledges-list');
  if (!list) return;
  const pending = getPrizePledges().filter(p => p.status === 'pending');
  if (pending.length === 0) {
    list.innerHTML = '<p class="no-entries" style="font-size:0.8rem;">No pending pledges.</p>';
    return;
  }
  list.innerHTML = pending.map((p, i) => `
    <div class="pending-pledge-item">
      <span class="pending-pledge-rsn">💰 ${escapeHtml(p.rsn)}</span>
      <span class="pending-pledge-amount">${p.amount.toLocaleString()} GP</span>
      <div class="pending-pledge-actions">
        <button class="btn btn-fire btn-sm pledge-approve-btn" data-rsn="${escapeHtml(p.rsn)}" data-amount="${p.amount}" data-ts="${p.timestamp}">Approve</button>
        <button class="btn btn-outline btn-sm pledge-reject-btn"  data-rsn="${escapeHtml(p.rsn)}" data-amount="${p.amount}" data-ts="${p.timestamp}">Reject</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.pledge-approve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { rsn, amount, ts } = btn.dataset;
      const pledges = getPrizePledges();
      const idx = pledges.findIndex(p =>
        p.rsn.toLowerCase() === rsn.toLowerCase() &&
        p.amount === Number(amount) &&
        String(p.timestamp) === ts
      );
      if (idx !== -1) {
        pledges[idx].status = 'approved';
        savePrizePledges(pledges);
        renderAdminPendingPledges();
        renderPrizeFundTilePreview();
        loadTop3Preview();
        showAdminMsg('pledge', `Approved pledge of ${Number(amount).toLocaleString()} GP from ${rsn}.`);
      }
    });
  });

  list.querySelectorAll('.pledge-reject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { rsn, amount, ts } = btn.dataset;
      const pledges = getPrizePledges();
      const idx = pledges.findIndex(p =>
        p.rsn.toLowerCase() === rsn.toLowerCase() &&
        p.amount === Number(amount) &&
        String(p.timestamp) === ts
      );
      if (idx !== -1) {
        pledges.splice(idx, 1);
        savePrizePledges(pledges);
        renderAdminPendingPledges();
        showAdminMsg('pledge', `Rejected pledge from ${rsn}.`);
      }
    });
  });
}

function wirePrizeFundModal() {
  document.getElementById('prize-pledge-form')?.addEventListener('submit', e => e.preventDefault());

  document.getElementById('pledge-submit-btn')?.addEventListener('click', () => {
    const rsnInput = document.getElementById('pledge-rsn-input');
    const amtInput = document.getElementById('pledge-amount-input');
    const msgEl    = document.getElementById('pledge-submit-msg');

    const rsn    = rsnInput?.value.trim();
    const amount = parseInt(amtInput?.value, 10);

    if (!rsn) {
      if (msgEl) { msgEl.textContent = 'Please enter your RSN.'; msgEl.className = 'admin-msg error'; msgEl.classList.remove('hidden'); }
      return;
    }
    if (rsn.length > 12) {
      if (msgEl) { msgEl.textContent = 'RSN must be 12 characters or fewer.'; msgEl.className = 'admin-msg error'; msgEl.classList.remove('hidden'); }
      return;
    }
    if (!amount || amount < 1) {
      if (msgEl) { msgEl.textContent = 'Please enter a valid GP amount (minimum 1 GP).'; msgEl.className = 'admin-msg error'; msgEl.classList.remove('hidden'); }
      return;
    }
    if (amount > MAX_PRIZE_GP) {
      if (msgEl) { msgEl.textContent = `Amount cannot exceed ${MAX_PRIZE_GP.toLocaleString()} GP.`; msgEl.className = 'admin-msg error'; msgEl.classList.remove('hidden'); }
      return;
    }

    const pledges = getPrizePledges();
    pledges.push({ rsn, amount, status: 'pending', timestamp: Date.now() });
    savePrizePledges(pledges);

    if (rsnInput) rsnInput.value = '';
    if (amtInput) amtInput.value = '';
    if (msgEl) {
      msgEl.textContent = `✅ Pledge submitted! An admin will verify it shortly.`;
      msgEl.className = 'admin-msg';
      msgEl.classList.remove('hidden');
    }
    renderPrizeFundModal();
    renderAdminPendingPledges();
  });
}

function renderDragonMembersAdmin() {
  const members = getDragonMembers();
  const list    = document.getElementById('dragon-members-list');
  if (!list) return;

  if (members.length === 0) {
    list.innerHTML = '<p class="no-entries" style="font-size:0.8rem;">No members yet.</p>';
    return;
  }

  list.innerHTML = members.map((m, i) => `
    <div class="dragon-tag">
      ${escapeHtml(m)}
      <button class="dragon-tag-remove" data-idx="${i}" aria-label="Remove ${escapeHtml(m)}">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('.dragon-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const current = getDragonMembers();
      current.splice(idx, 1);
      saveDragonMembers(current);
      renderDragonMembersAdmin();
      renderDragonTilePreview();
      showAdminMsg('dragon', `Member removed.`);
    });
  });
}

// ──────────────────────────────────────────────────
// Task Modal
// ──────────────────────────────────────────────────

let currentTaskId = null;

function openTaskModal(taskId) {
  const task   = TASKS[taskId];
  if (!task) return;
  currentTaskId = taskId;

  const modal   = document.getElementById('task-modal');
  const claims  = getClaims();

  document.getElementById('task-modal-icon').textContent  = task.icon;
  document.getElementById('task-modal-title').textContent = task.title;
  document.getElementById('task-modal-body').textContent  = task.detail;

  // Status
  const statusEl = document.getElementById('task-modal-status');
  if (claims[taskId]) {
    statusEl.textContent = `✅ Claimed by: ${claims[taskId]}`;
    statusEl.className   = 'modal-status claimed';
  } else {
    statusEl.textContent = '⏳ Unclaimed – up for grabs!';
    statusEl.className   = 'modal-status unclaimed';
  }

  // Rewards
  const rewardsEl = document.getElementById('task-modal-rewards');
  rewardsEl.innerHTML = `
    <p class="rewards-label">🎁 Rewards</p>
    ${task.rewards.map(r => `<span class="reward-tag">${escapeHtml(r)}</span>`).join('')}
  `;

  // Admin controls
  const adminEl = document.getElementById('task-modal-admin');
  if (isAdminLoggedIn()) {
    adminEl.classList.remove('hidden');
    const inp = document.getElementById('quick-claim-input');
    if (inp) inp.value = claims[taskId] || '';
  } else {
    adminEl.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.add('hidden');
  document.body.style.overflow = '';
  currentTaskId = null;
}

// ──────────────────────────────────────────────────
// Leaderboard Modal
// ──────────────────────────────────────────────────

async function openLeaderboardModal() {
  const modal   = document.getElementById('leaderboard-modal');
  const content = document.getElementById('lb-modal-content');

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  content.innerHTML = '<div class="loading-spinner">Loading leaderboard…</div>';

  const data = cachedLeaderboard || await fetchWOMLeaderboard();
  content.innerHTML = buildLeaderboardTable(data);
}

function closeLeaderboardModal() {
  document.getElementById('leaderboard-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ──────────────────────────────────────────────────
// Dragons Modal
// ──────────────────────────────────────────────────

function openDragonsModal() {
  const modal   = document.getElementById('dragons-modal');
  const listEl  = document.getElementById('dragons-modal-list');
  const members = getDragonMembers();

  if (members.length === 0) {
    listEl.innerHTML = '<p class="no-entries">No dragon members recorded yet. Be the first!</p>';
  } else {
    listEl.innerHTML = members.map(m => `
      <div class="dragon-member-item">${escapeHtml(m)}</div>
    `).join('');
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDragonsModal() {
  document.getElementById('dragons-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ──────────────────────────────────────────────────
// Admin Panel
// ──────────────────────────────────────────────────

function showAdminPanel() {
  const panel = document.getElementById('admin-panel');
  panel.classList.remove('hidden');
  document.getElementById('admin-toggle-btn').classList.add('active');
  renderDragonMembersAdmin();
  renderAdminPendingPledges();
}

function hideAdminPanel() {
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('admin-toggle-btn').classList.remove('active');
}

function showAdminMsg(scope, msg, isError = false) {
  const el = document.getElementById(`admin-${scope}-msg`);
  if (!el) return;
  el.textContent  = msg;
  el.className    = `admin-msg${isError ? ' error' : ''}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3500);
}

// ──────────────────────────────────────────────────
// Admin Login
// ──────────────────────────────────────────────────

async function checkAdminLogin(password) {
  const stored = await getStoredPasswordHash();
  return verifyPassword(password, stored);
}

function openAdminLoginModal() {
  const modal = document.getElementById('admin-login-modal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('admin-password-input').value = '';
  document.getElementById('admin-login-error').classList.add('hidden');
}

function closeAdminLoginModal() {
  document.getElementById('admin-login-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ──────────────────────────────────────────────────
// HTML Escape Helper
// ──────────────────────────────────────────────────

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

// ──────────────────────────────────────────────────
// Close on Overlay Click
// ──────────────────────────────────────────────────

function addOverlayClose(overlayId, closeFn) {
  const el = document.getElementById(overlayId);
  if (!el) return;
  el.addEventListener('click', e => {
    if (e.target === el) closeFn();
  });
}

// ──────────────────────────────────────────────────
// Keyboard Accessibility (Escape key)
// ──────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const modals = ['task-modal', 'leaderboard-modal', 'dragons-modal', 'admin-login-modal', 'prize-fund-modal'];
  for (const id of modals) {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) {
      el.querySelector('.modal-close')?.click();
      return;
    }
  }
});

// ──────────────────────────────────────────────────
// Wire Tile Clicks
// ──────────────────────────────────────────────────

function wireTileClicks() {
  document.querySelectorAll('.task-tile').forEach(tile => {
    const handler = () => {
      const id = tile.dataset.taskId;
      if (id === 'top3-players')    openLeaderboardModal();
      else if (id === 'here-be-dragons') openDragonsModal();
      else if (id === 'prize-fund') openPrizeFundModal();
      else if (TASKS[id])           openTaskModal(id);
    };

    tile.addEventListener('click', handler);
    tile.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    });
  });
}

// ──────────────────────────────────────────────────
// Wire Admin Panel Buttons
// ──────────────────────────────────────────────────

function wireAdminPanel() {
  // Claim button
  document.getElementById('admin-claim-btn')?.addEventListener('click', () => {
    const taskId  = document.getElementById('admin-task-select').value;
    const claimer = document.getElementById('admin-claimer-input').value.trim();
    if (!taskId)   { showAdminMsg('claim', 'Please select a task.', true); return; }
    if (!claimer)  { showAdminMsg('claim', 'Please enter a username.', true); return; }
    const claims   = getClaims();
    claims[taskId] = claimer;
    saveClaims(claims);
    renderAllClaims();
    showAdminMsg('claim', `Marked "${TASKS[taskId]?.title}" as claimed by ${claimer}.`);
  });

  // Unclaim button
  document.getElementById('admin-unclaim-btn')?.addEventListener('click', () => {
    const taskId = document.getElementById('admin-task-select').value;
    if (!taskId) { showAdminMsg('claim', 'Please select a task.', true); return; }
    const claims = getClaims();
    delete claims[taskId];
    saveClaims(claims);
    renderAllClaims();
    showAdminMsg('claim', `Claim removed from "${TASKS[taskId]?.title}".`);
  });

  // Add dragon member
  document.getElementById('admin-dragon-add-btn')?.addEventListener('click', () => {
    const inp     = document.getElementById('admin-dragon-input');
    const name    = inp.value.trim();
    if (!name) { showAdminMsg('dragon', 'Please enter a RSN.', true); return; }
    const members = getDragonMembers();
    if (members.includes(name)) { showAdminMsg('dragon', `${name} is already listed.`, true); return; }
    members.push(name);
    saveDragonMembers(members);
    inp.value = '';
    renderDragonMembersAdmin();
    renderDragonTilePreview();
    showAdminMsg('dragon', `${name} added to Dragon members.`);
  });

  // Enter key support for dragon input
  document.getElementById('admin-dragon-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('admin-dragon-add-btn')?.click();
  });

  // Change password
  document.getElementById('admin-change-pwd-btn')?.addEventListener('click', async () => {
    const np  = document.getElementById('admin-new-password').value;
    const cp  = document.getElementById('admin-confirm-password').value;
    if (!np)           { showAdminMsg('pwd', 'Enter a new password.', true); return; }
    if (np.length < 6) { showAdminMsg('pwd', 'Password must be at least 6 characters.', true); return; }
    if (np !== cp)     { showAdminMsg('pwd', 'Passwords do not match.', true); return; }
    const hashed = await hashPassword(np);
    localStorage.setItem(STORAGE_KEY_PASSWORD, hashed);
    document.getElementById('admin-new-password').value = '';
    document.getElementById('admin-confirm-password').value = '';
    showAdminMsg('pwd', 'Password updated successfully.');
  });

  // Logout
  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    setAdminSession(false);
    hideAdminPanel();
  });
}

// ──────────────────────────────────────────────────
// Quick-Claim Controls (inside task modal)
// ──────────────────────────────────────────────────

function wireQuickClaim() {
  document.getElementById('quick-claim-btn')?.addEventListener('click', () => {
    if (!currentTaskId) return;
    const inp     = document.getElementById('quick-claim-input');
    const claimer = inp.value.trim();
    if (!claimer) return;
    const claims       = getClaims();
    claims[currentTaskId] = claimer;
    saveClaims(claims);
    renderAllClaims();
    // Update modal status
    document.getElementById('task-modal-status').textContent = `✅ Claimed by: ${claimer}`;
    document.getElementById('task-modal-status').className   = 'modal-status claimed';
  });

  document.getElementById('quick-unclaim-btn')?.addEventListener('click', () => {
    if (!currentTaskId) return;
    const claims = getClaims();
    delete claims[currentTaskId];
    saveClaims(claims);
    renderAllClaims();
    document.getElementById('task-modal-status').textContent = '⏳ Unclaimed – up for grabs!';
    document.getElementById('task-modal-status').className   = 'modal-status unclaimed';
    document.getElementById('quick-claim-input').value = '';
  });
}

// ──────────────────────────────────────────────────
// Wire Modal Close Buttons
// ──────────────────────────────────────────────────

function wireModalCloseButtons() {
  document.getElementById('task-modal-close')?.addEventListener('click',       closeTaskModal);
  document.getElementById('lb-modal-close')?.addEventListener('click',         closeLeaderboardModal);
  document.getElementById('dragons-modal-close')?.addEventListener('click',    closeDragonsModal);
  document.getElementById('admin-login-close')?.addEventListener('click',      closeAdminLoginModal);
  document.getElementById('prize-fund-modal-close')?.addEventListener('click', closePrizeFundModal);

  addOverlayClose('task-modal',        closeTaskModal);
  addOverlayClose('leaderboard-modal', closeLeaderboardModal);
  addOverlayClose('dragons-modal',     closeDragonsModal);
  addOverlayClose('admin-login-modal', closeAdminLoginModal);
  addOverlayClose('prize-fund-modal',  closePrizeFundModal);
}

// ──────────────────────────────────────────────────
// Wire Admin Toggle Button (footer)
// ──────────────────────────────────────────────────

function wireAdminToggle() {
  document.getElementById('admin-toggle-btn')?.addEventListener('click', () => {
    if (!isAdminLoggedIn()) {
      openAdminLoginModal();
      return;
    }
    const panel = document.getElementById('admin-panel');
    if (panel.classList.contains('hidden')) {
      showAdminPanel();
    } else {
      hideAdminPanel();
    }
  });
}

// ──────────────────────────────────────────────────
// Wire Admin Login Form
// ──────────────────────────────────────────────────

function wireAdminLogin() {
  document.getElementById('admin-login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const pwd = document.getElementById('admin-password-input').value;
    const ok  = await checkAdminLogin(pwd);
    if (ok) {
      setAdminSession(true);
      closeAdminLoginModal();
      showAdminPanel();
    } else {
      document.getElementById('admin-login-error').classList.remove('hidden');
      document.getElementById('admin-password-input').value = '';
      document.getElementById('admin-password-input').focus();
    }
  });
}

// ──────────────────────────────────────────────────
// Refresh WOM data periodically (every 5 min)
// ──────────────────────────────────────────────────

function scheduleWOMRefresh() {
  setInterval(async () => {
    await loadTop3Preview();
  }, 5 * 60 * 1000);
}

// ──────────────────────────────────────────────────
// Initialise
// ──────────────────────────────────────────────────

async function init() {
  // Ensure password hash is initialised
  await getStoredPasswordHash();

  // Spawn visual ember effects
  spawnEmbers();

  // Wire up all event handlers
  wireTileClicks();
  wireModalCloseButtons();
  wireAdminToggle();
  wireAdminLogin();
  wireAdminPanel();
  wireQuickClaim();
  wirePrizeFundModal();

  // Render initial state from localStorage
  renderAllClaims();
  renderDragonTilePreview();
  renderPrizeFundTilePreview();

  // Load WOM leaderboard
  await loadTop3Preview();
  scheduleWOMRefresh();

  // If admin was already logged in this session (page reload), restore panel state
  if (isAdminLoggedIn()) {
    // Don't auto-open panel on page load, just ensure state is consistent
    document.getElementById('admin-toggle-btn').classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', init);
