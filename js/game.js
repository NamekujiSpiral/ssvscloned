(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // カスタムフォント読み込み
  const gontaFont = new FontFace('Gonta', 'url("/ssvscloned/data/FZゴンタかな.otf")');
  gontaFont.load().then(font => document.fonts.add(font)).catch(err => console.error('Font load failed:', err));

  // 仮想解像度設定
  const VIRTUAL_WIDTH = 1800;
  const VIRTUAL_HEIGHT = 3200;

  // UI領域設定
  const virtualButtonHeight = 320;
  const marginVirtual = 130;
  const COOLDOWN_DURATION = 0.4;

  // メニュー設定
  let menuOpen = false;
  let menuX = VIRTUAL_WIDTH;
  let swipeStart = null;
  const MENU_WIDTH = 800;
  const SWIPE_THRESHOLD = 100;

  // ゲーム状態
  let gameOver = false;
  let breakTarget = null;
  let breakProgress = 0;
  const BREAK_DURATION = 0.5;

  // 操作記録
  const pressedButtons = new Map();

  // 選択キャラ
  let selectedChar1 = 2;
  let selectedChar2 = 3;
  let autoOpponent = false;

  // キャラクター＆スキル定義
  const characters = [
    {
      name: 'クジラ', skills: [
        { name: 'ヘヴィショット', cost: 2, size: 220, speed: 7.5, behavior: 'straight' },
        { name: 'スーパーヘヴィ', cost: 5, size: 440, speed: 8, behavior: 'straight' },
        { name: 'だんまく', cost: 9, size: 150, speed: 4, behavior: 'danmaku' }
      ]
    },
    {
      name: 'ウサギ', skills: [
        { name: 'ショット', cost: 2, size: 80, speed: 12, behavior: 'straight' },
        { name: 'だましレフト', cost: 3, size: 80, speed: 12, behavior: 'curveLeft' },
        { name: 'スピードショット', cost: 7, size: 80, speed: 50, behavior: 'straight' }
      ]
    },
    {
      name: 'カエル', skills: [
        { name: 'プチショット', cost: 1, size: 30, speed: 6, behavior: 'straight' },
        { name: 'プチツイン', cost: 2, size: 30, speed: 6.2, behavior: 'twin' },
        { name: 'ジャンボふうせん', cost: 6, size: 30, speed: 6, behavior: 'balloon' }
      ]
    },
    {
      name: 'ピエロ', skills: [
        { name: 'ピエロショット', cost: 2, size: 80, speed: 12, behavior: 'straight' },
        { name: 'ミラーショット', cost: 4, size: 80, speed: 12, behavior: 'mirror' },
        { name: 'だましダブル', cost: 5, size: 80, speed: 12, behavior: 'trickDouble' }
      ]
    },
    {
      name: 'test', skills: [
        { name: 'test1', cost: 0, size: 200, speed: 3, behavior: 'straight' },
        { name: 'test2', cost: 3, size: 600, speed: 30, behavior: 'twin' },
        { name: 'testicle', cost: 1, size: 10, speed: 4, behavior: 'mirror' }
      ]
    }
  ];
  const playerColors = ['#4af', '#fa4'];

  const boxSize = 170;
  class Box {
    constructor() {
      let f;
      if (nextSpawn < 3) {
        f = 2;
      } else if (nextSpawn < 8) {
        f = 3;
      } else {
        f = 4;
      };
      this.id = Math.floor(Math.random() * f) + 1; // 1～4
      this.hp = this.id;
      this.side = Math.random() < 0.5 ? 'left' : 'right';
      this.x = this.side === 'left' ? - boxSize * 1.5 : VIRTUAL_WIDTH + boxSize * 1.5;
      this.y = VIRTUAL_HEIGHT / 2 + (Math.random() * 400 - 200);
      const speeds = [boxSize, boxSize/2, boxSize/3,boxSize/4];
      this.vx = (this.side === 'left' ? 1 : -1) * speeds[this.id - 1];
      this.size = boxSize;
      this.shakeTime = 0;
      this.shakeDuration = 0.3; // seconds
      this.shakeDirection = 0;
    }
    update(dt) {
      this.x += this.vx * dt;
      if (this.shakeTime > 0) {
        this.shakeTime = Math.max(0, this.shakeTime - dt);
      }
    }
    draw() {
      const shakeOffset = this.shakeTime > 0
        ? Math.sin((this.shakeTime / this.shakeDuration / 2) * Math.PI * 4) * 10 * this.shakeDirection
        : 0;
      ctx.fillStyle = "rgb(255, 238, 0)";
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2 + shakeOffset, this.size, this.size);
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '100px sans-serif';
      ctx.fillText(this.hp, this.x, this.y + shakeOffset);
    }
    isOff() {
      return this.x < -this.size || this.x > VIRTUAL_WIDTH + this.size;
    }
  }

  class PItem {
    constructor(x, y, owner) {
      this.x = x;
      this.y = y;
      this.owner = owner;
      this.vy = 200; // 仮想単位/秒
      if(this.owner === p2) this.vy *= -1;
      this.size = 70;
    }
    update(dt) {
      this.y += this.vy * dt;
    }
    draw() {
      // 星型を簡略的に多角形で描画
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.owner === p2) {
        ctx.scale(1, -1);
      }
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const r = this.size;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        const midAngle = angle + Math.PI / 5;
        ctx.lineTo(Math.cos(midAngle) * (r / 2), Math.sin(midAngle) * (r / 2));
      }
      ctx.closePath();
      ctx.fillStyle = '#ff0';
      ctx.fill();
      ctx.restore();
    }
    isOff() {
      return this.y - this.size > VIRTUAL_HEIGHT;
    }
  }

  // パワーアップアイテムリスト
  let pItems = [];
  let boxes = [];

  // 箱出現スケジュール
  const SPAWN_COUNT = 13;
  const spawnTimes = [3, 7, 12, 18, 25, 33, 42, 52, 63, 75, 88, 102, 117];//後で13個になるよう追加
  let nextSpawn = 0;
  let gameTime = 0;
  let DEBUG_TIME = { value: 0 };

  function dropP(x, y, owner) {
    pItems.push(new PItem(x, y, owner));
  }
  class Player {
    constructor(y, charIndex, color) {
      this.size = 180;
      this.width = 140;
      this.height = 180;
      this.x = (VIRTUAL_WIDTH - this.width) / 2;
      this.y = y;
      this.skills = characters[charIndex].skills;
      this.color = color;
      this.alive = true;
      this.direction = 0;
      this.baseSpeed = 3;
      this.speed = this.baseSpeed;
      this.maxSpeed = this.baseSpeed * 1.5;
      this.pCount = 0;
      this.speed = 3;
      this.cost = 0;
      this.maxCost = 10;
      this.costRate = 0.5;
      this.cooldowns = this.skills.map(_ => 0);
    }
    update(dt) {
      if (!this.alive || gameOver) return;
      const t = DEBUG_TIME.value || gameTime;
      if (t > 60) {
        const p1 = players[0], p2 = players[1];
        // 線形補間係数
        const tt = Math.min(Math.max((t - 60) / (145 - 60), 0), 1);
        // 開始時のギャップ
        const initialGap = -2100;
        // 目標ギャップ
        const targetGap = -450;
        // 許可間隔
        const allowedGap = initialGap + (targetGap - initialGap) * tt;
        // p1は上方向に、p2は下方向に近づける
        const midY = (p1.y + p2.y) / 2;
        p1.y = midY - allowedGap / 2;
        p2.y = midY + allowedGap / 2;
      }
      this.x = Math.max(0, Math.min(VIRTUAL_WIDTH - this.size, this.x + this.direction * this.speed));
      this.cost = Math.min(this.maxCost, this.cost + dt * this.costRate);
      this.cooldowns = this.cooldowns.map(cd => Math.max(0, cd - dt));
    }
    draw(alpha = 1, scale = 1) {
      if (!this.alive) return;
      ctx.save(); ctx.globalAlpha = alpha;
      const w = this.width * scale;
      const h = this.height * scale;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width * scale, this.height * scale);
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
      if ((this.behavior === 'curveLeft' || this.behavior === 'curveRight') && !this.passed) {
        if ((this.vy < 0 && this.y < VIRTUAL_HEIGHT / 2) || (this.vy > 0 && this.y > VIRTUAL_HEIGHT / 2)) {
          this.passed = true;
          this.vx = this.behavior === 'curveLeft' ? -4 : 4;
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

  let p1 = new Player(VIRTUAL_HEIGHT - virtualButtonHeight - marginVirtual - 200, selectedChar1, playerColors[0]);
  let p2 = new Player(virtualButtonHeight + marginVirtual, selectedChar2, playerColors[1]);
  const players = [p1, p2];
  let bullets = [];

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
  window.addEventListener('resize', resize); resize();

  function closeMenu() { menuOpen = false; menuX = VIRTUAL_WIDTH; }

  // 入力: ボタン操作, メニュースワイプ, メニュータップ
  canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;
    // メニュースワイプ開始
    if (x > VIRTUAL_WIDTH - SWIPE_THRESHOLD) { swipeStart = x; return; }
    // メニュー外タップで閉じる
    if (menuOpen && x < menuX) { closeMenu(); return; }
    // メニュー内部タップ：キャラ / AI 選択
    if (menuOpen && x >= menuX) {
      const localX = x - menuX;
      const localY = y;
      // キャラリスト
      characters.forEach((c, i) => {
        const itemY = 150 + i * 100;
        if (localY > itemY - 30 && localY < itemY + 30) {
          if (localX < MENU_WIDTH / 2) selectedChar1 = i;
          else selectedChar2 = i;
          // 再生成
          p1 = new Player(VIRTUAL_HEIGHT - virtualButtonHeight - marginVirtual - 200, selectedChar1, playerColors[0]);
          p2 = new Player(virtualButtonHeight + marginVirtual, selectedChar2, playerColors[1]);
        }
      });
      // AIトグル
      const aiY = 150 + characters.length * 100;
      if (localY > aiY - 30 && localY < aiY + 30) {
        autoOpponent = !autoOpponent;
      }
      // 閉じるアイコン
      if (localY < 50 && localX > MENU_WIDTH - 50) {
        closeMenu();
      }
      return;
    }
    // 以下は元のpointerdown処理
    const idx = Math.floor(x / (VIRTUAL_WIDTH / 3));
    const bh = virtualButtonHeight;
    if (y < bh) { pressedButtons.set(e.pointerId, { player: p2, idx }); return; }
    if (y > VIRTUAL_HEIGHT - bh) { pressedButtons.set(e.pointerId, { player: p1, idx }); return; }
    if (!gameOver) {
      const pl = y > VIRTUAL_HEIGHT / 2 ? p1 : p2;
      pl.direction = x < VIRTUAL_WIDTH / 2 ? -1 : 1;
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (swipeStart != null) {
      const dx = (e.clientX - canvas.getBoundingClientRect().left) / scaleX - swipeStart;
      menuX = VIRTUAL_WIDTH + dx;
      // clamp menuX
      menuX = Math.max(VIRTUAL_WIDTH - MENU_WIDTH, Math.min(menuX, VIRTUAL_WIDTH));
      menuOpen = true;
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (swipeStart != null) {
      swipeStart = null;
      if (menuOpen) {
        if (menuX > VIRTUAL_WIDTH - MENU_WIDTH / 2) closeMenu(); else menuX = VIRTUAL_WIDTH - MENU_WIDTH;
      }
      return;
    }
    const info = pressedButtons.get(e.pointerId);
    if (info && !gameOver) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scaleX;
      const y = (e.clientY - rect.top) / scaleY;
      const idxUp = Math.floor(x / (VIRTUAL_WIDTH / 3));
      const { player, idx } = info;
      if ((player === p2 && y < virtualButtonHeight && idxUp === idx) ||
        (player === p1 && y > VIRTUAL_HEIGHT - virtualButtonHeight && idxUp === idx)) {
        fire(player, idx);
      }
    }
    pressedButtons.delete(e.pointerId);
  });
  canvas.addEventListener('pointercancel', e => { swipeStart = null; pressedButtons.delete(e.pointerId); });


  function fire(player, idx) {
    const skill = player.skills[idx];
    if (player.cost < skill.cost || player.cooldowns[idx] > 0 || gameOver) return;
    player.cost -= skill.cost;
    player.cooldowns[idx] = COOLDOWN_DURATION;
    const bx = player.x + player.width / 2;
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
    if (!(b.x + h < t.x || b.x - h > t.x + t.width || b.y + h < t.y || b.y - h > t.y + t.height)) {
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

  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;
    gameTime += dt;



    //5. 描画
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(scaleX, scaleY);
    p1.draw(); p2.draw();
    boxes.forEach(box => box.draw());
    bullets.forEach(b => b.draw());
    pItems.forEach(pi => pi.draw());

    if (gameOver && breakTarget) {
      breakProgress += dt; const t = Math.min(1, breakProgress / BREAK_DURATION);
      breakTarget.draw(1 - t, 1 - t);
      if (t >= 1) { alert((breakTarget === p1 ? '上側' : '下側') + 'の勝利！'); location.reload(); return; }
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
      ctx.fillStyle = '#fff'; ctx.font = `${Math.floor(bhPx * 0.25)}px Gonta`;
      ctx.fillText(p2.skills[i].name, x0 + bwPx / 2, bhPx * 0.35);
      ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`;
      ctx.fillText(p2.skills[i].cost, x0 + bwPx / 2, bhPx * 0.75);
      ctx.font = `${Math.floor(bhPx * 0.25)}px Gonta`;
      ctx.fillText(p1.skills[i].name, x0 + bwPx / 2, y0m + bhPx * 0.35);
      ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`;
      ctx.fillText(p1.skills[i].cost, x0 + bwPx / 2, y0m + bhPx * 0.75);
    }
    const barH = 130 * scaleY;
    ctx.fillStyle = p2.color; ctx.fillRect(0, bhPx + 2, canvas.width * (p2.cost / p2.maxCost), barH);
    if (p2.cost >= p2.maxCost) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, bhPx + 2, canvas.width, barH); }
    ctx.fillStyle = p1.color; ctx.fillRect(0, canvas.height - bhPx - 2 - barH, canvas.width * (p1.cost / p1.maxCost), barH);
    if (p1.cost >= p1.maxCost) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, canvas.height - bhPx - 2 - barH, canvas.width, barH); }
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 5;
    for (let j = 1; j < 10; j++) {
      const xL = j * (canvas.width / 10);
      ctx.beginPath(); ctx.moveTo(xL, bhPx + 2); ctx.lineTo(xL, bhPx + 2 + barH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xL, canvas.height - bhPx - 2 - barH); ctx.lineTo(xL, canvas.height - bhPx - 2); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.font = `${barH * 0.8}px Gonta`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(p2.cost)}/${p2.maxCost}`, canvas.width / 2, bhPx + 2 + barH / 2);
    ctx.fillText(`${Math.floor(p1.cost)}/${p1.maxCost}`, canvas.width / 2, canvas.height - bhPx - 2 - barH / 2);
    // メニュー描画
    if (menuOpen) {
      ctx.save(); ctx.scale(scaleX, scaleY);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(menuX, 0, MENU_WIDTH, VIRTUAL_HEIGHT);
      // メニュー固定フォント
      ctx.fillStyle = '#fff';
      ctx.font = '50px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('設定', menuX + 20, 80);
      // キャラ選択リスト
      characters.forEach((c, i) => {
        const y = 150 + i * 100;
        // キャラ名
        ctx.fillStyle = '#fff';
        ctx.fillText(c.name, menuX + 20, y);
        // 選択状態
        if (i === selectedChar1) {
          ctx.fillStyle = playerColors[0]; ctx.fillText('(P1)', menuX + 20 + ctx.measureText(c.name).width + 10, y);
        }
        if (i === selectedChar2) {
          ctx.fillStyle = playerColors[1]; ctx.fillText('(P2)', menuX + 20 + ctx.measureText(c.name).width + 60, y);
        }
      });
      // AI項目
      const aiY = 150 + characters.length * 100;
      ctx.fillStyle = '#fff'; ctx.fillText(`AI Opponent:`, menuX + 20, aiY);
      ctx.fillStyle = autoOpponent ? '#0f0' : '#f00';
      ctx.fillText(autoOpponent ? 'ON' : 'OFF', menuX + 300, aiY);
      // 閉じるアイコン（白固定）
      ctx.fillStyle = '#fff';
      ctx.fillText('✕', menuX + MENU_WIDTH - 40, 40);
      ctx.restore();
    }
    // 1. 箱の出現
    if (nextSpawn < SPAWN_COUNT && gameTime >= spawnTimes[nextSpawn]) {
      boxes.push(new Box());
      nextSpawn++;
    }

    // 2. 更新
    p1.update(dt); p2.update(dt);
    bullets.forEach(b => b.update(dt));
    pItems.forEach(pi => pi.update(dt));
    boxes.forEach(box => box.update(dt));

    // 3. 箱－弾 衝突判定
    bullets = bullets.filter(b => {
      let hitBox = false;
      boxes.forEach((box, i) => {
        if (!hitBox) {
          const halfB = b.size / 2;
          const halfBox = box.size / 2;
          if (b.x + halfB > box.x - halfBox && b.x - halfB < box.x + halfBox &&
            b.y + halfB > box.y - halfBox && b.y - halfB < box.y + halfBox) {
            box.shakeDirection = -Math.sign(b.vy);
            box.shakeTime = box.shakeDuration;
            box.hp--;
            if (box.hp <= 0) { dropP(box.x, box.y, b.owner); boxes.splice(i, 1); }
            hitBox = true;
          }
        }
      });
      // Boxに当たった弾は消滅
      if (hitBox) return false;
      // 通常弾処理
      return !checkHit(b) && !b.isOff();
    });


    //4.P取得
    pItems = pItems.filter(pi => {
      let caught = false;
      [p1, p2].forEach(pl => {
        if (!caught && pi.x >= pl.x && pi.x <= pl.x + pl.width &&
          pi.y >= pl.y && pi.y <= pl.y + pl.height) {
          pl.pCount++; pl.speed = Math.min(pl.maxSpeed, pl.baseSpeed + 0.2 * pl.pCount);
          caught = true;
        }
      });
      return !caught && !pi.isOff();
    });

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
