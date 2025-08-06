import { Bullet } from './Bullet.js';
import { VIRTUAL_HEIGHT } from '../constants.js';

export class Turret {
  constructor(x, player, size) {
    this.x      = x;
    this.player = player;
    this.size   = size;
    this.color  = player.color;
    this.fireInterval = 1000;
    this.lastFireTime = Date.now();

    // プレイヤーが下半分にいるなら p1（下側）→タレットはプレイヤーの上
    // それ以外は p2（上側）→タレットはプレイヤーの下
    const isBottomPlayer = (player.y > VIRTUAL_HEIGHT / 2);
    this.upward = isBottomPlayer;
    this.yOffset = isBottomPlayer
      ? -this.size           // 下側プレイヤーならタレットを上に
      : player.height;       // 上側プレイヤーならタレットを下に

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
    const centerX = this.x + this.size / 2;
    // 発射開始 X はタレット中央から弾サイズ半分ずらす
    const startX = centerX - bulletSize / 2;

    let startY, vy;
    if (this.upward) {
      // 下側プレイヤー（p1）のタレット → 上向きに撃つ
      startY = this.y - bulletSize;
      vy     = -bulletSpeed;
    } else {
      // 上側プレイヤー（p2）のタレット → 下向きに撃つ
      startY = this.y + this.size;
      vy     = +bulletSpeed;
    }

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
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
