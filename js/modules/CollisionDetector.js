export class CollisionDetector {
  static checkBulletPlayerCollision(bullet, player) {
    const bulletLeft = bullet.x - bullet.size / 2;
    const bulletRight = bullet.x + bullet.size / 2;
    const bulletTop = bullet.y - bullet.size / 2;
    const bulletBottom = bullet.y + bullet.size / 2;

    const playerLeft = player.x - player.width / 2;
    const playerRight = player.x + player.width / 2;
    const playerTop = player.y - player.height / 2;
    const playerBottom = player.y + player.height / 2;

    if (bulletRight > playerLeft && bulletLeft < playerRight && bulletBottom > playerTop && bulletTop < playerBottom) {
      return true;
    }
    return false;
  }

  static checkBulletBoxCollision(bullet, box) {
    const halfB = bullet.size / 2;
    const halfBox = box.size / 2;
    if (
      bullet.x + halfB > box.x - halfBox &&
      bullet.x - halfB < box.x + halfBox &&
      bullet.y + halfB > box.y - halfBox &&
      bullet.y - halfB < box.y + halfBox
    ) {
      return true;
    }
    return false;
  }

  static checkBulletTurretCollision(bullet, turret) {
    const halfB = bullet.size / 2;
    const halfTurret = turret.size / 2;
    if (
      bullet.x + halfB > turret.x - halfTurret &&
      bullet.x - halfB < turret.x + halfTurret &&
      bullet.y + halfB > turret.y - halfTurret &&
      bullet.y - halfB < turret.y + halfTurret
    ) {
      return true;
    }
    return false;
  }

  static checkPItemPlayerCollision(pItem, player) {
    const itemLeft = pItem.x - pItem.size / 2;
    const itemRight = pItem.x + pItem.size / 2;
    const itemTop = pItem.y - pItem.size / 2;
    const itemBottom = pItem.y + pItem.size / 2;

    const playerLeft = player.x - player.width / 2;
    const playerRight = player.x + player.width / 2;
    const playerTop = player.y - player.height / 2;
    const playerBottom = player.y + player.height / 2;

    if (itemRight > playerLeft && itemLeft < playerRight && itemBottom > playerTop && itemTop < playerBottom) {
      return true;
    }
    return false;
  }
}
