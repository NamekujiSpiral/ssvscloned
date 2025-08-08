import { Bullet } from './Bullet.js';
import { VIRTUAL_HEIGHT } from '../constants.js';

export class Turret {
  constructor(x, player) {
    this.player = player;
    const scale = 0.4;
    this.width  = player.width * scale;
    this.height = player.height * scale;
    this.x      = x;
    this.color  = player.color;
    this.fireInterval = 1000;
    this.lastFireTime = Date.now();

    // プレイヤーが下半分にいるなら p1（下側）→タレットはプレイヤーの上
    // それ以外は p2（上側）→タレットはプレイヤーの下
    const isBottomPlayer = (player.y > VIRTUAL_HEIGHT / 2);
    this.upward = isBottomPlayer;
    this.yOffset = isBottomPlayer
      ? -this.height
      : player.height;

    this.updatePosition();
  }

  updatePosition() {
    this.y = this.player.y + this.yOffset;
  }

  update(bullets) {
    this.updatePosition();

    if (Date.now() - this.lastFireTime >= this.fireInterval) {
      this.lastFireTime = Date.now();
      bullets.push(this.fire());
    }
  }

  fire() {
    const bulletSpeed = 5;
    const bulletSize  = 20;
    const skill       = { behavior: 'straight', size: bulletSize };

    // タレット中心
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // 発射開始位置を弾の中心がタレットの中心になるように調整
    const startX = centerX;
    const startY = centerY - bulletSize / 2;

    const vy = this.upward ? -bulletSpeed : bulletSpeed;

    return new Bullet(
      startX,
      startY,
      0,
      vy,
      this.player,
      skill
    );
  }

  draw(ctx) {
    this.updatePosition();
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
