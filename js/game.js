(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // 仮想解像度
  const VIRTUAL_WIDTH = 1800;
  const VIRTUAL_HEIGHT = 3200;

  // ボタン領域
  const virtualButtonHeight = 320;
  const marginVirtual = 130;

  // クールタイム
  const COOLDOWN_DURATION = 0.4;

  // キャラクター＆スキル定義
  const characters = [
    {
      name: 'キャラ1', color: '#4af',
      skills: [
        { name: 'ヘヴィショット', cost: 2, size: 220, speed: 5, behavior: 'straight' },
        { name: 'スーパーヘヴィ', cost: 5, size: 660, speed: 6, behavior: 'straight' },
        { name: 'だんまく', cost: 9, size: 150, speed: 4, behavior: 'danmaku' }
      ]
    },
    {
      name: 'キャラ2', color: '#fa4',
      skills: [
        { name: 'ショット', cost: 2, size: 80,  speed: 12, behavior: 'straight' },
        { name: 'だましレフト', cost: 3, size: 80, speed: 12, behavior: 'curveLeft' },
        { name: 'スピードショット', cost: 7, size: 80, speed: 20, behavior: 'straight' }
      ]
    }
  ];

  // ゲーム状態
  let gameOver = false, breakTarget = null, breakProgress = 0;
  const BREAK_DURATION = 0.5;
  let pressedButton = null;

  class Player {
    constructor(y, charDef) {
      this.size = 180;
      this.x = (VIRTUAL_WIDTH - this.size) / 2;
      this.y = y;
      this.color = charDef.color;
      this.skills = charDef.skills;
      this.alive = true;
      this.direction = 0;
      this.speed = 3;
      this.cost = 0;
      this.maxCost = 10;
      this.costRate = 0.5;
      this.cooldowns = this.skills.map(_ => 0);
    }
    update(dt) {
      if (!this.alive || gameOver) return;
      this.x = Math.max(0, Math.min(VIRTUAL_WIDTH - this.size, this.x + this.direction * this.speed));
      this.cost = Math.min(this.maxCost, this.cost + dt * this.costRate);
      this.cooldowns = this.cooldowns.map(cd => Math.max(0, cd - dt));
    }
    draw(alpha=1, scale=1) {
      if (!this.alive) return;
      ctx.save(); ctx.globalAlpha = alpha;
      const w = this.size * scale, h = w;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x + (this.size-w)/2, this.y + (this.size-h)/2, w, h);
      ctx.restore();
    }
  }

  class Bullet {
    constructor(x, y, vx, vy, owner, skill) {
      this.x = x; this.y = y;
      this.vx = vx; this.vy = vy;
      this.owner = owner;
      this.size = skill.size;
      this.behavior = skill.behavior;
      this.passedCenter = false;
    }
    update(dt) {
      if (gameOver) return;
      // 行動
      if (this.behavior === 'curveLeft') {
        if (!this.passedCenter) {
          if ((this.vy<0 && this.y < VIRTUAL_HEIGHT/2) || (this.vy>0 && this.y > VIRTUAL_HEIGHT/2)) {
            this.passedCenter = true;
            // 左へ一定速度
            this.vx = -6;
          }
        }
      }
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
    }
    draw() {
      ctx.fillStyle = this.owner.color;
      ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
    isOffscreen() { return this.y < 0 || this.y > VIRTUAL_HEIGHT; }
  }

  // プレイヤー
  const p1 = new Player(VIRTUAL_HEIGHT - virtualButtonHeight - marginVirtual - 200, characters[0]);
  const p2 = new Player(virtualButtonHeight + marginVirtual, characters[1]);
  let bullets = [];

  // キャンバスとスケール
  let scaleX=1, scaleY=1;
  function resize(){
    const w=window.innerWidth, h=window.innerHeight;
    const r=VIRTUAL_WIDTH/VIRTUAL_HEIGHT;
    let dw, dh;
    if (w/h>r) { dh=h; dw=dh*r; } else { dw=w; dh=dw/r; }
    canvas.width=dw; canvas.height=dh;
    canvas.style.width=dw+'px'; canvas.style.height=dh+'px';
    scaleX=dw/VIRTUAL_WIDTH; scaleY=dh/VIRTUAL_HEIGHT;
  }
  window.addEventListener('resize',resize);
  resize();

  function fire(player, idx){
    const sk = player.skills[idx];
    if(player.cost<sk.cost||player.cooldowns[idx]>0||gameOver) return;
    player.cost -= sk.cost;
    player.cooldowns[idx] = COOLDOWN_DURATION;
    const bx = player.x + player.size/2;
    const by = player.y + (player===p1?-player.size/2:player.size+player.size/2);
    const vy = player===p1 ? -sk.speed : sk.speed;
    bullets.push(new Bullet(bx, by, 0, vy, player, sk));
  }

  function onHit(target){ gameOver=true; breakTarget=target; }

  function checkHit(b){
    const target = b.owner===p1?p2:p1;
    if(!target.alive||gameOver) return false;
    const half = b.size/2;
    if(!(b.x+half<target.x||b.x-half>target.x+target.size||
         b.y+half<target.y||b.y-half>target.y+target.size)){
      target.alive=false; onHit(target); return true;
    }
    return false;
  }

  canvas.addEventListener('pointerdown',e=>{
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/scaleX;
    const y=(e.clientY-r.top)/scaleY;
    const idx=Math.floor(x/(VIRTUAL_WIDTH/3));
    if(y<virtualButtonHeight){ pressedButton={player:p2,idx};return;}    
    if(y>VIRTUAL_HEIGHT-virtualButtonHeight){pressedButton={player:p1,idx};return;}
    if(!gameOver){const pl=y>VIRTUAL_HEIGHT/2?p1:p2;pl.direction=x<VIRTUAL_WIDTH/2?-1:1;}
  });
  canvas.addEventListener('pointerup',e=>{
    if(pressedButton&&!gameOver){
      const r=canvas.getBoundingClientRect();
      const x=(e.clientX-r.left)/scaleX;
      const y=(e.clientY-r.top)/scaleY;
      const {player:pl,idx}=pressedButton;
      if((pl===p2&&y<virtualButtonHeight)||(pl===p1&&y>VIRTUAL_HEIGHT-virtualButtonHeight)) fire(pl,idx);
    }
    pressedButton=null;
  });
  canvas.addEventListener('pointercancel',()=>{pressedButton=null;});

  let last=performance.now();
  function loop(now){
    const dt=(now-last)/1000; last=now;
    ctx.clearRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT);
    
    ctx.save(); ctx.scale(scaleX,scaleY);
    p1.update(dt); p2.update(dt);
    if(gameOver&&breakTarget){
      breakProgress+=dt; const t=Math.min(1,breakProgress/BREAK_DURATION);
      p1.draw(); p2.draw(); breakTarget.draw(1-t,1-t);
      if(t>=1){alert((breakTarget===p1?'上側':'下側')+'の勝利！');location.reload();return;}
    } else {
      p1.draw(); p2.draw();
      bullets=bullets.filter(b=>{ b.update(dt); const hit=checkHit(b); return !hit&&!b.isOffscreen(); });
    }
    ctx.restore();
    
    // UI 最後に弾を前面
    ctx.save();ctx.scale(scaleX,scaleY);
    bullets.forEach(b=>b.draw());
    ctx.restore();

    // UI描画
    const bhPx=virtualButtonHeight*scaleY;
    const bwPx=canvas.width/3;
    ctx.font=`${Math.floor(bhPx*0.3)}px sans-serif`;
    ctx.textAlign='center';
    // ボタン
    [p2,p1].forEach((pl,iPlayer)=>{
      const y0=iPlayer===0?0:canvas.height-bhPx;
      pl.skills.forEach((sk,idx)=>{
        const x0=idx*bwPx;
        const usable=pl.cost>=sk.cost&&pl.cooldowns[idx]<=0;
        ctx.fillStyle=usable?pl.color:'rgba(200,200,200,0.9)';
        ctx.fillRect(x0,y0,bwPx-2,bhPx-2);
        if(pressedButton&&pressedButton.player===pl&&pressedButton.idx===idx) ctx.fillStyle='rgba(0,0,0,0.3)',ctx.fillRect(x0,y0,bwPx-2,bhPx-2);
        ctx.fillStyle='#fff';
        ctx.fillText(sk.name,x0+bwPx/2,y0+bhPx*0.35);
        ctx.fillText(sk.cost,x0+bwPx/2,y0+bhPx*0.75);
      });
    });
    // コストバー
    const barH=18;
    // バー背面
    ctx.fillStyle=p2.color;
    ctx.fillRect(0,bhPx+2,canvas.width*(p2.cost/p2.maxCost),barH);
    if(p2.cost>=p2.maxCost)ctx.fillStyle='rgba(255,255,255,0.3)',ctx.fillRect(0,bhPx+2,canvas.width,barH);
    ctx.fillStyle=p1.color;
    ctx.fillRect(0,canvas.height-bhPx-2-barH,canvas.width*(p1.cost/p1.maxCost),barH);
    if(p1.cost>=p1.maxCost)ctx.fillStyle='rgba(255,255,255,0.3)',ctx.fillRect(0,canvas.height-bhPx-2-barH,canvas.width,barH);
    // 分割線 (前面)
    ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=5;
    for(let j=1;j<10;j++){const xL=j*(canvas.width/10);
      ctx.beginPath();ctx.moveTo(xL,bhPx+2);ctx.lineTo(xL,bhPx+2+barH);ctx.stroke();
      ctx.beginPath();ctx.moveTo(xL,canvas.height-bhPx-2-barH);ctx.lineTo(xL,canvas.height-bhPx-2);ctx.stroke();
    }
    // コスト表示 n/10
    ctx.fillStyle='#fff';ctx.font=`${barH*0.8}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(`${Math.floor(p2.cost)}/${p2.maxCost}`,canvas.width/2,bhPx+2+barH/2);
    ctx.fillText(`${Math.floor(p1.cost)}/${p1.maxCost}`,canvas.width/2,canvas.height-bhPx-2-barH/2);

    // 弾をUIの前面に描画
    ctx.save();ctx.scale(scaleX,scaleY);
    bullets.forEach(b=>b.draw());
    ctx.restore();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
