import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../constants.js';

export class Bullet {
  constructor(x, y, vx, vy, owner, skill) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.owner = owner;
    this.originalSize = skill.size;
    this.size = skill.size;
    this.behavior = skill.behavior;
    this.passed = false;
  }

  update(dt) {
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

  draw(ctx) {
    ctx.fillStyle = this.owner.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }

  isOff() {
    return this.y < 0 || this.y > VIRTUAL_HEIGHT;
  }
}