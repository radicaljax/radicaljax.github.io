// Hero object: a liquid-metal form drawn with raw WebGL. No library.
// It only draws while the hero is on screen, and holds one still frame when motion is off.
(function () {
  'use strict';
  var canvas = document.getElementById('gl');
  var hero = document.getElementById('top');
  var root = document.documentElement;
  if (!canvas || !hero) return;

  var gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  } catch (e) { gl = null; }
  if (!gl) { root.classList.add('no-gl'); return; }
  var deriv = gl.getExtension('OES_standard_derivatives');

  var NOISE = [
    'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}',
    'float snoise(vec3 v){',
    ' const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);',
    ' vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);',
    ' vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);',
    ' vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;',
    ' i=mod289(i);',
    ' vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    ' float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;',
    ' vec4 j=p-49.*floor(p*ns.z*ns.z);',
    ' vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);',
    ' vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);',
    ' vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
    ' vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));',
    ' vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    ' vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    ' vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    ' p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    ' vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;',
    ' return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}'
  ].join('\n');

  var COMMON = [
    'uniform float uT,uAspect,uScale;uniform vec2 uRot,uOff;',
    'mat3 rY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}',
    'mat3 rX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}',
    'vec4 proj(vec3 vp){float f=2.904;float n=.1,fr=20.;',
    ' vec4 c=vec4(vp.x*f/uAspect,vp.y*f,(vp.z*(fr+n)+2.*fr*n)/(n-fr),-vp.z);c.xy+=uOff*c.w;return c;}'
  ].join('\n');

  var VS = [
    'precision highp float;',
    'attribute vec3 p;uniform float uEnergy;',
    'varying vec3 vN,vV;varying float vD;',
    COMMON, NOISE,
    'float disp(vec3 q){float t=uT*.16;',
    ' float n=snoise(q*.95+vec3(0.,t,t*.7));',
    ' n+=.26*snoise(q*2.1-vec3(t*1.3,0.,t));',
    ' return n*(.2+uEnergy*.16);}',
    'vec3 warp(vec3 q){return q*(1.+disp(q));}',
    'void main(){',
    ' vec3 n0=normalize(p);float d=disp(n0);vec3 pos=n0*(1.+d);',
    ' vec3 up=abs(n0.y)>.99?vec3(1.,0.,0.):vec3(0.,1.,0.);',
    ' vec3 tg=normalize(cross(up,n0));vec3 bt=cross(n0,tg);',
    ' vec3 p1=warp(normalize(n0+tg*.035));vec3 p2=warp(normalize(n0+bt*.035));',
    ' vec3 nrm=normalize(cross(p1-pos,p2-pos));',
    ' mat3 R=rX(uRot.x)*rY(uRot.y);',
    ' vec3 wp=R*pos*uScale;vN=R*nrm;',
    ' vec3 vp=wp+vec3(0.,0.,-4.2);vV=-vp;vD=d;',
    ' gl_Position=proj(vp);',
    '}'
  ].join('\n');

  var FS = [
    deriv ? '#extension GL_OES_standard_derivatives : enable' : '',
    'precision highp float;',
    'varying vec3 vN,vV;varying float vD;',
    'uniform vec3 uAcc,uGlow;uniform float uT,uLight;',
    'vec3 pal(float t){return .5+.5*cos(6.28318*(t+vec3(0.,.33,.67)));}',
    'void main(){',
    ' vec3 N=normalize(vN),V=normalize(vV);',
    ' float ndv=max(dot(N,V),0.);float fr=pow(1.-ndv,2.4);',
    ' vec3 R=reflect(-V,N);',
    // studio lighting: one big softbox above, one coloured panel at the side, one thin strip light
    ' float box=smoothstep(.55,.82,R.y)*smoothstep(-.9,.3,R.x);',
    ' float side=smoothstep(.45,.95,-R.x)*smoothstep(-.5,.5,R.y);',
    ' float strip=smoothstep(.05,0.,abs(R.y+.28+.12*sin(R.x*3.+uT*.25)));',
    ' float under=smoothstep(.55,1.,-R.y);',
    ' float bands=pow(.5+.5*sin(R.y*9.+R.x*2.+vD*3.),8.);',
    ' vec3 base=mix(vec3(.012,.014,.022),vec3(.56,.59,.67),uLight);',
    ' vec3 col=base;',
    ' col+=pal(fr*1.1+N.y*.22+vD*1.4+uT*.02)*fr*mix(.85,.35,uLight);',
    ' col+=vec3(1.)*box*mix(.9,.5,uLight);',
    ' col+=uGlow*side*mix(.8,.35,uLight);',
    ' col+=vec3(1.)*strip*.3;',
    ' col+=uAcc*under*mix(.16,.0,uLight);',
    ' col+=mix(vec3(.55,.6,.75),vec3(1.),.4)*bands*mix(.22,.12,uLight);',
    ' col=mix(col,uAcc*mix(1.,.55,uLight),pow(fr,2.6)*mix(.8,.6,uLight));',
    deriv
      ? ' float g=vD*11.;float w=fwidth(g);float topo=1.-smoothstep(0.,w*1.4,abs(fract(g)-.5));'
      : ' float topo=0.;',
    ' col+=uAcc*topo*.3*(1.-fr)*(1.-uLight*.7);',
    ' col=col/(1.+col*.28);',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  var PVS = [
    'precision highp float;',
    'attribute vec4 a;uniform float uPx;varying float vA;',
    COMMON,
    'void main(){',
    ' vec3 q=rX(uRot.x*.5)*rY(uT*.04+uRot.y*.5)*a.xyz;',
    ' q.y+=sin(uT*.35+a.x*5.)*.05;q*=uScale;',
    ' vec3 vp=q+vec3(0.,0.,-4.2);',
    ' gl_Position=proj(vp);gl_PointSize=a.w*uPx/(-vp.z);',
    ' vA=smoothstep(-7.,-2.6,vp.z);',
    '}'
  ].join('\n');
  var PFS = [
    'precision highp float;varying float vA;uniform vec3 uCol;uniform float uAlpha;',
    'void main(){float d=length(gl_PointCoord-.5);float al=smoothstep(.5,.08,d)*vA*uAlpha;gl_FragColor=vec4(uCol*al,al);}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function prog(vs, fs) {
    var a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs); if (!a || !b) return null;
    var p = gl.createProgram(); gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; }
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var inf = gl.getActiveUniform(p, i); u[inf.name] = gl.getUniformLocation(p, inf.name); }
    return { p: p, u: u };
  }
  var P1 = prog(VS, FS), P2 = prog(PVS, PFS);
  if (!P1 || !P2) { root.classList.add('no-gl'); return; }

  // geometry: a subdivided icosahedron
  function icosphere(n) {
    var t = (1 + Math.sqrt(5)) / 2;
    var v = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
    var f = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
    function norm(i) { var l = Math.hypot(v[i], v[i + 1], v[i + 2]); v[i] /= l; v[i + 1] /= l; v[i + 2] /= l; }
    for (var i = 0; i < v.length; i += 3) norm(i);
    for (var s = 0; s < n; s++) {
      var cache = {}, nf = [];
      var mid = function (a, b) {
        var k = a < b ? a * 100000 + b : b * 100000 + a; if (cache[k] !== undefined) return cache[k];
        var id = v.length / 3; v.push((v[a * 3] + v[b * 3]) / 2, (v[a * 3 + 1] + v[b * 3 + 1]) / 2, (v[a * 3 + 2] + v[b * 3 + 2]) / 2); norm(id * 3);
        return (cache[k] = id);
      };
      for (var j = 0; j < f.length; j += 3) {
        var a = f[j], b = f[j + 1], c = f[j + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
        nf.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
      }
      f = nf;
    }
    return { v: new Float32Array(v), f: new Uint16Array(f) };
  }
  var small = Math.min(window.innerWidth, window.innerHeight) < 700;
  var geo = icosphere(small ? 5 : 6);
  var vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, geo.v, gl.STATIC_DRAW);
  var ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.f, gl.STATIC_DRAW);

  var NP = small ? 240 : 420, pts = new Float32Array(NP * 4);
  for (var i = 0; i < NP; i++) {
    var u = Math.random() * 2 - 1, th = Math.random() * 6.2832, r = 1.55 + Math.pow(Math.random(), 1.6) * 1.9, q = Math.sqrt(1 - u * u);
    pts[i * 4] = r * q * Math.cos(th); pts[i * 4 + 1] = r * u * .75; pts[i * 4 + 2] = r * q * Math.sin(th); pts[i * 4 + 3] = .007 + Math.random() * .02;
  }
  var pbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pbo); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
  var aP = gl.getAttribLocation(P1.p, 'p'), aA = gl.getAttribLocation(P2.p, 'a');

  // state
  var W = 0, H = 0, dpr = 1, aspect = 1, baseScale = 1, offX = 0, offY = 0;
  var acc = [0.78, 1, 0.18], glow = [0.29, 0.23, 1], accInk = [0.78, 1, 0.18], light = 0;
  var rotX = 0.25, rotY = 0, tX = 0.25, tY = 0, energy = 0, eS = 0, lastPX = null, lastPY = null;
  var visible = true, running = false, t0 = performance.now(), scrollP = 0;

  function hex(v, fb) {
    v = (v || '').trim(); if (v[0] !== '#') return fb;
    if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    var n = parseInt(v.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function readTheme() {
    var cs = getComputedStyle(root);
    acc = hex(cs.getPropertyValue('--acc'), acc); glow = hex(cs.getPropertyValue('--glow'), glow); accInk = hex(cs.getPropertyValue('--acc-ink'), accInk);
    light = root.dataset.theme === 'light' ? 1 : 0;
  }
  function resize() {
    var r = hero.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    aspect = W / H; gl.viewport(0, 0, canvas.width, canvas.height);
    if (W > 900) { offX = 0.45; offY = 0.02; baseScale = Math.min(0.94, aspect * 0.62); }
    else { offX = 0; offY = -0.6; baseScale = Math.min(0.66, aspect * 0.98); }
  }
  function draw(now) {
    var t = (now - t0) / 1000;
    if (root.classList.contains('rm')) t = 12;
    rotX += (tX - rotX) * 0.05; rotY += (tY - rotY) * 0.05; energy *= 0.95; eS += (energy - eS) * 0.08;
    var sc = baseScale * (1 - scrollP * 0.12), oy = offY - scrollP * 0.35;

    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(true);
    gl.useProgram(P1.p);
    gl.uniform1f(P1.u.uT, t); gl.uniform1f(P1.u.uAspect, aspect); gl.uniform1f(P1.u.uScale, sc); gl.uniform1f(P1.u.uEnergy, eS);
    gl.uniform2f(P1.u.uRot, rotX, rotY + t * 0.1); gl.uniform2f(P1.u.uOff, offX, oy);
    gl.uniform3fv(P1.u.uAcc, acc); gl.uniform3fv(P1.u.uGlow, glow); gl.uniform1f(P1.u.uLight, light);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.drawElements(gl.TRIANGLES, geo.f.length, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.BLEND); gl.depthMask(false);
    if (light) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(P2.p);
    gl.uniform1f(P2.u.uT, t); gl.uniform1f(P2.u.uAspect, aspect); gl.uniform1f(P2.u.uScale, sc); gl.uniform1f(P2.u.uPx, canvas.height);
    gl.uniform2f(P2.u.uRot, rotX, rotY); gl.uniform2f(P2.u.uOff, offX, oy);
    gl.uniform3fv(P2.u.uCol, light ? accInk : acc); gl.uniform1f(P2.u.uAlpha, light ? 0.6 : 0.65);
    gl.bindBuffer(gl.ARRAY_BUFFER, pbo); gl.enableVertexAttribArray(aA); gl.vertexAttribPointer(aA, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, NP);
  }
  function loop(now) {
    if (!visible || document.hidden || root.classList.contains('rm')) { running = false; return; }
    draw(now); requestAnimationFrame(loop);
  }
  function kick() {
    if (root.classList.contains('rm')) { requestAnimationFrame(draw); return; }
    if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(loop); }
  }

  window.addEventListener('pointermove', function (e) {
    tY = (e.clientX / window.innerWidth - 0.5) * 1.1; tX = 0.25 + (e.clientY / window.innerHeight - 0.5) * 0.7;
    if (lastPX !== null) energy = Math.min(1, energy + Math.hypot(e.clientX - lastPX, e.clientY - lastPY) * 0.0022);
    lastPX = e.clientX; lastPY = e.clientY;
  }, { passive: true });
  window.addEventListener('scroll', function () { scrollP = Math.min(1, Math.max(0, window.scrollY / H)); }, { passive: true });
  window.addEventListener('resize', function () { resize(); kick(); });
  window.addEventListener('rj:theme', function () { readTheme(); kick(); });
  window.addEventListener('rj:motion', kick);
  document.addEventListener('visibilitychange', kick);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(hero);
  }
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); visible = false; });

  readTheme(); resize(); kick();
  root.classList.add('gl-on');
})();
