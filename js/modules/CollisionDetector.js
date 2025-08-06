export class CollisionDetector {
  static checkBulletPlayerCollision(bullet, player) {
    const halfB = bullet.size / 2;
    if (
      bullet.x + halfB > player.x &&
      bullet.x - halfB < player.x + player.width &&
      bullet.y + halfB > player.y &&
      bullet.y - halfB < player.y + player.height
    ) {
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
    const half = pItem.size / 2;
    if (
      pItem.x + half > player.x &&
      pItem.x - half < player.x + player.width &&
      pItem.y + half > player.y &&
      pItem.y - half < player.y + player.height
    ) {
      return true;
    }
    return false;
  }
}
