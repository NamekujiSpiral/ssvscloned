(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const buttonHeightRatio = 0.12;
  const costBarHeight = 18;
  function getButtonHeight() {
    return canvas.height * buttonHeightRatio;
  }

  class Player {
    constructor(y, color) {
      this.size = 40;
      this.width = this.height = this.size;
      this.x = (canvas.width - this.size) / 2;
      this.y = y;
      this.color = color;
      this.alive = true;
      this.direction = 0;
      this.speed = 2;
      this.cost = 0;
    }
    update() {
      if (!this.alive) return;
      this.x += this.direction * this.speed;
      this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
    }
    draw() {
      if (!this.alive) return;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
  }

  class Bullet {
    constructor(x, y, vy, owner, size = 10) {
      this.x = x;
      this.y = y;
      this.vy = vy;
      this.owner = owner;
      this.size = size;
    }
    update() {
      this.y += this.vy;
    }
    draw() {
      ctx.fillStyle = this.owner.color;
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    isOffscreen() {
      return this.y < 0 || this.y > canvas.height;
    }
  }

  const p1 = new Player(canvas.height - 40, '#4af');
  const p2 = new Player(20, '#fa4');
  let bullets = [];

  function resize() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const targetRatio = 9 / 16;
    const windowRatio = winW / winH;

    let canvasW, canvasH;
    if (windowRatio > targetRatio) {
      canvasH = winH;
      canvasW = canvasH * targetRatio;
    } else {
      canvasW = winW;
      canvasH = canvasW / targetRatio;
    }

    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';

    const bh = getButtonHeight();
    p1.y = canvas.height - bh - 20 - p1.size;
    p2.y = bh + 20;
  }
  resize();

  function fire(player, type = 0) {
    const costTable = [2, 4, 6];
    const sizeTable = [10, 20, 30];
    const cost = costTable[type] || 0;
    if (player.cost < cost) return;

    player.cost -= cost;
    const bx = player.x + player.width / 2;
    const by = player.y + (player === p1 ? -5 : player.height + 5);
    const vy = player === p1 ? -5 : 5;
    bullets.push(new Bullet(bx, by, vy, player, sizeTable[type]));
  }

  function checkHit(b) {
    const target = b.owner === p1 ? p2 : p1;
    if (!target.alive) return false;
    if (b.x > target.x && b.x < target.x + target.width && b.y > target.y && b.y < target.y + target.height) {
      target.alive = false;
      return true;
    }
    return false;
  }

  canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const bh = getButtonHeight();
    const bw = canvas.width / 3;
    const idx = Math.floor(x / bw);

    if (y < bh) {
      fire(p2, idx);
      return;
    }
    if (y > canvas.height - bh) {
      fire(p1, idx);
      return;
    }

    const player = (y > canvas.height / 2) ? p1 : p2;
    player.direction = (x < canvas.width / 2) ? -1 : 1;
  });

  setInterval(() => {
    [p1, p2].forEach(player => {
      if (!player.alive) return;
      player.cost = Math.min(10, player.cost + 0.1);
    });
  }, 200);

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bh = getButtonHeight();
    const bw = canvas.width / 3;

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = p2.color;
      ctx.fillRect(i * bw, 0, bw - 2, bh - 2);
      ctx.fillStyle = p1.color;
      ctx.fillRect(i * bw, canvas.height - bh, bw - 2, bh - 2);
    }

    function drawCostBar(player, top) {
      const barWidth = (canvas.width * player.cost) / 10;
      ctx.fillStyle = player.color;
      ctx.fillRect(0, top, barWidth, costBarHeight);
    }

    drawCostBar(p2, bh);
    drawCostBar(p1, canvas.height - bh - costBarHeight);

    p1.update();
    p2.update();
    p1.draw();
    p2.draw();

    bullets.forEach(b => {
      b.update();
      b.draw();
    });

    bullets = bullets.filter(b => {
      if (checkHit(b)) {
        setTimeout(() => alert(`${b.owner === p1 ? '下側のプレイヤー' : '上側のプレイヤー'} の勝利！`), 10);
        setTimeout(() => location.reload(), 100);
        return false;
      }
      return !b.isOffscreen();
    });

    requestAnimationFrame(loop);
  }

  loop();
})();
