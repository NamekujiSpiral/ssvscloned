(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // カスタムフォント読み込み
  const gontaFont = new FontFace('Gonta', 'url("/data/FZゴンタかな.otf")');
  gontaFont.load().then(font => document.fonts.add(font)).catch(err => console.error('Font load failed:', err));

  // 仮想解像度設定
  const VIRTUAL_WIDTH = 1800;
  const VIRTUAL_HEIGHT = 3200;

  // UI領域設定
  const virtualButtonHeight = 320;
  const marginVirtual = 130;
  const COOLDOWN_DURATION = 0.4;

  // キャラクター＆スキル定義
  const characters = [
    { name: 'クジラ', skills: [
      { name: 'ヘヴィショット', cost: 2, size: 220, speed: 7.5, behavior: 'straight' },
      { name: 'スーパーヘヴィ', cost: 5, size: 440, speed: 8, behavior: 'straight' },
      { name: 'だんまく', cost: 9, size: 150, speed: 4, behavior: 'danmaku' }
    ]},
    { name: 'ウサギ', skills: [
      { name: 'ショット', cost: 2, size: 80, speed: 12, behavior: 'straight' },
      { name: 'だましレフト', cost: 3, size: 80, speed: 12, behavior: 'curveLeft' },
      { name: 'スピードショット', cost: 7, size: 80, speed: 50, behavior: 'straight' }
    ]},
    { name: 'カエル', skills: [
      { name: 'プチショット', cost: 1, size: 30, speed: 6, behavior: 'straight' },
      { name: 'プチツイン', cost: 2, size: 30, speed: 6.2, behavior: 'twin' },
      { name: 'ジャンボふうせん', cost: 6, size: 30, speed: 6, behavior: 'balloon' }
    ]},
    { name: 'ピエロ', skills: [
      { name: 'ピエロショット', cost: 2, size: 80, speed: 12, behavior: 'straight' },
      { name: 'ミラーショット', cost: 4, size: 80, speed: 12, behavior: 'mirror' },
      { name: 'だましダブル', cost: 5, size: 80, speed: 12, behavior: 'trickDouble' }
    ]}
  ];
  const playerColors = ['#4af', '#fa4'];

  // ゲーム状態
  let gameOver = false;
  let breakTarget = null;
  let breakProgress = 0;
  const BREAK_DURATION = 0.5;
  const pressedButtons = new Map();

  class Player {
    constructor(y, charIndex, color) {
      this.size = 180;
      this.x = (VIRTUAL_WIDTH - this.size) / 2;
      this.y = y;
      this.skills = characters[charIndex].skills;
      this.color = color;
      this.alive = true;
      this.direction = 0;
      this.speed = 3;
      this.cost = 0;
      this.maxCost = 10;
      this.costRate = 0.5;
      this.cooldowns = this.skills.map(_ => 0);
    }
    update(dt) {
      if (!this.alive || gameOver) return;
      this.x = Math.max(0, Math.min(VIRTUAL_WIDTH - this.size, this.x + this.direction * this.speed));
      this.cost = Math.min(this.maxCost, this.cost + dt * this.costRate);
      this.cooldowns = this.cooldowns.map(cd => Math.max(0, cd - dt));
    }
    draw(alpha = 1, scale = 1) {
      if (!this.alive) return;
      ctx.save(); ctx.globalAlpha = alpha;
      const w = this.size * scale;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x + (this.size - w) / 2, this.y + (this.size - w) / 2, w, w);
      ctx.restore();
    }
  }

  class Bullet {
    constructor(x, y, vx, vy, owner, skill) {
      this.x = x; this.y = y;
      this.vx = vx; this.vy = vy;
      this.owner = owner;
      this.originalSize = skill.size;
      this.size = skill.size;
      this.behavior = skill.behavior;
      this.passed = false;
    }
    update(dt) {
      if (gameOver) return;
      // 挙動切替
      if ((this.behavior === 'curveLeft' || this.behavior === 'curveRight') && !this.passed) {
        if ((this.vy < 0 && this.y < VIRTUAL_HEIGHT / 2) || (this.vy > 0 && this.y > VIRTUAL_HEIGHT / 2)) {
          this.passed = true;
          this.vx = this.behavior === 'curveLeft' ? -6 : 6;
        }
      }
      if (this.behavior === 'mirror' && !this.passed) {
        if ((this.vy < 0 && this.y < VIRTUAL_HEIGHT / 2) || (this.vy > 0 && this.y > VIRTUAL_HEIGHT / 2)) {
          this.passed = true;
          this.x = VIRTUAL_WIDTH - this.x;
        }
      }
      if (this.behavior === 'balloon') {
        if (!this.passed && ((this.vy < 0 && this.y < VIRTUAL_HEIGHT / 2) || (this.vy > 0 && this.y > VIRTUAL_HEIGHT / 2))) {
          this.passed = true;
        }
        if (this.passed && this.size < 600) {
          const growthRate = 450; // px/sec
          this.size = Math.min(600, this.size + growthRate * dt);
        }
      }
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
    }
    draw() {
      ctx.fillStyle = this.owner.color;
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    isOff() { return this.y < 0 || this.y > VIRTUAL_HEIGHT; }
  }

  // プレイヤー生成
  const p1 = new Player(VIRTUAL_HEIGHT - virtualButtonHeight - marginVirtual - 200, 2, playerColors[0]);
  const p2 = new Player(virtualButtonHeight + marginVirtual, 3, playerColors[1]);
  let bullets = [];

  // リサイズ・スケール
  let scaleX = 1, scaleY = 1;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const ratio = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    let dw, dh;
    if (w / h > ratio) { dh = h; dw = dh * ratio; } else { dw = w; dh = dw / ratio; }
    canvas.width = dw; canvas.height = dh;
    canvas.style.width = dw + 'px'; canvas.style.height = dh + 'px';
    scaleX = dw / VIRTUAL_WIDTH; scaleY = dh / VIRTUAL_HEIGHT;
  }
  window.addEventListener('resize', resize);
  resize();

  function fire(player, idx) {
    const skill = player.skills[idx];
    if (player.cost < skill.cost || player.cooldowns[idx] > 0 || gameOver) return;
    player.cost -= skill.cost;
    player.cooldowns[idx] = COOLDOWN_DURATION;
    const bx = player.x + player.size / 2;
    let by = player.y + (player === p1 ? -player.size / 2 : player.size + player.size / 2);
    if (skill.name === 'スーパーヘヴィ') by += (player === p1 ? 50 : -50);
    if (skill.behavior === 'twin') {
      const ang = 15 * Math.PI / 180;
      const mag = skill.speed;
      const vy = player === p1 ? -mag * Math.cos(ang) : mag * Math.cos(ang);
      bullets.push(new Bullet(bx, by, mag * Math.sin(ang), vy, player, skill));
      bullets.push(new Bullet(bx, by, -mag * Math.sin(ang), vy, player, skill));
      return;
    }
    if (skill.behavior === 'trickDouble') {
      const vy = player === p1 ? -skill.speed : skill.speed;
      bullets.push(new Bullet(bx, by, 0, vy, player, { ...skill, behavior: 'curveLeft' }));
      bullets.push(new Bullet(bx, by, 0, vy, player, { ...skill, behavior: 'curveRight' }));
      return;
    }
    bullets.push(new Bullet(bx, by, 0, player === p1 ? -skill.speed : skill.speed, player, skill));
  }

  function onHit(target) { gameOver = true; breakTarget = target; }
  function checkHit(b) {
    const t = b.owner === p1 ? p2 : p1;
    if (!t.alive || gameOver) return false;
    const h = b.size / 2;
    if (!(b.x + h < t.x || b.x - h > t.x + t.size || b.y + h < t.y || b.y - h > t.y + t.size)) {
      t.alive = false; onHit(t); return true;
    }
    return false;
  }

  function isButtonPressed(player, idx) {
    for (const info of pressedButtons.values()) {
      if (info.player === player && info.idx === idx) return true;
    }
    return false;
  }

  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / scaleX;
    const y = (e.clientY - r.top) / scaleY;
    const idx = Math.floor(x / (VIRTUAL_WIDTH / 3));
    if (y < virtualButtonHeight) { pressedButtons.set(e.pointerId, { player: p2, idx }); return; }
    if (y > VIRTUAL_HEIGHT - virtualButtonHeight) { pressedButtons.set(e.pointerId, { player: p1, idx }); return; }
    if (!gameOver) {
      const pl = y > VIRTUAL_HEIGHT / 2 ? p1 : p2;
      pl.direction = x < VIRTUAL_WIDTH / 2 ? -1 : 1;
    }
  });

  canvas.addEventListener('pointerup', e => {
    const info = pressedButtons.get(e.pointerId);
    if (info && !gameOver) {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / scaleX;
      const y = (e.clientY - r.top) / scaleY;
      const idxUp = Math.floor(x / (VIRTUAL_WIDTH / 3));
      const { player, idx } = info;
      if ((player === p2 && y < virtualButtonHeight && idxUp === idx) ||
          (player === p1 && y > VIRTUAL_HEIGHT - virtualButtonHeight && idxUp === idx)) {
        fire(player, idx);
      }
    }
    pressedButtons.delete(e.pointerId);
  });

  canvas.addEventListener('pointercancel', e => pressedButtons.delete(e.pointerId));

  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000; last = now;
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.save(); ctx.scale(scaleX, scaleY);
    p1.update(dt); p2.update(dt);
    if (gameOver && breakTarget) {
      breakProgress += dt; const t = Math.min(1, breakProgress / BREAK_DURATION);
      p1.draw(); p2.draw(); breakTarget.draw(1 - t, 1 - t);
      if (t >= 1) { alert((breakTarget === p1 ? '上側' : '下側') + 'の勝利！'); location.reload(); return; }
    } else {
      p1.draw(); p2.draw(); bullets = bullets.filter(b => { b.update(dt); b.draw(); return !checkHit(b) && !b.isOff(); });
    }
    ctx.restore();
    // UI描画
    const bhPx = virtualButtonHeight * scaleY, bwPx = canvas.width / 3;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const x0 = i * bwPx, y0p = 0, y0m = canvas.height - bhPx;
      const us2 = p2.cost >= p2.skills[i].cost && p2.cooldowns[i] <= 0;
      const us1 = p1.cost >= p1.skills[i].cost && p1.cooldowns[i] <= 0;
      ctx.fillStyle = us2 ? p2.color : 'rgba(200,200,200,0.9)'; ctx.fillRect(x0, y0p, bwPx - 2, bhPx - 2);
      ctx.fillStyle = us1 ? p1.color : 'rgba(200,200,200,0.9)'; ctx.fillRect(x0, y0m, bwPx - 2, bhPx - 2);
      if (isButtonPressed(p2, i)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0, y0p, bwPx - 2, bhPx - 2); }
      if (isButtonPressed(p1, i)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0, y0m, bwPx - 2, bhPx - 2); }
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.floor(bhPx * 0.25)}px Gonta`;
      ctx.fillText(p2.skills[i].name, x0 + bwPx / 2, bhPx * 0.35);
      ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`;
      ctx.fillText(p2.skills[i].cost, x0 + bwPx / 2, bhPx * 0.75);
      ctx.font = `${Math.floor(bhPx * 0.25)}px Gonta`;
      ctx.fillText(p1.skills[i].name, x0 + bwPx / 2, y0m + bhPx * 0.35);
      ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`;
      ctx.fillText(p1.skills[i].cost, x0 + bwPx / 2, y0m + bhPx * 0.75);
    }
    const barH = 18;
    ctx.fillStyle = p2.color; ctx.fillRect(0, bhPx + 2, canvas.width * (p2.cost / p2.maxCost), barH);
    if (p2.cost >= p2.maxCost) ctx.fillStyle = 'rgba(255,255,255,0.3)', ctx.fillRect(0, bhPx + 2, canvas.width, barH);
    ctx.fillStyle = p1.color; ctx.fillRect(0, canvas.height - bhPx - 2 - barH, canvas.width * (p1.cost / p1.maxCost), barH);
    if (p1.cost >= p1.maxCost) ctx.fillStyle = 'rgba(255,255,255,0.3)', ctx.fillRect(0, canvas.height - bhPx - 2 - barH, canvas.width, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 5;
    for (let j = 1; j < 10; j++) {
      const xL = j * (canvas.width / 10);
      ctx.beginPath(); ctx.moveTo(xL, bhPx + 2); ctx.lineTo(xL, bhPx + 2 + barH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xL, canvas.height - bhPx - 2 - barH); ctx.lineTo(xL, canvas.height - bhPx - 2); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.font = `${barH * 0.8}px Gonta`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(p2.cost)}/${p2.maxCost}`, canvas.width / 2, bhPx + 2 + barH / 2);
    ctx.fillText(`${Math.floor(p1.cost)}/${p1.maxCost}`, canvas.width / 2, canvas.height - bhPx - 2 - barH / 2);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
