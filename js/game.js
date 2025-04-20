(() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
  
    function resize() {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const targetRatio = 9 / 16;
      const windowRatio = winW / winH;
    
      let canvasW, canvasH;
      if (windowRatio > targetRatio) {
        // ウィンドウが横長すぎ → 高さに合わせて幅を制限
        canvasH = winH;
        canvasW = canvasH * targetRatio;
      } else {
        // 縦長すぎ or ジャスト → 幅に合わせて高さを制限
        canvasW = winW;
        canvasH = canvasW / targetRatio;
      }
    
      // キャンバス属性として解像度を設定
      canvas.width  = canvasW;
      canvas.height = canvasH;
      // CSS サイズとしても同じにしないと、描画領域と見た目サイズでズレが出る
      canvas.style.width  = canvasW + 'px';
      canvas.style.height = canvasH + 'px';
    }
    window.addEventListener('resize', resize);
    resize();
    // ボタン領域の高さ（画面高さの20%）
    const buttonHeightRatio = 0.13;
    function getButtonHeight() {
      return canvas.height * buttonHeightRatio;
    }
  
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
      constructor(x, y, vy, owner, radius = 5) {
        this.x = x;
        this.y = y;
        this.vy = vy;
        this.owner = owner;
        this.radius = radius;
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
  
    let pointerActive = false;
    let activePlayer = null;
    
    canvas.addEventListener('pointerdown', e => {
      const bh = getButtonHeight();
      const y = e.clientY;
      // ── ボタン領域をタップしたら、ボタン番号に応じた弾を発射 ──
      if (y > canvas.height - bh) {
        const idx = Math.floor(e.clientX / (canvas.width/3));
        fire(p1, idx);    // 下側プレイヤー(p1)のボタンなので固定
        return;           // 移動判定には進まない
      }
    
      // ── それ以外は従来どおりの上下プレイヤー＆移動開始判定 ──
      pointerActive = true;
      activePlayer = (y > canvas.height/2) ? p1 : p2;
      // 右端ボタンはもう不要なので削除してOK
    });

    canvas.addEventListener('pointermove', e => {
      if (!pointerActive || !activePlayer) return;
      // スライド移動：中央合わせ
      activePlayer.x = Math.max(0,
        Math.min(canvas.width - activePlayer.width,
          e.clientX - activePlayer.width / 2
        )
      );
    });
    
    canvas.addEventListener('pointerup', e => {
      pointerActive = false;
      activePlayer = null;
    });
    
    // （念のため）pointer がキャンセルされたときも同様にリセット
    canvas.addEventListener('pointercancel', () => {
      pointerActive = false;
      activePlayer = null;
    });
  
    // 発射処理
    function fire(player, type = 0) {
      if (!player.alive) return;
      const bx = player.x + player.width/2;
      const by = player.y + (player===p1? -5 : player.height+5);
      const vy = player===p1? -5 : 5;
      // タイプごとに半径を変える例
      const sizeMap = [5, 10, 15];
      const radius = sizeMap[type] || sizeMap[0];
      bullets.push(new Bullet(bx, by, vy, player, radius));
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

      // ── ボタン描画 ──
      const bh = getButtonHeight();
      const bw = canvas.width / 3;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = p1.color;      // 下側プレイヤーの色をボタン色に
        ctx.fillRect(i * bw, canvas.height - bh, bw - 2, bh - 2);
        // （-2はボタン間の余白です。不要なら外してください）
      }
    
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
  