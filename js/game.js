(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // カスタムフォント読み込み
  // GitHub Pages ではルートからの絶対パスを使います
  const gontaFont = new FontFace('Gonta', 'url("/ssvscloned/data/FZゴンタかな.otf")');
  gontaFont.load().then(font => document.fonts.add(font)).catch(err => console.error('Font load failed:', err));

  // 仮想解像度
  const VIRTUAL_WIDTH = 1800;
  const VIRTUAL_HEIGHT = 3200;

  // ボタン領域
  const virtualButtonHeight = 320;
  const marginVirtual = 130;

  // クールタイム
  const COOLDOWN_DURATION = 0.4;

  // キャラクター＆スキル定義
  const characters = [
    { name: 'キャラ1', color: '#4af', skills: [
      { name: 'ヘヴィショット', cost: 2, size: 220, speed: 7.5, behavior: 'straight' },
      { name: 'スーパーヘヴィ', cost: 5, size: 440, speed: 8, behavior: 'straight' },
      { name: 'だんまく', cost: 9, size: 150, speed: 4, behavior: 'danmaku' }
    ]},
    { name: 'キャラ2', color: '#fa4', skills: [
      { name: 'ショット', cost: 2, size: 80, speed: 12, behavior: 'straight' },
      { name: 'だましレフト', cost: 3, size: 80, speed: 12, behavior: 'curveLeft' },
      { name: 'スピードショット', cost: 7, size: 80, speed: 50, behavior: 'straight' }
    ]}
  ];

  // ゲーム状態
  let gameOver = false;
  let breakTarget = null;
  let breakProgress = 0;
  const BREAK_DURATION = 0.5;

  // 押しているボタン情報を pointerId ごとに保持
  const pressedButtons = new Map();

  class Player {
    constructor(y, def) {
      this.size = 180;
      this.x = (VIRTUAL_WIDTH - this.size) / 2;
      this.y = y;
      this.color = def.color;
      this.skills = def.skills;
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
      this.size = skill.size;
      this.behavior = skill.behavior;
      this.passed = false;
    }
    update(dt) {
      if (gameOver) return;
      if (this.behavior === 'curveLeft' && !this.passed) {
        if ((this.vy < 0 && this.y < VIRTUAL_HEIGHT / 2) || (this.vy > 0 && this.y > VIRTUAL_HEIGHT / 2)) {
          this.passed = true;
          this.vx = -6;
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

  const p1 = new Player(VIRTUAL_HEIGHT - virtualButtonHeight - marginVirtual - 200, characters[0]);
  const p2 = new Player(virtualButtonHeight + marginVirtual, characters[1]);
  let bullets = [];

  // スケール計算
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
    const by = player.y + (player === p1 ? -player.size / 2 : player.size + player.size / 2);
    const vy = player === p1 ? -skill.speed : skill.speed;
    bullets.push(new Bullet(bx, by, 0, vy, player, skill));
  }

  function onHit(target) {
    gameOver = true;
    breakTarget = target;
  }

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
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;
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
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scaleX;
      const y = (e.clientY - rect.top) / scaleY;
      const idxUp = Math.floor(x / (VIRTUAL_WIDTH / 3));
      const { player, idx } = info;
      // 押し始めと同じボタンで離した場合のみ発射
      if ((player === p2 && y < virtualButtonHeight && idxUp === idx) ||
          (player === p1 && y > VIRTUAL_HEIGHT - virtualButtonHeight && idxUp === idx)) {
        fire(player, idx);
      }
    }
    pressedButtons.delete(e.pointerId);
  });

  canvas.addEventListener('pointercancel', e => {
    pressedButtons.delete(e.pointerId);
  });

  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000; last = now;
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // ゲーム描画
    ctx.save(); ctx.scale(scaleX, scaleY);
    p1.update(dt); p2.update(dt);
    if (gameOver && breakTarget) {
      breakProgress += dt; const t = Math.min(1, breakProgress / BREAK_DURATION);
      p1.draw(); p2.draw(); breakTarget.draw(1 - t, 1 - t);
      if (t >= 1) { alert((breakTarget === p1 ? '上側' : '下側') + 'の勝利！'); location.reload(); return; }
    } else {
      p1.draw(); p2.draw();
      bullets = bullets.filter(b => { b.update(dt); b.draw(); return !checkHit(b) && !b.isOff(); });
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
      // フォント設定と表示
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.floor(bhPx * 0.25)}px Gonta`; ctx.fillText(p2.skills[i].name, x0 + bwPx / 2, bhPx * 0.35);
      ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`; ctx.fillText(p2.skills[i].cost, x0 + bwPx / 2, bhPx * 0.75);
      ctx.font = `${Math.floor(bhPx * 0.25)}px Gonta`; ctx.fillText(p1.skills[i].name, x0 + bwPx / 2, y0m + bhPx * 0.35);
      ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`; ctx.fillText(p1.skills[i].cost, x0 + bwPx / 2, y0m + bhPx * 0.75);
    }

    // コストバー
    const barH = 18;
    ctx.fillStyle = p2.color; ctx.fillRect(0, bhPx + 2, canvas.width * (p2.cost / p2.maxCost), barH);
    if (p2.cost >= p2.maxCost) ctx.fillStyle = 'rgba(255,255,255,0.3)', ctx.fillRect(0, bhPx + 2, canvas.width, barH);
    ctx.fillStyle = p1.color; ctx.fillRect(0, canvas.height - bhPx - 2 - barH, canvas.width * (p1.cost / p1.maxCost), barH);
    if (p1.cost >= p1.maxCost) ctx.fillStyle = 'rgba(255,255,255,0.3)', ctx.fillRect(0, canvas.height - bhPx - 2 - barH, canvas.width, barH);

    // 分割線
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 5;
    for (let j = 1; j < 10; j++) {
      const xL = j * (canvas.width / 10);
      ctx.beginPath(); ctx.moveTo(xL, bhPx + 2); ctx.lineTo(xL, bhPx + 2 + barH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xL, canvas.height - bhPx - 2 - barH); ctx.lineTo(xL, canvas.height - bhPx - 2); ctx.stroke();
    }

    // コスト表示
    ctx.fillStyle = '#fff'; ctx.font = `${barH * 0.8}px Gonta`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(p2.cost)}/${p2.maxCost}`, canvas.width / 2, bhPx + 2 + barH / 2);
    ctx.fillText(`${Math.floor(p1.cost)}/${p1.maxCost}`, canvas.width / 2, canvas.height - bhPx - 2 - barH / 2);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
