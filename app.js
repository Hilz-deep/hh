import {createTree} from './tree.js';
import {drawLandscape} from './landscape.js';
import {createGestures} from './gestures.js';
import {createMusic} from './music.js';
import {createTrainer,extractFeatures,LABELS,LABEL_NAMES} from './gesture-train.js';
const shapes={
  book:'M3 4.5c3-1 6-.7 9 1 3-1.7 6-2 9-1v14c-3-1-6-.7-9 1-3-1.7-6-2-9-1z M12 5.5v14',
  camera:'M3 7h4l2-3h6l2 3h4v13H3z M15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0',
  pinch:'M5 13c-1-2 1-3 2-2l3 3-1-7c-.4-2 2-2.7 2.7-.6l1.6 4.9 1-4c.5-2 3-1.4 2.6.5l-.5 4 1.5-2.5c1-1.5 3-.5 2.2 1.2l-2.5 7c-.7 2.3-2.5 3.5-5 3.5-2.1 0-3.4-.9-4.6-2.6z M4 6 2 5 M6 3 5 1',
  fist:'M4 11V8.5c0-2 3.4-2 3.4 0V11 6.5c0-2 3.5-2 3.5 0v4-5c0-2 3.6-2 3.6 0v5-3.7c0-2 3.5-2 3.5 0v5l1.4-1.2c1.6-1.2 3.1.5 1.9 2.1L18 18c-1 1.8-2.5 2.7-4.5 2.7h-2c-3.3 0-5.3-1.4-6.3-4.5L4 11z',
  hand:'M7 13V6.5c0-1.9 2.8-1.9 2.8 0V11 4c0-2 3-2 3 0v7-6c0-1.9 3-1.9 3 0v6-4c0-1.9 2.9-1.9 2.9 0v7c0 4.4-2.2 7.2-6 7.2-2.3 0-3.7-.8-5.2-2.7L3 13c-1.2-1.7.7-3.3 2.1-2z',
  drag:'M3 12h18 M7 8l-4 4 4 4 M17 8l4 4-4 4',full:'M9 4H4v5 M15 4h5v5 M20 15v5h-5 M4 15v5h5',
  album:'M6 6h15v14H6z M3 16V3h14 M7 17l4-5 3 3 3-4 4 6 M10 10h.1',
  music:'M9 18V5l10-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  train:'M12 3a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z M4 21c0-4 3.6-6 8-6s8 2 8 6 M19 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z',
  zen:'M3 12a9 9 0 0 1 18 0 M3 12h3 M18 12h3 M12 3v3 M12 18v3 M8 12a4 4 0 0 1 8 0',
  ok:'M7 12a3 3 0 1 1 4.6-2.5L11 10 M7.5 12.5 10 15l4-5 M13 8l7 7 M20 8l-7 7',
  plus:'M12 5v14 M5 12h14',close:'M5 5l14 14 M19 5 5 19',left:'M15 5l-7 7 7 7',right:'M9 5l7 7-7 7'
};
for(const icon of document.querySelectorAll('[data-icon]')){
  icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 24 24"><path d="'+shapes[icon.dataset.icon]+'"/></svg>';
}
const el=id=>document.getElementById(id);
const samples=[['village','雪夜小镇'],['cabin','林间小屋'],['forest','冬日晨光'],['lights','圣诞市集']].map(([id,name])=>({src:'./photos/'+id+'.jpg',name}));
let photos=[...samples], selected=0, cameraOn=false, timer;
const viewer=el('viewer'),guide=el('guide'),scene=el('scene');
function notify(message){el('toast').textContent=message;clearTimeout(timer);timer=setTimeout(()=>el('toast').textContent='',4500)}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let closingViewer=false, closeRun=0;
function closeViewer(){
  if(!viewer.open||closingViewer)return;
  if(reducedMotion){viewer.close();return}
  closingViewer=true;
  const run=++closeRun;
  // The .closing class fades the backdrop out in step with the dialog;
  // close() only runs once the animation has actually finished.
  viewer.classList.add('closing');
  const animation=viewer.animate(
    [{opacity:1,transform:'scale(1) translateY(0)'},{opacity:0,transform:'scale(.94) translateY(14px)'}],
    {duration:240,easing:'cubic-bezier(.5,0,.75,.4)'});
  const timeout=new Promise(resolve=>setTimeout(resolve,300));
  const settle=()=>{if(run!==closeRun)return;closingViewer=false;viewer.classList.remove('closing');if(viewer.open)viewer.close()};
  Promise.race([animation.finished,timeout]).then(settle,settle);
}
function sparkles(){
  if(reducedMotion)return;
  for(let i=0;i<14;i++){
    const dot=document.createElement('i');
    dot.className='sparkle';
    const angle=Math.random()*Math.PI*2, distance=70+Math.random()*150;
    dot.style.left='50%';dot.style.top='42%';
    viewer.append(dot);
    dot.animate([
      {opacity:0,transform:'translate(-50%,-50%) scale(.4)'},
      {opacity:1,transform:`translate(calc(-50% + ${Math.cos(angle)*distance*.35}px),calc(-50% + ${Math.sin(angle)*distance*.35}px)) scale(1)`,offset:.25},
      {opacity:0,transform:`translate(calc(-50% + ${Math.cos(angle)*distance}px),calc(-50% + ${Math.sin(angle)*distance}px)) scale(.2)`}
    ],{duration:650+Math.random()*300,easing:'cubic-bezier(.22,1,.36,1)'}).finished.then(()=>dot.remove()).catch(()=>dot.remove());
  }
}
function viewerStrip(){
  const strip=el('viewerStrip');
  strip.replaceChildren(...photos.map((p,i)=>{
    const thumb=document.createElement('button');
    thumb.className='strip-thumb'+(i===selected?' active':'');
    thumb.setAttribute('aria-label',p.name);
    const img=new Image();img.alt='';img.src=p.src;
    thumb.append(img);
    thumb.onclick=()=>showPhoto(i,null,i>selected?1:-1);
    return thumb;
  }));
}
function showPhoto(index,origin=null,direction=0){
  if(guide.open||index<0||index>=photos.length)return;
  const opening=!viewer.open;
  const previous=selected;
  selected=index;
  const p=photos[index];
  const image=el('large');
  el('large').src=p.src;el('large').alt=p.name;el('photoName').textContent=p.name;
  el('photoIndex').textContent=(index+1)+' / '+photos.length;
  viewerStrip();
  if(opening){
    // The tree behind the photo is the tree again, not a gathered ball.
    tree.setGather(false);
    // A stale close animation must not fade out the freshly opened dialog.
    closeRun++;closingViewer=false;viewer.classList.remove('closing');
    viewer.getAnimations().forEach(animation=>animation.cancel());
    // Expand from the photo that was tapped: the dialog grows out of it.
    if(origin&&!reducedMotion){
      const rect=viewer.getBoundingClientRect();
      const cx=origin.x??(origin.left+origin.width/2), cy=origin.y??(origin.top+origin.height/2);
      viewer.style.transformOrigin=`${cx-rect.left}px ${cy-rect.top}px`;
    }else viewer.style.transformOrigin='50% 50%';
    viewer.showModal();
    if(!reducedMotion){
      image.getAnimations().forEach(animation=>animation.cancel());
      image.animate([
        {opacity:0,transform:'scale(.86)',filter:'blur(8px)'},
        {opacity:1,transform:'scale(1)',filter:'blur(0)'}
      ],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'});
      sparkles();
    }
  }else if(!reducedMotion){
    // Switching photos slides sideways in the direction of travel.
    const dir=direction||(index>previous?1:-1);
    image.getAnimations().forEach(animation=>animation.cancel());
    image.animate([
      {opacity:0,transform:`translateX(${dir*46}px) scale(.985)`,filter:'blur(4px)'},
      {opacity:1,transform:'translateX(0) scale(1)',filter:'blur(0)'}
    ],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'});
  }
}
function cycle(direction=1){showPhoto((selected+direction+photos.length)%photos.length,null,direction)}
el('prev').onclick=()=>cycle(-1);el('next').onclick=()=>cycle();
el('guideBtn').onclick=()=>guide.showModal();
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>{if(button.dataset.close==='viewer')closeViewer();else el(button.dataset.close).close()};
viewer.addEventListener('cancel',e=>{e.preventDefault();closeViewer()});
for(const dialog of [viewer,guide])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom){if(dialog===viewer)closeViewer();else dialog.close()}});
drawLandscape(el('landscape'));
const tree=createTree(el('tree'),{onSelect:showPhoto});

// Opening starfield guide. A three-scene, pure-frontend slideshow: tap or
// swipe to advance, and the last scene lights the tree. The tree waits as a
// gathered ball of light until the curtain parts.
(function opening(){
  const intro=el('intro');
  if(!intro) return;
  const slides=[...intro.querySelectorAll('.intro-slide')];
  const dots=[...el('introDots').children];
  const enterBtn=el('introEnter'), hint=el('introHint');
  let index=0, entered=false;

  // Drifting starfield on its own canvas, independent of the main scene.
  const sky=el('introSky');
  let skyStop=()=>{};
  if(sky && !reducedMotion){
    const c=sky.getContext('2d');
    let w=0,h=0,dpr=1,raf=0,last=0,seed=91827;
    const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    const stars=Array.from({length:260},()=>({x:rnd(),y:rnd(),r:.3+rnd()**3*1.5,a:.15+rnd()*.6,ph:rnd()*6.28,sp:.3+rnd()*1.1}));
    function resize(){const r=sky.getBoundingClientRect();if(!r.width||!r.height)return;dpr=Math.min(devicePixelRatio||1,1.5);w=r.width;h=r.height;sky.width=Math.round(w*dpr);sky.height=Math.round(h*dpr)}
    function paint(now){raf=requestAnimationFrame(paint);if(document.hidden||!w)return;const dt=Math.min(80,last?now-last:16);last=now;const t=now/1000;
      c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
      const g=c.createRadialGradient(w*.5,h*.46,0,w*.5,h*.46,Math.max(w,h)*.62);
      g.addColorStop(0,'rgba(48,32,74,.55)');g.addColorStop(.5,'rgba(16,12,32,.35)');g.addColorStop(1,'rgba(4,4,12,0)');
      c.fillStyle=g;c.fillRect(0,0,w,h);
      for(const s of stars){const a=s.a*(.55+.45*Math.sin(t*s.sp+s.ph));c.globalAlpha=a;c.fillStyle=rnd()<.5?'#fff':'#ffe6f2';
        c.beginPath();c.arc((s.x+.004*Math.sin(t*.2+s.ph))*w,s.y*h,s.r,0,6.2832);c.fill()}
      c.globalAlpha=1;
    }
    resize();raf=requestAnimationFrame(paint);
    const ro=new ResizeObserver(resize);ro.observe(sky);
    skyStop=()=>{cancelAnimationFrame(raf);ro.disconnect()};
  }

  if(!reducedMotion){
    const frag=document.createDocumentFragment();
    for(let i=0;i<46;i++){
      const flake=document.createElement('i');
      const size=2+Math.random()*3.4;
      flake.style.width=size+'px';flake.style.height=size+'px';
      flake.style.left=(Math.random()*100)+'%';
      flake.style.animationDuration=(7+Math.random()*9)+'s';
      flake.style.animationDelay=(-Math.random()*12)+'s';
      flake.style.opacity=(.35+Math.random()*.5);
      frag.append(flake);
    }
    el('introSnow').replaceChildren(frag);
  }

  tree.setGather(true);

  function show(next){
    index=Math.max(0,Math.min(slides.length-1,next));
    slides.forEach((s,i)=>s.classList.toggle('is-active',i===index));
    dots.forEach((d,i)=>d.classList.toggle('is-active',i===index));
    const last=index===slides.length-1;
    enterBtn.classList.toggle('is-visible',last);
    hint.textContent=last?'轻点「点亮圣诞树」或按 Enter 进入':'轻点任意处继续 · 左右滑动切换场景';
  }
  function enter(){
    if(entered)return;
    entered=true;
    window.removeEventListener('keydown',onKey,true);
    skyStop();
    // Kick off the rain-drop entrance: particles fall from the top of the
    // screen, pile up at the bottom, then spiral into the tree after ~3s.
    tree.playRainEntrance();
    if(reducedMotion){intro.hidden=true;return}
    intro.classList.add('leaving');
    // Hide the cover quickly so the falling rain is visible; the animation
    // itself keeps running for ~5s after the cover is gone.
    setTimeout(()=>{intro.hidden=true;try{el('tree').focus({preventScroll:true})}catch{}},620);
  }
  function advance(){ if(index<slides.length-1)show(index+1); else enter(); }

  let startX=null;
  intro.addEventListener('pointerdown',e=>{startX={x:e.clientX,y:e.clientY}});
  intro.addEventListener('pointerup',e=>{
    if(startX===null)return;
    const dx=e.clientX-startX.x, dy=e.clientY-startX.y;startX=null;
    if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)){ show(index+(dx<0?1:-1)); return; }
    if(Math.hypot(dx,dy)<10) advance();
  });
  intro.addEventListener('wheel',e=>{e.preventDefault();if(Math.abs(e.deltaY)>18)show(index+(e.deltaY>0?1:-1))},{passive:false});
  function onKey(e){
    if(entered)return;
    if(e.key==='ArrowRight'){e.preventDefault();show(index+1)}
    else if(e.key==='ArrowLeft'){e.preventDefault();show(index-1)}
    else if(e.key==='Enter'||e.key===' '||e.key==='Spacebar'){
      e.preventDefault();
      if(index<slides.length-1)show(index+1);else enter();
    }
  }
  enterBtn.addEventListener('click',e=>{e.stopPropagation();enter()});
  window.addEventListener('keydown',onKey,true);
  show(0);
})();

function gallery(){
  const fragment=document.createDocumentFragment();
  photos.forEach((p,i)=>{
    const tile=document.createElement('button'),img=new Image(),caption=document.createElement('span');
    tile.className='tile';tile.onclick=()=>{const r=tile.getBoundingClientRect();showPhoto(i,{x:r.left+r.width/2,y:r.top+r.height/2})};img.alt='';img.src=p.src;caption.textContent=p.name;
    tile.append(img,caption);fragment.append(tile);
  });
  el('film').replaceChildren(fragment);el('count').textContent=photos.length+' 张照片';tree.setPhotos(photos);
}
gallery();
function openAlbum(){return new Promise((resolve,reject)=>{
  const req=indexedDB.open('noel-atelier-album',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('photos',{keyPath:'id',autoIncrement:true});
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
})}
const database=openAlbum().catch(()=>null);
async function restore(){
  const db=await database;if(!db)return;
  const records=await new Promise((res,rej)=>{const r=db.transaction('photos').objectStore('photos').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  if(!records.length)return;
  photos=[...records.map(p=>({src:URL.createObjectURL(p.blob),name:p.name})),...samples];gallery();
}
const restored=restore().catch(()=>notify('本地相册读取失败，可以重新添加照片。'));

// Auto-discover photos placed in the photos/ folder. A static site cannot list
// a directory, so we probe a manifest plus common names and add what exists.
async function autoDiscoverPhotos(){
  const known=new Set(photos.map(p=>p.src));
  const candidates=new Set();
  // 1) manifest.json, if the author provided one.
  try{
    const res=await fetch('./photos/manifest.json',{cache:'no-store'});
    if(res.ok){const list=await res.json();if(Array.isArray(list))list.forEach(n=>{
      if(typeof n==='string')candidates.add(n);
    })}
  }catch{}
  // 2) common names users tend to drop in.
  for(const base of ['photo','img','image','christmas','tree'])for(const ext of ['jpg','jpeg','png','webp'])for(let i=1;i<=6;i++)candidates.add(base+'-'+i+'.'+ext);
  const found=[];
  await Promise.all([...candidates].slice(0,40).map(src=>new Promise(resolve=>{
    if(known.has('./photos/'+src))return resolve();
    const img=new Image();
    img.onload=()=>{if(img.naturalWidth>0)found.push({src:'./photos/'+src,name:src.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ')}) ;resolve()};
    img.onerror=()=>resolve();
    img.src='./photos/'+src;
  })));
  if(found.length){
    const start=photos.length-samples.length;
    photos.splice(start,0,...found);gallery();
    notify('已自动挂上 '+found.length+' 张目录照片');
  }
}
const autoPhotos=autoDiscoverPhotos().catch(()=>{});
async function preparePhoto(file){
  const src=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=src;await img.decode();
    const scale=Math.min(1,1500/Math.max(img.width,img.height));const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#10191f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.87));if(!blob)throw Error('decode');
    return {blob,name:file.name.replace(/\.[^.]+$/,'')||'我的照片'};
  }finally{URL.revokeObjectURL(src)}
}
el('upload').onclick=()=>el('files').click();
el('files').onchange=async()=>{
  const files=[...el('files').files];if(!files.length)return;
  el('files').value='';el('upload').disabled=true;await restored;await autoPhotos;
  const fresh=[];for(const file of files){try{fresh.push(await preparePhoto(file))}catch{}}
  if(fresh.length){
    const db=await database;let saved=false;
    try{if(db){await new Promise((res,rej)=>{const tx=db.transaction('photos','readwrite');for(const p of fresh)tx.objectStore('photos').add(p);tx.oncomplete=res;tx.onerror=tx.onabort=()=>rej(tx.error)});saved=true}}catch{}
    const start=photos.length-samples.length;
    photos.splice(start,0,...fresh.map(p=>({name:p.name,src:URL.createObjectURL(p.blob)})));selected=start;gallery();el('film').children[start].scrollIntoView({block:'nearest',inline:'nearest'});
    notify('已挂上 '+fresh.length+' 张照片'+(saved?'':'，本次浏览有效')+(fresh.length<files.length?'，部分文件未能读取':''));
  }else notify('照片读取失败，请选择浏览器支持的图片。');
  el('upload').disabled=false;
};
const HAND_LINKS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function drawHandPreview(frame){
  const preview=el('handPreview'), canvas=el('handCanvas'), ctx=canvas.getContext('2d');
  if(!cameraOn||preview.hidden)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!frame?.present||!frame.landmarks){
    el('handHint').textContent='等待手掌';el('pinchMeter').style.width='0%';
    return;
  }
  const W=canvas.width,H=canvas.height;
  const point=i=>[(1-frame.landmarks[i].x)*W,frame.landmarks[i].y*H];
  ctx.lineWidth=2;ctx.strokeStyle='rgba(221,195,144,.9)';
  for(const [a,b] of HAND_LINKS){const [x1,y1]=point(a),[x2,y2]=point(b);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  for(let i=0;i<frame.landmarks.length;i++){
    const [x,y]=point(i);
    ctx.fillStyle=i===4||i===8?'#ffd98a':'#eef3ff';
    ctx.beginPath();ctx.arc(x,y,i===0?5:3.4,0,Math.PI*2);ctx.fill();
  }
  // Pinch line between thumb tip and index tip, gold while pinched.
  const [tx,ty]=point(4),[ix,iy]=point(8);
  ctx.strokeStyle=frame.pinchGap<0.31?'#ffd98a':'rgba(255,255,255,.75)';ctx.lineWidth=2.5;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(ix,iy);ctx.stroke();ctx.setLineDash([]);
  const meter=Math.max(0,Math.min(100,(0.68-frame.pinchGap)/0.37*100));
  el('pinchMeter').style.width=meter+'%';
  el('handHint').textContent=frame.distance==='far'?'手靠近一点':frame.distance==='near'?'手远一点':frame.fist?'已握拳':frame.pinchGap<0.31?'捏合中…':'已识别手掌';
}
let cameraRequest=0;
function cameraState(on){cameraOn=on;el('handPreview').hidden=!on;el('camera').querySelector('span').textContent=on?'关闭摄像头':'开启摄像头';scene.classList.toggle('active',on)}

// ---- New V2 UI state: trainer panel, zen mode, wishes, inscription ----
const train=el('train'), wishOverlay=el('wishOverlay');
let zenOn=false;

function drawTrainBars(votes){
  const box=el('trainBars');
  if(!box.children.length){
    box.replaceChildren(...LABELS.map(l=>{
      const row=document.createElement('div');row.className='train-bar';
      row.innerHTML='<span>'+LABEL_NAMES[l]+'</span><i></i>';
      return row;
    }));
  }
  [...box.children].forEach((row,i)=>{
    const v=votes[LABELS[i]]||0;
    row.querySelector('i').style.width=Math.round(v*100)+'%';
  });
}
function refreshTrainCount(){
  const n=trainer.size();
  el('trainCount').textContent=n?('本地训练集：'+n+' 条 · '+Object.entries(trainer.counts()).map(([k,v])=>LABEL_NAMES[k]+' '+v).join('，')):'暂无训练样本';
}

// A wish appears on OK: particles scatter like starlight and a random line fades in.
const WISHES=[
  '愿你这一年的所有等待，都在今晚开出花来。',
  '愿你所念之人，都在灯火可亲处。',
  '把烦恼交给风，把心愿挂上树，把温柔留给自己。',
  '愿星光替我，照亮你回家的路。',
  'Merry Christmas · 愿你被这个世界温柔以待。',
  '今年的圣诞，谢谢你和我在一起。',
  '愿每一个平凡的日子，都有微小而确实的幸福。'
];
let wishTimer;
function grantWish(){
  if(zenOn)return;
  tree.setScatter(true);tree.pulse(1);
  el('wishText').textContent=WISHES[Math.floor(Math.random()*WISHES.length)];
  wishOverlay.hidden=false;
  clearTimeout(wishTimer);
  wishTimer=setTimeout(closeWish,12000);
}
function closeWish(){
  wishOverlay.hidden=true;
  tree.setScatter(false);tree.setGather(false);
}

// Gesture trainer: local k-NN model, optional ML takeover of pose recognition.
const trainer=createTrainer();
let lastFeatures=null, lastPrediction=null, mlPose=null, mlPoseAt=0;

function applyPose(pose){
  if(viewer.open||guide.open||zenOn)return;
  if(pose==='fist'){tree.setGather(true)}
  else if(pose==='palm'){tree.setScatter(true);tree.pulse(.35)}
  else if(pose==='idle'){tree.setGather(false);tree.setScatter(false)}
  else if(pose==='ok'){/* OK is an action, handled separately */}
}

const gestures=createGestures({
  onDoublePinch(){tree.pulse(1);if(!guide.open){if(viewer.open)cycle();else showPhoto(selected)}},
  onFist(){tree.pulse(.6);if(viewer.open){closeViewer();tree.setGather(true)}},
  onPose(pose){
    // Gathering only applies when no photo is open: a fist held while a
    // photo is showing closes it (onFist, above), and an open palm while
    // viewing must not expand the tree behind the dialog.
    if(viewer.open||guide.open)return;
    if(trainer.enabled){
      // ML takeover: the rule label is ignored; the k-NN prediction drives it.
      if(lastPrediction && now()-mlPoseAt>160){
        const label=lastPrediction.label;
        const mapped=label==='fist'?'fist':label==='palm'?'palm':label==='ok'?'ok':'idle';
        if(mapped!==mlPose){mlPose=mapped;mlPoseAt=now();applyPose(mapped)}
      }
      return;
    }
    applyPose(pose);
  },
  onFeatures(points){
    lastFeatures=extractFeatures(points);
    if(!lastFeatures)return;
    lastPrediction=trainer.predict(lastFeatures);
    // Feed the trainer's live readout when its panel is open.
    if(train.open){
      el('trainGuess').textContent=lastPrediction?LABEL_NAMES[lastPrediction.label]:'需训练样本';
      el('trainConfidence').textContent=lastPrediction?Math.round(lastPrediction.confidence*100)+'%':'';
      const votes={};LABELS.forEach(l=>votes[l]=0);
      if(lastPrediction)votes[lastPrediction.label]=lastPrediction.confidence;
      drawTrainBars(votes);
    }
  },
  onOK(){grantWish()},
  onRotate(delta){if(!viewer.open&&!guide.open)tree.rotate(delta)},
  onStatus(message){el('status').textContent=message},
  onFrame(frame){drawHandPreview(frame)},
  onError(error){cameraState(false);notify(error.message)}
});
const now=()=>performance.now();
const music=createMusic();
function refreshMusicButton(playing){
  const button=el('music');
  button.classList.toggle('playing',playing);
  button.setAttribute('aria-pressed',String(playing));
  button.querySelector('span').textContent=playing?'音乐开':'音乐';
  button.setAttribute('aria-label',playing?'关闭圣诞音乐':'播放圣诞音乐');
}
el('music').onclick=()=>{try{refreshMusicButton(music.toggle())}catch{notify('音乐无法播放，请在浏览器中允许音频后重试。')}};
el('camera').onclick=async()=>{
  const request=++cameraRequest;
  if(cameraOn||el('camera').getAttribute('aria-busy')==='true'){
    gestures.stop();
    el('camera').removeAttribute('aria-busy');
    cameraState(false);
    return;
  }
  const button=el('camera');
  button.setAttribute('aria-busy','true');
  button.querySelector('span').textContent='取消开启';
  try{
    await gestures.start();
    if(request===cameraRequest)cameraState(true);
  }catch(error){
    if(request===cameraRequest){cameraState(false);notify(error.message)}
  }finally{
    if(request===cameraRequest)button.removeAttribute('aria-busy');
  }
};
document.addEventListener('keydown',e=>{
  // Trainer: number keys record the currently held gesture into the local set.
  if(train.open && ['1','2','3','4','5'].includes(e.key) && cameraOn && lastFeatures){
    const label=LABELS[Number(e.key)-1];
    if(trainer.add(label,lastFeatures)){refreshTrainCount();notify('已记录：'+LABEL_NAMES[label]);el('trainGuess').textContent=LABEL_NAMES[label]}
    return;
  }
  if(e.key==='p'||e.key==='P'){if(!/input|textarea/i.test(e.target.tagName)){e.preventDefault();toggleZen(!zenOn)}}
  if(!wishOverlay.hidden && e.key==='Escape'){closeWish();return}
  if(viewer.open&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();cycle(e.key==='ArrowLeft'?-1:1)}
  else if(!viewer.open && (e.target===el('tree')||e.target===document.body)&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();tree.rotate(e.key==='ArrowLeft'?-.25:.25)}
  else if(e.key==='Escape'&&scene.classList.contains('expanded'))toggleExpanded(false);
});
function fullLabel(on){el('full').setAttribute('aria-label',on?'退出全屏':'进入全屏');el('full').title=on?'退出全屏':'全屏'}
function toggleExpanded(on){scene.classList.toggle('expanded',on);fullLabel(on)}
el('full').onclick=async()=>{if(scene.classList.contains('expanded'))return toggleExpanded(false);if(document.fullscreenElement)return document.exitFullscreen();try{await scene.requestFullscreen()}catch{toggleExpanded(true)}};
document.addEventListener('fullscreenchange',()=>fullLabel(!!document.fullscreenElement));

// ---- Trainer UI ----
el('trainBtn').onclick=()=>{train.showModal();refreshTrainCount();drawTrainBars({});if(!cameraOn)notify('开启摄像头后即可实时采集与训练手势。')};
el('train').querySelectorAll('.train-keys button').forEach(b=>b.onclick=()=>{
  if(!cameraOn||!lastFeatures){notify('请先开启摄像头并让手进入画面。');return}
  const label=b.dataset.label;
  if(trainer.add(label,lastFeatures)){refreshTrainCount();notify('已记录：'+LABEL_NAMES[label])}
});
el('trainUndo').onclick=()=>{if(trainer.undo()){refreshTrainCount();notify('已撤销上一条')}};
el('trainClear').onclick=()=>{trainer.clear();refreshTrainCount();notify('训练集已清空')};
el('trainExport').onclick=()=>{
  const blob=new Blob([trainer.exportJSON()],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gesture-training.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
el('trainImport').onclick=()=>el('trainFile').click();
el('trainFile').onchange=async()=>{
  const f=el('trainFile').files?.[0];if(!f)return;
  const ok=trainer.importJSON(await f.text());el('trainFile').value='';
  refreshTrainCount();notify(ok?'训练数据已导入':'导入失败，文件格式不正确');
};
el('trainEnable').onchange=e=>{trainer.enabled=e.target.checked;mlPose=null;notify(trainer.enabled?'ML 接管已开启':'ML 接管已关闭，恢复规则识别')};

// ---- Zen (clean-view) mode ----
function toggleZen(on){
  zenOn=on;
  document.body.classList.toggle('zen',on);
  // Inline styles guarantee the chrome hides regardless of cascade order.
  for(const node of [document.querySelector('.gallery'),scene.querySelector('.gestures'),scene.querySelector('.scene-end')]){
    if(node)node.style.display=on?'none':'';
  }
  el('zenBtn').classList.toggle('playing',on);
  el('zenBtn').querySelector('span').textContent=on?'退出观赏':'净屏';
  if(on){tree.setGather(false);tree.setScatter(false);if(!wishOverlay.hidden)closeWish()}
}
el('zenBtn').onclick=()=>toggleZen(!zenOn);

// ---- Wish overlay ----
el('wishClose').onclick=closeWish;

// ---- To inscription (editable) ----
(function inscription(){
  const box=el('inscription'),textEl=el('inscriptionText');
  const KEY='noel-inscription';
  try{const saved=localStorage.getItem(KEY);if(saved)textEl.textContent=saved}catch{}
  function edit(){
    const current=textEl.textContent;
    const value=window.prompt('写一句想对 TA 说的话（题字）',current==='你'?'':current);
    if(value===null)return;
    const next=value.trim().slice(0,40)||'你';
    textEl.textContent=next;
    try{localStorage.setItem(KEY,next)}catch{}
  }
  box.addEventListener('click',edit);
  box.setAttribute('role','button');box.tabIndex=0;
  box.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit()}});
})();

window.addEventListener('pagehide',()=>{++cameraRequest;gestures.stop();music.stop();refreshMusicButton(false);el('camera').removeAttribute('aria-busy');cameraState(false)});
