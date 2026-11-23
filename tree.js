// All tree, spiral, orbit, and heart particles share one static vertex buffer.
// The shader handles projection, shimmer and drift. The foreground canvas carries the photo ornaments.
const TAU = Math.PI * 2;
const STRIDE = 10;

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function colorAt(y, tint) {
  // Reference video palette: deep magenta at the ground, luminous pink-white
  // toward the tip. `f` is 1 at the tip and 0 at the base.
  const f = Math.min(1, Math.max(0, (1.02 - y) ** 1.45 + tint));
  return [0.52 + 0.46*f, 0.11 + 0.44*f, 0.38 + 0.56*f];
}

function radiusAt(y) {
  const t = Math.max(0, Math.min(1, y));
  // Four stacked tiers: each layer flares at its lower edge and pinches
  // slightly where the next layer starts, so the cone reads as a tree.
  const edges = [0, 0.30, 0.58, 0.82, 1.0];
  const radii = [0.012, 0.158, 0.268, 0.358, 0.418];
  let k = 0;
  while (k < 3 && t >= edges[k + 1]) k++;
  const local = (t - edges[k]) / (edges[k + 1] - edges[k]);
  let r = radii[k] + (radii[k + 1] - radii[k]) * Math.pow(local, 0.85);
  r += Math.pow(Math.max(0, (local - 0.86) / 0.14), 2) * 0.028;
  r *= 1 - 0.05 * Math.exp(-Math.pow(local / 0.10, 2));
  return r;
}

function makeCloud() {
  const random = seededRandom(298134), points = [];
  const spread = () => random() + random() + random() - 1.5;
  function add(x, y, z, size, color, brightness, kind = 0) {
    points.push(x, y, z, size, ...color, brightness, random() * TAU, kind);
  }
  function place(y, r, angle, size, color, brightness) {
    add(Math.cos(angle) * r, y, Math.sin(angle) * r, size, color, brightness);
  }
  // Six helical ribbons, thirteen latitude rings, and a sparse interior give the cone its depth.
  // Broad ribbons are built out of separate points and remain readable as they turn.
  // About 7% of the tree points are warm gold, so the ice-blue cone has a
  // contrasting sparkle instead of one flat colour.
  const gold = () => [1, .68 + random() * .18, .34 + random() * .14];
  for (let i=0; i<19040; i++) {
    const strand=i%6;
    const y=Math.pow(random(),0.69);
    const a=y*TAU*7.5 + strand*TAU/6 + .29*Math.sin(y*9+strand*.7) + spread()*.115;
    const r=radiusAt(y)*(.95 + .035*Math.sin(y*22+strand) + spread()*.10);
    const yy=y + spread()*(.004 + .011*y);
    const bright=random()<.08;
    const tint=bright ? .24+random()*.25 : spread()*.085;
    const size=bright ? .0029+random()*.0020 : .0008+random()**1.65*.0026;
    const isGold=random() < .05 + .11*(1-y);
    place(yy,r,a,isGold?size*1.35:size,isGold?gold():colorAt(y,tint),isGold?.92:bright ? .94 : .29+random()*.50);
  }
  for (let i=0; i<6160; i++) {
    const ring=i%13;
    const y=(ring+.55)/13, a=random()*TAU;
    const r=radiusAt(y)*(.96+spread()*.125);
    const yy=y+spread()*(.003+.009*y)+.008*Math.sin(a*3+ring);
    const bright=random()<.08;
    const isGold=random() < .05 + .11*(1-y);
    place(yy,r,a,bright?.0045:.001+random()**2*.0024,isGold?gold():colorAt(y,.07+random()*.22),isGold?.9:bright?.88:.28+random()*.44);
  }
  for(let i=0; i<2800; i++) {
    const y=Math.pow(random(),.67),a=random()*TAU;
    const r=radiusAt(y)*Math.sqrt(random())*.92;
    place(y,r,a,.001+random()**2*.0028,colorAt(y,spread()*.13),.22+random()*.41);
  }
  for (let band = 0; band < 4; band++) {
    const n = [1140,860,560,280][band], radius = [.35,.412,.469,.528][band];
    for (let i=0; i<n; i++) {
      const a = random()*TAU + band*0.22;
      const r = radius + Math.sin(a*3+band)*.005 + spread()*(.005+band*.0021);
      const intensity=(.22+random()*.63)*(.71+.29*Math.sin(a*2+band));
      add(Math.cos(a)*r, 1.018 + band*.004 + spread()*.0036, Math.sin(a)*r,
        .0011+random()**2*.0028, [.92+random()*.08,.42+random()*.26,.74+random()*.22],intensity,4+band);
    }
  }
  for (let i=0; i<600; i++) {
    const a=random()*TAU;
    const r=.19+Math.sqrt(random())*.40;
    add(Math.cos(a)*r, 1.03+spread()*.009, Math.sin(a)*r,.001+random()*.002,[.72,.40,.78],random()*.35,1);
  }
  // A camera-facing hollow heart preserves its silhouette at every viewing angle.
  for (let i=0; i<900; i++) {
    const t = random() * TAU;
    const x = Math.sin(t)**3;
    const y = (13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/16;
    const f = .91 + spread()*.085;
    const pink = random();
    add(x*.046*f+spread()*.0008, -.060-y*.042*f+spread()*.001, 0,
      .0013+random()**2*.0036,[1,.54+pink*.45,.75+pink*.25],.43+random()*.56,2);
  }
  for (let i=0; i<410; i++) {
    const x = (random()-.5)*1.94, y = random()*1.28-.16, z = (random()-.5)*1.1;
    add(x,y,z,.0008+random()**3*.0044,[.67+random()*.29,.77+random()*.21,1], .15+random()*.39,3);
  }
  // A thick, bright trunk grounds the cone: it starts tucked under the
  // lowest branch layer and reaches below the ground glow, so it stays
  // visible from the front and while the tree turns instead of being
  // washed out by the glow at the base.
  for (let i=0; i<980; i++) {
    const y=.985+random()*.175, a=random()*TAU;
    const f=(y-.985)/.175;
    const r=(.086-.024*f)*(.88+spread()*.16);
    const warm=random()<.45;
    add(Math.cos(a)*r, y, Math.sin(a)*r, .0016+random()**2*.0028,
      warm?[.88,.6,.3]:[.58+random()*.14,.4+random()*.09,.22+random()*.06],
      .58+random()*.38);
  }
  // A dense garland ring marks the lowest branch layer so the base reads clearly.
  for (let i=0; i<760; i++) {
    const y=.965+random()*.035, a=random()*TAU;
    const r=radiusAt(y)*(.985+spread()*.045);
    const isGold=random()<.16, bright=random()<.14;
    place(y,r,a,bright?.0038:.001+random()**2*.0026,isGold?gold():colorAt(y,.1+random()*.2),isGold?.92:bright?.9:.4+random()*.45);
  }
  // A five-point gold star crowns the heart: outline points plus a bright core.
  {
    const cy=-0.148, outer=.052, inner=.0215, star=[];
    for (let k=0;k<10;k++){
      const ang=-Math.PI/2 + k*Math.PI/5, rad=k%2===0?outer:inner;
      star.push([Math.cos(ang)*rad, cy+Math.sin(ang)*rad]);
    }
    for (let i=0;i<520;i++){
      const seg=i%10, p0=star[seg], p1=star[(seg+1)%10], f=random();
      add(p0[0]+(p1[0]-p0[0])*f+spread()*.0012, p0[1]+(p1[1]-p0[1])*f+spread()*.0012, 0,
        .0012+random()**2*.0028,[1,.78+random()*.16,.42+random()*.12],.72+random()*.28,2);
    }
    for (let i=0;i<130;i++){
      const a=random()*TAU, r=Math.sqrt(random())*.016;
      add(Math.cos(a)*r, cy+Math.sin(a)*r*.9, 0, .0014+random()**2*.003,[1,.9,.72],.9,2);
    }
  }
  // Festive fairy lights: multicoloured baubles strung over the branches.
  // Each bulb carries its own phase, so the vertex shader blinks them out of
  // sync like the string lights of a classic Python turtle Christmas tree.
  const festive = [[1,.42,.66],[1,.72,.44],[.92,.48,.86],[1,.58,.78],[.98,.80,.52]];
  for (let i=0; i<1200; i++) {
    const y = .02 + Math.pow(random(), .72) * .94;
    const a = random() * TAU;
    const r = radiusAt(y) * (1.05 + spread()*.04);
    add(Math.cos(a)*r, y, Math.sin(a)*r, .0038+random()*.0032,
      festive[i % festive.length], .95+random()*.05, 8);
  }
  // A large golden star crowns the tip of the tree.
  {
    const cy=1.085, outer=.062, inner=.026, star=[];
    for (let k=0;k<10;k++){
      const ang=-Math.PI/2 + k*Math.PI/5, rad=k%2===0?outer:inner;
      star.push([Math.cos(ang)*rad, cy+Math.sin(ang)*rad]);
    }
    for (let i=0;i<700;i++){
      const seg=i%10, p0=star[seg], p1=star[(seg+1)%10], f=random();
      add(p0[0]+(p1[0]-p0[0])*f+spread()*.0016, p0[1]+(p1[1]-p0[1])*f+spread()*.0016, 0,
        .0018+random()**2*.0034,[1,.80+random()*.16,.40+random()*.14],.85+random()*.15,1);
    }
    for (let i=0;i<240;i++){
      const a=random()*TAU, r=Math.sqrt(random())*.022;
      add(Math.cos(a)*r, cy+Math.sin(a)*r*.9, 0, .0016+random()**2*.0034,[1,.92,.74],.95,1);
    }
  }
  return new Float32Array(points);
}

const vertexSource = `
attribute vec3 aPosition;
attribute float aSize;
attribute vec3 aColor;
attribute float aBrightness;
attribute float aPhase;
attribute float aKind;
uniform vec2 uViewport;
uniform vec2 uOrigin;
uniform vec2 uRotation;
uniform float uScale;
uniform float uRatio;
uniform float uTime;
uniform float uPulse;
uniform float uIntro;
uniform float uGather;
uniform float uScatter;
uniform float uRain;    // entrance 1: 0..1 particle curtain falls from the top
uniform float uHeart;   // entrance 2: 0..1 scattered cloud condenses into a heart
uniform float uCluster; // entrance 3: 0..1 heart collapses to a glowing bud at the tip
uniform float uGrow;    // entrance 4: 0..1 bud grows downward into the tree
uniform float uStreak;  // rain-light trail: 0 = bright head, 1 = faded tail
varying vec3 vColor;
varying float vBrightness;
// Deterministic pseudo-random direction from a particle's phase, so the
// scatter target needs no extra vertex attribute.
vec3 starDir(float phase){
  float a=phase*12.9898, b=phase*78.233, c=phase*37.719;
  float theta=fract(sin(a)*43758.5453)*6.2831853;
  float z=fract(sin(b)*24634.6345)*2.0-1.0;
  float r=sqrt(max(0.0,1.0-z*z));
  float rad=0.62+fract(sin(c)*15731.743)*1.02;
  return vec3(cos(theta)*r,z,sin(theta)*r)*rad;
}
// A stable target point on a large, camera-facing heart (the video's signature
// beat). The outline is a bright rim; the interior is filled with a soft cloud.
vec2 heartPoint(float phase, out float rim){
  float t=fract(phase*0.15915494)*6.2831853;
  float hx=sin(t)*sin(t)*sin(t);
  float hy=(13.0*cos(t)-5.0*cos(2.0*t)-2.0*cos(3.0*t)-cos(4.0*t))/16.0;
  float edge=step(0.62,fract(sin(phase*44.113)*9157.31));
  float interior=sqrt(fract(sin(phase*27.71)*5731.17));
  rim=edge;
  float f=mix(interior*0.92,1.0,edge);
  return vec2(hx*f,hy*f);
}
void main() {
  vec3 p=aPosition;
  float s=uRotation.x, c=uRotation.y;
  float x = p.x*c + p.z*s;
  float z = p.z*c - p.x*s;
  float y=p.y+z*0.157;
  // Entrance: the cloud rises a little and fades in over the first moment.
  y += (1.0-uIntro)*0.22*(0.5+0.5*sin(aPhase*3.0));
  // Twinkle is stronger than a gentle shimmer, and bright points flare.
  float shimmer=0.72+0.28*sin(uTime*(0.86+0.12*aPhase)+aPhase*3.3);
  shimmer += 0.30*pow(0.5+0.5*sin(uTime*2.1+aPhase*5.0),3.0)*step(0.72,aBrightness);
  float brightness = aBrightness * (0.25+0.75*uIntro) * (1.0+uPulse*0.9);
  float crown = aKind<0.5 ? 1.0-smoothstep(0.12,0.58,p.y) : 0.0;
  if (aKind > 7.5) {
    // Fairy lights: each bulb blinks on its own phase string, so the tree
    // twinkles in alternating colours rather than as one uniform pulse.
    float blink = 0.5+0.5*sin(uTime*3.1+aPhase*4.0);
    shimmer = 0.55 + 1.10*pow(blink,2.0);
    x += 0.0011*sin(0.9*uTime+aPhase*3.0);
    y += 0.0011*cos(0.7*uTime+aPhase*2.0);
  } else if (aKind < 0.5) {
    x += 0.0013*sin(1.15*uTime+aPhase*4.0);
    y += 0.0018*cos(0.81*uTime+aPhase*2.0);
    brightness *= 0.65 + 0.42*clamp(0.5+z/max(0.015,p.y*0.59),0.0,1.0);
  } else if (aKind > 3.5) {
    float speed = mod(aKind,2.0)<0.5 ? 0.071 : -0.057;
    float phase = speed*(1.0+(aKind-4.0)*0.25)*uTime;
    float rx=x*cos(phase)+z*sin(phase);
    float rz=z*cos(phase)-x*sin(phase);
    x=rx; y=p.y+rz*0.157;
  } else if (aKind > 2.5) {
    x=p.x+0.019*sin(0.23*uTime+aPhase);
    y=mod(p.y+0.16+uTime*(0.009+aSize*1.7),1.28)-0.16;
    shimmer=0.69+0.31*sin(0.92*uTime+aPhase);
  } else if (aKind > 1.5) {
    float beat=1.0+(0.034+0.05*uPulse)*sin(1.8*uTime);
    x=p.x*beat;
    y=-0.06+(p.y+0.06)*beat;
  }
  // Gathering: every particle except the falling snow drifts toward one
  // glowing ball at the middle of the tree, with a little per-particle
  // jitter so the ball reads as a dense cluster instead of a single point.
  if (uGather > 0.001 && (aKind < 2.5 || aKind > 3.5)) {
    vec2 gathered = vec2(0.0, 0.45)
      + vec2(sin(aPhase*12.9898), cos(aPhase*7.233)) * 0.028;
    vec2 pos = mix(vec2(x, y), gathered, uGather);
    x = pos.x; y = pos.y;
    brightness *= 1.0 + uGather * 0.55;
  }
  // Scatter: the tree dissolves into a slowly drifting field of stars. Each
  // particle keeps its own direction and gentle orbital drift so the cloud
  // reads as scattered starlight, not a frozen explosion. Photos follow on
  // the 2D layer via the same scatter value.
  if (uScatter > 0.001 && aKind < 2.5) {
    vec3 dir = starDir(aPhase);
    float drift = 0.045*sin(uTime*(0.28+0.12*dir.x)+aPhase);
    vec2 dest = vec2(dir.x*0.92, 0.42 + dir.y*0.66 + drift);
    vec2 pos = mix(vec2(x, y), dest, uScatter);
    x = pos.x; y = pos.y;
    shimmer = mix(shimmer, 0.55 + 0.75*pow(0.5+0.5*sin(uTime*1.6+aPhase*3.0),2.0), uScatter);
    brightness *= 1.0 + uScatter*0.35;
  }
  // ---- Four-beat entrance show (matches the reference video) ----
  // 1) uRain:    a staggered curtain falls from above the screen.
  // 2) uHeart:   the falling cloud condenses into a big glowing heart.
  // 3) uCluster: the heart collapses into a bud at the tree tip.
  // 4) uGrow:    the bud blooms downward into the finished tree, guided by a
  //              helix so the growth reads as a spiral ribbon unfurling.
  // At the settled state (uRain=1,uHeart=0,uCluster=0,uGrow=1) nothing moves.
  float heartRim=0.0;
  if (uRain < 0.999 || uHeart > 0.001 || uCluster > 0.001 || uGrow < 0.999) {
    float h1=fract(sin(aPhase*12.9898)*43758.5453);
    float h2=fract(sin(aPhase*78.233)*24634.6345);
    float h3=fract(sin(aPhase*45.164)*12543.123);
    float h4=fract(sin(aPhase*34.771)*6217.317);
    float h5=fract(sin(aPhase*57.913)*3719.541);
    // Falling light streaks: most particles fall inside a handful of vertical
    // CURTAINS (uneven density, like the reference), the rest are loose stray
    // stars. Each drop owns its start height, speed, delay and a vertical
    // trail length. The trail itself is drawn by repeating the scene with
    // uStreak sweeping 0->1; here we only place the head and fade the tail.
    float delay=h1*0.72;                                    // staggered start
    float lp=clamp((uRain-delay)/(1.0-delay),0.0,1.0);
    float pace=0.55+h5*0.9;                                 // per-drop speed
    float fall=clamp(lp*pace,0.0,1.0);
    fall=fall*fall*(3.0-2.0*fall);                          // soft ease
    float startY=-0.58-h4*0.40;                             // above the top edge
    float cloudY=0.20+h3*0.58;                              // scattered landing
    // Many thin curtains across the screen plus scattered strays -> an even
    // but still unevenly-textured veil of falling light.
    float curtain;
    if (h4 < 0.72) {
      float k=floor(h5*9.0);                                 // 0..8
      float center=-1.20+k*0.30;                             // curtain centres
      curtain=center+(h2-0.5)*0.13+(h1-0.5)*0.05;
    } else {
      curtain=(h2-0.5)*2.6;                                  // loose strays
    }
    float sway=0.05*sin(uTime*0.8+aPhase*5.0+h4*6.2831)*(1.0-fall*0.5);
    vec2 cloud=vec2(curtain+sway, mix(startY,cloudY,fall));
    // Light-streak tail: uStreak walks from the bright head (0) upward along
    // the fall path to a faded tail (1). Each drop has its own trail length.
    float trailLen=(0.045+h3*0.11)*step(0.001,uRain)*step(uRain,0.999);
    cloud.y += uStreak*trailLen;
    brightness *= mix(1.0, 0.06, uStreak);

    // Heart: a large camera-facing heart centred a little above the middle.
    vec2 hp=heartPoint(aPhase,heartRim);
    vec2 heart=vec2(hp.x*0.40, 0.42-hp.y*0.30);
    vec2 pos=mix(cloud,heart,smoothstep(0.0,1.0,uHeart));

    // Bud: collapse the heart into a tight glowing cluster at the tree tip.
    float bh=fract(sin(aPhase*91.7)*24631.7);
    vec2 bud=vec2((h1-0.5)*0.045, -0.055+(h2-0.5)*0.035+bh*0.012);
    pos=mix(pos,bud,smoothstep(0.0,1.0,uCluster));

    // Grow: each particle waits until the bloom front reaches its height, so
    // the tree opens from the top down. A per-particle angular swirl makes the
    // front trace a helix rather than a flat horizontal slice.
    float g=uGrow*uGrow*(3.0-2.0*uGrow);
    float height=p.y;                       // 0 at tip, 1 at the base
    float front=g*1.42-0.12;                // leading edge of the bloom
    float local=clamp((front-height)/(0.30),0.0,1.0);
    local=local*local*(3.0-2.0*local);
    float spin=aPhase+height*13.0+g*6.2831853;
    vec2 swirl=vec2(cos(spin),sin(spin))*(1.0-local)*0.035*(0.4+height);
    vec2 treeTarget=vec2(x,y);
    pos=mix(pos,treeTarget+swirl,local);

    x=pos.x; y=pos.y;
    float heartShine=smoothstep(0.0,1.0,uHeart)*(1.0-smoothstep(0.0,1.0,uCluster));
    brightness *= 1.0 + (1.0-g)*0.35 + heartShine*(heartRim>0.5?1.35:0.45)
                + sin(local*3.14159265)*0.5;
  }
  vec2 screen=(uOrigin+uScale*vec2(x,y))/uViewport;
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0.0,1.0);
  gl_PointSize=max(1.7*uRatio,aSize*uScale*uRatio*(2.65+2.9*crown)*(0.45+0.55*uIntro)*(1.0+uGather*0.3));
  // During the rain beat the streaks read as cool white / silver starlight,
  // with only a minority keeping a pink-violet tint (see reference image).
  float rainBeat=step(uHeart,0.02)*(1.0-step(0.999,uRain));
  float rarePink=step(0.86,fract(sin(aPhase*63.71)*2749.13));
  vec3 rainColor=mix(vec3(0.90,0.94,1.0),vec3(1.0,0.62,0.84),rarePink*0.75);
  vColor=mix(mix(aColor,vec3(1.0,.88,.96),crown*0.34),rainColor,rainBeat);
  vBrightness=brightness*shimmer*(1.0+0.42*crown);
}`;
const fragmentSource = `
precision mediump float;
varying vec3 vColor;
varying float vBrightness;
void main() {
  vec2 p=gl_PointCoord*2.0-1.0;
  float r=dot(p,p);
  if(r>=1.0) discard;
  float light=exp(-r*5.6)*0.88 + max(0.0,1.0-r)*0.16;
  float alpha=light*vBrightness;
  gl_FragColor=vec4(vColor*alpha,alpha);
}`;

function compile(gl, type, source) {
  const shader=gl.createShader(type);
  gl.shaderSource(shader,source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
    const reason=gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(reason);
  }
  return shader;
}

function createGPU(canvas, cloud) {
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:'low-power'});
  if (!gl) return null;
  const program=gl.createProgram();
  const vert=compile(gl,gl.VERTEX_SHADER,vertexSource), frag=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
  gl.attachShader(program,vert); gl.attachShader(program,frag); gl.linkProgram(program);
  gl.deleteShader(vert); gl.deleteShader(frag);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,cloud,gl.STATIC_DRAW);
  for (const [name,components,offset] of [['aPosition',3,0],['aSize',1,3],['aColor',3,4],['aBrightness',1,7],['aPhase',1,8],['aKind',1,9]]) {
    const loc=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,components,gl.FLOAT,false,STRIDE*4,offset*4);
  }
  const [viewport,origin,rotation,scale,ratio,time,pulse,intro,gather,scatter,rain,heart,cluster,grow,streak] = ['uViewport','uOrigin','uRotation','uScale','uRatio','uTime','uPulse','uIntro','uGather','uScatter','uRain','uHeart','uCluster','uGrow','uStreak'].map(n=>gl.getUniformLocation(program,n));
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE); gl.clearColor(0,0,0,0);
  // Number of trail segments drawn during the rain beat. Each extra pass
  // re-draws the cloud a little higher and dimmer to form a light streak.
  const STREAKS=11;
  return {
    draw(view, sn, cs, t, pulseValue, introValue, st) {
      gl.viewport(0,0,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(viewport,view.w,view.h); gl.uniform2f(origin,view.x,view.y);
      gl.uniform2f(rotation,sn,cs); gl.uniform1f(scale,view.s); gl.uniform1f(ratio,view.dpr);
      gl.uniform1f(time,t); gl.uniform1f(pulse,pulseValue); gl.uniform1f(intro,introValue); gl.uniform1f(gather,st.gather); gl.uniform1f(scatter,st.scatter);
      gl.uniform1f(rain,st.rain); gl.uniform1f(heart,st.heart); gl.uniform1f(cluster,st.cluster); gl.uniform1f(grow,st.grow);
      // Only streak during the rain beat (before the heart condenses).
      const raining = st.rain < 0.999 && st.heart < 0.02;
      const passes = raining ? STREAKS : 1;
      for (let i=0;i<passes;i++) {
        gl.uniform1f(streak, raining ? i/(STREAKS-1) : 0);
        gl.drawArrays(gl.POINTS,0,cloud.length/STRIDE);
      }
    },
    destroy() { gl.deleteBuffer(buffer); gl.deleteProgram(program); }
  };
}

// Reduced point count with prepainted radial sprites keeps the same shape on devices without WebGL.
function makeFallback(cloud) {
  const festiveRGB=[[1,.42,.66],[1,.72,.44],[.92,.48,.86],[1,.58,.78],[.98,.80,.52]];
  const sprites = Array.from({length:21},(_,i)=>{
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=16;
    const c=canvas.getContext('2d');
    const t=i/12;
    const rgb=i>=16 ? festiveRGB[i-16].map(v=>Math.round(v*255))
      : i>=13 ? [255,153+(i-13)*37,206+(i-13)*19] : [Math.floor(118+137*t),Math.floor(26+174*t),Math.floor(82+160*t)];
    const gradient=c.createRadialGradient(8,8,0,8,8,8);
    for(const [at,alpha] of [[0,1],[.3,.74],[.65,.18],[1,0]]) gradient.addColorStop(at,'rgba('+rgb.join(',')+','+alpha+')');
    c.fillStyle=gradient;c.fillRect(0,0,16,16);
    return canvas;
  });
  const points=[];
  for (let i=0;i<cloud.length;i+=STRIDE) {
    const kind=cloud[i+9];
    if (i/STRIDE%(kind===8?2:kind===3?2:kind===2?3:kind>=4?4:7)!==0) continue;
    const festiveIndex=()=>{let best=0,d=Infinity;for(let k=0;k<5;k++){const c=festiveRGB[k],diff=(cloud[i+4]-c[0])**2+(cloud[i+5]-c[1])**2+(cloud[i+6]-c[2])**2;if(diff<d){d=diff;best=k}}return best};
    const shade=kind===8?16+festiveIndex()
      : kind===2?13+Math.floor(cloud[i+8]*.435):Math.min(12,Math.max(0,Math.round((cloud[i+4]-.26)/.74*12)));
    points.push({x:cloud[i],y:cloud[i+1],z:cloud[i+2],s:cloud[i+3],b:cloud[i+7],phase:cloud[i+8],kind,sprite:sprites[shade]});
  }
  const scatterTarget=(phase)=>{
    const a=Math.sin(phase*12.9898)*43758.5453, b=Math.sin(phase*78.233)*24634.6345, cc=Math.sin(phase*37.719)*15731.743;
    const theta=(a-Math.floor(a))*Math.PI*2, z=(b-Math.floor(b))*2-1, rad=.62+(cc-Math.floor(cc))*1.02;
    const r=Math.sqrt(Math.max(0,1-z*z));
    return {x:Math.cos(theta)*r*rad, y:z*rad};
  };
  const fract=x=>x-Math.floor(x);
  const smooth=e=>e*e*(3-2*e);
  const heartJS=(phase)=>{
    const th=fract(phase*0.15915494)*Math.PI*2;
    const hx=Math.sin(th)**3;
    const hy=(13*Math.cos(th)-5*Math.cos(2*th)-2*Math.cos(3*th)-Math.cos(4*th))/16;
    const edge=fract(Math.sin(phase*44.113)*9157.31)>=0.62?1:0;
    const interior=Math.sqrt(fract(Math.sin(phase*27.71)*5731.17));
    const f=edge?1:interior*0.92;
    return {x:hx*f,y:hy*f,rim:edge};
  };
  return (c,view,sn,cs,t,pulseValue=0,introValue=1,st)=>{
    const {gather:gatherValue=0,scatter:scatterValue=0,rain:rainValue=1,heart:heartValue=0,cluster:clusterValue=0,grow:growValue=1}=st;
    c.globalCompositeOperation='lighter';
    for(const p of points) {
      let x=p.x*cs+p.z*sn;
      const z=p.z*cs-p.x*sn;
      let y=p.y+z*.157, a=p.b*(.72+.28*Math.sin(t*.94+p.phase*2))*(0.25+0.75*introValue)*(1+pulseValue*0.9);
      y += (1-introValue)*0.22*(0.5+0.5*Math.sin(p.phase*3));
      if(p.kind===8){
        const blink=0.5+0.5*Math.sin(t*3.1+p.phase*4.0);
        a*=0.55+1.10*Math.pow(blink,2.0);
      } else if(p.kind>=4){
        const ph=(p.kind%2===0?.071:-.057)*(1+(p.kind-4)*.25)*t;
        const cc=Math.cos(ph),ss=Math.sin(ph);
        y=p.y+(z*cc-x*ss)*.157;x=x*cc+z*ss;
      } else if(p.kind===3) {
        x=p.x+.019*Math.sin(.23*t+p.phase); y=(p.y+.16+t*(.009+p.s*1.7))%1.28-.16;
      } else if(p.kind===2) {
        const beat=1+(.034+.05*pulseValue)*Math.sin(1.8*t);
        x=p.x*beat;y=-.06+(p.y+.06)*beat;
      } else if (p.kind===0) {
        x+=.0013*Math.sin(t+p.phase*4);y+=.0018*Math.cos(t*.81+p.phase*2);
        a*=.72+.28*Math.min(1,Math.max(0,.5+z/Math.max(.015,p.y*.59)));
      }
      if (gatherValue > 0.001 && p.kind !== 3) {
        const gx = Math.sin(p.phase*12.9898) * 0.028, gy = 0.45 + Math.cos(p.phase*7.233) * 0.028;
        x = x + (gx - x) * gatherValue; y = y + (gy - y) * gatherValue;
        a *= 1 + gatherValue * 0.55;
      }
      if (scatterValue > 0.001 && p.kind < 2.5) {
        const dir=scatterTarget(p.phase);
        const drift=.045*Math.sin(t*(.28+.12*dir.x)+p.phase);
        const dx=dir.x*.92, dy=.42+dir.y*.66+drift;
        x=x+(dx-x)*scatterValue; y=y+(dy-y)*scatterValue;
        a*=1+scatterValue*.35;
      }
      if (rainValue < 0.999 || heartValue > 0.001 || clusterValue > 0.001 || growValue < 0.999) {
        const h1=fract(Math.sin(p.phase*12.9898)*43758.5453);
        const h2=fract(Math.sin(p.phase*78.233)*24634.6345);
        const h3=fract(Math.sin(p.phase*45.164)*12543.123);
        const h4=fract(Math.sin(p.phase*34.771)*6217.317);
        const h5=fract(Math.sin(p.phase*57.913)*3719.541);
        const delay=h1*0.72;
        const lp=Math.min(1,Math.max(0,(rainValue-delay)/(1-delay)));
        let fall=Math.min(1,Math.max(0,lp*(0.55+h5*0.9)));
        fall=fall*fall*(3-2*fall);
        const startY=-0.58-h4*0.40;
        const cloudY=0.20+h3*0.58;
        let curtain;
        if (h4 < 0.72) {
          const k=Math.floor(h5*9.0);
          const center=-1.20+k*0.30;
          curtain=center+(h2-0.5)*0.13+(h1-0.5)*0.05;
        } else {
          curtain=(h2-0.5)*2.6;
        }
        const sway=0.05*Math.sin(t*0.8+p.phase*5.0+h4*6.2831)*(1-fall*0.5);
        let px=curtain+sway, py=startY+(cloudY-startY)*fall;
        const hp=heartJS(p.phase);
        const hx=hp.x*0.40, hy=0.42-hp.y*0.30;
        const hm=smooth(heartValue);
        px=px+(hx-px)*hm; py=py+(hy-py)*hm;
        const bh=fract(Math.sin(p.phase*91.7)*24631.7);
        const bx0=(h1-0.5)*0.045, by0=-0.055+(h2-0.5)*0.035+bh*0.012;
        const cm=smooth(clusterValue);
        px=px+(bx0-px)*cm; py=py+(by0-py)*cm;
        const g=smooth(growValue), height=p.y;
        const front=g*1.42-0.12;
        let local=Math.min(1,Math.max(0,(front-height)/0.30));
        local=smooth(local);
        const spin=p.phase+height*13.0+g*6.2831853;
        const sx=Math.cos(spin)*(1-local)*0.035*(0.4+height);
        const sy=Math.sin(spin)*(1-local)*0.035*(0.4+height);
        x=px+((x+sx)-px)*local; y=py+((y+sy)-py)*local;
        const heartShine=smooth(heartValue)*(1-smooth(clusterValue));
        a*=1+(1-g)*0.35+heartShine*(hp.rim?1.35:0.45)+Math.sin(local*Math.PI)*0.5;
      }
      const crown=p.kind===0?Math.max(0,1-p.y/.7):0;
      const r=Math.max(1.1,p.s*view.s*(1.95+crown*.90)*(1+gatherValue*0.3));
      a*=1+crown*.66;
      // Rain streaks: repeat the sprite upward with fading alpha to draw a
      // vertical light trail, matching the GPU multi-pass look.
      const raining=rainValue<0.999&&heartValue<0.02;
      if (raining) {
        const ht=fract(Math.sin(p.phase*45.164)*12543.123);
        const trailPx=(0.045+ht*0.11)*view.s;
        const SEGS=11;
        for (let s=SEGS-1;s>=0;s--) {
          const f=s/(SEGS-1);
          const sy=view.y+y*view.s-f*trailPx;
          c.globalAlpha=Math.min(.98,a*1.18*(1-f*0.94));
          c.drawImage(p.sprite,view.x+x*view.s-r,sy-r,r*2,r*2);
        }
      } else {
        c.globalAlpha=Math.min(.98,a*1.18);
        c.drawImage(p.sprite,view.x+x*view.s-r,view.y+y*view.s-r,r*2,r*2);
      }
    }
    c.globalAlpha=1; c.globalCompositeOperation='source-over';
  };
}

// A soft halo reaches beyond individual point sprites on both render paths.
function makeHeartGlow() {
  const sprite=document.createElement('canvas');
  sprite.width=sprite.height=192;
  const c=sprite.getContext('2d');
  const bloom=c.createRadialGradient(96,96,0,96,96,96);
  bloom.addColorStop(0,'rgba(255,192,223,.23)');
  bloom.addColorStop(.23,'rgba(255,143,196,.25)');
  bloom.addColorStop(.49,'rgba(247,115,179,.13)');
  bloom.addColorStop(.76,'rgba(202,84,166,.045)');
  bloom.addColorStop(1,'rgba(174,71,158,0)');
  c.fillStyle=bloom; c.fillRect(0,0,192,192);
  c.beginPath();
  for(let i=0; i<=128; i++) {
    const t=TAU*i/128;
    const x=96+Math.sin(t)**3*37;
    const y=96-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*2.11;
    if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
  }
  c.closePath(); c.shadowBlur=14;c.shadowColor='#ff88bb';
  c.lineWidth=5;c.strokeStyle='rgba(255,174,214,.44)';c.stroke();
  return sprite;
}

// A few bright meteors streak across the upper sky during the opening rain.
function drawMeteors(ctx, view, elapsed, alpha){
  if(alpha<=0.004||elapsed>3400)return;
  const t=elapsed/1000;
  const lanes=[[0.10,1.5,0.15],[0.04,1.1,0.55],[0.02,1.3,0.95]];
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<lanes.length;i++){
    const [x0,dur,delay]=lanes[i];
    const p=(t-delay)/dur;
    if(p<0||p>1.18)continue;
    const prog=Math.min(1,p), fade=Math.min(1,(1.18-p)/0.18);
    const sx=x0*view.w, sy=-view.h*0.06;
    const hx=sx+view.w*0.30*prog, hy=sy+view.h*0.30*prog;
    const tail=view.w*0.15;
    const grad=ctx.createLinearGradient(hx-tail*0.87,hy-tail*0.5,hx,hy);
    grad.addColorStop(0,'rgba(255,235,210,0)');
    grad.addColorStop(1,'rgba(255,248,232,'+(0.85*alpha*fade)+')');
    ctx.strokeStyle=grad;ctx.lineWidth=2.1;
    ctx.beginPath();ctx.moveTo(hx-tail*0.87,hy-tail*0.5);ctx.lineTo(hx,hy);ctx.stroke();
    ctx.fillStyle='rgba(255,252,240,'+(alpha*fade)+')';
    ctx.beginPath();ctx.arc(hx,hy,1.9,0,TAU);ctx.fill();
  }
  ctx.restore();
}

// A radiant four-point star that crowns the finished tree.
function drawTipStar(ctx, view, ox, alpha, t){
  if(alpha<=0.004)return;
  const cx=ox, cy=view.y+view.s*0.005;
  const pulse=0.86+0.14*Math.sin(t*2.1);
  const R=view.s*0.052*pulse;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R*3.4);
  g.addColorStop(0,'rgba(255,255,255,'+(0.8*alpha)+')');
  g.addColorStop(0.22,'rgba(255,226,246,'+(0.34*alpha)+')');
  g.addColorStop(1,'rgba(255,170,220,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R*3.4,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,'+(0.9*alpha)+')';
  ctx.lineWidth=Math.max(1,view.s*0.0021);
  ctx.beginPath();ctx.moveTo(cx-R*2.5,cy);ctx.lineTo(cx+R*2.5,cy);
  ctx.moveTo(cx,cy-R*2.5);ctx.lineTo(cx,cy+R*2.5);ctx.stroke();
  ctx.lineWidth=Math.max(0.8,view.s*0.0012);
  ctx.beginPath();ctx.moveTo(cx-R*1.15,cy-R*1.15);ctx.lineTo(cx+R*1.15,cy+R*1.15);
  ctx.moveTo(cx-R*1.15,cy+R*1.15);ctx.lineTo(cx+R*1.15,cy-R*1.15);ctx.stroke();
  ctx.restore();
}

// Script lettering under the tree, once the show has settled.
function drawMerry(ctx, view, ox, alpha){
  if(alpha<=0.004)return;
  const size=Math.max(17,view.s*0.068);
  ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='italic '+size+'px "Segoe Script","Brush Script MT","Snell Roundhand",Georgia,serif';
  ctx.shadowColor='rgba(255,168,216,.9)';ctx.shadowBlur=size*0.55;
  ctx.fillStyle='rgba(255,240,249,.97)';
  ctx.fillText('Merry Christmas',ox,view.y+view.s*1.055);
  ctx.shadowBlur=0;ctx.restore();
}

// Golden fireworks that bloom in the sky to the right of the finished tree.
function makeFireworks(){
  let bursts=[], nextAt=0, seed=77612;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  function spawn(view,ox,t){
    const count=54+Math.floor(rnd()*30);
    const cx=ox+view.s*(0.26+rnd()*0.24);
    const cy=view.y+view.s*(0.02+rnd()*0.24);
    const ring=rnd()<0.55, parts=[];
    for(let i=0;i<count;i++){
      const a=ring?(i/count)*TAU+rnd()*0.05:rnd()*TAU;
      const sp=ring?(0.9+rnd()*0.12):(0.3+rnd()*0.72);
      parts.push({a,sp,size:0.7+rnd()*1.7,tw:rnd()*TAU,delay:rnd()*0.10});
    }
    bursts.push({cx,cy,t0:t,parts,life:1.5+rnd()*0.7});
  }
  return {
    reset(){bursts=[];nextAt=0},
    draw(ctx,view,ox,t,active){
      if(!active){bursts=[];nextAt=0;return}
      if(t>nextAt){spawn(view,ox,t);nextAt=t+1.15+rnd()*1.5}
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let bi=bursts.length-1;bi>=0;bi--){
        const b=bursts[bi], age=t-b.t0;
        if(age>b.life){bursts.splice(bi,1);continue}
        const prog=age/b.life, expand=(1-Math.pow(1-prog,2))*view.s*0.17;
        for(const q of b.parts){
          const aa=age-q.delay;if(aa<0)continue;
          const d=expand*q.sp;
          const gx=b.cx+Math.cos(q.a)*d;
          const gy=b.cy+Math.sin(q.a)*d+aa*aa*view.s*0.034;
          const twinkle=0.6+0.4*Math.sin(t*12+q.tw);
          const fade=Math.max(0,1-prog)*twinkle;
          const r=q.size*(1-prog*0.45);
          ctx.globalAlpha=Math.min(1,fade*0.9);
          ctx.fillStyle='#ffd98a';ctx.beginPath();ctx.arc(gx,gy,r,0,TAU);ctx.fill();
          ctx.globalAlpha=Math.min(1,fade*0.22);
          ctx.beginPath();ctx.arc(gx,gy,r*3.2,0,TAU);ctx.fill();
        }
      }
      ctx.restore();
    }
  };
}

// A soft pool of light under the tree, painted on the foreground canvas.
function makeGroundGlow() {
  const sprite=document.createElement('canvas');
  sprite.width=256; sprite.height=96;
  const c=sprite.getContext('2d');
  c.save();
  c.translate(128,48); c.scale(1,0.375); c.translate(-128,-128);
  const glow=c.createRadialGradient(128,128,0,128,128,128);
  glow.addColorStop(0,'rgba(236,130,196,.32)');
  glow.addColorStop(.35,'rgba(198,92,178,.22)');
  glow.addColorStop(.62,'rgba(255,205,130,.10)');
  glow.addColorStop(1,'rgba(140,70,150,0)');
  c.fillStyle=glow; c.fillRect(0,0,256,256);
  c.restore();
  return sprite;
}

// Gift boxes at the foot of the tree, drawn on the foreground canvas like
// the Python turtle version: coloured parcels with a ribbon cross and bow.
const GIFTS=[
  {x:-.154,y:.008,s:1.00,body:'#7d4b8c',ribbon:'#f2d489'},
  {x:-.062,y:.030,s:.74,body:'#3f6f8c',ribbon:'#f5efe0'},
  {x: .040,y:.014,s:.88,body:'#a8534e',ribbon:'#f6d9a0'},
  {x: .142,y:.036,s:.66,body:'#4f7d63',ribbon:'#f3e6c0'},
  {x: .098,y:-.006,s:.55,body:'#8c6a3f',ribbon:'#f7e9c8'}
];
function drawGifts(c,view,sn,gather){
  const alpha=Math.max(0,1-gather*1.35);
  if(alpha<=0.02)return;
  c.save();
  c.globalAlpha=alpha;
  for(const g of GIFTS){
    const w=view.s*.072*g.s, h=w*.82;
    const x=view.x+g.x*view.s+sn*g.y*view.s*.16;
    const y=view.y+view.s*1.028-h*.5+g.y*view.s*.10;
    c.translate(x,y);
    // soft contact shadow
    c.fillStyle='rgba(3,6,14,.45)';
    c.beginPath();c.ellipse(0,h*.62,w*.72,h*.20,0,0,Math.PI*2);c.fill();
    // box body with a slightly lighter top face for depth
    c.fillStyle=g.body;
    c.fillRect(-w*.5,-h*.5,w,h);
    c.fillStyle='rgba(255,255,255,.10)';
    c.fillRect(-w*.5,-h*.5,w,h*.22);
    c.fillStyle='rgba(0,0,0,.16)';
    c.fillRect(-w*.5,h*.22,w,h*.28);
    // ribbon cross
    c.fillStyle=g.ribbon;
    c.fillRect(-w*.075,-h*.5,w*.15,h);
    c.fillRect(-w*.5,-h*.095,w,h*.19);
    // bow
    c.beginPath();
    c.ellipse(-w*.13,-h*.5-h*.11,w*.14,h*.12,-.5,0,Math.PI*2);
    c.ellipse( w*.13,-h*.5-h*.11,w*.14,h*.12, .5,0,Math.PI*2);
    c.fill();
    c.beginPath();c.arc(0,-h*.5-h*.10,w*.055,0,Math.PI*2);c.fill();
    c.setTransform(view.dpr,0,0,view.dpr,0,0);
  }
  c.restore();
}

const PHOTO_HEIGHTS=[.43,.69,.33,.81,.57,.24,.74,.89];
const PHOTO_ANGLES=[1.22,2.23,4.68,.58,3.54,1.82,5.77,2.91];

export function createTree(canvas,{onSelect}={}) {
  const ctx=canvas.getContext('2d');
  const stage=document.createElement('canvas');
  stage.setAttribute('aria-hidden','true');
  stage.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  const cloud=makeCloud(), heartGlow=makeHeartGlow(), groundGlow=makeGroundGlow();
  const fireworks=makeFireworks();
  let gpu=null, fallback=null;
  function useGPU() {
    try { gpu=createGPU(stage,cloud); } catch { gpu=null; }
    if(!gpu && !fallback) fallback=makeFallback(cloud);
    stage.style.visibility=gpu?'visible':'hidden';
  }
  useGPU(); canvas.before(stage); canvas.style.position='relative';
  function onContextLost(event) { event.preventDefault(); gpu=null; if(!fallback) fallback=makeFallback(cloud);stage.style.visibility='hidden'; }
  stage.addEventListener('webglcontextlost',onContextLost); stage.addEventListener('webglcontextrestored',useGPU);

  let view={w:0,h:0,x:0,y:0,s:0,dpr:1}, photos=[], hits=[], angle=0, target=0;
  let drag=null, frame=0, last=0, animationTime=0, stopped=false, pauseOrbitUntil=0;
  let pulseValue=0, startedAt=0, parallax=0, parallaxTarget=0;
  let gatherValue=0, gatherTarget=0;
  let scatterValue=0, scatterTarget=0, scatterDirs=[];
  // Four-beat entrance show, driven by an absolute start time so it survives
  // frame-rate changes. Each value is 0..1. Settled state (no show, and after
  // the show) is rain=1, heart=0, cluster=0, grow=1: a plain finished tree.
  let entranceStart=null, rainValue=1, heartValue=0, clusterValue=0, growValue=1, ornamentFade=1;
  // Timeline mirrors the reference video: a falling curtain, a heart that
  // lingers, a collapse to the tip, then a top-down bloom into the tree.
  // Optional ?slow=4 query parameter stretches the whole show for inspection.
  const slowFactor=(()=>{try{const v=parseFloat(new URLSearchParams(location.search).get('slow'));return v>=1&&v<=20?v:1}catch{return 1}})();
  const RAIN_MS=5000*slowFactor, HEART_IN_MS=1800*slowFactor, HEART_HOLD_MS=1600*slowFactor, CLUSTER_MS=900*slowFactor, GROW_MS=4500*slowFactor;
  const ENTRANCE_MS=RAIN_MS+HEART_IN_MS+HEART_HOLD_MS+CLUSTER_MS+GROW_MS;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  function resize() {
    const {width:w,height:h}=canvas.getBoundingClientRect();
    if (!w||!h) return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const s=Math.min(h*.74,w*.94);
    view={w,h,dpr,s,x:w*.5,y:(h-s*1.34)*.5+s*.21};
    stage.width=canvas.width=Math.max(1,Math.round(w*dpr));
    stage.height=canvas.height=Math.max(1,Math.round(h*dpr));
  }
  function setPhotos(list) {
    const loaded=new Map(photos.map(p=>[p.src,p.img]));
    photos=list.map((p,i)=>{
      let img=loaded.get(p.src);
      if (!img) {img=new Image();img.src=p.src;}
      const h=PHOTO_HEIGHTS[i%8]+.024*Math.sin(Math.floor(i/8)*2.39);
      const r=radiusAt(h)*1.11, a=PHOTO_ANGLES[i%8]+Math.floor(i/8)*2.39996;
      return {index:i,src:p.src,img,x:r*Math.cos(a),y:h,z:r*Math.sin(a),r,tilt:Math.sin(i*1.8+.55)*.083};
    });
  }

  function drawPhotos(sn,cs,originX,gatherValue=0,scatterValue=0) {
    hits=[];
    // Each photo gets a stable scatter direction derived from its index.
    if (scatterDirs.length!==photos.length) {
      scatterDirs=photos.map((_,i)=>{
        const a=Math.sin((i+1)*12.9898)*43758.5453, b=Math.sin((i+1)*78.233)*24634.6345;
        return {x:(a-Math.floor(a))*2-1, y:(b-Math.floor(b))*2-1};
      });
    }
    const list=photos.map(p=>({p,z:p.z*cs-p.x*sn})).sort((a,b)=>a.z-b.z);
    for(const {p,z} of list) {
      if (!p.img.naturalWidth || z < -p.r*.11) continue;
      const alpha=Math.min(1,Math.max(0,(z/p.r+.11)*3.1))*(1-gatherValue*0.92);
      if (alpha <= 0.02) continue;
      let x=originX+(p.x*cs+p.z*sn)*view.s,y=view.y+(p.y+z*.157)*view.s;
      // While gathered, the photos shrink toward the ball and fade out
      // instead of floating where the tree used to be.
      x=originX+(x-originX)*(1-gatherValue*0.7);
      y=view.y+view.s*0.45+(y-(view.y+view.s*0.45))*(1-gatherValue*0.7);
      let w=view.s*(.077+.044*z)*(1-gatherValue*0.55), h=w*1.09;
      let tilt=p.tilt, twinkle=1;
      // Scatter: photos drift out into the starfield like floating starlight.
      if (scatterValue>0.001) {
        const d=scatterDirs[p.index]||{x:0,y:0};
        const dx=originX+d.x*view.s*.72, dy=view.y+view.s*.40+d.y*view.s*.60;
        x+=(dx-x)*scatterValue; y+=(dy-y)*scatterValue;
        tilt+=scatterValue*.34*Math.sin(animationTime*.6+p.index);
        w*=1-scatterValue*.16; h=w*1.09;
        twinkle=.78+.22*Math.sin(animationTime*1.7+p.index*1.3);
      }
      const iw=w*.88, ih=h*.79, crop=Math.max(iw/p.img.naturalWidth,ih/p.img.naturalHeight);
      const sw=iw/crop, sh=ih/crop;
      ctx.save();ctx.globalAlpha=alpha*twinkle;ctx.translate(x,y);ctx.rotate(tilt);
      ctx.shadowColor='rgba(160,195,255,.4)';ctx.shadowBlur=Math.max(2,view.s*.018);
      ctx.lineWidth=Math.max(.6,view.s*.001);ctx.strokeStyle='#b7d3fa';
      ctx.beginPath();ctx.moveTo(-w*.37,-h*.47);ctx.lineTo(0,-h*.64);ctx.lineTo(w*.37,-h*.47);ctx.stroke();
      ctx.fillStyle='#bac5d3';ctx.fillRect(-w*.5,-h*.5,w,h);
      ctx.fillStyle='#f0f2f5';ctx.fillRect(-w*.476,-h*.478,w*.952,h*.956);
      ctx.shadowBlur=0;
      ctx.drawImage(p.img,(p.img.naturalWidth-sw)/2,(p.img.naturalHeight-sh)/2,sw,sh,-iw*.5,-h*.425,iw,ih);
      ctx.restore();
      if (alpha>.36 && gatherValue<0.5 && scatterValue<0.35) hits.push({index:p.index,x,y,w,h});
    }
  }
  function draw(now) {
    if(stopped) return;
    frame=requestAnimationFrame(draw);
    if(document.hidden || !view.s) return;
    const dt=Math.min(.08,(now-last)/1000);
    if(!gpu && now-last < 32) return;
    last=now;
    if(!reducedMotion?.matches) {
      animationTime+=dt;
      if(!drag && now>pauseOrbitUntil) target+=dt*.062;
    }
    if (!startedAt) startedAt = now;
    const intro = reducedMotion?.matches ? 1 : Math.min(1, (now - startedAt) / 1400);
    const easedIntro = 1 - Math.pow(1 - intro, 3);
    pulseValue *= Math.exp(-2.6 * dt);
    // Entrance timeline: falling curtain -> heart -> bud -> top-down bloom.
    // Ornaments fade in only once the tree has essentially formed. Reduced
    // motion skips straight to the settled tree.
    if (entranceStart !== null) {
      const e = now - entranceStart;
      if (reducedMotion?.matches || e >= ENTRANCE_MS) {
        rainValue = 1; heartValue = 0; clusterValue = 0; growValue = 1; ornamentFade = 1; entranceStart = null;
      } else {
        const tHeart = RAIN_MS, tCluster = tHeart + HEART_IN_MS + HEART_HOLD_MS, tGrow = tCluster + CLUSTER_MS;
        rainValue = Math.min(1, e / RAIN_MS);
        heartValue = e < tHeart ? 0 : e < tHeart + HEART_IN_MS ? (e - tHeart) / HEART_IN_MS : 1;
        clusterValue = e < tCluster ? 0 : e < tGrow ? (e - tCluster) / CLUSTER_MS : 1;
        growValue = e < tGrow ? 0 : Math.min(1, (e - tGrow) / GROW_MS);
        const form = (e - tGrow) / GROW_MS;
        ornamentFade = form <= 0.35 ? 0 : Math.min(1, (form - 0.35) / 0.5);
        if (e > tHeart && e < tGrow && pulseValue < 0.12) pulseValue = 0.12;
      }
    }
    // Gathering is deliberately slow (about 2-3 s to a full ball) so a
    // brief fist that only closes a photo does not collapse the tree;
    // expanding back is quicker. Reduced motion snaps instead of easing.
    if (reducedMotion?.matches) gatherValue = gatherTarget;
    else {
      const rate = gatherTarget > gatherValue ? 0.85 : 2.2;
      gatherValue += (gatherTarget - gatherValue) * (1 - Math.exp(-rate * dt));
      if (Math.abs(gatherTarget - gatherValue) < 0.002) gatherValue = gatherTarget;
    }
    // Scatter eases slowly outward like drifting starlight; reforming is a
    // little quicker. Gather and scatter are mutually exclusive by design.
    if (reducedMotion?.matches) scatterValue = scatterTarget;
    else {
      const rate = scatterTarget > scatterValue ? 0.9 : 1.8;
      scatterValue += (scatterTarget - scatterValue) * (1 - Math.exp(-rate * dt));
      if (Math.abs(scatterTarget - scatterValue) < 0.002) scatterValue = scatterTarget;
    }
    parallax += (parallaxTarget - parallax) * (1 - Math.exp(-6 * dt));
    const originX = view.x + parallax;
    angle+=(target-angle)*(1-Math.exp(-14*dt));
    const sn=Math.sin(angle),cs=Math.cos(angle);
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
    ctx.clearRect(0,0,view.w,view.h);
    const shiftedView = {...view, x: originX};
    const entrance={gather:gatherValue,scatter:scatterValue,rain:rainValue,heart:heartValue,cluster:clusterValue,grow:growValue};
    if(gpu) gpu.draw(shiftedView,sn,cs,animationTime,pulseValue,easedIntro,entrance);
    else fallback(ctx,shiftedView,sn,cs,animationTime,pulseValue,easedIntro,entrance);
    // The pink heart halo belongs to the heart beat; the ground glow belongs
    // to the finished tree. Cross-fade them so neither floats at the wrong time.
    const heartPhase=Math.max(0,Math.min(1,heartValue*(1-clusterValue)))*(1-scatterValue*.85);
    if(heartPhase>0.004){
      const glowSize=view.s*(.66+.02*Math.sin(animationTime*2.2))*(1+pulseValue*.2);
      ctx.globalAlpha=heartPhase;
      ctx.drawImage(heartGlow,originX-glowSize*.5,view.y+view.s*.42-glowSize*.5,glowSize,glowSize);
    }
    const groundW=view.s*1.06, groundH=view.s*.20;
    ctx.globalAlpha=(1-scatterValue*.85)*ornamentFade;
    ctx.drawImage(groundGlow,originX-groundW*.5,view.y+view.s*1.01-groundH*.5,groundW,groundH);
    ctx.globalAlpha=1;
    drawGifts(ctx,{...view,x:originX},sn,Math.max(gatherValue,scatterValue,1-ornamentFade));
    drawPhotos(sn,cs,originX,Math.max(gatherValue,1-ornamentFade),scatterValue);
    // Foreground flourishes from the reference video.
    const elapsed=entranceStart!==null?(now-entranceStart):Infinity;
    if(!reducedMotion?.matches) drawMeteors(ctx,view,elapsed,(1-scatterValue)*(1-gatherValue));
    const settled=ornamentFade;
    drawTipStar(ctx,view,originX,settled*(1-scatterValue*.6),animationTime);
    drawMerry(ctx,view,originX,settled*(1-scatterValue*.85));
    if(!reducedMotion?.matches){
      fireworks.draw(ctx,view,originX,animationTime,settled>0.9&&scatterValue<0.25&&gatherValue<0.25);
    }
  }

  function pulse(strength=1) { pulseValue = Math.max(pulseValue, Math.min(1, strength)); }

  // Start the four-beat entrance show: falling curtain -> heart -> bud at the
  // tip -> top-down bloom into the tree. Any prior gather/scatter state is
  // cleared so the show runs from a clean tree shape.
  function playRainEntrance() {
    if (!startedAt) startedAt = performance.now();
    gatherTarget = 0; scatterTarget = 0;
    gatherValue = 0; scatterValue = 0;
    rainValue = 0; heartValue = 0; clusterValue = 0; growValue = 0; ornamentFade = 0;
    fireworks.reset();
    entranceStart = performance.now();
  }

  function setGather(on) { gatherTarget = on ? 1 : 0; if (on) scatterTarget = 0; }

  function setScatter(on) { scatterTarget = on ? 1 : 0; if (on) gatherTarget = 0; }

  function rotate(delta) {
    if(!Number.isFinite(delta)) return;
    target+=delta; pauseOrbitUntil=performance.now()+2000;
  }
  function hit(x,y) {
    for(let i=hits.length-1;i>=0;i--) {
      const b=hits[i]; if(Math.abs(b.x-x)<b.w*.56+3 && Math.abs(b.y-y)<b.h*.56+3) return b;
    }
  }
  // A press counts as a tap only if the pointer stays within a small radius
  // of where it went down; anything further is a drag that rotates the tree.
  // The release-time distance decides, so a press that wobbles a little and
  // returns still opens the photo instead of being swallowed as a drag, and
  // no rotation is applied until the drag threshold is actually crossed.
  const CLICK_TOLERANCE=6;
  function down(e) {
    if(drag || e.button!==0) return;
    canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,dragging:false};
  }
  function move(e) {
    const bounds=canvas.getBoundingClientRect();
    if(!drag) {
      canvas.style.cursor=hit(e.clientX-bounds.left,e.clientY-bounds.top)?'pointer':'grab';
      // Gentle parallax: the tree leans a few pixels toward the pointer.
      parallaxTarget = reducedMotion?.matches ? 0 : (e.clientX - bounds.left) / Math.max(1, bounds.width) * 22 - 11;
      return;
    }
    if(e.pointerId!==drag.id) return;
    if(!drag.dragging) {
      if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>CLICK_TOLERANCE){drag.dragging=true;drag.lastX=e.clientX;canvas.style.cursor='grabbing';}
      return;
    }
    rotate((e.clientX-drag.lastX)*3.3/Math.max(160,view.s));
    drag.lastX=e.clientX;
  }
  function up(e) {
    if(!drag || e.pointerId!==drag.id) return;
    if(e.type==='pointerup' && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<=CLICK_TOLERANCE) {
      const bounds=canvas.getBoundingClientRect(), photo=hit(e.clientX-bounds.left,e.clientY-bounds.top);
      if(photo) onSelect?.(photo.index, {x: bounds.left + photo.x, y: bounds.top + photo.y});
    }
    drag=null;canvas.style.cursor='grab';
  }
  canvas.style.cursor='grab';canvas.style.touchAction='pan-y';
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();frame=requestAnimationFrame(draw);
  return {setPhotos,rotate,pulse,setGather,setScatter,playRainEntrance,destroy() {
    stopped=true;cancelAnimationFrame(frame);observer.disconnect();gpu?.destroy();stage.remove();
    canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
    canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);
    stage.removeEventListener('webglcontextlost',onContextLost);stage.removeEventListener('webglcontextrestored',useGPU);
  }};
}
