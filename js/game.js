(() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
  
    // 画面サイズを縦画面フルスクリーンに
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
  
    // プレイヤー定義
    class Player {
      constructor(y, color) {
        this.width = 50;
        this.height = 20;
        this.x = (canvas.width - this.width) / 2;
        this.y = y;
        this.color = color;
        this.alive = true;
      }
      draw() {
        if (!this.alive) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
  
    // 弾定義
    class Bullet {
      constructor(x, y, vy, owner) {
        this.x = x;
        this.y = y;
        this.vy = vy;
        this.owner = owner;
        this.radius = 5;
      }
      update() {
        this.y += this.vy;
      }
      draw() {
        ctx.fillStyle = this.owner.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      isOffscreen() {
        return this.y < 0 || this.y > canvas.height;
      }
    }
  
    // プレイヤー初期化
    const p1 = new Player(canvas.height - 40, '#4af'); // 下側
    const p2 = new Player(20, '#fa4');                 // 上側
  
    let bullets = [];
  
    // タッチ管理
    const touches = {};
  
    canvas.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        // 画面を上下エリアで分割
        const who = (t.clientY > canvas.height / 2) ? p1 : p2;
        touches[t.identifier] = { who, startX: t.clientX };
        // 右端エリア（発射ボタン：幅20%）なら発射
        if (t.clientX > canvas.width * 0.8) {
          fire(who);
        }
      }
      e.preventDefault();
    });
  
    canvas.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        const info = touches[t.identifier];
        if (!info) continue;
        // スライド量だけXを移動
        const dx = t.clientX - info.startX;
        info.who.x = Math.max(0,
          Math.min(canvas.width - info.who.width, info.who.x + dx)
        );
        info.startX = t.clientX;
      }
      e.preventDefault();
    });
  
    canvas.addEventListener('touchend', e => {
      for (const t of e.changedTouches) {
        delete touches[t.identifier];
      }
      e.preventDefault();
    });
  
    // 発射処理
    function fire(player) {
      if (!player.alive) return;
      const bx = player.x + player.width / 2;
      const by = player.y + (player === p1 ? -5 : player.height + 5);
      const vy = player === p1 ? -5 : 5;
      bullets.push(new Bullet(bx, by, vy, player));
    }
  
    // 衝突検知
    function checkHit(b) {
      const target = b.owner === p1 ? p2 : p1;
      if (!target.alive) return false;
      if (b.x > target.x &&
          b.x < target.x + target.width &&
          b.y > target.y &&
          b.y < target.y + target.height) {
        target.alive = false;
        return true;
      }
      return false;
    }
  
    // メインループ
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // プレイヤー描画
      p1.draw();
      p2.draw();
  
      // 弾更新・描画
      bullets.forEach(b => b.update());
      bullets.forEach(b => b.draw());
  
      // 衝突 or 画面外の弾削除
      bullets = bullets.filter(b => {
        if (checkHit(b)) {
          setTimeout(() => alert(
            `${b.owner === p1 ? '下側のプレイヤー' : '上側のプレイヤー'} の勝利！`
          ), 10);
          // リロードして再戦
          setTimeout(() => location.reload(), 100);
          return false;
        }
        return !b.isOffscreen();
      });
  
      requestAnimationFrame(loop);
    }
  
    loop();
  })();
  