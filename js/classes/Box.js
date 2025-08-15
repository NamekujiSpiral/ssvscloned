import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT, BOX_SIZE } from '../constants.js';

export class Box {
  constructor(nextSpawn) {
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
    this.x = this.side === 'left' ? - BOX_SIZE * 1.5 : VIRTUAL_WIDTH + BOX_SIZE * 1.5;
    this.y = VIRTUAL_HEIGHT / 2 + (Math.random() * 400 - 200);
    const speeds = [BOX_SIZE, BOX_SIZE / 2, BOX_SIZE / 3, BOX_SIZE / 4];
    this.vx = (this.side === 'left' ? 1 : -1) * speeds[this.id - 1];
    this.size = BOX_SIZE;
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

  draw(ctx) {
    const shakeOffset = this.shakeTime > 0
      ? Math.sin((this.shakeTime / this.shakeDuration / 2) * Math.PI * 4) * 10 * this.shakeDirection
      : 0;
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2 + shakeOffset, this.size, this.size);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '100px sans-serif';
    ctx.fillText(this.hp, this.x, this.y + shakeOffset);
  }

  isOff() {
    return this.x < -this.size || this.x > VIRTUAL_WIDTH + this.size;
  }
}