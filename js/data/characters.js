export const characters = [
  {
    name: 'クジラ', skills: [
      { name: 'ヘヴィショット', cost: 2, size: 220, speed: 7.5, behavior: 'straight', unlockP: 0 },
      { name: 'スーパーヘヴィ', cost: 5, size: 440, speed: 8, behavior: 'straight', unlockP: 3 },
      { name: 'だんまく', cost: 9, size: 150, speed: 4, behavior: 'danmaku', unlockP: 2 }
    ]
  },
  {
    name: 'ウサギ', skills: [
      { name: 'ショット', cost: 2, size: 75, speed: 12, behavior: 'straight', unlockP: 0 },
      { name: 'だましレフト', cost: 3, size: 75, speed: 12, behavior: 'curveLeft', unlockP: 2 },
      { name: 'スピードショット', cost: 7, size: 75, speed: 50, behavior: 'straight', unlockP: 2 }
    ]
  },
  {
    name: 'カエル', skills: [
      { name: 'プチショット', cost: 1, size: 30, speed: 6, behavior: 'straight', unlockP: 0 },
      { name: 'プチツイン', cost: 2, size: 30, speed: 6.2, behavior: 'twin', unlockP: 1 },
      { name: 'ジャンボふうせん', cost: 6, size: 30, speed: 6, behavior: 'balloon', unlockP: 2 }
    ]
  },
  {
    name: 'ピエロ', skills: [
      { name: 'ピエロショット', cost: 2, size: 75, speed: 12, behavior: 'straight', unlockP: 0 },
      { name: 'ミラーショット', cost: 4, size: 75, speed: 12, behavior: 'mirror', unlockP: 2 },
      { name: 'だましダブル', cost: 5, size: 75, speed: 12, behavior: 'trickDouble', unlockP: 2 }
    ]
  },
  {
    name: 'test', skills: [
      { name: 'test1', cost: 0, size: 200, speed: 3, behavior: 'straight', unlockP: 0 },
      { name: 'test2', cost: 3, size: 600, speed: 30, behavior: 'twin', unlockP: 0 },
      { name: 'testicle', cost: 1, size: 10, speed: 4, behavior: 'mirror', unlockP: 2 }
    ]
  }
];

characters.forEach(ch => {
  let cum = 0;
  ch.skills.forEach(skill => {
    cum += skill.unlockP;
    skill._cumUnlockP = cum;
  });
});
