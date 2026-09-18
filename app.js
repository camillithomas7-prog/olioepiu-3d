/* OLIO E PIÙ · Greenwich Village — interazioni */
(function () {
  "use strict";
  var MQ = matchMedia("(max-width:900px)"), MOB = MQ.matches;
  MQ.addEventListener ? MQ.addEventListener("change", function () { location.reload(); }) : MQ.addListener(function () { location.reload(); });
  var RED = matchMedia("(prefers-reduced-motion:reduce)").matches;
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger);
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function win(p, a, b, f) { f = f || 0.04; return clamp((p - a) / f, 0, 1) * (1 - clamp((p - (b - f)) / f, 0, 1)); }
  if (window.gsap && !RED) gsap.set(".h1 .l>span", { yPercent: 110 });

  /* ============ SMOOTH SCROLL ============ */
  var lenis = null;
  if (window.Lenis && !RED && !MOB) {
    lenis = new Lenis({ duration: 1.0, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    if (HAS_GSAP) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    lenis.stop();
  }
  $$("[data-go]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href"); if (!id || id.charAt(0) !== "#") return;
      var el = $(id); if (!el) return; e.preventDefault();
      var y = id === "#hero" ? 0 : el.getBoundingClientRect().top + scrollY - (id === "#room" || id === "#firma" ? 0 : 20);
      if (lenis) lenis.scrollTo(y, { duration: 1.8 }); else scrollTo({ top: y, behavior: "smooth" });
    });
  });

  /* ============ SEQUENZE DI FOTOGRAMMI (canvas) ============ */
  function Seq(canvas, cfg) {
    var me = this, ctx = canvas.getContext("2d"), N = cfg.n, frames = new Array(N), want = 0, key = "";
    me.loaded = 0; me.N = N;
    function pad(i) { return ("00" + (i + 1)).slice(-3); }
    function nearest(i) { for (var d = 0; d < N; d++) { var a = frames[(i - d + N) % N], b = frames[(i + d) % N]; if (a && a.ok) return a; if (b && b.ok) return b; } return null; }
    me.size = function () { var dpr = Math.min(devicePixelRatio || 1, MOB ? 1.5 : 1.6), r = canvas.getBoundingClientRect(); canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); key = ""; me.draw(want); };
    me.draw = function (i) {
      want = ((Math.round(i) % N) + N) % N; var img = nearest(want); if (!img) return;
      var k = img.idx + "|" + canvas.width + "|" + (me.zoom || 1).toFixed(3); if (k === key) return; key = k;
      var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
      var s = cfg.fit(cw, ch, iw, ih) * (me.zoom || 1), w = iw * s, h = ih * s, ox = (cw - w) / 2, oy = (ch - h) / 2;
      ctx.clearRect(0, 0, cw, ch); ctx.drawImage(img, ox, oy, w, h);
      if (cfg.mask) { var R = Math.min(w, h) / 2, gr = ctx.createRadialGradient(cw / 2, ch / 2, R * 0.72, cw / 2, ch / 2, R * 0.99); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalCompositeOperation = "destination-in"; ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = "source-over"; }
    };
    function load(i, cb) {
      if (frames[i]) { cb && cb(); return; }
      var im = new Image(); im.decoding = "async"; im.idx = i; frames[i] = im;
      im.onload = function () { im.ok = true; me.loaded++; if (Math.abs(i - want) < 6) { key = ""; me.draw(want); } cb && cb(); };
      im.onerror = function () { cb && cb(); }; im.src = cfg.dir + "f" + pad(i) + ".webp";
    }
    var order = []; [8, 4, 2, 1].forEach(function (st) { for (var i = 0; i < N; i += st) if (order.indexOf(i) < 0) order.push(i); });
    me.first = Math.ceil(N / 8);
    me.pump = function (n) { var active = 0, pos = 0; (function next() { while (active < n && pos < order.length) { active++; load(order[pos++], function () { active--; next(); }); } })(); };
    me.size(); addEventListener("resize", me.size);
  }
  var H = window.HERO || { n: 0 }, P = window.PLATE || { n: 0 };
  var hero = new Seq($("#seq"), { n: MOB ? H.nm : H.n, dir: MOB ? H.m : H.d, fit: function (cw, ch, iw, ih) { return Math.max(cw / iw, ch / ih); } });
  var plate = new Seq($("#plate"), { n: P.n, dir: P.d, mask: true, fit: function (cw, ch, iw, ih) { return MOB ? Math.min(cw / iw * 1.25, ch / ih * 0.8) : ch / ih * 0.9; } });
  hero.pump(MOB ? 4 : 6);

  /* ============ PRELOADER ============ */
  var preBar = $("#preBar"), shown = 0, t0 = performance.now(), revealed = false;
  (function tick() {
    if (revealed) return;
    var goal = Math.min(hero.N ? clamp(hero.loaded / hero.first, 0, 1) : 1, clamp((performance.now() - t0) / 1600, 0, 1));
    shown += (goal - shown) * 0.1; if (goal >= 1 && shown > 0.99) shown = 1;
    preBar.style.transform = "scaleX(" + shown + ")";
    if (shown >= 1 || performance.now() - t0 > 6000) return reveal();
    requestAnimationFrame(tick);
  })();
  function reveal() {
    revealed = true;
    setTimeout(function () {
      $("#pre").classList.add("out"); document.body.classList.remove("loading"); if (lenis) lenis.start();
      setTimeout(function () { plate.pump(4); }, 1500);
      if (HAS_GSAP && !RED) {
        gsap.fromTo("#seq", { scale: 1.12 }, { scale: 1, duration: 2.4, ease: "expo.out" });
        gsap.fromTo(".h1 .l>span", { yPercent: 110 }, { yPercent: 0, duration: 1.5, ease: "expo.out", stagger: 0.13, delay: 0.35 });
        gsap.to(".h-in", { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.1, delay: 0.6 });
      } else { $$(".h-in").forEach(function (e) { e.style.opacity = 1; e.style.transform = "none"; }); }
      setTimeout(function () { $("#pre").style.display = "none"; if (HAS_GSAP) ScrollTrigger.refresh(); }, 1300);
    }, 200);
  }

  /* ============ HERO: la camminata dentro il ristorante ============ */
  var chaps = [$("#ch0"), $("#ch1"), $("#ch2"), $("#ch3")], dots = $$("#hprog span"), hmeta = $("#hmeta"), hscroll = $("#hscroll");
  function heroScroll(p) {
    hero.draw(p * (hero.N - 1));
    var o0 = 1 - clamp((p - 0.03) / 0.09, 0, 1);
    chaps[0].style.opacity = o0; chaps[0].style.transform = "translateY(" + ((1 - o0) * -40) + "px)"; chaps[0].style.pointerEvents = o0 < 0.5 ? "none" : "";
    [[0.16, 0.44], [0.5, 0.78]].forEach(function (r, i) { var o = win(p, r[0], r[1], 0.06), c = chaps[i + 1]; c.style.opacity = o; c.style.transform = "translateY(" + ((1 - o) * 40) + "px)"; });
    var o3 = clamp((p - 0.86) / 0.08, 0, 1); chaps[3].style.opacity = o3; chaps[3].style.transform = "translate(-50%,-50%) scale(" + (0.92 + o3 * 0.08) + ")";
    hmeta.style.opacity = o0; hscroll.style.opacity = 1 - clamp(p / 0.03, 0, 1);
    var st = p < 0.14 ? 0 : p < 0.48 ? 1 : p < 0.84 ? 2 : 3; dots.forEach(function (d, i) { d.classList.toggle("on", i === st); });
  }
  heroScroll(0);
  if (HAS_GSAP) ScrollTrigger.create({ trigger: "#hero", start: "top top", end: "bottom bottom", scrub: true, onUpdate: function (s) { heroScroll(s.progress); } });

  /* ============ CARBONARA A 360° ============ */
  (function () {
    var turn = 0, prog = 0, ings = $$(".ing"), drag = $("#fiDrag"), cv = $("#plate");
    function draw() { plate.draw(prog * (plate.N - 1) + turn); }
    function set(p) {
      prog = p; plate.zoom = 0.9 + Math.min(p, 0.5) * 0.12; draw(); document.getElementById("firma").style.setProperty("--R", (cv.clientHeight * 0.9 * plate.zoom * 0.37) + "px");
      ings.forEach(function (el, i) { var o = win(p, 0.14 + i * 0.1, 0.96, 0.06); el.style.opacity = o; el.style.transform = "translateX(" + ((1 - o) * (el.classList.contains("r") ? 30 : -30)) + "px)"; });
    }
    set(0);
    if (HAS_GSAP) ScrollTrigger.create({ trigger: "#firma", start: "top top", end: "bottom bottom", scrub: true, onUpdate: function (s) { set(s.progress); } });
    var dn = false, lx = 0, acc = 0;
    cv.addEventListener("pointerdown", function (e) { dn = true; lx = e.clientX; cv.setPointerCapture(e.pointerId); drag.style.opacity = 0; });
    cv.addEventListener("pointermove", function (e) { if (!dn) return; acc += e.clientX - lx; lx = e.clientX; var st = Math.round(acc / 5); if (st) { turn += st; acc -= st * 5; draw(); } });
    cv.addEventListener("pointerup", function () { dn = false; }); cv.addEventListener("pointercancel", function () { dn = false; });
  })();

  /* ============ NAV / FAB / MARQUEE ============ */
  var nav = $("#nav"), fab = $("#fab"), lastY = 0;
  function onY(y) {
    var heroEnd = $("#hero").offsetHeight - innerHeight;
    nav.classList.toggle("solid", y > heroEnd - 40);
    if (y > lastY + 4 && y > innerHeight) nav.classList.add("hide"); else if (y < lastY - 4) nav.classList.remove("hide");
    lastY = y; fab.classList.toggle("show", y > heroEnd && !inReserve);
  }
  var inReserve = false;
  new IntersectionObserver(function (es) { inReserve = es[0].isIntersecting; onY(scrollY); }, { threshold: 0.1 }).observe($("#reserve"));
  if (lenis) lenis.on("scroll", function (e) { onY(e.scroll); }); else addEventListener("scroll", function () { onY(scrollY); }, { passive: true });
  onY(scrollY);
  (function () { var el = $("#mq"), x = 0; (function loop() { var half = el.scrollWidth / 2; x -= 0.6; if (-x >= half) x += half; el.style.transform = "translate3d(" + x + "px,0,0)"; requestAnimationFrame(loop); })(); })();

  /* ============ REVEAL + PARALLASSE ============ */
  if (HAS_GSAP && !RED) {
    $$(".rv").forEach(function (el) { gsap.to(el, { opacity: 1, y: 0, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } }); });
    $$(".par").forEach(function (im) { gsap.fromTo(im, { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: { trigger: im.parentNode, start: "top bottom", end: "bottom top", scrub: true } }); });
    gsap.fromTo("#forno video", { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: "#forno", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo(".fo-in .h2", { letterSpacing: "0.08em" }, { letterSpacing: "-0.02em", ease: "none", scrollTrigger: { trigger: "#forno", start: "top 80%", end: "center center", scrub: true } });
    gsap.fromTo(".pour", { clipPath: "inset(12% 10% 12% 10% round 4px)" }, { clipPath: "inset(0% 0% 0% 0% round 4px)", ease: "none", scrollTrigger: { trigger: ".pour", start: "top bottom", end: "center center", scrub: true } });
    gsap.fromTo(".ap-vid", { clipPath: "inset(30% 0 0 0 round 220px 220px 4px 4px)" }, { clipPath: "inset(0% 0 0 0 round 220px 220px 4px 4px)", ease: "none", scrollTrigger: { trigger: ".ap-vid", start: "top bottom", end: "center center", scrub: true } });
  } else $$(".rv").forEach(function (e) { e.style.opacity = 1; e.style.transform = "none"; });

  /* storia: le parole si accendono una alla volta */
  (function () {
    var q = $("#storyQ"), ws = [];
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { split(n); return; } if (n.nodeType !== 3) return;
        var f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (w) { if (!w) return; if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(" ")); return; } var s = document.createElement("span"); s.className = "w"; s.textContent = w; f.appendChild(s); ws.push(s); });
        n.parentNode.replaceChild(f, n);
      });
    })(q);
    if (HAS_GSAP && !RED) ScrollTrigger.create({ trigger: q, start: "top 80%", end: "bottom 45%", scrub: true, onUpdate: function (s) { var k = Math.round(s.progress * ws.length); ws.forEach(function (w, i) { w.classList.toggle("on", i < k); }); } });
    else ws.forEach(function (w) { w.classList.add("on"); });
  })();

  /* contatori */
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; cio.unobserve(e.target);
      var el = e.target, to = +el.dataset.count, from = +(el.dataset.from || 0), t1 = performance.now();
      (function step(t) { var p = Math.min((t - t1) / 1800, 1), k = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(from + (to - from) * k); if (p < 1) requestAnimationFrame(step); })(t1);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach(function (el) { cio.observe(el); });

  /* ============ MENU ============ */
  (function () {
    var imgs = $$("#mvis img"), nm = $("#mvisN"), pr = $("#mvisP");
    function show(k, title, price) { imgs.forEach(function (im) { im.classList.toggle("on", im.dataset.k === k); }); nm.textContent = title; pr.textContent = price; }
    function firstOf(cat) { var mi = $(".mi[data-img]", cat); if (mi) show(mi.dataset.img, $("h4", mi).textContent, $(".pr", mi).textContent); }
    $$("#tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#tabs button").forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
        $$(".mcat").forEach(function (c) { var on = c.dataset.c === b.dataset.c; c.classList.toggle("on", on); if (on) { firstOf(c); if (HAS_GSAP && !RED) gsap.fromTo($$(".mi,.note", c), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.04 }); } });
        if (HAS_GSAP) ScrollTrigger.refresh();
      });
    });
    $$(".mi[data-img]").forEach(function (mi) { mi.addEventListener("mouseenter", function () { show(mi.dataset.img, $("h4", mi).textContent, $(".pr", mi).textContent); }); });
  })();

  /* ============ VIDEO LAZY ============ */
  function vsrc(v) { var s = v.dataset.src; return MOB ? s.replace(/\.mp4$/, "-m.mp4") : s; }
  var vio = new IntersectionObserver(function (es) { es.forEach(function (e) { var v = e.target; if (e.isIntersecting) { if (!v.getAttribute("src")) { v.src = vsrc(v); v.preload = "auto"; } var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }); }, { rootMargin: "200px", threshold: 0.01 });
  $$("video[data-src]").forEach(function (v) { vio.observe(v); });

  /* ============ GALLERIA ORIZZONTALE ============ */
  (function () {
    if (!HAS_GSAP || MOB) return;
    var tr = $("#rmTrack"), ims = $$(".rc img", tr);
    ScrollTrigger.create({ trigger: "#room", start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true, onUpdate: function (s) {
      tr.style.transform = "translate3d(" + (-s.progress * (tr.scrollWidth - innerWidth)) + "px,0,0)";
      ims.forEach(function (im, i) { im.style.transform = "scale(1.12) translateX(" + ((s.progress - i / ims.length) * -60) + "px)"; });
    } });
  })();

  /* ============ BOTTIGLIA 3D ============ */
  (function () {
    if (!window.THREE || !window.GLTFLoader) return;
    var host = $("#botStage"), c = $("#bot");
    var rd; try { rd = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); } catch (e) { return; }
    rd.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); rd.outputColorSpace = THREE.SRGBColorSpace; rd.toneMapping = THREE.ACESFilmicToneMapping; rd.toneMappingExposure = 1.1;
    var sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(24, 1, 0.1, 60); cam.position.set(0, 0.3, 9);
    var pm = new THREE.PMREMGenerator(rd); sc.environment = pm.fromScene(new RoomEnvironment(rd), 0.04).texture; pm.dispose();
    var key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(3, 4, 5); sc.add(key);
    var rim = new THREE.DirectionalLight(0xd9bd8a, 2.4); rim.position.set(-4, 2, -4); sc.add(rim);
    sc.add(new THREE.AmbientLight(0xffffff, 0.35));
    var root = new THREE.Group(); sc.add(root);
    // foglie d'ulivo che fluttuano attorno alla bottiglia
    var leafShape = new THREE.Shape(); leafShape.moveTo(0, -0.5); leafShape.quadraticCurveTo(0.14, 0, 0, 0.5); leafShape.quadraticCurveTo(-0.14, 0, 0, -0.5);
    var leafGeo = new THREE.ShapeGeometry(leafShape, 8), leaves = [];
    for (var i = 0; i < (MOB ? 10 : 18); i++) {
      var m = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ color: i % 3 ? 0x5f7d4e : 0x8fa37a, roughness: 0.7, side: THREE.DoubleSide }));
      var a = Math.random() * Math.PI * 2, r = 1.3 + Math.random() * 1.1; m.userData = { a: a, r: r, y: -1.6 + Math.random() * 3.2, s: 0.15 + Math.random() * 0.25, sp: 0.1 + Math.random() * 0.2 };
      m.scale.setScalar(0.35 + Math.random() * 0.35); sc.add(m); leaves.push(m);
    }
    var olives = new THREE.Group(); sc.add(olives);
    for (var j = 0; j < 5; j++) { var o = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), new THREE.MeshStandardMaterial({ color: j % 2 ? 0x3d4a1e : 0x2a1f24, roughness: 0.25, metalness: 0.05 })); o.scale.set(1, 1.3, 1); o.userData = { a: j * 1.25, r: 1.5 + (j % 2) * 0.5, y: -1.2 + j * 0.55 }; olives.add(o); }
    var loaded = false;
    var draco = new DRACOLoader(); draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/");
    new GLTFLoader().setDRACOLoader(draco).load("assets/bottle.glb", function (g) {
      var mdl = g.scene, box = new THREE.Box3().setFromObject(mdl), size = box.getSize(new THREE.Vector3()), cen = box.getCenter(new THREE.Vector3()), s = 2.9 / size.y;
      mdl.scale.setScalar(s); mdl.position.set(-cen.x * s, -cen.y * s, -cen.z * s);
      mdl.traverse(function (o) { if (o.isMesh) { var mt = o.material; if (mt.map) mt.map.colorSpace = THREE.SRGBColorSpace; mt.envMapIntensity = 1.1; } });
      root.add(mdl); loaded = true; $("#botLoad").classList.add("out");
      // etichetta crema con il logo (la texture generata l'aveva persa)
      var bx = new THREE.Box3().setFromObject(mdl), bs = bx.getSize(new THREE.Vector3()), bc = bx.getCenter(new THREE.Vector3());
      var lc = document.createElement("canvas"); lc.width = 512; lc.height = 700; var g = lc.getContext("2d");
      g.fillStyle = "#f1ead8"; g.fillRect(0, 0, 512, 700);
      g.strokeStyle = "rgba(184,149,90,.9)"; g.lineWidth = 3; g.strokeRect(22, 22, 468, 656); g.lineWidth = 1; g.strokeRect(32, 32, 448, 636);
      g.fillStyle = "#1d3d2c"; g.textAlign = "center";
      g.font = "500 30px 'DM Mono', monospace"; g.fillText("EST. 2010 · NEW YORK", 256, 110);
      var logo = new Image(); logo.onload = function () { var w = 400, h = w * logo.height / logo.width; g.drawImage(logo, 56, 180, w, h); lt.needsUpdate = true; }; logo.src = "assets/logo-green.png";
      g.font = "italic 500 52px 'Cormorant Garamond', serif"; g.fillText("Olio Extra Vergine", 256, 470); g.fillText("di Oliva", 256, 530);
      g.fillStyle = "#b8955a"; g.fillRect(206, 580, 100, 2); g.fillStyle = "#1d3d2c"; g.font = "500 24px 'DM Mono', monospace"; g.fillText("GREENWICH VILLAGE", 256, 630);
      var lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8;
      var lw = bs.x * 0.92, lh = lw * 760 / 512;
      var lab = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.85 }));
      lab.position.set(bc.x, bc.y - bs.y * 0.15, bc.z + bs.z / 2 + 0.004); root.add(lab);
      var back = new THREE.Mesh(new THREE.PlaneGeometry(lw * 0.8, lw * 0.5), new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.85 }));
      back.position.set(bc.x, bc.y - bs.y * 0.12, bc.z - bs.z / 2 - 0.004); back.rotation.y = Math.PI; root.add(back);
    }, undefined, function () { $("#botLoad").textContent = ""; });
    function size() { var r = host.getBoundingClientRect(); rd.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }
    size(); addEventListener("resize", size);
    var rot = { y: 0, vy: 0 }, dn = false, lx = 0, on = false, t = 0, sp = 0;
    host.addEventListener("pointerdown", function (e) { dn = true; lx = e.clientX; host.setPointerCapture(e.pointerId); $("#bhint").style.opacity = 0; });
    host.addEventListener("pointermove", function (e) { if (!dn) return; rot.vy = (e.clientX - lx) * 0.012; lx = e.clientX; rot.y += rot.vy; });
    host.addEventListener("pointerup", function () { dn = false; }); host.addEventListener("pointercancel", function () { dn = false; });
    new IntersectionObserver(function (es) { on = es[0].isIntersecting; }, { rootMargin: "100px" }).observe(host);
    if (HAS_GSAP) ScrollTrigger.create({ trigger: "#olio", start: "top bottom", end: "bottom top", onUpdate: function (s) { sp = s.progress; } });
    (function loop() {
      requestAnimationFrame(loop); if (!on) return; t += 0.016;
      if (!dn) { rot.vy *= 0.95; rot.y += rot.vy; rot.y *= 0.985; } rot.y += Math.sin(t * 0.5) * 0.0025;
      root.rotation.set(0.06, rot.y + (sp - 0.5) * 1.6, Math.sin(t * 0.6) * 0.03); root.position.y = Math.sin(t * 0.8) * 0.06;
      leaves.forEach(function (m) { var u = m.userData, a = u.a + t * u.sp; m.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 0.7 + u.a) * 0.2 - (sp - 0.5) * 1.2, Math.sin(a) * u.r * 0.7); m.rotation.set(t * u.s + u.a, a, t * u.s * 0.7); });
      olives.children.forEach(function (m) { var u = m.userData, a = u.a - t * 0.15; m.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.a) * 0.1, Math.sin(a) * u.r * 0.7); });
      rd.render(sc, cam);
    })();
  })();

  /* ============ ORARI: aperto adesso? (ora di New York) ============ */
  (function () {
    var ny; try { ny = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); } catch (e) { ny = new Date(); }
    var d = ny.getDay(), h = ny.getHours() + ny.getMinutes() / 60, opens = (d === 0 || d === 6) ? 10 : 11, open = h >= opens;
    $("#todayHours").textContent = (opens === 10 ? "10:00 AM" : "11:00 AM") + " – 12:00 AM";
    var el = $("#openNow"); el.classList.toggle("closed", !open); $("#openTxt").textContent = open ? "Open now · until midnight" : "Opens today at " + (opens === 10 ? "10 AM" : "11 AM");
  })();

  /* ============ PRENOTAZIONE (porta a Resy con data e coperti) ============ */
  (function () {
    var ts = $("#rTime"), dt = $("#rDate"), now = new Date();
    for (var m = 11 * 60; m <= 23 * 60; m += 30) { var hh = Math.floor(m / 60), mm = m % 60, o = document.createElement("option"); o.value = ("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2); o.textContent = ((hh + 11) % 12 + 1) + ":" + ("0" + mm).slice(-2) + (hh < 12 ? " AM" : " PM"); if (m === 19 * 60 + 30) o.selected = true; ts.appendChild(o); }
    var iso = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
    dt.value = iso(now); dt.min = iso(now);
    $("#rform").addEventListener("submit", function (e) {
      e.preventDefault();
      window.open("https://resy.com/cities/new-york-ny/venues/olio-e-piu?date=" + dt.value + "&seats=" + $("#rSeats").value, "_blank", "noopener");
    });
  })();
})();
