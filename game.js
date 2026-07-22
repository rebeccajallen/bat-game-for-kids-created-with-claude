// ===================== Bat RPG - Night Survivor =====================
// A top-down survival game where you play a bat, fight off waves of
// creatures, gain XP/gold, level up, and spend skill points on an
// RPG-style stat system to boost yourself.
// =======================================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ---------- DOM refs ----------
const hpFill = document.getElementById('hp-fill');
const hpText = document.getElementById('hp-text');
const xpFill = document.getElementById('xp-fill');
const xpText = document.getElementById('xp-text');
const ultFill = document.getElementById('ult-fill');
const rocketFill = document.getElementById('rocket-fill');
const levelText = document.getElementById('level-text');
const goldText = document.getElementById('gold-text');
const waveText = document.getElementById('wave-text');
const worldText = document.getElementById('world-text');
const spText = document.getElementById('sp-text');
const upgradeBtn = document.getElementById('upgrade-btn');
const autoAttackBtn = document.getElementById('autoattack-btn');
const rpgPanel = document.getElementById('rpg-panel');
const panelSp = document.getElementById('panel-sp');
const statList = document.getElementById('stat-list');
const closePanelBtn = document.getElementById('close-panel');
const helpBtn = document.getElementById('help-btn');
const helpPanel = document.getElementById('help-panel');
const closeHelpBtn = document.getElementById('close-help');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const gameoverScreen = document.getElementById('gameover-screen');
const restartBtn = document.getElementById('restart-btn');
const finalStats = document.getElementById('final-stats');
const bestWaveEl = document.getElementById('best-wave');
const shopBtn = document.getElementById('shop-btn');
const shopBtnStart = document.getElementById('shop-btn-start');
const shopBtnGameover = document.getElementById('shop-btn-gameover');
const shopPanel = document.getElementById('shop-panel');
const closeShopBtn = document.getElementById('close-shop');
const shopCoinsEl = document.getElementById('shop-coins');
const batSkinListEl = document.getElementById('bat-skin-list');
const rpgSkinListEl = document.getElementById('rpg-skin-list');
const permUpgradeListEl = document.getElementById('perm-upgrade-list');
const pauseBtn = document.getElementById('pause-btn');
const pausePanel = document.getElementById('pause-panel');
const resumeBtn = document.getElementById('resume-btn');
const pauseUpgradeBtn = document.getElementById('pause-upgrade-btn');
const pauseShopBtn = document.getElementById('pause-shop-btn');
const pauseHelpBtn = document.getElementById('pause-help-btn');
const pauseWaveEl = document.getElementById('pause-wave');
const pauseLevelEl = document.getElementById('pause-level');
const pauseCoinsEl = document.getElementById('pause-coins');

// ---------- Base stats (before skill points) ----------
const BASE = {
  hp: 100,
  damage: 8,
  speed: 3.2,
  attackCooldown: 0.55, // seconds
  range: 110,
  ultCooldown: 14,
  rpgCooldown: 6,
};

// ---------- Skill / RPG stat configuration ----------
const statConfig = {
  vitality: {
    name: 'Vitality',
    desc: '+15 Max HP, +0.5 HP regen/sec per point',
    level: 0,
  },
  strength: {
    name: 'Strength',
    desc: '+3 Attack Damage per point',
    level: 0,
  },
  agility: {
    name: 'Agility',
    desc: '+0.35 Move Speed, faster attacks per point',
    level: 0,
  },
  focus: {
    name: 'Focus',
    desc: '+14 Attack Range, +2% Crit Chance per point',
    level: 0,
  },
  echo: {
    name: 'Echo Power',
    desc: '+20% Echo Blast damage, faster cooldown per point',
    level: 0,
  },
};

function resetStatConfig() {
  Object.values(statConfig).forEach((s) => (s.level = 0));
}

// ---------- Coin Shop: skins & permanent upgrades ----------
// Coins persist across runs (saved to localStorage). Every skin and
// permanent upgrade costs a flat 100 coins.
const SHOP_ITEM_COST = 100;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let coins = parseInt(localStorage.getItem('batrpg_coins') || '0', 10) || 0;
function saveCoins() {
  localStorage.setItem('batrpg_coins', String(coins));
  // Keep the HUD coin counter in sync immediately, even outside active
  // gameplay (start screen, paused, game over), so it never looks stale.
  goldText.textContent = `🪙 ${coins}`;
}
saveCoins(); // sync the HUD with whatever was already saved, right from page load

const BAT_SKINS = {
  classic: { name: 'Classic Bat', cost: 0, body: '#241b3d', bodyLight: '#3a2f5c', membrane: 'rgba(106, 62, 209, 0.55)', ear: '#5a2fc9', eye: '#ff5050' },
  crimson: { name: 'Crimson Bat', cost: SHOP_ITEM_COST, body: '#3a1518', bodyLight: '#5c2530', membrane: 'rgba(209, 62, 78, 0.55)', ear: '#c92f4a', eye: '#ffb347' },
  golden: { name: 'Golden Bat', cost: SHOP_ITEM_COST, body: '#3d3018', bodyLight: '#5c4a25', membrane: 'rgba(209, 178, 62, 0.55)', ear: '#c9a02f', eye: '#50e0ff' },
  shadow: { name: 'Shadow Bat', cost: SHOP_ITEM_COST, body: '#0c0c12', bodyLight: '#1c1c24', membrane: 'rgba(50, 50, 65, 0.6)', ear: '#2c2c38', eye: '#8a5cf5' },
  toxic: { name: 'Toxic Bat', cost: SHOP_ITEM_COST, body: '#122c1c', bodyLight: '#22482f', membrane: 'rgba(62, 209, 110, 0.55)', ear: '#2fc95a', eye: '#ffd447' },
};

const RPG_SKINS = {
  classic: { name: 'Classic Launcher', cost: 0, tube: '#4a4a42', tubeDark: '#2f2f2a', rim: '#6b6b5e', flash: '#ffd447', rocketBody: '#5c5c66', rocketFlame: '#f57c33' },
  gold: { name: 'Gold-Plated', cost: SHOP_ITEM_COST, tube: '#a8862f', tubeDark: '#6b5620', rim: '#e0c060', flash: '#fff0a0', rocketBody: '#c9a02f', rocketFlame: '#ffd447' },
  camo: { name: 'Camo Green', cost: SHOP_ITEM_COST, tube: '#3a4a2f', tubeDark: '#26301f', rim: '#5c6b4a', flash: '#c0ff80', rocketBody: '#3a4a2f', rocketFlame: '#7bd47a' },
  neon: { name: 'Neon Blue', cost: SHOP_ITEM_COST, tube: '#2f4a6b', tubeDark: '#1f2f42', rim: '#5cbfff', flash: '#8fe0ff', rocketBody: '#2f4a6b', rocketFlame: '#33d9c1' },
};

const PERMANENT_UPGRADES = {
  vitalityPerm: { name: "Vampire's Heart", desc: '+20 Max HP on every run, forever', cost: SHOP_ITEM_COST, apply: () => { BASE.hp += 20; } },
  strengthPerm: { name: 'Iron Fangs', desc: '+4 Attack Damage on every run, forever', cost: SHOP_ITEM_COST, apply: () => { BASE.damage += 4; } },
  agilityPerm: { name: 'Swift Wings', desc: '+0.4 Move Speed on every run, forever', cost: SHOP_ITEM_COST, apply: () => { BASE.speed += 0.4; } },
  focusPerm: { name: 'Night Vision', desc: '+20 Attack Range on every run, forever', cost: SHOP_ITEM_COST, apply: () => { BASE.range += 20; } },
};

let ownedBatSkins = loadJSON('batrpg_owned_bat_skins', ['classic']);
let equippedBatSkin = localStorage.getItem('batrpg_equipped_bat_skin') || 'classic';
let ownedRpgSkins = loadJSON('batrpg_owned_rpg_skins', ['classic']);
let equippedRpgSkin = localStorage.getItem('batrpg_equipped_rpg_skin') || 'classic';
let ownedPermUpgrades = loadJSON('batrpg_owned_perm_upgrades', []);

// Apply any previously-purchased permanent upgrades to the base stats once at load.
ownedPermUpgrades.forEach((id) => {
  if (PERMANENT_UPGRADES[id]) PERMANENT_UPGRADES[id].apply();
});

// ---------- Game state ----------
let state = 'start'; // 'start' | 'playing' | 'paused' | 'gameover'
let keys = {};
let lastTime = 0;

let player, enemies, particles, floatingTexts, rockets;
let scenery = [];
let mist = [];
let groundFog = [];
let groundPatches = [];
let forestTrees = [];
let wave, waveTimer, waveSpawning, enemiesToSpawn, spawnTimer;
let bestWave = parseInt(localStorage.getItem('batrpg_best_wave') || '1', 10);
bestWaveEl.textContent = bestWave;

// ---------- Wormholes & alternate worlds ----------
// Every so often a swirling wormhole appears somewhere on the map. If the
// bat flies into it, the whole map is transported to a different "world"
// with its own night-sky palette, and the bat gets a small reward.
const WORLDS = [
  { name: 'Midnight Forest', skyTop: '#1d1636', skyMid: '#120c22', skyBottom: '#07050f', mist: '200,200,255', moon: '#f0edd8' },
  { name: 'Blood Moon Realm', skyTop: '#3d1414', skyMid: '#220b12', skyBottom: '#0f0508', mist: '255,150,150', moon: '#ff8a8a', tint: 'rgba(120,20,20,0.12)' },
  { name: 'Toxic Swamp', skyTop: '#123420', skyMid: '#0b2214', skyBottom: '#050f08', mist: '150,255,180', moon: '#c8ff9a', tint: 'rgba(30,120,50,0.12)' },
  { name: 'Crystal Cavern', skyTop: '#132a3d', skyMid: '#0b1b2a', skyBottom: '#050d14', mist: '160,220,255', moon: '#9adcff', tint: 'rgba(40,110,170,0.12)' },
  { name: 'Golden Dusk', skyTop: '#3a2f10', skyMid: '#231b0a', skyBottom: '#100c04', mist: '255,220,150', moon: '#ffe08a', tint: 'rgba(150,110,20,0.1)' },
];
let currentWorldIndex = 0;
let wormhole = null;
let wormholeTimer = 0;
let screenFlash = 0;
let screenFlashColor = '#ffffff';

function spawnWormhole() {
  // Pick a spot away from the player so it isn't an unavoidable ambush.
  let x, y;
  do {
    x = 60 + Math.random() * (W - 120);
    y = 60 + Math.random() * (H - 120);
  } while (player && distance(x, y, player.x, player.y) < 180);

  wormhole = { x, y, radius: 26, life: 14, spinPhase: 0 };
  floatingTexts.push({
    x, y: y - 40, text: '🌀 A wormhole has appeared!', life: 1.4, vy: -15, color: '#b48cff',
  });
}

function enterWormhole() {
  currentWorldIndex = (currentWorldIndex + 1) % WORLDS.length;
  const world = WORLDS[currentWorldIndex];

  // small reward for braving the wormhole
  player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.2);
  coins += 15;
  saveCoins();

  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30;
    particles.push({
      x: wormhole.x, y: wormhole.y,
      vx: Math.cos(angle) * 200,
      vy: Math.sin(angle) * 200,
      life: 0.5, color: '#b48cff',
    });
  }

  player.x = W / 2 + (Math.random() - 0.5) * 120;
  player.y = H / 2 + (Math.random() - 0.5) * 120;
  floatingTexts.push({
    x: player.x, y: player.y - 30, text: `Welcome to ${world.name}!`, life: 1.4, vy: -18, color: '#b48cff',
  });

  screenFlash = 0.4;
  screenFlashColor = world.moon;
  wormhole = null;
  wormholeTimer = 22 + Math.random() * 16;
}

function createPlayer() {
  return {
    x: W / 2,
    y: H / 2,
    radius: 16,
    hp: BASE.hp,
    maxHp: BASE.hp,
    hpRegen: 0,
    damage: BASE.damage,
    speed: BASE.speed,
    attackCooldown: BASE.attackCooldown,
    attackTimer: 0,
    clickAttackTimer: 0,
    range: BASE.range,
    critChance: 0,
    critMult: 1.8,
    ultimateDamageMult: 1,
    ultimateCooldown: BASE.ultCooldown,
    ultimateTimer: 0,
    rpgCooldown: BASE.rpgCooldown,
    rpgTimer: 0,
    rpgFlash: 0,
    level: 1,
    xp: 0,
    xpToNext: 20,
    skillPoints: 0,
    facing: 1,
    flapPhase: 0,
    hitFlash: 0,
  };
}

function recomputeStats() {
  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  player.maxHp = BASE.hp + statConfig.vitality.level * 15;
  player.hpRegen = statConfig.vitality.level * 0.5;
  player.damage = BASE.damage + statConfig.strength.level * 3;
  player.speed = BASE.speed + statConfig.agility.level * 0.35;
  player.attackCooldown = Math.max(0.15, BASE.attackCooldown * Math.pow(0.95, statConfig.agility.level));
  player.range = BASE.range + statConfig.focus.level * 14;
  player.critChance = Math.min(0.75, statConfig.focus.level * 0.02);
  player.ultimateDamageMult = 1 + statConfig.echo.level * 0.2;
  player.ultimateCooldown = Math.max(3, BASE.ultCooldown * Math.pow(0.93, statConfig.echo.level));
  player.hp = Math.min(player.maxHp, Math.max(0, player.maxHp * hpRatio));
}

function resetGame() {
  resetStatConfig();
  player = createPlayer();
  recomputeStats();
  player.hp = player.maxHp;
  enemies = [];
  particles = [];
  floatingTexts = [];
  rockets = [];
  wave = 0;
  waveTimer = 1.2;
  waveSpawning = false;
  enemiesToSpawn = 0;
  spawnTimer = 0;
  keys = {};
  currentWorldIndex = 0;
  wormhole = null;
  wormholeTimer = 18 + Math.random() * 12;
  screenFlash = 0;
  generateScenery();
}

// Scatter rocks, bushes, grass tufts and drifting mist across the map so
// each playthrough has a slightly different moonlit forest floor.
function generateScenery() {
  scenery = [];
  const addPatch = (type, count, sizeMin, sizeMax) => {
    for (let i = 0; i < count; i++) {
      scenery.push({
        type,
        x: 15 + Math.random() * (W - 30),
        y: 15 + Math.random() * (H - 30),
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        rot: Math.random() * Math.PI * 2,
      });
    }
  };
  addPatch('rock', 9, 10, 20);
  addPatch('bush', 11, 14, 24);
  addPatch('grass', 40, 6, 12);

  mist = [];
  for (let i = 0; i < 6; i++) {
    // Each mist cloud is made of several overlapping soft puffs that orbit
    // its center, so the whole cloud churns and swirls as it drifts.
    const puffCount = 5 + Math.floor(Math.random() * 3);
    const puffs = [];
    for (let j = 0; j < puffCount; j++) {
      puffs.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.25 + Math.random() * 0.55,
        size: 0.45 + Math.random() * 0.55,
        spin: Math.random() < 0.5 ? 1 : -1,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
    mist.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 4,
      radius: 60 + Math.random() * 90,
      opacity: 0.06 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
      swirlSpeed: (0.12 + Math.random() * 0.18) * (Math.random() < 0.5 ? 1 : -1),
      puffs,
    });
  }

  // Low, wavy ground-fog banks for the Midnight Forest's spooky forest floor.
  groundFog = [];
  for (let i = 0; i < 4; i++) {
    groundFog.push({
      y: H - 50 - i * 40 + Math.random() * 20,
      height: 45 + Math.random() * 25,
      offset: Math.random() * W,
      speed: 6 + Math.random() * 10,
      amp: 6 + Math.random() * 10,
      opacity: 0.05 + Math.random() * 0.06,
    });
  }

  // Mottled forest-floor ground patches and tall trees, exclusive to the
  // Midnight Forest world, to give it a real "forest" feel underfoot.
  groundPatches = [];
  for (let i = 0; i < 16; i++) {
    groundPatches.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 45 + Math.random() * 60,
      rot: Math.random() * Math.PI * 2,
      shade: Math.random() < 0.5 ? '#162a1c' : '#1c2e1a',
    });
  }

  forestTrees = [];
  for (let i = 0; i < 9; i++) {
    forestTrees.push({
      x: 35 + Math.random() * (W - 70),
      y: 35 + Math.random() * (H - 70),
      size: 26 + Math.random() * 20,
      lean: (Math.random() - 0.5) * 0.25,
      swayPhase: Math.random() * Math.PI * 2,
    });
  }
}
generateScenery();

// ---------- Enemy factory ----------
const ENEMY_TYPES = {
  hawk: { color: '#e05252', radius: 12, hpMult: 0.6, dmgMult: 0.8, speedMult: 1.7, xp: 6, gold: 2 },
  spider: { color: '#7bd47a', radius: 15, hpMult: 1.8, dmgMult: 0.6, speedMult: 0.8, xp: 9, gold: 4 },
  hunter: { color: '#c9c0e8', radius: 14, hpMult: 1.1, dmgMult: 1.2, speedMult: 1.1, xp: 8, gold: 5 },
};

function spawnEnemy() {
  const typeKeys = Object.keys(ENEMY_TYPES);
  const typeKey = typeKeys[Math.floor(Math.random() * typeKeys.length)];
  const t = ENEMY_TYPES[typeKey];

  // spawn just outside canvas edge
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = -30; y = Math.random() * H; }
  else if (edge === 1) { x = W + 30; y = Math.random() * H; }
  else if (edge === 2) { x = Math.random() * W; y = -30; }
  else { x = Math.random() * W; y = H + 30; }

  const scale = 1 + wave * 0.14;
  const baseHp = 22 * t.hpMult * scale;
  enemies.push({
    type: typeKey,
    x, y,
    radius: t.radius,
    color: t.color,
    hp: baseHp,
    maxHp: baseHp,
    damage: 6 * t.dmgMult * scale,
    speed: (1.1 + Math.random() * 0.3) * t.speedMult,
    xpValue: t.xp + wave,
    goldValue: t.gold + Math.floor(wave / 2),
    attackTimer: 0,
    attackCooldown: 0.7,
    hitFlash: 0,
    animPhase: Math.random() * Math.PI * 2,
    facing: 1,
    moveAngle: 0,
  });
}

function startWave() {
  wave += 1;
  waveText.textContent = `Wave ${wave}`;
  enemiesToSpawn = 4 + wave * 2;
  waveSpawning = true;
  spawnTimer = 0;
}

// ---------- Input ----------
let autoAttackEnabled = true;

function setAutoAttack(enabled) {
  autoAttackEnabled = enabled;
  autoAttackBtn.textContent = `🦇 Auto-Attack: ${enabled ? 'ON' : 'OFF'}`;
  autoAttackBtn.classList.toggle('off', !enabled);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if (e.repeat) return; // ignore held-key auto-repeat for one-shot actions
  if (key === 'u') toggleRpgPanel();
  if (key === 'h') toggleHelpPanel();
  if (key === 'p') toggleShopPanel();
  if (key === 'e') tryUltimate();
  if (key === 'r') tryFireRpg();
  if (key === 't') setAutoAttack(!autoAttackEnabled);
  if (key === 'escape') {
    // Esc closes whichever menu is on top; if none are open, it pauses the game.
    if (rpgPanelOpen) setRpgPanel(false);
    else if (helpPanelOpen) setHelpPanel(false);
    else if (shopPanelOpen) setShopPanel(false);
    else togglePausePanel();
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

upgradeBtn.addEventListener('click', toggleRpgPanel);
closePanelBtn.addEventListener('click', () => setRpgPanel(false));
helpBtn.addEventListener('click', toggleHelpPanel);
closeHelpBtn.addEventListener('click', () => setHelpPanel(false));
autoAttackBtn.addEventListener('click', () => setAutoAttack(!autoAttackEnabled));
shopBtn.addEventListener('click', toggleShopPanel);
shopBtnStart.addEventListener('click', toggleShopPanel);
shopBtnGameover.addEventListener('click', toggleShopPanel);
closeShopBtn.addEventListener('click', () => setShopPanel(false));
pauseBtn.addEventListener('click', togglePausePanel);
resumeBtn.addEventListener('click', () => setPausePanel(false));
pauseUpgradeBtn.addEventListener('click', () => { setPausePanel(false); toggleRpgPanel(); });
pauseShopBtn.addEventListener('click', () => { setPausePanel(false); toggleShopPanel(); });
pauseHelpBtn.addEventListener('click', () => { setPausePanel(false); toggleHelpPanel(); });

canvas.addEventListener('click', (e) => {
  if (state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (player.clickAttackTimer > 0) return;

  // Find the closest enemy under the click point that is also within the
  // player's attack range, so manual clicking mirrors the auto-attack rules.
  let target = null;
  let bestD = Infinity;
  enemies.forEach((en) => {
    if (en.dead) return;
    const dClick = distance(mx, my, en.x, en.y);
    if (dClick > en.radius + 6) return;
    const dPlayer = distance(player.x, player.y, en.x, en.y);
    if (dPlayer > player.range) return;
    if (dClick < bestD) { bestD = dClick; target = en; }
  });

  if (target) {
    const isCrit = Math.random() < player.critChance;
    const dmg = player.damage * (isCrit ? player.critMult : 1);
    damageEnemy(target, dmg, isCrit);
    player.clickAttackTimer = player.attackCooldown;
  }
});

// Show a pointer cursor whenever the mouse hovers a clickable (in-range) enemy.
canvas.addEventListener('mousemove', (e) => {
  if (state !== 'playing') {
    canvas.style.cursor = 'default';
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  const hovering = enemies.some((en) => {
    if (en.dead) return false;
    if (distance(mx, my, en.x, en.y) > en.radius + 6) return false;
    return distance(player.x, player.y, en.x, en.y) <= player.range;
  });
  canvas.style.cursor = hovering ? 'pointer' : 'crosshair';
});

startBtn.addEventListener('click', () => {
  resetGame();
  state = 'playing';
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  startWave();
});
restartBtn.addEventListener('click', () => {
  resetGame();
  state = 'playing';
  gameoverScreen.classList.add('hidden');
  startWave();
});

// The Upgrade, Help, Shop and Pause panels all pause the game while open,
// and are mutually exclusive (opening one closes the others). Game state
// only resumes to 'playing' once every panel is closed. The Shop is also
// reachable from the start/game-over screens, where state isn't touched.
let rpgPanelOpen = false;
let helpPanelOpen = false;
let shopPanelOpen = false;
let pausePanelOpen = false;

function syncPauseState() {
  if (state !== 'playing' && state !== 'paused') return;
  state = (rpgPanelOpen || helpPanelOpen || shopPanelOpen || pausePanelOpen) ? 'paused' : 'playing';
}

function setRpgPanel(open) {
  rpgPanelOpen = open;
  rpgPanel.classList.toggle('hidden', !open);
  if (open) renderStatList();
  syncPauseState();
}
function toggleRpgPanel() {
  if (state !== 'playing' && state !== 'paused') return;
  if (!rpgPanelOpen) {
    if (helpPanelOpen) setHelpPanel(false);
    if (shopPanelOpen) setShopPanel(false);
    if (pausePanelOpen) setPausePanel(false);
  }
  setRpgPanel(!rpgPanelOpen);
}

function setHelpPanel(open) {
  helpPanelOpen = open;
  helpPanel.classList.toggle('hidden', !open);
  syncPauseState();
}
function toggleHelpPanel() {
  if (state !== 'playing' && state !== 'paused') return;
  if (!helpPanelOpen) {
    if (rpgPanelOpen) setRpgPanel(false);
    if (shopPanelOpen) setShopPanel(false);
    if (pausePanelOpen) setPausePanel(false);
  }
  setHelpPanel(!helpPanelOpen);
}

function setShopPanel(open) {
  shopPanelOpen = open;
  shopPanel.classList.toggle('hidden', !open);
  if (open) renderShop();
  syncPauseState();
}
function toggleShopPanel() {
  if (!['start', 'playing', 'paused', 'gameover'].includes(state)) return;
  if (!shopPanelOpen) {
    if (rpgPanelOpen) setRpgPanel(false);
    if (helpPanelOpen) setHelpPanel(false);
    if (pausePanelOpen) setPausePanel(false);
  }
  setShopPanel(!shopPanelOpen);
}

function setPausePanel(open) {
  pausePanelOpen = open;
  pausePanel.classList.toggle('hidden', !open);
  if (open && player) {
    pauseWaveEl.textContent = wave;
    pauseLevelEl.textContent = player.level;
    pauseCoinsEl.textContent = coins;
  }
  syncPauseState();
}
function togglePausePanel() {
  if (state !== 'playing' && state !== 'paused') return;
  if (!pausePanelOpen) {
    if (rpgPanelOpen) setRpgPanel(false);
    if (helpPanelOpen) setHelpPanel(false);
    if (shopPanelOpen) setShopPanel(false);
  }
  setPausePanel(!pausePanelOpen);
}

function renderShop() {
  shopCoinsEl.textContent = coins;

  const renderSkinGrid = (container, catalog, owned, equipped, onEquip, colorKey) => {
    container.innerHTML = '';
    Object.entries(catalog).forEach(([id, skin]) => {
      const isOwned = owned.includes(id);
      const isEquipped = equipped === id;
      const card = document.createElement('div');
      card.className = 'skin-item' + (isEquipped ? ' equipped' : '');
      const swatch = document.createElement('div');
      swatch.className = 'skin-swatch';
      swatch.style.background = skin[colorKey];
      const name = document.createElement('div');
      name.className = 'skin-name';
      name.textContent = skin.name;
      const btn = document.createElement('button');
      btn.className = 'skin-btn ' + (isEquipped ? 'equipped' : isOwned ? 'equip' : 'buy');
      btn.textContent = isEquipped ? 'Equipped' : isOwned ? 'Equip' : `Buy (${skin.cost || SHOP_ITEM_COST})`;
      if (isEquipped) btn.disabled = true;
      if (!isOwned && coins < skin.cost) btn.disabled = true;
      btn.addEventListener('click', () => onEquip(id, isOwned));
      card.appendChild(swatch);
      card.appendChild(name);
      card.appendChild(btn);
      container.appendChild(card);
    });
  };

  renderSkinGrid(batSkinListEl, BAT_SKINS, ownedBatSkins, equippedBatSkin, (id, isOwned) => {
    if (!isOwned) {
      const skin = BAT_SKINS[id];
      if (coins < skin.cost) return;
      coins -= skin.cost;
      saveCoins();
      ownedBatSkins = [...ownedBatSkins, id];
      saveJSON('batrpg_owned_bat_skins', ownedBatSkins);
    }
    equippedBatSkin = id;
    localStorage.setItem('batrpg_equipped_bat_skin', id);
    renderShop();
  }, 'body');

  renderSkinGrid(rpgSkinListEl, RPG_SKINS, ownedRpgSkins, equippedRpgSkin, (id, isOwned) => {
    if (!isOwned) {
      const skin = RPG_SKINS[id];
      if (coins < skin.cost) return;
      coins -= skin.cost;
      saveCoins();
      ownedRpgSkins = [...ownedRpgSkins, id];
      saveJSON('batrpg_owned_rpg_skins', ownedRpgSkins);
    }
    equippedRpgSkin = id;
    localStorage.setItem('batrpg_equipped_rpg_skin', id);
    renderShop();
  }, 'tube');

  permUpgradeListEl.innerHTML = '';
  Object.entries(PERMANENT_UPGRADES).forEach(([id, up]) => {
    const owned = ownedPermUpgrades.includes(id);
    const row = document.createElement('div');
    row.className = 'perm-item';
    row.innerHTML = `
      <span class="stat-name">${up.name}</span>
      <span class="stat-desc">${up.desc}</span>
      <button class="perm-buy ${owned ? 'owned' : ''}" ${owned || coins < up.cost ? 'disabled' : ''}>${owned ? 'Owned' : `Buy (${up.cost})`}</button>
    `;
    if (!owned) {
      row.querySelector('.perm-buy').addEventListener('click', () => {
        if (coins < up.cost) return;
        coins -= up.cost;
        saveCoins();
        ownedPermUpgrades = [...ownedPermUpgrades, id];
        saveJSON('batrpg_owned_perm_upgrades', ownedPermUpgrades);
        up.apply();
        if (player) {
          recomputeStats();
          updateHud();
        }
        renderShop();
      });
    }
    permUpgradeListEl.appendChild(row);
  });
}

function renderStatList() {
  statList.innerHTML = '';
  panelSp.textContent = player.skillPoints;
  Object.entries(statConfig).forEach(([key, s]) => {
    const row = document.createElement('div');
    row.className = 'stat-item';
    row.innerHTML = `
      <span class="stat-name">${s.name}</span>
      <span class="stat-desc">${s.desc}</span>
      <span class="stat-level">${s.level}</span>
      <button class="stat-plus" ${player.skillPoints <= 0 ? 'disabled' : ''}>+</button>
    `;
    row.querySelector('.stat-plus').addEventListener('click', () => {
      try {
        if (player.skillPoints > 0) {
          s.level += 1;
          player.skillPoints -= 1;
          recomputeStats();
          renderStatList();
          updateHud();
        }
      } catch (err) {
        console.error('Upgrade failed (recovered):', err);
      }
    });
    statList.appendChild(row);
  });
}

// ---------- Combat helpers ----------
function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function damageEnemy(enemy, dmg, isCrit) {
  enemy.hp -= dmg;
  enemy.hitFlash = 0.15;
  floatingTexts.push({
    x: enemy.x, y: enemy.y - enemy.radius,
    text: (isCrit ? '★' : '') + Math.round(dmg),
    life: 0.6, vy: -30, color: isCrit ? '#ffd447' : '#ffffff',
  });
  if (enemy.hp <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
  enemy.dead = true;
  player.xp += enemy.xpValue;
  coins += enemy.goldValue;
  saveCoins();
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: enemy.x, y: enemy.y,
      vx: (Math.random() - 0.5) * 120,
      vy: (Math.random() - 0.5) * 120,
      life: 0.4, color: enemy.color,
    });
  }
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.skillPoints += 1;
    player.xpToNext = Math.round(20 + player.level * 15);
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.3);
    floatingTexts.push({
      x: player.x, y: player.y - 30, text: 'LEVEL UP!', life: 1.0, vy: -20, color: '#8a5cf5',
    });
  }
}

function tryUltimate() {
  if (state !== 'playing') return;
  if (player.ultimateTimer > 0) return;
  player.ultimateTimer = player.ultimateCooldown;
  const radius = 260;
  const dmg = 24 * player.ultimateDamageMult;
  enemies.forEach((en) => {
    if (distance(player.x, player.y, en.x, en.y) <= radius) {
      damageEnemy(en, dmg, false);
    }
  });
  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 * i) / 40;
    particles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * 220,
      vy: Math.sin(angle) * 220,
      life: 0.5, color: '#33d9c1',
    });
  }
}

// Fire an RPG (rocket-propelled grenade) at the nearest enemy - a slower,
// harder-hitting explosive shot with its own cooldown, separate from the
// bite auto-attack and the Echo Blast ultimate.
function tryFireRpg() {
  if (state !== 'playing') return;
  if (player.rpgTimer > 0) return;
  player.rpgTimer = player.rpgCooldown;
  player.rpgFlash = 0.12;

  let target = null;
  let bestDist = Infinity;
  enemies.forEach((en) => {
    const d = distance(player.x, player.y, en.x, en.y);
    if (d < bestDist) { bestDist = d; target = en; }
  });

  let dx, dy;
  if (target) {
    dx = target.x - player.x;
    dy = target.y - player.y;
  } else {
    dx = player.facing;
    dy = 0;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;

  const speed = 480;
  rockets.push({
    x: player.x, y: player.y,
    vx: dx * speed, vy: dy * speed,
    radius: 6,
    traveled: 0,
    maxRange: 720,
    damage: player.damage * 4,
    splash: 75,
  });
}

function explodeRocket(r) {
  enemies.forEach((en) => {
    if (!en.dead && distance(r.x, r.y, en.x, en.y) <= r.splash) {
      damageEnemy(en, r.damage, false);
    }
  });
  for (let i = 0; i < 26; i++) {
    const angle = (Math.PI * 2 * i) / 26;
    const speed = 80 + Math.random() * 160;
    particles.push({
      x: r.x, y: r.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45, color: Math.random() < 0.5 ? '#f57c33' : '#ffd447',
    });
  }
}

// ---------- Update ----------
function update(dt) {
  if (state !== 'playing') return;

  // movement
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    player.x += dx * player.speed * dt * 60;
    player.y += dy * player.speed * dt * 60;
    player.facing = dx >= 0 ? 1 : -1;
  }
  player.x = Math.max(player.radius, Math.min(W - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(H - player.radius, player.y));
  player.flapPhase += dt * 12;

  // regen
  if (player.hpRegen > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.hpRegen * dt);
  }

  // attack timer (auto-attack, can be toggled off via the Auto-Attack button or T key)
  player.attackTimer -= dt;
  if (autoAttackEnabled && player.attackTimer <= 0) {
    let target = null;
    let bestDist = Infinity;
    enemies.forEach((en) => {
      const d = distance(player.x, player.y, en.x, en.y);
      if (d <= player.range && d < bestDist) {
        bestDist = d;
        target = en;
      }
    });
    if (target) {
      const isCrit = Math.random() < player.critChance;
      const dmg = player.damage * (isCrit ? player.critMult : 1);
      damageEnemy(target, dmg, isCrit);
      if (isCrit) {
        // lifesteal-esque flavor could go here later
      }
      player.attackTimer = player.attackCooldown;
    } else {
      player.attackTimer = 0.05; // check again soon
    }
  }

  // manual click-to-attack cooldown (works whether or not auto-attack is on)
  if (player.clickAttackTimer > 0) player.clickAttackTimer -= dt;

  // ultimate timer
  if (player.ultimateTimer > 0) player.ultimateTimer -= dt;
  if (player.rpgTimer > 0) player.rpgTimer -= dt;
  if (player.rpgFlash > 0) player.rpgFlash -= dt;

  // rockets (Fire RPG projectiles)
  rockets.forEach((r) => {
    const stepX = r.vx * dt;
    const stepY = r.vy * dt;
    r.x += stepX;
    r.y += stepY;
    r.traveled += Math.hypot(stepX, stepY);

    let hit = false;
    enemies.forEach((en) => {
      if (!en.dead && distance(r.x, r.y, en.x, en.y) <= en.radius + r.radius) hit = true;
    });

    if (hit || r.traveled >= r.maxRange || r.x < 0 || r.x > W || r.y < 0 || r.y > H) {
      explodeRocket(r);
      r.dead = true;
    }
  });
  rockets = rockets.filter((r) => !r.dead);

  // enemies
  enemies.forEach((en) => {
    if (en.dead) return;
    const d = distance(player.x, player.y, en.x, en.y) || 1;
    const nx = (player.x - en.x) / d;
    const ny = (player.y - en.y) / d;
    const touchDist = player.radius + en.radius;
    if (d > touchDist) {
      en.x += nx * en.speed * dt * 60;
      en.y += ny * en.speed * dt * 60;
      en.facing = nx >= 0 ? 1 : -1;
      en.moveAngle = Math.atan2(ny, nx);
    } else {
      en.attackTimer -= dt;
      if (en.attackTimer <= 0) {
        en.attackTimer = en.attackCooldown;
        player.hp -= en.damage;
        player.hitFlash = 0.2;
        floatingTexts.push({
          x: player.x, y: player.y - 20, text: '-' + Math.round(en.damage), life: 0.5, vy: -25, color: '#ff6060',
        });
      }
    }
    en.animPhase += dt * (6 + en.speed * 2);
    if (en.hitFlash > 0) en.hitFlash -= dt;
  });
  enemies = enemies.filter((en) => !en.dead);

  if (player.hitFlash > 0) player.hitFlash -= dt;

  // spawning
  if (waveSpawning) {
    spawnTimer -= dt;
    if (spawnTimer <= 0 && enemiesToSpawn > 0) {
      spawnEnemy();
      enemiesToSpawn -= 1;
      spawnTimer = 0.6;
    }
    if (enemiesToSpawn <= 0) waveSpawning = false;
  } else if (enemies.length === 0) {
    waveTimer -= dt;
    if (waveTimer <= 0) {
      startWave();
      waveTimer = 1.2;
    }
  }

  // particles
  particles.forEach((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  });
  particles = particles.filter((p) => p.life > 0);

  floatingTexts.forEach((f) => {
    f.y += f.vy * dt;
    f.life -= dt;
  });
  floatingTexts = floatingTexts.filter((f) => f.life > 0);

  // drifting ground mist, wraps around the map edges and swirls as it drifts
  mist.forEach((m) => {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.phase += m.swirlSpeed * dt;
    if (m.x < -m.radius) m.x = W + m.radius;
    if (m.x > W + m.radius) m.x = -m.radius;
    if (m.y < -m.radius) m.y = H + m.radius;
    if (m.y > H + m.radius) m.y = -m.radius;
  });

  // wavy ground-fog banks drift sideways over time
  groundFog.forEach((b) => {
    b.offset += b.speed * dt;
  });

  // gentle tree sway
  forestTrees.forEach((t) => {
    t.swayPhase += dt * 0.6;
  });

  // wormholes: spawn occasionally, and teleport the bat to a new world on contact
  if (!wormhole) {
    wormholeTimer -= dt;
    if (wormholeTimer <= 0) spawnWormhole();
  } else {
    wormhole.spinPhase += dt;
    wormhole.life -= dt;
    if (wormhole.life <= 0) {
      wormhole = null;
      wormholeTimer = 22 + Math.random() * 16;
    } else if (distance(player.x, player.y, wormhole.x, wormhole.y) <= player.radius + wormhole.radius) {
      enterWormhole();
    }
  }
  if (screenFlash > 0) screenFlash -= dt;

  // death check
  if (player.hp <= 0) {
    endGame();
  }

  updateHud();
}

function endGame() {
  state = 'gameover';
  if (wave > bestWave) {
    bestWave = wave;
    localStorage.setItem('batrpg_best_wave', String(bestWave));
    bestWaveEl.textContent = bestWave;
  }
  finalStats.textContent = `Reached Wave ${wave} • Level ${player.level} • ${coins} coins banked`;
  gameoverScreen.classList.remove('hidden');
}

function updateHud() {
  hpFill.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  hpText.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHp} HP`;
  xpFill.style.width = `${(player.xp / player.xpToNext) * 100}%`;
  xpText.textContent = `${player.xp} / ${player.xpToNext} XP`;
  levelText.textContent = `Lv ${player.level}`;
  goldText.textContent = `🪙 ${coins}`;
  waveText.textContent = `Wave ${wave}`;
  worldText.textContent = `🌙 ${WORLDS[currentWorldIndex].name}`;
  const ultPct = player.ultimateTimer > 0 ? 100 - (player.ultimateTimer / player.ultimateCooldown) * 100 : 100;
  ultFill.style.width = `${ultPct}%`;
  const rpgPct = player.rpgTimer > 0 ? 100 - (player.rpgTimer / player.rpgCooldown) * 100 : 100;
  rocketFill.style.width = `${rpgPct}%`;
  if (player.skillPoints > 0) {
    spText.style.display = 'inline-block';
    spText.textContent = `Skill Points: ${player.skillPoints}`;
  } else {
    spText.style.display = 'none';
  }
}

// ---------- Render ----------
function drawBackground() {
  const world = WORLDS[currentWorldIndex];

  // moonlit forest-floor gradient (deeper vignette away from the moon), tinted per-world
  const grad = ctx.createRadialGradient(W - 100, 60, 60, W * 0.4, H * 0.6, Math.max(W, H) * 0.9);
  grad.addColorStop(0, world.skyTop);
  grad.addColorStop(0.55, world.skyMid);
  grad.addColorStop(1, world.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (world.tint) {
    ctx.fillStyle = world.tint;
    ctx.fillRect(0, 0, W, H);
  }

  // mottled forest-floor ground patches, exclusive to the Midnight Forest
  if (currentWorldIndex === 0) {
    groundPatches.forEach((g) => {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      ctx.fillStyle = g.shade;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, g.size, g.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  }

  // twinkling stars in the upper sky band
  const t = performance.now() / 1000;
  for (let i = 0; i < 70; i++) {
    const sx = (i * 137.5) % W;
    const sy = (i * 91.3) % (H * 0.5);
    const twinkle = 0.35 + 0.55 * Math.abs(Math.sin(t * 1.4 + i * 0.7));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  // moon with soft glow halo and craters, tinted per-world
  const moonX = W - 80, moonY = 80, moonR = 40;
  const glow = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * 2.4);
  glow.addColorStop(0, 'rgba(240,237,216,0.32)');
  glow.addColorStop(1, 'rgba(240,237,216,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = world.moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(180,175,150,0.55)';
  ctx.beginPath(); ctx.arc(moonX - 12, moonY - 9, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(moonX + 11, moonY + 10, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(moonX + 3, moonY - 17, 3, 0, Math.PI * 2); ctx.fill();

  // ground scenery: rocks, bushes and grass tufts scattered across the map
  scenery.forEach((s) => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    if (s.type === 'rock') {
      ctx.fillStyle = '#241f33';
      ctx.beginPath();
      ctx.moveTo(-s.size, s.size * 0.4);
      ctx.lineTo(-s.size * 0.5, -s.size * 0.6);
      ctx.lineTo(s.size * 0.3, -s.size * 0.8);
      ctx.lineTo(s.size, s.size * 0.2);
      ctx.lineTo(s.size * 0.5, s.size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.ellipse(-s.size * 0.2, -s.size * 0.2, s.size * 0.35, s.size * 0.18, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.type === 'bush') {
      ctx.fillStyle = '#182a1e';
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * s.size * 0.4, Math.sin(ang) * s.size * 0.3, s.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, s.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#233a28';
      ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s.size * 0.3, s.size * 0.4);
        ctx.quadraticCurveTo(i * s.size * 0.5, -s.size * 0.2, i * s.size * 0.2, -s.size * 0.6);
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  // tall swaying trees, exclusive to the Midnight Forest
  if (currentWorldIndex === 0) {
    forestTrees.forEach((tr) => {
      const sway = Math.sin(tr.swayPhase) * 0.05;
      ctx.save();
      ctx.translate(tr.x, tr.y);

      // shadow at the base
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, tr.size * 0.15, tr.size * 0.8, tr.size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(tr.lean + sway);

      // trunk
      ctx.fillStyle = '#120e18';
      ctx.beginPath();
      ctx.moveTo(-tr.size * 0.1, tr.size * 0.1);
      ctx.lineTo(-tr.size * 0.06, -tr.size * 0.5);
      ctx.lineTo(tr.size * 0.06, -tr.size * 0.5);
      ctx.lineTo(tr.size * 0.1, tr.size * 0.1);
      ctx.closePath();
      ctx.fill();

      // canopy: a cluster of overlapping dark circles
      ctx.fillStyle = '#0f1f16';
      const canopyY = -tr.size * 0.85;
      ctx.beginPath(); ctx.arc(0, canopyY, tr.size * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-tr.size * 0.4, canopyY + tr.size * 0.18, tr.size * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(tr.size * 0.4, canopyY + tr.size * 0.18, tr.size * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, canopyY - tr.size * 0.3, tr.size * 0.4, 0, Math.PI * 2); ctx.fill();

      // faint moonlit highlight on one side of the canopy
      ctx.fillStyle = 'rgba(150,140,190,0.12)';
      ctx.beginPath();
      ctx.arc(tr.size * 0.25, canopyY - tr.size * 0.2, tr.size * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }
}

// Drawn AFTER the bat/enemies so the mist visibly drifts in front of them,
// while staying translucent so everything underneath remains visible.
function drawMistLayer() {
  const world = WORLDS[currentWorldIndex];
  const t = performance.now() / 1000;

  // Each cloud is several soft puffs orbiting its center at different radii/
  // speeds, so the whole thing churns and swirls like a real drifting cloud
  // instead of just sliding across the screen as one flat blob.
  mist.forEach((m) => {
    m.puffs.forEach((puff) => {
      const angle = puff.angle + m.phase * puff.spin;
      const dist = puff.dist * m.radius;
      const px = m.x + Math.cos(angle) * dist;
      const py = m.y + Math.sin(angle) * dist * 0.55; // flatten vertically, cloud-like
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.1 + puff.pulseOffset);
      const size = puff.size * m.radius * pulse;

      const g = ctx.createRadialGradient(px, py, 0, px, py, size);
      g.addColorStop(0, `rgba(${world.mist},${m.opacity})`);
      g.addColorStop(0.7, `rgba(${world.mist},${m.opacity * 0.5})`);
      g.addColorStop(1, `rgba(${world.mist},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Low, wavy ground-fog banks - a spooky forest-floor mist unique to Midnight Forest
  if (currentWorldIndex === 0) {
    groundFog.forEach((b) => {
      const grad = ctx.createLinearGradient(0, b.y - b.height / 2, 0, b.y + b.height / 2);
      grad.addColorStop(0, 'rgba(210,210,255,0)');
      grad.addColorStop(0.5, `rgba(210,210,255,${b.opacity})`);
      grad.addColorStop(1, 'rgba(210,210,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const step = 40;
      ctx.moveTo(0, b.y - b.height / 2 + Math.sin(b.offset * 0.02) * b.amp);
      for (let x = 0; x <= W; x += step) {
        ctx.lineTo(x, b.y - b.height / 2 + Math.sin((x + b.offset) * 0.02) * b.amp);
      }
      for (let x = W; x >= 0; x -= step) {
        ctx.lineTo(x, b.y + b.height / 2 + Math.sin((x + b.offset) * 0.02 + 1.5) * b.amp);
      }
      ctx.closePath();
      ctx.fill();
    });
  }
}

function drawBat(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.facing, 1);

  if (p.hitFlash > 0) {
    ctx.shadowColor = '#ff4040';
    ctx.shadowBlur = 15;
  }

  const flap = Math.sin(p.flapPhase) * 0.5 + 0.5; // 0..1
  const skin = BAT_SKINS[equippedBatSkin] || BAT_SKINS.classic;
  const bodyColor = skin.body;
  const bodyLight = skin.bodyLight;
  const membraneColor = skin.membrane;
  const boneColor = '#150e26';

  // --- Wings: translucent membrane with finger-bone ribs and a scalloped trailing edge ---
  const drawWing = (dir) => {
    const spanX = 34 * dir;
    const tipY = -12 - flap * 12;
    const bellyY = 8 - flap * 5;

    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(spanX * 0.35, tipY * 0.9, spanX * 0.7, tipY);
    ctx.quadraticCurveTo(spanX * 0.98, tipY * 0.35, spanX, bellyY - 6);
    ctx.quadraticCurveTo(spanX * 0.82, bellyY - 1, spanX * 0.58, bellyY - 3);
    ctx.quadraticCurveTo(spanX * 0.38, bellyY + 4, spanX * 0.18, bellyY);
    ctx.quadraticCurveTo(spanX * 0.05, bellyY + 2, 0, 3);
    ctx.closePath();
    ctx.fillStyle = membraneColor;
    ctx.fill();
    ctx.strokeStyle = boneColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // finger bones radiating from the shoulder
    ctx.strokeStyle = boneColor;
    ctx.lineWidth = 1.3;
    for (let i = 1; i <= 3; i++) {
      const t = i / 3;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(spanX * t, tipY * (1 - t * 0.3) + (bellyY - tipY) * t * 0.55);
      ctx.stroke();
    }
  };
  drawWing(-1);
  drawWing(1);

  // --- Body (soft furry gradient) ---
  const bodyGrad = ctx.createRadialGradient(-3, -5, 2, 0, 0, 16);
  bodyGrad.addColorStop(0, bodyLight);
  bodyGrad.addColorStop(1, bodyColor);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // subtle fur flecks for texture
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 5; i++) {
    const ang = i * 1.3 + 0.4;
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * 5, 1 + Math.sin(ang) * 6, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Ears (with inner-ear detail) ---
  const drawEar = (dir) => {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(dir * 8, -11);
    ctx.quadraticCurveTo(dir * 13, -18, dir * 10, -23);
    ctx.quadraticCurveTo(dir * 6, -18, dir * 3, -13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin.ear;
    ctx.beginPath();
    ctx.moveTo(dir * 8, -13);
    ctx.quadraticCurveTo(dir * 10.5, -17, dir * 9, -20);
    ctx.quadraticCurveTo(dir * 6.5, -16.5, dir * 5, -13.5);
    ctx.closePath();
    ctx.fill();
  };
  drawEar(-1);
  drawEar(1);

  // --- Snout / nose ---
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 4, 4.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d0a18';
  ctx.beginPath();
  ctx.ellipse(0, 4.5, 1.3, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // little fangs
  ctx.fillStyle = '#f2f0ff';
  ctx.beginPath();
  ctx.moveTo(-2, 6);
  ctx.lineTo(-1.2, 9);
  ctx.lineTo(-0.4, 6);
  ctx.closePath();
  ctx.moveTo(2, 6);
  ctx.lineTo(1.2, 9);
  ctx.lineTo(0.4, 6);
  ctx.closePath();
  ctx.fill();

  // --- little clawed feet tucked under the body ---
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, 11);
  ctx.lineTo(-5, 15);
  ctx.moveTo(4, 11);
  ctx.lineTo(5, 15);
  ctx.stroke();

  // --- glowing eyes with a little shine ---
  ctx.save();
  ctx.shadowColor = skin.eye;
  ctx.shadowBlur = 6;
  ctx.fillStyle = skin.eye;
  ctx.beginPath();
  ctx.arc(-4, -2, 2, 0, Math.PI * 2);
  ctx.arc(4, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-4.6, -2.6, 0.6, 0, Math.PI * 2);
  ctx.arc(3.4, -2.6, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // RPG launcher, held forward under the body like a little bazooka
  const rpgSkin = RPG_SKINS[equippedRpgSkin] || RPG_SKINS.classic;
  ctx.save();
  ctx.translate(4, 9);
  ctx.rotate(0.2);
  // tube
  ctx.fillStyle = rpgSkin.tube;
  ctx.fillRect(-2, -3, 22, 6);
  // back end (wider, darker)
  ctx.fillStyle = rpgSkin.tubeDark;
  ctx.fillRect(-4, -4, 7, 8);
  // muzzle rim
  ctx.fillStyle = rpgSkin.rim;
  ctx.beginPath();
  ctx.arc(20, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // little sight/handle on top
  ctx.fillStyle = rpgSkin.tubeDark;
  ctx.fillRect(6, -6, 4, 3);
  // muzzle flash when just fired
  if (p.rpgFlash > 0) {
    const flashAlpha = Math.min(1, p.rpgFlash / 0.12);
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = rpgSkin.flash;
    ctx.beginPath();
    ctx.arc(22, 0, 7 * flashAlpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  ctx.restore();

  // range indicator (subtle)
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.range, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(138,92,245,0.08)';
  ctx.stroke();
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

function drawHawk(en) {
  const r = en.radius;
  const flap = Math.sin(en.animPhase) * 0.5 + 0.5; // 0..1
  ctx.save();
  ctx.translate(en.x, en.y);
  ctx.scale(en.facing, 1);

  const dark = shadeColor(en.color, -50);
  const light = shadeColor(en.color, 30);

  // wings (flapping)
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.1);
  ctx.quadraticCurveTo(-r * 1.5, -r * 0.5 - flap * r * 0.7, -r * 2.1, r * 0.2 - flap * r * 0.4);
  ctx.quadraticCurveTo(-r * 0.9, r * 0.5, 0, r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.1);
  ctx.quadraticCurveTo(r * 1.5, -r * 0.5 - flap * r * 0.7, r * 2.1, r * 0.2 - flap * r * 0.4);
  ctx.quadraticCurveTo(r * 0.9, r * 0.5, 0, r * 0.15);
  ctx.closePath();
  ctx.fill();

  // tail feathers
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, r * 0.4);
  ctx.lineTo(0, r * 1.1);
  ctx.lineTo(r * 0.15, r * 0.4);
  ctx.closePath();
  ctx.fill();

  // body
  ctx.fillStyle = en.color;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.05, r * 0.55, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // head
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(r * 0.1, -r * 0.65, r * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // beak
  ctx.fillStyle = '#f5c542';
  ctx.beginPath();
  ctx.moveTo(r * 0.4, -r * 0.65);
  ctx.lineTo(r * 1.05, -r * 0.55);
  ctx.lineTo(r * 0.35, -r * 0.42);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(r * 0.2, -r * 0.72, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSpider(en) {
  const r = en.radius;
  ctx.save();
  ctx.translate(en.x, en.y);
  ctx.rotate(en.moveAngle + Math.PI / 2);

  const dark = shadeColor(en.color, -55);

  // 8 animated legs
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const idx = i % 4;
    const spread = (idx / 3 - 0.5) * 2.0; // -1..1
    const wig = Math.sin(en.animPhase + idx * 1.3) * 0.22;
    const kneeX = side * Math.cos(spread * 0.9) * r * 0.95;
    const kneeY = Math.sin(spread * 0.9) * r * 0.95 + wig * r * 0.3;
    const footX = side * Math.cos(spread * 1.15) * r * 1.9;
    const footY = Math.sin(spread * 1.15) * r * 1.9 + wig * r * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
  }

  // abdomen (rear)
  ctx.fillStyle = en.color;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.55, r * 0.68, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // cephalothorax (front)
  ctx.fillStyle = shadeColor(en.color, -15);
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.35, r * 0.48, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // eyes cluster
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-r * 0.16, -r * 0.55, r * 0.09, 0, Math.PI * 2);
  ctx.arc(r * 0.16, -r * 0.55, r * 0.09, 0, Math.PI * 2);
  ctx.arc(-r * 0.08, -r * 0.68, r * 0.06, 0, Math.PI * 2);
  ctx.arc(r * 0.08, -r * 0.68, r * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // fangs
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.moveTo(-r * 0.14, -r * 0.15);
  ctx.lineTo(-r * 0.22, r * 0.05);
  ctx.lineTo(-r * 0.06, -r * 0.1);
  ctx.closePath();
  ctx.moveTo(r * 0.14, -r * 0.15);
  ctx.lineTo(r * 0.22, r * 0.05);
  ctx.lineTo(r * 0.06, -r * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawHunter(en) {
  const r = en.radius;
  const bob = Math.sin(en.animPhase) * r * 0.06;
  ctx.save();
  ctx.translate(en.x, en.y + bob);
  ctx.scale(en.facing, 1);

  const dark = shadeColor(en.color, -60);
  const darker = shadeColor(en.color, -85);

  // cloak / robe body
  ctx.fillStyle = en.color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, r * 0.95);
  ctx.quadraticCurveTo(-r * 0.95, -r * 0.25, 0, -r * 1.05);
  ctx.quadraticCurveTo(r * 0.95, -r * 0.25, r * 0.75, r * 0.95);
  ctx.quadraticCurveTo(0, r * 1.2, -r * 0.75, r * 0.95);
  ctx.closePath();
  ctx.fill();

  // cloak shading fold
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6);
  ctx.lineTo(0, r * 0.9);
  ctx.stroke();

  // hood shadow / face void
  ctx.fillStyle = darker;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.55, r * 0.4, r * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  // glowing eyes
  ctx.fillStyle = '#ffd447';
  ctx.shadowColor = '#ffd447';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(-r * 0.16, -r * 0.55, r * 0.085, 0, Math.PI * 2);
  ctx.arc(r * 0.16, -r * 0.55, r * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // clawed arm reaching forward
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.3, r * 0.05);
  ctx.lineTo(r * 1.05, -r * 0.15);
  ctx.stroke();

  // claws
  ctx.strokeStyle = '#e8e0d8';
  ctx.lineWidth = Math.max(1, r * 0.09);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(r * 1.0, -r * 0.15);
    ctx.lineTo(r * 1.3, -r * 0.1 + i * r * 0.18);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(en) {
  ctx.save();
  if (en.hitFlash > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
  }
  if (en.type === 'hawk') {
    drawHawk(en);
  } else if (en.type === 'hunter') {
    drawHunter(en);
  } else {
    drawSpider(en);
  }
  ctx.restore();

  // enemy hp bar
  const barW = en.radius * 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(en.x - barW / 2, en.y - en.radius - 10, barW, 4);
  ctx.fillStyle = '#e05252';
  ctx.fillRect(en.x - barW / 2, en.y - en.radius - 10, barW * Math.max(0, en.hp / en.maxHp), 4);
}

function drawRocket(r) {
  ctx.save();
  const angle = Math.atan2(r.vy, r.vx);
  ctx.translate(r.x, r.y);
  ctx.rotate(angle);
  const rpgSkin = RPG_SKINS[equippedRpgSkin] || RPG_SKINS.classic;

  // flame trail
  ctx.fillStyle = rpgSkin.rocketFlame;
  ctx.beginPath();
  ctx.moveTo(-10, -3);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-10, 3);
  ctx.closePath();
  ctx.fill();

  // rocket body
  ctx.fillStyle = rpgSkin.rocketBody;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-6, -4);
  ctx.lineTo(-6, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawWormhole(w) {
  ctx.save();
  ctx.translate(w.x, w.y);
  // last couple seconds flicker/shrink before it closes
  const fade = Math.min(1, w.life / 2);
  const pulse = 0.85 + 0.15 * Math.sin(w.spinPhase * 3);

  const glow = ctx.createRadialGradient(0, 0, w.radius * 0.3, 0, 0, w.radius * 2.4 * pulse);
  glow.addColorStop(0, `rgba(138,92,245,${0.55 * fade})`);
  glow.addColorStop(1, 'rgba(138,92,245,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, w.radius * 2.4 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = fade;
  for (let i = 0; i < 3; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const spin = w.spinPhase * (i + 1) * dir;
    ctx.beginPath();
    ctx.strokeStyle = i % 2 === 0 ? '#b48cff' : '#5cdcff';
    ctx.lineWidth = 3;
    ctx.arc(0, 0, w.radius * (0.4 + i * 0.22), spin, spin + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.fillStyle = '#0a0616';
  ctx.beginPath();
  ctx.arc(0, 0, w.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function render() {
  drawBackground();

  if (state === 'playing' || state === 'paused' || state === 'gameover') {
    if (wormhole) drawWormhole(wormhole);
    enemies.forEach(drawEnemy);
    drawBat(player);
    rockets.forEach(drawRocket);

    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    floatingTexts.forEach((f) => {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 14px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    });

    drawMistLayer();

    if (screenFlash > 0) {
      ctx.globalAlpha = Math.min(1, screenFlash / 0.4) * 0.6;
      ctx.fillStyle = screenFlashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------- Main loop ----------
function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;
  // Never let a single bad frame kill the whole game loop: catch any error,
  // log it, and keep scheduling the next frame instead of freezing.
  try {
    update(dt);
    render();
  } catch (err) {
    console.error('Game loop error (recovered):', err);
  }
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
