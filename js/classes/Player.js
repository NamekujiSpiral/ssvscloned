import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../constants.js';

export class Player {
  constructor(y, charIndex, color, characters) {
    this.size = 180;
    this.width = 140;
    this.height = 180;
    this.x = (VIRTUAL_WIDTH - this.width) / 2;
    this.y = y;
    this.initialY = y; // 初期Y座標を保存
    this.skills = characters[charIndex].skills;
    this.color = color;
    this.alive = true;
    this.direction = 0;
    this.baseSpeed = 2.5;
    this.speed = this.baseSpeed;
    this.maxSpeed = this.baseSpeed * 1.5;
    this.pCount = 0;
    this.cost = 0;
    this.maxCost = 10;
    this.costRate = 0.5;
    this.cooldowns = this.skills.map(_ => 0);
    this.bounceOffsetY = 0;
  }

  update(dt, gameTime, players, isMirrorPlanet = false) {
    if (!this.alive) return;

    const t = gameTime;
    if (t > 60) {
      const p1 = players[0], p2 = players[1];
      const tt = Math.min(Math.max((t - 60) / (145 - 60), 0), 1);
      const initialGap = -2100;
      const targetGap = -450;
      const allowedGap = initialGap + (targetGap - initialGap) * tt;
      const midY = (p1.y + p2.y) / 2;
      p1.y = midY - allowedGap / 2;
      p2.y = midY + allowedGap / 2;
    }

    this.x += this.direction * this.speed;

    if (isMirrorPlanet) {
      if (this.x < -this.width) this.x = VIRTUAL_WIDTH;
      if (this.x > VIRTUAL_WIDTH) this.x = -this.width;
    } else {
      this.x = Math.max(0, Math.min(VIRTUAL_WIDTH - this.size, this.x));
    }

    if (window.selectedPlanet === 4) {
      const bounceHeight = 300; // はねる高さ
      const bounceSpeed = 1.5; // はねる速さ
      this.bounceOffsetY = Math.abs(Math.sin(gameTime * bounceSpeed)) * bounceHeight;
      this.y = this.initialY + (this.y < VIRTUAL_HEIGHT / 2 ? this.bounceOffsetY : -this.bounceOffsetY);
    } else {
      this.bounceOffsetY = 0;
      this.y = this.initialY;
    }

    this.cost = Math.min(this.maxCost, this.cost + dt * this.costRate);
    this.cooldowns = this.cooldowns.map(cd => Math.max(0, cd - dt));
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.fillStyle = this.color;
    const y = this.y;
    ctx.fillRect(this.x, y, this.width, this.height);
  }
}
