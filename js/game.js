(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // 仮想解像度設定
  const VIRTUAL_WIDTH = 1800;
  const VIRTUAL_HEIGHT = 3200;

  // ボタン領域の仮想高さ（仮想高さの10%）
  const buttonHeightRatio = 0.1;
  const virtualButtonHeight = VIRTUAL_HEIGHT * buttonHeightRatio;
  const marginVirtual = 130; // キャラとボタンの間隔（仮想単位）

  // スキルコスト設定
  const skillCosts = [2, 4, 6];

  class Player {
    constructor(y, color) {
      this.size = 200; // 仮想単位で正方形サイズ
      this.width = this.height = this.size;
      this.x = (VIRTUAL_WIDTH - this.size) / 2;
      this.y = y;
      this.color = color;
      this.alive = true;
      this.direction = 0;
      this.speed = 3; // 仮想単位/frame
      this.cost = 0;
      this.maxCost = 10;
      this.costRate = 0.5; // 仮想時間1秒あたり0.5コスト
    }
    update(dt) {
      if (!this.alive) return;
      // 移動
      this.x = Math.max(0, Math.min(VIRTUAL_WIDTH - this.size, this.x + this.direction * this.speed));
      // コスト蓄積
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
      this.size = [100, 200, 300][side]; // 仮想単位の弾サイズ
    }
    update(dt) {
      this.y += this.vy * dt * 60; // 仮想速度補正
    }
    draw() {
      ctx.fillStyle = this.owner.color;
      ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
    isOffscreen() {
      return this.y < 0 || this.y > VIRTUAL_HEIGHT;
    }
  }

  // プレイヤー生成（Yは仮想座標）
  const p1 = new Player(VIRTUAL_HEIGHT - virtualButtonHeight - marginVirtual - 200, '#4af');
  const p2 = new Player(virtualButtonHeight + marginVirtual, '#fa4');
  let bullets = [];

  // キャンバスサイズ・スケール計算
  let scaleX = 1, scaleY = 1;
  function resize() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const targetRatio = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    const windowRatio = winW / winH;
    let drawW, drawH;
    if (windowRatio > targetRatio) {
      drawH = winH;
      drawW = drawH * targetRatio;
    } else {
      drawW = winW;
      drawH = drawW / targetRatio;
    }
    canvas.style.width = drawW + 'px';
    canvas.style.height = drawH + 'px';
    canvas.width = drawW;
    canvas.height = drawH;
    scaleX = drawW / VIRTUAL_WIDTH;
    scaleY = drawH / VIRTUAL_HEIGHT;
    console.log();
  }
  window.addEventListener('resize', resize);
  resize();

  // 発射処理
  function fire(player, side) {
    if (player.cost < skillCosts[side]) return;
    player.cost -= skillCosts[side];
    const bx = player.x + player.size/2;
    const by = player.y + (player === p1 ? -player.size/2 : player.size + player.size/2);
    const vy = player === p1 ? -8 : 8;
    bullets.push(new Bullet(bx, by, vy, player, side));
  }

  // 衝突判定（仮想座標で）
  function checkHit(b) {
    const target = b.owner === p1 ? p2 : p1;
    const half = b.size/2;
    if (!target.alive) return false;
    return !(b.x+half < target.x || b.x-half > target.x + target.size ||
             b.y+half < target.y || b.y-half > target.y + target.size);
  }

  // タッチ/クリック入力
  canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;
    const bw = VIRTUAL_WIDTH / 3;
    const idx = Math.floor(x / bw);
    if (y < virtualButtonHeight) { fire(p2, idx); return; }
    if (y > VIRTUAL_HEIGHT - virtualButtonHeight) { fire(p1, idx); return; }
    const player = y > VIRTUAL_HEIGHT/2 ? p1 : p2;
    player.direction = x < VIRTUAL_WIDTH/2 ? -1 : 1;
  });

  // 毎フレーム更新
  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000; last = now;
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // ゲームエリア描画をスケーリング
    ctx.save();
    ctx.scale(scaleX, scaleY);
    // プレイヤー描画
    p1.update(dt); p2.update(dt);
    p1.draw(); p2.draw();
    // 弾描画
    bullets.forEach(b => b.update(dt));
    bullets = bullets.filter(b => {
      b.draw();
      if (checkHit(b)) { b.owner.alive = false; return false; }
      return !b.isOffscreen();
    });
    ctx.restore();

    // UI（ボタン・ゲージ）は画面（CSS）座標で表示
    const drawW = VIRTUAL_WIDTH * scaleX;
    const drawH = VIRTUAL_HEIGHT * scaleY;
    // ボタン
    const bhPx = virtualButtonHeight * scaleY;
    const bwPx = drawW / 3;
    for (let i = 0; i < 3; i++) {
      // 上
      ctx.fillStyle = p2.color;
      ctx.fillRect(i*bwPx, 0, bwPx-2, bhPx-2);
      // 下
      ctx.fillStyle = p1.color;
      ctx.fillRect(i*bwPx, drawH - bhPx, bwPx-2, bhPx-2);
    }
    // コストゲージ
    const barH = 18;
    // p2
    ctx.fillStyle = p2.color;
    ctx.fillRect(0, bhPx + 2, drawW * (p2.cost/p2.maxCost), barH);
    // p1
    ctx.fillStyle = p1.color;
    ctx.fillRect(0, drawH - bhPx - 2 - barH, drawW * (p1.cost/p1.maxCost), barH);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
