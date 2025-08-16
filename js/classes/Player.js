import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../constants.js';
import { Particle } from './Particle.js';

export class Player {
  constructor(y, charIndex, color, characters) {
    this.size = 180;
    this.width = 140;
    this.height = 180;
    this.x = VIRTUAL_WIDTH / 2;
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
    this.dir = y > VIRTUAL_HEIGHT / 2 ? 1 : -1 ;

    this.isHit = false;
    this.hitTime = 0;
    this.hitDuration = 1.5; // seconds
    this.shatterParticles = [];
  }

  onHit() {
    if (this.isHit) return;
    this.isHit = true;
    this.hitTime = 0;
  }

  static updatePlayers(dt, gameTime, players, isMirrorPlanet = false, isTrampolinePlanet = false, isTrampolinePlanetB = false) {
    const [p1, p2] = players;

    // Y座標の計算
    let p1_baseY = p1.initialY;
    let p2_baseY = p2.initialY;

    if (gameTime > 60) {
      const t = Math.min(Math.max((gameTime - 60) / (145 - 60), 0), 1);
      const initialGap = p2.initialY - p1.initialY;
      const targetGap = -450;
      const allowedGap = initialGap + (targetGap - initialGap) * t;
      const midY = (p1.initialY + p2.initialY) / 2;
      p1_baseY = midY - allowedGap / 2;
      p2_baseY = midY + allowedGap / 2;
    }

    p1.y = p1_baseY;
    p2.y = p2_baseY;

    const bounceHeight = 300;
    const bounceSpeed = 1.5;
    const bounceOffsetY = Math.abs(Math.sin(gameTime * bounceSpeed)) * bounceHeight;

    if (isTrampolinePlanet) {
      p1.y -= bounceOffsetY;
      p2.y += bounceOffsetY;
      p1.bounceOffsetY = -bounceOffsetY;
      p2.bounceOffsetY = bounceOffsetY;
    } else if (isTrampolinePlanetB) {
        p1.y += bounceOffsetY;
        p2.y -= bounceOffsetY;
        p1.bounceOffsetY = bounceOffsetY;
        p2.bounceOffsetY = -bounceOffsetY;
    } else {
      p1.bounceOffsetY = 0;
      p2.bounceOffsetY = 0;
    }

    // 各プレイヤーの残りの更新ロジック
    players.forEach(player => {
      if (!player.alive) return;

      if (player.isHit) {
        player.hitTime += dt;
        if (player.hitTime > player.hitDuration) {
          player.alive = false;
        }

        if (player.hitTime > 0.2 && player.shatterParticles.length === 0) {
          for (let i = 0; i < 50; i++) {
            player.shatterParticles.push(new Particle(player.x, player.y, player.color, player.dir));
          }
        }

        player.shatterParticles.forEach(p => p.update());
        return;
      }

      player.x += player.direction * player.speed;

      if (isMirrorPlanet) {
        if (player.x < -player.width) player.x = VIRTUAL_WIDTH;
        if (player.x > VIRTUAL_WIDTH) player.x = -player.width;
      } else {
        player.x = Math.max(player.width / 2, Math.min(VIRTUAL_WIDTH - player.width / 2, player.x));
      }

      player.cost = Math.min(player.maxCost, player.cost + dt * player.costRate);
      player.cooldowns = player.cooldowns.map(cd => Math.max(0, cd - dt));
    });
  }

  draw(ctx) {
    if (!this.alive) return;

    if (this.isHit) {
      if (this.hitTime <= 0.2) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(10 * Math.PI / 180);
        ctx.fillStyle = 'white';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
      } else {
        this.shatterParticles.forEach(p => p.draw(ctx));
      }
    } else {
      ctx.fillStyle = this.color;
      const y = this.y;
      ctx.fillRect(this.x - this.width / 2, y - this.height / 2, this.width, this.height);
    }
  }
}
