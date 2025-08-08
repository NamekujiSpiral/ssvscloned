import { Player } from './classes/Player.js';
import { Bullet } from './classes/Bullet.js';
import { Box } from './classes/Box.js';
import { PItem } from './classes/PItem.js';
import { UIRenderer } from './modules/UIRenderer.js';
import { CollisionDetector } from './modules/CollisionDetector.js';
import { Turret } from './classes/Turret.js';
import { characters } from './data/characters.js';
import {
  VIRTUAL_WIDTH,
  VIRTUAL_HEIGHT,
  VIRTUAL_BUTTON_HEIGHT,
  MARGIN_VIRTUAL,
  COOLDOWN_DURATION,
  MENU_WIDTH,
  SWIPE_THRESHOLD,
  BREAK_DURATION,
  SPAWN_COUNT,
  SPAWN_TIMES,
  PLAYER_COLORS
} from './constants.js';

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const uiRenderer = new UIRenderer(canvas, ctx);

  // ゲーム状態
  let gameOver = false;
  let breakTarget = null;
  let breakProgress = 0;

  // 操作記録
  const pressedButtons = new Map();

  // 選択キャラ
  window.selectedChar1 = 2; // P1の選択キャラをグローバルに
  window.selectedChar2 = 3; // P2の選択キャラをグローバルに
  let autoOpponent = false;
  window.selectedPlanet = 0; // 選択中のわくせい

  let p1 = new Player(VIRTUAL_HEIGHT - VIRTUAL_BUTTON_HEIGHT - MARGIN_VIRTUAL - 200, window.selectedChar1, PLAYER_COLORS[0], characters);
  let p2 = new Player(VIRTUAL_BUTTON_HEIGHT + MARGIN_VIRTUAL, window.selectedChar2, PLAYER_COLORS[1], characters);
  const players = [p1, p2];
  let bullets = [];
let turrets = [];
  let pItems = [];
  let boxes = [];

  let nextSpawn = 0;
  let gameTime = 0;

  // メニュー設定
  let menuOpen = false;
  let menuX = VIRTUAL_WIDTH;
  let swipeStart = null;

  function closeMenu() {
    menuOpen = false;
    menuX = VIRTUAL_WIDTH;
  }

  function dropP(x, y, owner) {
    pItems.push(new PItem(x, y, owner));
  }

  function fire(player, idx, p1, p2) {
    const skill = player.skills[idx];
    if (player.pCount < skill._cumUnlockP) return;
    if (player.cost < skill.cost || player.cooldowns[idx] > 0 || gameOver) return;

    player.cost -= skill.cost;
    player.cooldowns[idx] = COOLDOWN_DURATION;

    const bx = player.x + player.width / 2;
    let by = player.y + (player === p1 ? -player.size / 2 : player.size / 2);


    if (skill.name === 'スーパーヘヴィ') by += (player === p1 ? 50 : -50);

    if (skill.behavior === 'twin') {
      const ang = 15 * Math.PI / 180;
      const mag = skill.speed;
      const vy = (player === p1 ? -mag * Math.cos(ang) : mag * Math.cos(ang));
      bullets.push(new Bullet(bx, by, mag * Math.sin(ang), vy, player, skill));
      bullets.push(new Bullet(bx, by, -mag * Math.sin(ang), vy, player, skill));
      return;
    }
    if (skill.behavior === 'trickDouble') {
      const vy = (player === p1 ? -skill.speed : skill.speed);
      bullets.push(new Bullet(bx, by, 0, vy, player, { ...skill, behavior: 'curveLeft' }));
      bullets.push(new Bullet(bx, by, 0, vy, player, { ...skill, behavior: 'curveRight' }));
      return;
    }
    if (skill.behavior === 'placeTurret') {
      // タレットの幅はプレイヤーの幅の40%なので、その半分のオフセットで中央に配置
      const turretWidth = player.width * 0.4;
      turrets.push(new Turret(player.x + player.width / 2 - turretWidth / 2, player));
      return;
    }
    if (skill.behavior === 'shortAim' || skill.behavior === 'turnAim') {
      const targetX = VIRTUAL_WIDTH / 2;
      const targetY = VIRTUAL_HEIGHT / 2;
      const dx = targetX - bx;
      const dy = targetY - by;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / distance) * skill.speed;
      const vy = (dy / distance) * skill.speed;
      bullets.push(new Bullet(bx, by, vx, vy, player, skill));
      return;
    }
    if (skill.behavior === 'longAim') {
      const targetPlayer = player === p1 ? p2 : p1;
      const targetX = VIRTUAL_WIDTH / 2;
      const targetY = targetPlayer.y;
      const dx = targetX - bx;
      const dy = targetY - by;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / distance) * skill.speed;
      const vy = (dy / distance) * skill.speed;
      bullets.push(new Bullet(bx, by, vx, vy, player, skill));
      return;
    }
    bullets.push(new Bullet(bx, by, 0, (player === p1 ? -skill.speed : skill.speed), player, skill));
  }

  function onHit(target) {
    gameOver = true;
    breakTarget = target;
  }

  function findNearest(items, player) {
    let minDistance = Infinity;
    let nearestItem = null;
    for (const item of items) {
      const distance = Math.abs(item.x - player.x) + Math.abs(item.y - player.y);
      if (distance < minDistance) {
        minDistance = distance;
        nearestItem = item;
      }
    }
    return nearestItem;
  }

  function decideMove(player) {
    const nearestPItem = findNearest(pItems, player);
    if (nearestPItem) {
      return nearestPItem.x < player.x ? -1 : 1;
    }
    return 0; // 何もしない
  }

  function updateAI(player, dt) {
    player.direction = decideMove(player);
    // AIがスキルを発動するロジックを追加することも可能
    // 例: if (player.cost >= player.skills[0].cost && player.cooldowns[0] <= 0) fire(player, 0);
  }

  function handleInput(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / uiRenderer.scaleX;
    const y = (e.clientY - rect.top) / uiRenderer.scaleY;

    // メニュースワイプ開始
    if (x > VIRTUAL_WIDTH - SWIPE_THRESHOLD) {
      swipeStart = x;
      return;
    }
    // メニュー外タップで閉じる
    if (menuOpen && x < menuX) {
      closeMenu();
      return;
    }
    // メニュー内部タップ：キャラ / AI / わくせい 選択
    if (menuOpen && x >= menuX) {
      const localX = x - menuX;
      const localY = y;
      // キャラリスト
      characters.forEach((c, i) => {
        const itemY = 150 + i * 100;
        if (localY > itemY - 30 && localY < itemY + 30) {
          if (localX < MENU_WIDTH / 2) window.selectedChar1 = i;
          else window.selectedChar2 = i;
          // 再生成
          p1 = new Player(VIRTUAL_HEIGHT - VIRTUAL_BUTTON_HEIGHT - MARGIN_VIRTUAL - 200, window.selectedChar1, PLAYER_COLORS[0], characters);
          p2 = new Player(VIRTUAL_BUTTON_HEIGHT + MARGIN_VIRTUAL, window.selectedChar2, PLAYER_COLORS[1], characters);
          players[0] = p1;
          players[1] = p2;
        }
      });
      // AIトグル
      const aiY = 150 + characters.length * 100;
      if (localY > aiY - 30 && localY < aiY + 30) {
        autoOpponent = !autoOpponent;
      }
      // わくせい選択
      const planetBaseY = 150 + (characters.length + 2) * 100;
      const planetY1 = planetBaseY;
      const planetY2 = planetBaseY + 100;
      const planetY3 = planetBaseY + 200;
      const planetY4 = planetBaseY + 300;
      const planetY5 = planetBaseY + 400;
      const planetY6 = planetBaseY + 500;

      if (localY > planetY1 - 30 && localY < planetY1 + 30) {
        window.selectedPlanet = 0;
      }
      if (localY > planetY2 - 30 && localY < planetY2 + 30) {
        window.selectedPlanet = 1;
      }
      if (localY > planetY3 - 30 && localY < planetY3 + 30) {
        window.selectedPlanet = 2;
      }
      if (localY > planetY4 - 30 && localY < planetY4 + 30) {
        window.selectedPlanet = 3;
      }
      if (localY > planetY5 - 30 && localY < planetY5 + 30) {
        window.selectedPlanet = 4;
      }
      if (localY > planetY6 - 30 && localY < planetY6 + 30) {
        window.selectedPlanet = 5;
      }

      // 閉じるアイコン
      if (localY < 50 && localX > MENU_WIDTH - 50) {
        closeMenu();
      }
      return;
    }
    // 以下は元のpointerdown処理
    const idx = Math.floor(x / (VIRTUAL_WIDTH / 3));
    const bh = VIRTUAL_BUTTON_HEIGHT;
    if (y < bh) { pressedButtons.set(e.pointerId, { player: p2, idx }); return; }
    if (y > VIRTUAL_HEIGHT - bh) { pressedButtons.set(e.pointerId, { player: p1, idx }); return; }
    if (!gameOver) {
      const pl = y > VIRTUAL_HEIGHT / 2 ? p1 : p2;
      if (pl === p2 && autoOpponent) return;
      pl.direction = x < VIRTUAL_WIDTH / 2 ? -1 : 1;
    }
  }

  function handlePointerMove(e) {
    if (swipeStart != null) {
      const dx = (e.clientX - canvas.getBoundingClientRect().left) / uiRenderer.scaleX - swipeStart;
      menuX = VIRTUAL_WIDTH + dx;
      // clamp menuX
      menuX = Math.max(VIRTUAL_WIDTH - MENU_WIDTH, Math.min(menuX, VIRTUAL_WIDTH));
      menuOpen = true;
    }
  }

  function handlePointerUp(e) {
    if (swipeStart != null) {
      swipeStart = null;
      if (menuOpen) {
        if (menuX > VIRTUAL_WIDTH - MENU_WIDTH / 2) closeMenu();
        else menuX = VIRTUAL_WIDTH - MENU_WIDTH;
      }
      return;
    }
    const info = pressedButtons.get(e.pointerId);
    if (info && !gameOver) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / uiRenderer.scaleX;
      const y = (e.clientY - rect.top) / uiRenderer.scaleY;
      const idxUp = Math.floor(x / (VIRTUAL_WIDTH / 3));
      const { player, idx } = info;
      if (player === p2 && autoOpponent) return;
      if (
        (player === p2 && y < VIRTUAL_BUTTON_HEIGHT && idxUp === idx) ||
        (player === p1 && y > VIRTUAL_HEIGHT - VIRTUAL_BUTTON_HEIGHT && idxUp === idx)
      ) {
        fire(player, idx, p1, p2);
      }
    }
    pressedButtons.delete(e.pointerId);
  }

  function handlePointerCancel(e) {
    swipeStart = null;
    pressedButtons.delete(e.pointerId);
  }

  canvas.addEventListener('pointerdown', handleInput);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerCancel);

  function updateGameLogic(dt) {
    const isMirrorPlanet = window.selectedPlanet === 2;
    const isMirrorPlanetB = window.selectedPlanet === 3;
    const isTrampolinePlanet = window.selectedPlanet === 4;
    const isTrampolinePlanetB = window.selectedPlanet === 5;

    // わくせい効果
    if (window.selectedPlanet === 1) {
      p1.costRate = 0.75;
      p2.costRate = 0.75;
    } else {
      p1.costRate = 0.5;
      p2.costRate = 0.5;
    }

    // 1. 箱の出現
    if (nextSpawn < SPAWN_COUNT && gameTime >= SPAWN_TIMES[nextSpawn]) {
      boxes.push(new Box(nextSpawn));
      nextSpawn++;
    }

    if (autoOpponent) {
      updateAI(p2, dt);
    }

    // 2. 更新
    Player.updatePlayers(dt, gameTime, players, isMirrorPlanet, isTrampolinePlanet, isTrampolinePlanetB);
    bullets.forEach(b => b.update(dt, isMirrorPlanet, isMirrorPlanetB));
    turrets.forEach(t => t.update(bullets));
    pItems.forEach(pi => pi.update(dt));
    boxes.forEach(box => box.update(dt));

    // 3. 衝突判定
    bullets = bullets.filter(b => {
      let bulletShouldBeRemoved = false; // 弾が削除されるべきかどうかのフラグ

      boxes = boxes.filter(box => {
        if (CollisionDetector.checkBulletBoxCollision(b, box)) {
          box.shakeDirection = -Math.sign(b.vy);
          box.shakeTime = box.shakeDuration;
          box.hp--;
          if (box.hp <= 0) {
            dropP(box.x, box.y, b.owner);
            bulletShouldBeRemoved = true; // 箱が破壊されたら弾も削除
            return false; // 箱を削除
          }
          bulletShouldBeRemoved = true; // 箱に当たったら弾も削除
        }
        return true; // 箱を残す
      });

      if (bulletShouldBeRemoved) return false; // 弾が削除されるべきならここで削除

      // タレットへの衝突判定
      turrets = turrets.filter(turret => {
        if (b.owner !== turret.player && CollisionDetector.checkBulletTurretCollision(b, turret)) {
          return false; // タレットを破壊
        }
        return true;
      });

      if (bulletShouldBeRemoved) return false;

      // プレイヤーへの衝突判定
      const targetPlayer = b.owner === p1 ? p2 : p1;
      if (!targetPlayer.alive) return false;

      if (CollisionDetector.checkBulletPlayerCollision(b, targetPlayer)) {
        onHit(targetPlayer);
        return false; // 弾を削除
      }

      return !b.isOff();
    });

    // 4. Pアイテム取得
    pItems = pItems.filter(pi => {
      let caught = false;
      players.forEach(pl => {
        if (CollisionDetector.checkPItemPlayerCollision(pi, pl)) {
          pl.pCount++;
          pl.speed = Math.min(pl.maxSpeed, pl.baseSpeed + 0.2 * pl.pCount);
          caught = true;
        }
      });
      return !caught && !pi.isOff();
    });
  }

  function drawGameElements(dt) {
    ctx.save();
    ctx.scale(uiRenderer.scaleX, uiRenderer.scaleY);

    // 描画順序: 箱 → キャラクター → 弾 → Pアイテム
    boxes.forEach(box => box.draw(ctx));
    turrets.forEach(t => t.draw(ctx));
    p1.draw(ctx);
    p2.draw(ctx);
    bullets.forEach(b => b.draw(ctx));
    pItems.forEach(pi => pi.draw(ctx));

    if (gameOver && breakTarget) {
      breakProgress += dt;
      const t = Math.min(1, breakProgress / BREAK_DURATION);
      // drawGameElements内でctx.scaleが適用されているため、ここではscaleを考慮しない
      breakTarget.draw(ctx, 1 - t, 1 - t);
      if (t >= 1) {
        ctx.restore(); // ゲーム要素のスケールを元に戻す
        // ゲームオーバー画面表示
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';

        // テキストのフォントサイズと位置をcanvas.heightに基づいて調整
        const winTextFontSize = canvas.height * 0.08; // 例: 高さの8%に調整
        const restartTextFontSize = canvas.height * 0.04; // 例: 高さの4%に調整

        ctx.font = `bold ${winTextFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((breakTarget === p1 ? '上側' : '下側') + 'の勝利！', canvas.width / 2, canvas.height * 0.4);

        // リスタートボタン
        ctx.font = `bold ${restartTextFontSize}px Arial`;
        ctx.fillText('クリックしてリスタート', canvas.width / 2, canvas.height * 0.6);

        canvas.onclick = () => location.reload();
        return;
      }
    }
    ctx.restore();
  }

  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;
    gameTime += dt;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // 画面クリアをここで行う

    if (!gameOver) {
      updateGameLogic(dt);
    }

    drawGameElements(dt);
    uiRenderer.draw(p1, p2, pressedButtons, menuOpen, menuX, autoOpponent);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();