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
const levelText = document.getElementById('level-text');
const goldText = document.getElementById('gold-text');
const waveText = document.getElementById('wave-text');
const spText = document.getElementById('sp-text');
const upgradeBtn = document.getElementById('upgrade-btn');
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

// ---------- Base stats (before skill points) ----------
const BASE = {
  hp: 100,
  damage: 8,
  speed: 3.2,
  attackCooldown: 0.55, // seconds
  range: 110,
  ultCooldown: 14,
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

// ---------- Game state ----------
let state = 'start'; // 'start' | 'playing' | 'paused' | 'gameover'
let keys = {};
let lastTime = 0;

let player, enemies, particles, floatingTexts;
let wave, waveTimer, waveSpawning, enemiesToSpawn, spawnTimer;
let bestWave = parseInt(localStorage.getItem('batrpg_best_wave') || '1', 10);
bestWaveEl.textContent = bestWave;

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
    range: BASE.range,
    critChance: 0,
    critMult: 1.8,
    ultimateDamageMult: 1,
    ultimateCooldown: BASE.ultCooldown,
    ultimateTimer: 0,
    level: 1,
    xp: 0,
    xpToNext: 20,
    skillPoints: 0,
    gold: 0,
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
  wave = 0;
  waveTimer = 1.2;
  waveSpawning = false;
  enemiesToSpawn = 0;
  spawnTimer = 0;
  keys = {};
}

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
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if (e.repeat) return; // ignore held-key auto-repeat for one-shot actions
  if (key === 'u') toggleRpgPanel();
  if (key === 'h') toggleHelpPanel();
  if (key === 'e') tryUltimate();
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

upgradeBtn.addEventListener('click', toggleRpgPanel);
closePanelBtn.addEventListener('click', () => setRpgPanel(false));
helpBtn.addEventListener('click', toggleHelpPanel);
closeHelpBtn.addEventListener('click', () => setHelpPanel(false));
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

// Both the Upgrade panel and the Help panel pause the game while open.
// Game state only resumes to 'playing' once every panel is closed.
let rpgPanelOpen = false;
let helpPanelOpen = false;

function syncPauseState() {
  if (state !== 'playing' && state !== 'paused') return;
  state = (rpgPanelOpen || helpPanelOpen) ? 'paused' : 'playing';
}

function setRpgPanel(open) {
  rpgPanelOpen = open;
  rpgPanel.classList.toggle('hidden', !open);
  if (open) renderStatList();
  syncPauseState();
}
function toggleRpgPanel() {
  if (state !== 'playing' && state !== 'paused') return;
  if (!rpgPanelOpen && helpPanelOpen) setHelpPanel(false); // panels are mutually exclusive
  setRpgPanel(!rpgPanelOpen);
}

function setHelpPanel(open) {
  helpPanelOpen = open;
  helpPanel.classList.toggle('hidden', !open);
  syncPauseState();
}
function toggleHelpPanel() {
  if (state !== 'playing' && state !== 'paused') return;
  if (!helpPanelOpen && rpgPanelOpen) setRpgPanel(false); // panels are mutually exclusive
  setHelpPanel(!helpPanelOpen);
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
  player.gold += enemy.goldValue;
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

  // attack timer
  player.attackTimer -= dt;
  if (player.attackTimer <= 0) {
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

  // ultimate timer
  if (player.ultimateTimer > 0) player.ultimateTimer -= dt;

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
  finalStats.textContent = `Reached Wave ${wave} • Level ${player.level} • ${player.gold} gold collected`;
  gameoverScreen.classList.remove('hidden');
}

function updateHud() {
  hpFill.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  hpText.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHp} HP`;
  xpFill.style.width = `${(player.xp / player.xpToNext) * 100}%`;
  xpText.textContent = `${player.xp} / ${player.xpToNext} XP`;
  levelText.textContent = `Lv ${player.level}`;
  goldText.textContent = `🪙 ${player.gold}`;
  waveText.textContent = `Wave ${wave}`;
  const ultPct = player.ultimateTimer > 0 ? 100 - (player.ultimateTimer / player.ultimateCooldown) * 100 : 100;
  ultFill.style.width = `${ultPct}%`;
  if (player.skillPoints > 0) {
    spText.style.display = 'inline-block';
    spText.textContent = `Skill Points: ${player.skillPoints}`;
  } else {
    spText.style.display = 'none';
  }
}

// ---------- Render ----------
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(1, '#12081f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // moon
  ctx.beginPath();
  ctx.arc(W - 80, 80, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#f0edd8';
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;

  // stars (static pseudo-random pattern based on sin)
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137.5) % W;
    const sy = (i * 91.3) % H;
    ctx.fillRect(sx, sy, 1.5, 1.5);
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

  // wings
  ctx.fillStyle = '#3a2f5c';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-24, -10 - flap * 10, -30, 6 - flap * 6);
  ctx.quadraticCurveTo(-14, 10, 0, 4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(24, -10 - flap * 10, 30, 6 - flap * 6);
  ctx.quadraticCurveTo(14, 10, 0, 4);
  ctx.closePath();
  ctx.fill();

  // body
  ctx.fillStyle = '#1c1730';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // ears
  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(-11, -22);
  ctx.lineTo(-3, -14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -12);
  ctx.lineTo(11, -22);
  ctx.lineTo(3, -14);
  ctx.closePath();
  ctx.fill();

  // eyes
  ctx.fillStyle = '#e05252';
  ctx.beginPath();
  ctx.arc(-4, -2, 1.8, 0, Math.PI * 2);
  ctx.arc(4, -2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // range indicator (subtle)
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.range, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(138,92,245,0.08)';
  ctx.stroke();
}

function drawEnemy(en) {
  ctx.save();
  if (en.hitFlash > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = en.color;
  if (en.type === 'hawk') {
    ctx.beginPath();
    ctx.moveTo(en.x, en.y - en.radius);
    ctx.lineTo(en.x - en.radius, en.y + en.radius);
    ctx.lineTo(en.x + en.radius, en.y + en.radius);
    ctx.closePath();
    ctx.fill();
  } else if (en.type === 'hunter') {
    ctx.fillRect(en.x - en.radius, en.y - en.radius, en.radius * 2, en.radius * 2);
  } else {
    ctx.beginPath();
    ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
    ctx.fill();
    // legs
    ctx.strokeStyle = en.color;
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(en.x + Math.cos(ang) * en.radius * 0.6, en.y + Math.sin(ang) * en.radius * 0.6);
      ctx.lineTo(en.x + Math.cos(ang) * en.radius * 1.4, en.y + Math.sin(ang) * en.radius * 1.4);
      ctx.stroke();
    }
  }
  ctx.restore();

  // enemy hp bar
  const barW = en.radius * 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(en.x - barW / 2, en.y - en.radius - 10, barW, 4);
  ctx.fillStyle = '#e05252';
  ctx.fillRect(en.x - barW / 2, en.y - en.radius - 10, barW * Math.max(0, en.hp / en.maxHp), 4);
}

function render() {
  drawBackground();

  if (state === 'playing' || state === 'paused' || state === 'gameover') {
    enemies.forEach(drawEnemy);
    drawBat(player);

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
