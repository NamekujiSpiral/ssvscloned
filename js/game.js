(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // 仮想解像度設定
  const VIRTUAL_WIDTH = 1800;
  const VIRTUAL_HEIGHT = 3200;

  // ボタン領域の仮想高さ
  const virtualButtonHeight = 320;
  const marginVirtual = 130;

  // スキル設定
  const skillNames = ['技1', '技2', '技3'];
  const skillCosts = [1, 3, 6];

  class Player {
    constructor(y, color) {
      this.size = 200;
      this.x = (VIRTUAL_WIDTH - this.size) / 2;
      this.y = y;
      this.color = color;
      this.alive = true;
      this.direction = 0;
      this.speed = 3;
      this.cost = 0;
      this.maxCost = 10;
      this.costRate = 0.5;
    }
    update(dt) {
      if (!this.alive) return;
      this.x = Math.max(0, Math.min(VIRTUAL_WIDTH - this.size, this.x + this.direction * this.speed));
      this.cost = Math.min(this.maxCost, this.cost + dt * this.costRate);
    }
    draw() {
      if (!this.alive) return;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
  }

  class Bullet {
    constructor(x, y, vy, owner, side) {
      this.x = x;
      this.y = y;
      this.vy = vy;
      this.owner = owner;
      this.size = [100, 200, 300][side];
    }
    update(dt) {
      this.y += this.vy * dt * 60;
    }
    draw() {
      ctx.fillStyle = this.owner.color;
      ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
    isOffscreen() {
      return this.y < 0 || this.y > VIRTUAL_HEIGHT;
    }
  }

  const p1 = new Player(VIRTUAL_HEIGHT - virtualButtonHeight - marginVirtual - 200, '#4af');
  const p2 = new Player(virtualButtonHeight + marginVirtual, '#fa4');
  let bullets = [];

  // キャンバスとスケール
  let scaleX = 1, scaleY = 1;
  function resize() {
    const winW = window.innerWidth; const winH = window.innerHeight;
    const ratio = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    let drawW, drawH;
    if (winW / winH > ratio) { drawH = winH; drawW = drawH * ratio; }
    else { drawW = winW; drawH = drawW / ratio; }
    canvas.width = drawW; canvas.height = drawH;
    canvas.style.width = drawW + 'px'; canvas.style.height = drawH + 'px';
    scaleX = drawW / VIRTUAL_WIDTH; scaleY = drawH / VIRTUAL_HEIGHT;
  }
  window.addEventListener('resize', resize);
  resize();

  function fire(player, side) {
    if (player.cost < skillCosts[side]) return;
    player.cost -= skillCosts[side];
    const bx = player.x + player.size/2;
    const by = player.y + (player === p1 ? -player.size/2 : player.size + player.size/2);
    const vy = player === p1 ? -8 : 8;
    bullets.push(new Bullet(bx, by, vy, player, side));
  }

  function checkHit(b) {
    const target = b.owner === p1 ? p2 : p1;
    const half = b.size/2;
    if (!target.alive) return false;
    return !(b.x + half < target.x || b.x - half > target.x + target.size ||
             b.y + half < target.y || b.y - half > target.y + target.size);
  }

  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / scaleX;
    const y = (e.clientY - r.top) / scaleY;
    const idx = Math.floor(x / (VIRTUAL_WIDTH / 3));
    if (y < virtualButtonHeight) { fire(p2, idx); return; }
    if (y > VIRTUAL_HEIGHT - virtualButtonHeight) { fire(p1, idx); return; }
    const pl = y > VIRTUAL_HEIGHT/2 ? p1 : p2;
    pl.direction = x < VIRTUAL_WIDTH/2 ? -1 : 1;
  });

  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000; last = now;
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // ゲーム世界描画
    ctx.save(); ctx.scale(scaleX, scaleY);
    p1.update(dt); p2.update(dt);
    p1.draw(); p2.draw();
    bullets.forEach(b => b.update(dt));
    bullets = bullets.filter(b => { b.draw(); if (checkHit(b)) { b.owner.alive = false; return false; } return !b.isOffscreen(); });
    ctx.restore();

    // UI描画
    const bhPx = virtualButtonHeight * scaleY;
    const bwPx = canvas.width / 3;
    // 技ボタンとラベル
    ctx.font = `${Math.floor(bhPx*0.3)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      const x0 = i * bwPx;
      // ボタン色
      ctx.fillStyle = (p2.cost >= skillCosts[i]) ? p2.color : 'rgba(200,200,200,0.9)';
      ctx.fillRect(x0, 0, bwPx-2, bhPx-2);
      ctx.fillStyle = (p1.cost >= skillCosts[i]) ? p1.color : 'rgba(200,200,200,0.9)';
      ctx.fillRect(x0, canvas.height-bhPx, bwPx-2, bhPx-2);
      // 技名
      ctx.fillStyle = '#fff';
      ctx.fillText(skillNames[i], x0 + bwPx/2, bhPx * 0.35);
      ctx.fillText(skillNames[i], x0 + bwPx/2, canvas.height - bhPx + bhPx * 0.35);
      // コスト数値
      ctx.fillText(skillCosts[i], x0 + bwPx/2, bhPx * 0.75);
      ctx.fillText(skillCosts[i], x0 + bwPx/2, canvas.height - bhPx + bhPx * 0.75);
    }

    // コストバー分割線
    const barH = 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3;
    for (let j=1; j<10; j++){
      const xL = j*(canvas.width/10);
      ctx.beginPath(); ctx.moveTo(xL,bhPx+2); ctx.lineTo(xL,bhPx+2+barH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xL,canvas.height-bhPx-2-barH); ctx.lineTo(xL,canvas.height-bhPx-2); ctx.stroke();
    }
    // コストゲージ描画
    // 上部
    ctx.fillStyle = p2.color;
    ctx.fillRect(0,bhPx+2,canvas.width*(p2.cost/p2.maxCost),barH);
    if (p2.cost >= p2.maxCost) { ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillRect(0,bhPx+2,canvas.width,barH); }
    // 下部
    ctx.fillStyle = p1.color;
    ctx.fillRect(0,canvas.height-bhPx-2-barH,canvas.width*(p1.cost/p1.maxCost),barH);
    if (p1.cost >= p1.maxCost) { ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillRect(0,canvas.height-bhPx-2-barH,canvas.width,barH); }

    // コスト表示 n/10
    ctx.fillStyle='#fff'; ctx.font=`${barH*0.8}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`${Math.floor(p2.cost)}/${p2.maxCost}`, canvas.width/2, bhPx+2+barH/2);
    ctx.fillText(`${Math.floor(p1.cost)}/${p1.maxCost}`, canvas.width/2, canvas.height-bhPx-2-barH/2);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
