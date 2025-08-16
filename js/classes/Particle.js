export class Particle {
  constructor(x, y, color, dir) {
    this.x = x + (Math.random() - 0.5) * 40;
    this.y = y;
    this.size = 20;
    this.color = color;
    const baseAngle = Math.PI / 2 * dir;
    const spread = Math.PI / 3;
    const angle = baseAngle + (Math.random() - 0.5) * spread;
    const speed = Math.random() * 2;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = 0.5;
    this.life = 100 -  Math.random() * 10;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
