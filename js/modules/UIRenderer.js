import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_BUTTON_HEIGHT, MENU_WIDTH, PLAYER_COLORS } from '../constants.js';
import { characters } from '../data/characters.js';

export class UIRenderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.scaleX = 1;
    this.scaleY = 1;
    this.gontaFont = new FontFace('Gonta', 'url("/ssvscloned/data/FZゴンタかな.otf")');
    this.gontaFont.load().then(font => document.fonts.add(font)).catch(err => console.error('Font load failed:', err));
    window.addEventListener('resize', this.resize.bind(this));
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const ratio = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    let dw, dh;
    if (w / h > ratio) { dh = h; dw = dh * ratio; } else { dw = w; dh = dw / ratio; }
    this.canvas.width = dw;
    this.canvas.height = dh;
    this.canvas.style.width = dw + 'px';
    this.canvas.style.height = dh + 'px';
    this.scaleX = dw / VIRTUAL_WIDTH;
    this.scaleY = dh / VIRTUAL_HEIGHT;
  }

  drawCostBar(player, y) {
    const barH = 130;
    const segmentWidth = VIRTUAL_WIDTH / player.maxCost;
    const segmentMargin = 8;
    const cornerRadius = 10;
    const barY = y;
    const barHeight = barH;
    const verticalMargin = 4; // 上下のマージン

    const intCost = Math.floor(player.cost);

    // 1. 最背面: うっすい紺色の長方形
    this.ctx.fillStyle = 'rgba(0, 0, 50, 0.2)';
    this.ctx.fillRect(0, barY, VIRTUAL_WIDTH, barHeight);

    // 2. 中間: 10個の角丸長方形 (#2f2f31)
    this.ctx.lineWidth = 8;
    for (let i = 0; i < player.maxCost; i++) {
        const x = i * segmentWidth + segmentMargin / 2;
        const w = segmentWidth - segmentMargin;
        
        // 溜まっていない部分
        this.ctx.fillStyle = '#2f2f31';
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        
        this.ctx.beginPath();
        this.ctx.roundRect(x, barY + verticalMargin, w, barHeight - verticalMargin * 2, cornerRadius);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    // 3. 溜まった分だけプレイヤーカラーで表示
    for (let i = 0; i < intCost; i++) {
        const x = i * segmentWidth + segmentMargin / 2;
        const w = segmentWidth - segmentMargin;

        this.ctx.fillStyle = player.color;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';

        this.ctx.beginPath();
        this.ctx.roundRect(x, barY + verticalMargin, w, barHeight - verticalMargin * 2, cornerRadius);
        this.ctx.fill();
        this.ctx.stroke();
    }

    // 4. 最前面: うすいプレイヤーカラーのバー
    const totalProgressWidth = (VIRTUAL_WIDTH / player.maxCost) * player.cost;
    this.ctx.fillStyle = this.hexToRgba(player.color, 0.3); // うすいプレイヤーカラー
    this.ctx.fillRect(0, barY, totalProgressWidth, barHeight);
  }

  draw(p1, p2, pressedButtons, menuOpen, menuX, autoOpponent) {
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);

    // UI描画
    const bhPx = VIRTUAL_BUTTON_HEIGHT;
    const bwPx = VIRTUAL_WIDTH / 3;
    this.ctx.textAlign = 'center';

    for (let i = 0; i < 3; i++) {
      const x0 = i * bwPx;
      const y0p = 0;
      const y0m = VIRTUAL_HEIGHT - bhPx;
      const skill2 = p2.skills[i];
      const skill1 = p1.skills[i];
      const unlocked2 = p2.pCount >= skill2._cumUnlockP;
      const ready2 = unlocked2 && p2.cost >= skill2.cost && p2.cooldowns[i] <= 0;
      const unlocked1 = p1.pCount >= skill1._cumUnlockP;
      const ready1 = unlocked1 && p1.cost >= skill1.cost && p1.cooldowns[i] <= 0;

      // ボタン背景
      this.ctx.fillStyle = !unlocked2 ? 'rgba(130,130,130,1)' : (!ready2 ? 'rgba(200,200,200,1)' : p2.color);
      this.ctx.fillRect(x0, y0p, bwPx - 2, bhPx - 2);
      this.ctx.fillStyle = !unlocked1 ? 'rgba(130,130,130,1)' : (!ready1 ? 'rgba(200,200,200,1)' : p1.color);
      this.ctx.fillRect(x0, y0m, bwPx - 2, bhPx - 2);

      // 押下フィードバック
      if (this.isButtonPressed(pressedButtons, p2, i)) { this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.fillRect(x0, y0p, bwPx - 2, bhPx - 2); }
      if (this.isButtonPressed(pressedButtons, p1, i)) { this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.fillRect(x0, y0m, bwPx - 2, bhPx - 2); }

      // 技名
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `${Math.floor(bhPx * 0.22)}px Gonta`;
      this.ctx.fillText(skill2.name, x0 + bwPx / 2, bhPx * 0.3);
      this.ctx.fillText(skill1.name, x0 + bwPx / 2, y0m + bhPx * 0.3);

      // コスト or 必要Pの星形表示
      const starSize = 70 * 2 * 0.8; // =70
      const gap = starSize * 1.2;

      // p2
      if (unlocked2) {
        this.ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`;
        this.ctx.fillText(skill2.cost, x0 + bwPx / 2, bhPx * 0.8);
      } else {
        const maxP = skill2.unlockP;
        const haveP = p2.pCount - (i > 0 ? p2.skills[i - 1]._cumUnlockP : 0);
        const startX = x0 + bwPx / 2 - (gap * (maxP - 1)) / 2;
        for (let s = 0; s < maxP; s++) {
          const cx = startX + s * gap;
          const cy = bhPx * 0.7;
          this.drawStar(cx, cy, starSize / 2, s < haveP ? '#ef8503' : 'rgba(100,100,100,1)');
        }
      }
      // p1
      if (unlocked1) {
        this.ctx.font = `${Math.floor(bhPx * 0.3)}px Gonta`;
        this.ctx.fillText(skill1.cost, x0 + bwPx / 2, y0m + bhPx * 0.8);
      } else {
        const maxP = skill1.unlockP;
        const haveP = p1.pCount - (i > 0 ? p1.skills[i - 1]._cumUnlockP : 0);
        const startX = x0 + bwPx / 2 - (gap * (maxP - 1)) / 2;
        for (let s = 0; s < maxP; s++) {
          const cx = startX + s * gap;
          const cy = y0m + bhPx * 0.7;
          this.drawStar(cx, cy, starSize / 2, s < haveP ? '#ef8503' : 'rgba(100,100,100,1)');
        }
      }
    }

    const barH = 130;
    const barMargin = 10; // Margin between bar and buttons

    // Player cost bars
    this.drawCostBar(p2, bhPx + barMargin);
    this.drawCostBar(p1, VIRTUAL_HEIGHT - bhPx - barH - barMargin);

    // Text on top of bars
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `${barH * 0.8}px Gonta`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${Math.floor(p2.cost)}/${p2.maxCost}`, VIRTUAL_WIDTH / 2, bhPx + barMargin + barH / 2);
    this.ctx.fillText(`${Math.floor(p1.cost)}/${p1.maxCost}`, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - bhPx - barMargin - barH / 2);

    // メニュー描画
    if (menuOpen) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(menuX, 0, MENU_WIDTH, VIRTUAL_HEIGHT);
      // メニュー固定フォント
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '50px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('設定', menuX + 20, 80);
      // キャラ選択リスト
      characters.forEach((c, i) => {
        const y = 150 + i * 100;
        // キャラ名
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(c.name, menuX + 20, y);
        // 選択状態
        if (i === window.selectedChar1) {
          this.ctx.fillStyle = PLAYER_COLORS[0];
          this.ctx.fillText('(P1)', menuX + 20 + this.ctx.measureText(c.name).width + 10, y);
        }
        if (i === window.selectedChar2) {
          this.ctx.fillStyle = PLAYER_COLORS[1];
          this.ctx.fillText('(P2)', menuX + 20 + this.ctx.measureText(c.name).width + 60, y);
        }
      });
      // AI項目
      const aiY = 150 + characters.length * 100;
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(`AI Opponent:`, menuX + 20, aiY);
      this.ctx.fillStyle = autoOpponent ? '#0f0' : '#f00';
      this.ctx.fillText(autoOpponent ? 'ON' : 'OFF', menuX + 300, aiY);

      // わくせい選択
      const planetBaseY = 150 + (characters.length + 2) * 100; // スペースを追加
      const planetNames = [
        'デフォルト',
        'スピードわくせいB',
        'ミラーわくせい',
        'ミラーわくせいB',
        'トランポリンわくせい',
        'トランポリンわくせいB',
        'スピードわくせいD'
      ];

      this.ctx.fillStyle = '#fff';
      this.ctx.fillText('わくせい', menuX + 20, planetBaseY - 50);

      planetNames.forEach((name, index) => {
        const planetY = planetBaseY + index * 100;
        this.ctx.fillStyle = window.selectedPlanets.includes(index) ? '#0f0' : '#fff';
        this.ctx.fillText(name, menuX + 40, planetY);
      });

      // デバッグボタン
      const debugButtonY = planetBaseY + planetNames.length * 100;
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText('時間+10s', menuX + 40, debugButtonY);

      // 閉じるアイコン（白固定）
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText('✕', menuX + MENU_WIDTH - 40, 40);
    }
    this.ctx.restore();
  }

  isButtonPressed(pressedButtons, player, idx) {
    for (const info of pressedButtons.values()) {
      if (info.player === player && info.idx === idx) return true;
    }
    return false;
  }

  drawStar(cx, cy, r, color) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const ang = (Math.PI * 2 / 5) * k - Math.PI / 2;
      this.ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      const mid = ang + Math.PI / 5;
      this.ctx.lineTo(Math.cos(mid) * (r / 2), Math.sin(mid) * (r / 2));
    }
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.restore();
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}