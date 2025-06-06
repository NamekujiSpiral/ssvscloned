(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // カスタムフォント読み込み
  //const gontaFont = new FontFace('Gonta', 'url("/ssvscloned/data/FZゴンタかな.otf")');
  //gontaFont.load().then(font => document.fonts.add(font)).catch(err => console.error('Font load failed:', err));

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
  let selectedChar1 = 4;
  let selectedChar2 = 3;
  let autoOpponent = false;

  // キャラクター＆スキル定義
  const characters = [
    {
      name: 'クジラ', skills: [
        { name: 'ヘヴィショット', cost: 2, size: 220, speed: 7.5, behavior: 'straight', unlockP: 0, id: 61 },
        { name: 'スーパーヘヴィ', cost: 5, size: 440, speed: 8, behavior: 'straight', unlockP: 3, id: 62 },
        { name: 'だんまく', cost: 9, size: 150, speed: 4, behavior: 'danmaku', unlockP: 2, id: 63 }
      ]
    },
    {
      name: 'ウサギ', skills: [
        { name: 'ショット', cost: 2, size: 80, speed: 12, behavior: 'straight', unlockP: 0, id: 31 },
        { name: 'だましレフト', cost: 3, size: 80, speed: 12, behavior: 'curveLeft', unlockP: 2, id: 32 },
        { name: 'スピードショット', cost: 7, size: 80, speed: 50, behavior: 'straight', unlockP: 2, id: 33 }
      ]
    },
    {
      name: 'カエル', skills: [
        { name: 'プチショット', cost: 1, size: 30, speed: 6, behavior: 'straight', unlockP: 0, id: 81 },
        { name: 'プチツイン', cost: 2, size: 30, speed: 6.2, behavior: 'twin', unlockP: 1, id: 82 },
        { name: 'ジャンボふうせん', cost: 6, size: 30, speed: 6, behavior: 'balloon', unlockP: 2, id: 83 }
      ]
    },
    {
      name: 'ピエロ', skills: [
        { name: 'ピエロショット', cost: 2, size: 80, speed: 12, behavior: 'straight', unlockP: 0, id: 151 },
        { name: 'ミラーショット', cost: 4, size: 80, speed: 12, behavior: 'mirror', unlockP: 2, id: 152 },
        { name: 'だましダブル', cost: 5, size: 80, speed: 12, behavior: 'trickDouble', unlockP: 2, id: 153 }
      ]
    },
    {
      name: 'test', skills: [
        { name: 'test1', cost: 0, size: 200, speed: 3, behavior: 'straight', unlockP: 0, id: 901 },
        { name: 'test2', cost: 3, size: 600, speed: 30, behavior: 'twin', unlockP: 0, id: 902 },
        { name: 'testicle', cost: 1, size: 10, speed: 4, behavior: 'mirror', unlockP: 2, id: 903 }
      ]
    }
  ];
  characters.forEach(ch => {
    let cum = 0;
    ch.skills.forEach(skill => {
      cum += skill.unlockP;
      skill._cumUnlockP = cum;
    })
  })
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
      const speeds = [boxSize, boxSize / 2, boxSize / 3, boxSize / 4];
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
      if (this.owner === p2) this.vy *= -1;
      this.size = 70;
      this.color = '#ff0';
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
      ctx.fillStyle = this.color;
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
      this.character = charIndex;
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
    constructor(x, y, vx, vy, owner, skill, skillidx) {
      this.x = x; this.y = y;
      this.vx = vx; this.vy = vy;
      this.owner = owner;
      this.originalSize = skill.size;
      this.size = skill.size;
      this.behavior = skill.behavior;
      this.passed = false;
      this.id = skill.id;
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
      if (pl == p2 && autoOpponent) return;
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
      if (player == 2 && autoOpponent) return;
      if ((player === p2 && y < virtualButtonHeight && idxUp === idx) ||
        (player === p1 && y > VIRTUAL_HEIGHT - virtualButtonHeight && idxUp === idx)) {
        fire(player, idx);
      }
    }
    pressedButtons.delete(e.pointerId);
  });
  canvas.addEventListener('pointercancel', e => { swipeStart = null; pressedButtons.delete(e.pointerId); });



  // ── RL 環境の初期化 ──
  const env = createEnv();
  // 状態／行動空間の次元は reset() 後に確定
  const initState = env.reset();
  const stateDim = initState.length;
  const skillCount = p2.skills.length + 1;
  const actionDim = 2 * skillCount;
  const gamma = 0.99;   // 割引率

  // ── DQN モデルを作成 ──
  const agent1 = createDQN(stateDim, actionDim);
  const agent2 = createDQN(stateDim, actionDim);

  function createEnv() {
    function reset() {
      gameTime = 0;
      bullets = [];
      boxes = [];
      pItems = [];
      p1 = new Player(VIRTUAL_HEIGHT - virtualButtonHeight - marginVirtual - 200, 1, playerColors[0]);
      p2 = new Player(virtualButtonHeight + marginVirtual, 1, playerColors[1]);
      breakTarget = null;
      gameOver = false;
      return getState();
    }

    function step({ dir1, skillId1, dir2, skillId2 }) {
      let events = [];
      let done = false;


      p1.direction = dir1;
      if (skillId1 !== null) {
        // id → 配列インデックスに変換
        const idx = p1.skills.findIndex(s => s.id === skillId1);
        if (idx >= 0) {
          fire(p1, idx);
          events.push({ type: 'shot', player: 'p1' });
        }
      }
      p2.direction = dir2;
      if (skillId2 !== null) {
        const idx = p2.skills.findIndex(s => s.id === skillId2);
        if (idx >= 0) {
          fire(p2, idx);
          events.push({ type: 'shot', player: 'p2' });
        }
      }

      const dt = 1 / 30;
      gameTime += dt;
      updateAll(dt, events);

      for (let v of bullets) {
        checkHit(v);
      }
      if (breakTarget) {
        events.push({ type: 'kill', player: breakTarget === p2 ? 'p2' : 'p1' });
        events.push({ type: 'killed_by', player: breakTarget === p2 ? 'p1' : 'p2' });
        done = true;
      }

      [p1, p2].forEach((pl) => {
        pl.skills.forEach((s, i) => {
          if (!s._unlocked && pl.pCount >= s._cumUnlockP) {
            s._unlocked = true;
            events.push({ type: 'skill_unlock', player: pl === p1 ? 'p1' : 'p2', skillIdx: i });
          }
        })
      });

      const nextState = getState();
      const reward1 = computeReward(events, 'p1');
      const reward2 = computeReward(events, 'p2');

      return { nextState, reward1, reward2, done };
    }

    function getState() {
      const s = [
        gameTime / 1000,
        p2.x / VIRTUAL_WIDTH,
        p2.y / VIRTUAL_HEIGHT,
        p2.cost / 10,
        p2.character / 100,

        p1.x / VIRTUAL_WIDTH,
        p1.y / VIRTUAL_HEIGHT,
        p1.cost / 10,
        p1.character / 100
      ]

      // bullets: 20発分、なければゼロ埋め
      for (let i = 0; i < 20; i++) {
        if (i < bullets.length) {
          const b = bullets[i];
          s.push(
            b.x / VIRTUAL_WIDTH,
            b.y / VIRTUAL_HEIGHT,
            b.id / 1000,
            b.vx / 100,
            b.vy / 100,
            b.size / 1000
          );
        } else {
          // 6要素分ゼロ
          s.push(0, 0, 0, 0, 0, 0);
        }
      }

      for (let i = 0; i < 3; i++) {
        if (i < pItems.length) {
          const pi = pItems[i];
          s.push(pi.x / VIRTUAL_WIDTH, pi.y / VIRTUAL_HEIGHT);
        } else {
          s.push(0, 0);
        }
      }

      for (let i = 0; i < 6; i++) {
        if (i < boxes.length) {
          const box = boxes[i];
          s.push(box.x / VIRTUAL_WIDTH, box.y / VIRTUAL_HEIGHT, box.id / 5);
        } else {
          s.push(0, 0, 0);
        }
      }
      return s;
    }

    return { reset, step, getState }
  }

  function computeReward(events, player) {
    let reward = 0;

    for (const ev of events) {
      switch (ev.type) {
        case 'p_spawn':
          if (ev.player === player) reward += +5;
          else reward += -1;
          break;

        case 'p_collect':
          if (ev.player === player) reward += +10;
          else reward += -15;
          break;

        case 'skill_unlock':
          if (ev.player === player) reward += +15;
          else reward += -20;
          break;

        case 'kill':
          if (ev.player !== player) {
            reward += +500;
          }
          break;

        case 'killed_by':
          if (ev.player !== player) {
            reward += -500;
          }
          break;

        case 'shot':
          if (ev.player === player) {
            reward += -1;
          }
      }
    }

    reward += -0.01;
    return reward;
  }

  function createDQN(inputDim, outputDim) {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [inputDim], units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: outputDim }));
    model.compile({ optimizer: tf.train.adam(0.0005), loss: 'meanSquaredError' });
    return model;
  }


  class ReplayBuffer {
    constructor(maxSize = 100000) {
      this.maxSize = maxSize;
      this.buffer = [];
      this.pos = 0;
    }
    add(experience) {
      if (this.buffer.length < this.maxSize) {
        this.buffer.push(experience);
      } else {
        this.buffer[this.pos] = experience;
        this.pos = (this.pos + 1) % this.maxSize;
      }
    }
    sample(batchSize) {
      const out = [];
      for (let i = 0; i < batchSize; i++) {
        const idx = Math.floor(Math.random() * this.buffer.length);
        out.push(this.buffer[idx]);
      }
      return out;
    }
    size() {
      return this.buffer.length;
    }
  }

  function selectAction(model, state, epsilon, player) {
    let dir;
    let skillId = null;

    // どのプレイヤーを操作するかを判定
    // もし player が文字列 'p1' もしくは 'p2' なら、対応するオブジェクトを取得
    const pl = (player === 'p1') ? p1 : (player === 'p2' ? p2 : player);
    // 例：player に Player インスタンス自体を渡してもよい

    // 1) ε-greedy で移動方向を決める
    if (Math.random() < epsilon) {
      // ランダムに -1 or +1
      dir = Math.random() < 0.5 ? -1 : +1;
    } else {
      // モデル推論フェーズ
      const input = tf.tensor2d([state]);
      const qValues = model.predict(input);
      const actionIndex = qValues.argMax(-1).dataSync()[0];
      tf.dispose(input);
      tf.dispose(qValues);

      const moveIdx = Math.floor(actionIndex / skillCount);
      const skillIdx = actionIndex % skillCount;

      dir = (moveIdx === 0) ? -1 : +1;
      skillId = (skillIdx === 0)
        ? null
        : pl.skills[skillIdx - 1].id;

      return { dir, skillId };
    }

    // 2) ランダム探索フェーズ：50% でスキルを撃つ
    if (Math.random() < 0.01) {
      // pl のスキル一覧から「撃てるもの」を集める
      const avail = pl.skills
        .map((sk, i) => ({ sk, i }))
        .filter(({ sk, i }) =>
          pl.cost >= sk.cost && pl.cooldowns[i] <= 0
        );

      if (avail.length > 0) {
        const { sk } = avail[Math.floor(Math.random() * avail.length)];
        skillId = sk.id;
      }
    }

    return { dir, skillId };
  }

  // ── 学習ループの例 ──
  async function trainLoop(stopFlagFn, savedmodel) {
    // ── ハイパーパラメータ ──
    const MAX_EPISODES = 500;    // 総エピソード数
    const MAX_STEPS = 30 * 175;
    const batchSize = 128;     // ミニバッチサイズ
    let epsilon = 1.0;    // ε-greedy の初期 ε
    const epsilonMin = 0.05;   // ε の最小値
    const epsilonDecay = 0.995;  // エピソード毎の ε 減衰率
    const trainInterval = 10;

    if (savedmodel) {
      window.agent1 = savedmodel;
      window.agent2 = savedmodel;
      epsilon = 0.5;
    } else {
      window.agent1 = createDQN(stateDim, actionDim);
      window.agent2 = createDQN(stateDim, actionDim);
    }

    // それぞれのリプレイバッファ
    const buffer1 = new ReplayBuffer(50000);
    const buffer2 = new ReplayBuffer(50000);

    // 環境を初期化
    const env = createEnv();

    for (let episode = 0; episode < MAX_EPISODES; episode++) {
      if (stopFlagFn && stopFlagFn() === true) {
        console.log(`学習中断: episode ${episode} で打ち切り`);
        return agent2;
      }

      let state = env.reset();
      let done = false;
      let stepCount = 0;
      let totalR1 = 0;
      let totalR2 = 0;

      while (!done && stepCount < MAX_STEPS) {
        // ────── (1) 両エージェントが行動を選択 ──────
        const act1 = selectAction(agent1, state, epsilon, p1);
        const act2 = selectAction(agent2, state, epsilon, p2);

        // ────── (2) 環境を一ステップ進める ──────
        const { nextState, reward1, reward2, done: d } = env.step({
          dir1: act1.dir,
          skillId1: act1.skillId,
          dir2: act2.dir,
          skillId2: act2.skillId
        });

        if (false && Math.random() < 0.2) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save(); ctx.scale(scaleX, scaleY);
          p1.draw(); p2.draw();
          boxes.forEach(box => box.draw());
          bullets.forEach(b => b.draw());
          pItems.forEach(pi => pi.draw());
          ctx.restore();
        }

        const actionIdx1 = (act1.dir === -1 ? 0 : 1) * skillCount
          + (act1.skillId == null ? 0 : (p2.skills.findIndex(s => s.id === act1.skillId) + 1));
        const actionIdx2 = (act2.dir === -1 ? 0 : 1) * skillCount
          + (act2.skillId == null ? 0 : (p2.skills.findIndex(s => s.id === act2.skillId) + 1));

        buffer1.add({ state, dir: act1.dir, skillId: act1.skillId, action: actionIdx1, reward: reward1, nextState, done: d });
        buffer2.add({ state, dir: act2.dir, skillId: act2.skillId, action: actionIdx2, reward: reward2, nextState, done: d });

        state = nextState;
        done = d;
        totalR1 += reward1;
        totalR2 += reward2;
        stepCount++;

        if (stepCount % trainInterval === 0) {
          if (buffer1.size() >= batchSize) {
            const batch1 = buffer1.sample(batchSize);
            await trainOnBatch(agent1, batch1);
          }
          if (buffer2.size() >= batchSize) {
            const batch2 = buffer2.sample(batchSize);
            await trainOnBatch(agent2, batch2);
          }
        }
      }

      // ε-greedy の ε を徐々に減少
      epsilon = Math.max(epsilonMin, epsilon * epsilonDecay);
      console.log(`Episode ${episode}: steps=${stepCount}  R1=${totalR1.toFixed(2)}  R2=${totalR2.toFixed(2)}  ε=${epsilon.toFixed(2)}`);
    }
  }

  async function trainOnBatch(model, batch) {
    const N = batch.length;
    const states = tf.tensor2d(batch.map(e => e.state));
    const nextStates = tf.tensor2d(batch.map(e => e.nextState));

    // モデルから Q(s) を取得
    const qPredTensor = tf.tensor2d(
      Array.isArray(model.predict(states))
        ? (await model.predict(states)[0].array())
        : (await model.predict(states).array())
    );

    // 報酬と終了フラグの配列
    const rewards = batch.map(e => e.reward);
    const dones = batch.map(e => e.done ? 1 : 0);

    // 次状態の最大 Q 値
    const qNext = (await model.predict(nextStates).max(-1).array());

    // TD 目標値行列の組み立て
    const rawPred = await qPredTensor.array();
    const qTarget = rawPred.map((row, i) => {
      const newRow = row.slice();
      const moveIdx = batch[i].dir === -1 ? 0 : 1;
      const skillIdx = batch[i].skillId == null
        ? 0
        : p2.skills.findIndex(s => s.id === batch[i].skillId) + 1;
      const actionIndex = moveIdx * skillCount + skillIdx;
      if (actionIndex < 0 || actionIndex >= newRow.length) {
        console.error(`Invalid actionIndex ${actionIndex} at batch[${i}]`);
      }
      newRow[actionIndex] = rewards[i] + gamma * (1 - dones[i]) * qNext[i];
      return newRow;
    });

    // 目標値テンソル化
    const targetTensor = tf.tensor2d(qTarget, [N, actionDim]);

    // 学習ステップ
    await model.fit(states, targetTensor, { batchSize: N, epochs: 1, verbose: 0 });

    // リソース解放
    tf.dispose([states, nextStates, qPredTensor, targetTensor]);
  }

  const rewardsHistory = [];

  function fire(player, idx) {
    const skill = player.skills[idx];
    if (player.pCount < skill._cumUnlockP) return;
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

  function findNearest(P, player) {
    let min = Infinity;
    let mini;
    for (let i in P) {
      let d = Math.abs(P[i].x - player.x) + Math.abs(P[i].y - player.y);
      if (min > d) {
        min = d;
        mini = P[i];
      }
    }
    return mini;
  }

  function decideMove(player) {
    //PItem 取得
    const nearest = findNearest(pItems, player);
    if (nearest) {
      return nearest.x - nearest.size / 2 < player.x ? -1 : +1;
    }

    //何もしない
    return player.direction;
  }

  function updateAI(player, dt) {
    // 移動方向を決めて反映
    player.direction = decideMove(player);
  }

  function updateAll(dt, events) {
    if (nextSpawn < SPAWN_COUNT && gameTime >= spawnTimes[nextSpawn]) {
      boxes.push(new Box());
      nextSpawn++;
    }
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
            if (box.hp <= 0) {
              dropP(box.x, box.y, b.owner);
              boxes.splice(i, 1);
              events.push({ type: 'p_spawn', player: b.owner === p2 ? 'p2' : 'p1' });
            }
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
      const half = pi.size / 2;
      [p1, p2].forEach(pl => {
        if (caught) return;
        // PItem の矩形： (pi.x-half, pi.y-half) から (pi.x+half, pi.y+half)
        // Player の矩形： (pl.x, pl.y) から (pl.x+pl.width, pl.y+pl.height)
        if (
          pi.x + half > pl.x &&
          pi.x - half < pl.x + pl.width &&
          pi.y + half > pl.y &&
          pi.y - half < pl.y + pl.height
        ) {
          pl.pCount++;
          pl.speed = Math.min(pl.maxSpeed, pl.baseSpeed + 0.2 * pl.pCount);
          events.push({ type: 'p_collect', player: pl === p2 ? 'p2' : 'p1' });
          caught = true;
        }
      });
      return !caught && !pi.isOff();
    });
  }
  /*
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
  // UI描画
  const bhPx = virtualButtonHeight * scaleY, bwPx = canvas.width / 3;
  ctx.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const x0 = i * bwPx, y0p = 0, y0m = canvas.height - bhPx;
    const skill2 = p2.skills[i], skill1 = p1.skills[i];
    const unlocked2 = p2.pCount >= skill2._cumUnlockP;
    const ready2 = unlocked2 && p2.cost >= skill2.cost && p2.cooldowns[i] <= 0;
    const unlocked1 = p1.pCount >= skill1._cumUnlockP;
    const ready1 = unlocked1 && p1.cost >= skill1.cost && p1.cooldowns[i] <= 0;
 
    // ボタン背景
    ctx.fillStyle = !unlocked2 ? 'rgba(130,130,130,1)' : (!ready2 ? 'rgba(200,200,200,1)' : p2.color);
    ctx.fillRect(x0, y0p, bwPx - 2, bhPx - 2);
    ctx.fillStyle = !unlocked1 ? 'rgba(130,130,130,1)' : (!ready1 ? 'rgba(200,200,200,1)' : p1.color);
    ctx.fillRect(x0, y0m, bwPx - 2, bhPx - 2);
 
    // 押下フィードバック
    if (isButtonPressed(p2, i)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0, y0p, bwPx - 2, bhPx - 2); }
    if (isButtonPressed(p1, i)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0, y0m, bwPx - 2, bhPx - 2); }
 
    // 技名
    ctx.fillStyle = '#fff'; ctx.font = `${Math.floor(bhPx * 0.22)}px Gonta`;
    ctx.fillText(skill2.name, x0 + bwPx / 2, bhPx * 0.25);
    ctx.fillText(skill1.name, x0 + bwPx / 2, y0m + bhPx * 0.25);
 
    // コスト or 必要Pの星形表示
    const starSize = 70 * 2 * 0.8 * scaleY; // =70
    const gap = starSize * 1.2;
    // p2
    if (unlocked2) {
      ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`;
      ctx.fillText(skill2.cost, x0 + bwPx / 2, bhPx * 0.7);
    } else {
      const maxP = skill2.unlockP;
      const haveP = Math.min(p2.pCount - p2.skills[i - 1]._cumUnlockP, maxP);
      const startX = x0 + bwPx / 2 - (gap * (maxP - 1)) / 2;
      for (let s = 0; s < maxP; s++) {
        const cx = startX + s * gap;
        const cy = bhPx * 0.7;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const ang = (Math.PI * 2 / 5) * k - Math.PI / 2;
          ctx.lineTo(Math.cos(ang) * (starSize / 2), Math.sin(ang) * (starSize / 2));
          const mid = ang + Math.PI / 5;
          ctx.lineTo(Math.cos(mid) * (starSize / 4), Math.sin(mid) * (starSize / 4));
        }
        ctx.closePath();
        ctx.fillStyle = s < haveP ? '#ff0' : 'rgba(100,100,100,1)';
        ctx.fill();
        ctx.restore();
      }
    }
    // p1
    if (unlocked1) {
      ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`;
      ctx.fillText(skill1.cost, x0 + bwPx / 2, y0m + bhPx * 0.7);
    } else {
      const maxP = skill1.unlockP;
      const haveP = Math.min(p1.pCount - p1.skills[i - 1]._cumUnlockP, maxP);
      const startX = x0 + bwPx / 2 - (gap * (maxP - 1)) / 2;
      for (let s = 0; s < maxP; s++) {
        const cx = startX + s * gap;
        const cy = y0m + bhPx * 0.7;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const ang = (Math.PI * 2 / 5) * k - Math.PI / 2;
          ctx.lineTo(Math.cos(ang) * (starSize / 2), Math.sin(ang) * (starSize / 2));
          const mid = ang + Math.PI / 5;
          ctx.lineTo(Math.cos(mid) * (starSize / 4), Math.sin(mid) * (starSize / 4));
        }
        ctx.closePath();
        ctx.fillStyle = s < haveP ? '#ff0' : 'rgba(100,100,100,1)';
        ctx.fill();
        ctx.restore();
      }
    }
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
 
  if (autoOpponent) {
    updateAI(p2, dt);
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
    const half = pi.size / 2;
    [p1, p2].forEach(pl => {
      if (caught) return;
      // PItem の矩形： (pi.x-half, pi.y-half) から (pi.x+half, pi.y+half)
      // Player の矩形： (pl.x, pl.y) から (pl.x+pl.width, pl.y+pl.height)
      if (
        pi.x + half > pl.x &&
        pi.x - half < pl.x + pl.width &&
        pi.y + half > pl.y &&
        pi.y - half < pl.y + pl.height
      ) {
        pl.pCount++;
        pl.speed = Math.min(pl.maxSpeed, pl.baseSpeed + 0.2 * pl.pCount);
        caught = true;
      }
    });
    return !caught && !pi.isOff();
  });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
*/
  window.trainLoop = trainLoop;
})();
