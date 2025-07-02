import { VIRTUAL_HEIGHT } from '../constants.js';

export class PItem {
  constructor(x, y, owner) {
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.vy = 200; // 仮想単位/秒
    if (this.owner.y < VIRTUAL_HEIGHT / 2) this.vy *= -1; // P2のアイテムは上向きに移動
    this.size = 70;
    this.color = '#ff0';
  }

  update(dt) {
    this.y += this.vy * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.owner.y < VIRTUAL_HEIGHT / 2) {
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
    return this.y - this.size > VIRTUAL_HEIGHT || this.y + this.size < 0;
  }
}