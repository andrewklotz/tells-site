(() => {
  'use strict'
  const d = document.documentElement
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
  let G = null, ST = null, hasGsap = false
  let readyResolve
  const T = (window.Tells = { hasGsap: false, ready: new Promise(r => (readyResolve = r)) })
  const stageMQ = matchMedia('screen and (min-width: 720px) and (min-height: 600px)')
  const raf = fn => requestAnimationFrame(fn)
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }
  d.classList.add('scripted', 'qa-anim')

  T.motion = 'full'
  d.setAttribute('data-motion', 'full')
  const motionListeners = []
  T.onMotion = fn => motionListeners.push(fn)
  const full = () => hasGsap

  const Focus = (T.focus = (() => {
    const SPREAD = 0.3, NS = 'http://www.w3.org/2000/svg', MINE = /^(tells-|rule-)/
    const pending = new Set()
    const GAP = { '': 0.16, block: 0.09, rule: 0.26, wipe: 0.07 }, MAXQ = 1.2
    let lastAt = -Infinity, lastGap = 0
    function slot(el) {
      const now = performance.now() / 1000
      const q = Math.min(MAXQ, Math.max(0, lastAt + lastGap - now))
      lastAt = now + q
      lastGap = GAP[el.dataset.focus || ''] ?? 0.09
      return q
    }
    function split(el) {
      if (el._words) return el._words
      const full = el.textContent.replace(/\s+/g, ' ').trim()
      const words = []
      const walk = node => {
        for (const n of Array.from(node.childNodes)) {
          if (n.nodeType === 3) {
            if (!n.textContent.trim()) continue
            const frag = document.createDocumentFragment()
            for (const part of n.textContent.split(/(\s+)/)) {
              if (!part) continue
              if (!part.trim()) { frag.append(part); continue }
              const w = document.createElement('span')
              w.className = 'w'
              w.textContent = part
              frag.append(w)
              words.push(w)
            }
            n.replaceWith(frag)
          } else if (n.nodeType === 1) {
            if (n.classList.contains('w')) words.push(n)
            else if (n.matches('em, b, strong')) { const w = document.createElement('span'); w.className = 'w'; n.replaceWith(w); w.append(n); words.push(w) }
            else walk(n)
          }
        }
      }
      walk(el)
      words.forEach(w => w.setAttribute('aria-hidden', 'true'))
      const sr = document.createElement('span')
      sr.className = 'vh'
      sr.textContent = full
      el.prepend(sr)
      const n = words.length
      const r = words.map((w, i) => ((i + 1) * 2654435761 >>> 0) % 1009)
      const lo = Math.min(...r), hi = Math.max(...r)
      words.forEach((w, i) => {
        if (w.style.getPropertyValue('--d')) return
        const t = 0.6 * (n > 1 ? i / (n - 1) : 0) + 0.4 * (hi > lo ? (r[i] - lo) / (hi - lo) : 0)
        w.style.setProperty('--d', (t * SPREAD).toFixed(3) + 's')
      })
      return (el._words = words)
    }
    let inkN = 0
    const inky = el => T.motion === 'full' && !!el.closest('[data-close]')
    function inkFilter(el) {
      if (el._ink) return el._ink
      const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n }
      const id = 'ink-text-' + ++inkN
      const f = mk('filter', { id, x: '-20%', y: '-40%', width: '140%', height: '180%', 'color-interpolation-filters': 'sRGB' })
      const blur = mk('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '0' })
      const ct = mk('feComponentTransfer', {})
      ct.append(mk('feFuncA', { type: 'linear', slope: '12', intercept: '-5.5' }))
      f.append(blur, ct)
      $('svg.sprite').append(f)
      return (el._ink = { id, blur, tween: null })
    }
    function inkIn(el) {
      const ink = inkFilter(el)
      const from = 0.09 * (parseFloat(getComputedStyle(el).fontSize) || 100)
      const s = { v: from }
      ink.blur.setAttribute('stdDeviation', from.toFixed(2))
      el.style.filter = `url(#${ink.id})`
      el.classList.add('ink-go')
      ink.tween = G.to(s, { v: 0, duration: 0.85, ease: 'house', onUpdate: () => ink.blur.setAttribute('stdDeviation', s.v.toFixed(3)), onComplete: () => inkDone(el) })
    }
    function inkDone(el) {
      const ink = el._ink
      if (ink) { ink.tween?.kill(); ink.tween = null }
      el.style.filter = ''
      el.classList.remove('ink-go')
    }
    const order = (a, b) => (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
    const arrive = entries => entries.filter(e => e.isIntersecting).sort(order).forEach(e => {
      io.unobserve(e.target)
      ioRule.unobserve(e.target)
      play(e.target, true)
      if (e.target.dataset.focus === 'rule') follow(e.target)
    })
    function follow(el) {
      const after = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
      Array.from(pending)
        .filter(r => r.dataset.focus === 'rule' && el.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING)
        .sort(after)
        .forEach(r => {
          const b = r.getBoundingClientRect()
          if (b.top < innerHeight && b.bottom > 0) play(r, true)
          else { ioRule.unobserve(r); io.observe(r) }
        })
    }
    const io = new IntersectionObserver(arrive, { rootMargin: '0px 0px -15% 0px' })
    const ioRule = new IntersectionObserver(arrive, { rootMargin: '0px 0px -40% 0px' })
    function wait(el, observe) {
      if (!el || T.motion === 'paused' || pending.has(el)) return
      if (!inky(el) && el.closest('[data-close]')) return
      const kind = el.dataset.focus
      if ((kind === 'wipe' || kind === 'rule') && T.motion !== 'full') return
      if (inky(el)) el.classList.add('ink-wait')
      else {
        if (!kind) split(el)
        el.classList.add('focus-wait')
      }
      pending.add(el)
      if (observe) (kind === 'rule' ? ioRule : io).observe(el)
    }
    function play(el, queued) {
      if (!pending.has(el)) return
      pending.delete(el)
      io.unobserve(el)
      ioRule.unobserve(el)
      if (el.classList.contains('ink-wait')) {
        el.classList.remove('ink-wait')
        if (T.motion === 'full' && G) inkIn(el)
        return
      }
      const q = queued ? slot(el) : 0
      if (q) el.style.setProperty('--q', q.toFixed(3) + 's')
      else { const at = performance.now() / 1000 + (parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0); if (at >= lastAt) { lastAt = at; lastGap = GAP[el.dataset.focus || ''] ?? 0.09 } }
      el.classList.remove('focus-wait')
      el.classList.add('focus-go')
      const done = () => { if (el.classList.contains('focus-go')) { el.classList.remove('focus-go'); el.style.removeProperty('--q') } }
      const anims = el.getAnimations ? el.getAnimations({ subtree: true }).filter(a => MINE.test(a.animationName || '')) : null
      if (!anims) el._done = setTimeout(done, (q + (parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0) + SPREAD) * 1000 + 1400)
      else if (!anims.length) done()
      else Promise.all(anims.map(a => a.finished)).then(done, done)
    }
    function finish(el) {
      if (!el) return
      if (pending.has(el)) { pending.delete(el); io.unobserve(el); ioRule.unobserve(el); el.classList.remove('focus-wait', 'ink-wait') }
      clearTimeout(el._done)
      el.classList.remove('focus-go')
      el.style.removeProperty('--q')
      inkDone(el)
    }
    function finishAll() {
      Array.from(pending).forEach(finish)
      $$('.focus-go, .ink-go').forEach(finish)
    }
    return { split, wait, play, finish, finishAll }
  })())
  T.onMotion(m => { if (m === 'paused') Focus.finishAll() })
  if (d.classList.contains('intro')) {
    const end = () => d.classList.remove('intro')
    const anims = $$('.hero [data-intro], .hero__title .w').flatMap(el => (el.getAnimations ? el.getAnimations() : []))
    if (anims.length) Promise.all(anims.map(a => a.finished)).then(end, end)
    setTimeout(end, 1700)
  }

  ;(() => {
    const blur = $('[data-ink-head-blur]')
    if (!blur || !d.classList.contains('intro')) { d.classList.add('ink-done'); return }
    const from = +blur.getAttribute('stdDeviation') || 14, dur = 900
    const ease = t => 1 - Math.pow(1 - t, 4)
    let t0 = 0
    const step = now => {
      if (!t0) t0 = now
      const t = Math.min(1, (now - t0) / dur)
      blur.setAttribute('stdDeviation', (from * (1 - ease(t))).toFixed(3))
      if (t < 1 && T.motion === 'full') raf(step)
      else d.classList.add('ink-done')
    }
    raf(step)
  })()

  const navMap = [
    ['product', ['#live', '#lock-screen', '#slips', '#play']],
    ['your-brand', ['#your-brand']],
    ['market', ['#market']],
    ['how', ['#how', '#rules', '#status', '#questions']],
  ]
  const navState = new Map()
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => navState.set(e.target, e.isIntersecting))
    let current = null
    for (const [key, sels] of navMap) if (sels.some(s => navState.get($(s)))) current = key
    $$('[data-nav]').forEach(a => {
      const on = a.dataset.nav === current
      a.classList.toggle('is-current', on)
      on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')
    })
  }, { rootMargin: '-40% 0px -59% 0px' })
  navMap.forEach(([, sels]) => sels.forEach(s => $(s) && navIO.observe($(s))))

  d.classList.add('nav-glass')
  const capsule = $('.site-header__in')
  let inkQueued = false
  function navInk() {
    inkQueued = false
    const c = capsule.getBoundingClientRect(), y = (c.top + c.bottom) / 2
    let g = 'dark'
    $$('[data-ground]').forEach(el => {
      const r = el.getBoundingClientRect(), wipe = /^inset\(\s*([\d.]+)%/.exec(el.style.clipPath)
      const top = wipe ? r.top + r.height * Math.min(100, parseFloat(wipe[1])) / 100 : r.top
      if (top <= y && r.bottom > y) g = el.dataset.ground
    })
    d.classList.toggle('nav-on-yellow', g === 'yellow')
  }
  const queueInk = () => { if (!inkQueued) { inkQueued = true; raf(navInk) } }
  T.navInk = queueInk
  queueInk()
  addEventListener('scroll', queueInk, { passive: true })
  const settleInk = () => { queueInk(); setTimeout(queueInk, 300) }
  addEventListener('resize', settleInk)
  addEventListener('orientationchange', settleInk)
  window.visualViewport?.addEventListener('resize', queueInk)
  T.ready.then(queueInk)

  const TYPES = { webm: 'video/webm; codecs="vp9"', mp4: 'video/mp4; codecs="avc1.640032"' }
  const Films = (T.films = (() => {
    const films = $$('.screen-media[data-film]').filter(el => $('video', el)).map(el => ({
      el, video: $('video', el), poster: $('img', el), name: el.dataset.film,
      hero: el.hasAttribute('data-hero'), stage: !!el.closest('[data-device="stage"]'),
      loaded: false, ratio: 0, blocked: false, awayAt: 0, near: null,
    }))
    let stageOn = false
    let screen = 'live'
    let stageVisible = true
    let suspended = false
    let heroReady = false

    const inLayout = f => (stageOn ? f.stage : !f.stage)
    const loadPoster = f => { const p = f.poster; if (p && p.dataset.src) { p.src = p.dataset.src; delete p.dataset.src; p.decode?.().catch(() => {}) } }
    const attach = f => {
      if (f.loaded) return
      f.loaded = true
      loadPoster(f)
      for (const k of ['webm', 'mp4']) {
        const url = f.video.dataset[k]
        if (!url) continue
        const s = document.createElement('source')
        s.src = url; s.type = TYPES[k]
        f.video.append(s)
      }
      f.video.preload = 'auto'
      f.video.load()
    }
    const detach = f => {
      if (!f.loaded) return
      f.loaded = false
      f.el.classList.remove('has-frame')
      $$('source', f.video).forEach(s => s.remove())
      f.video.removeAttribute('src')
      f.video.preload = 'none'
      try { f.video.load() } catch (e) {}
    }
    films.forEach(f => f.video.addEventListener('playing', () => f.el.classList.add('has-frame')))

    function active(f) {
      if (!inLayout(f)) return false
      if (stageOn) return stageVisible && f.name === screen
      const best = films.filter(x => !x.stage && x.ratio >= 0.35).sort((a, b) => b.ratio - a.ratio)[0]
      return best === f
    }
    const wants = f => T.motion === 'full' && !suspended && !document.hidden && !f.blocked && (!f.hero || heroReady) && active(f)
    function play(f) {
      attach(f)
      const p = f.video.play()
      if (p && p.catch) p.catch(err => { if (err && err.name === 'NotAllowedError') { f.blocked = true; detach(f) } })
    }
    function sync() {
      const now = performance.now()
      films.forEach(f => {
        if (wants(f)) {
          if (f.video.paused) {
            if (f.awayAt && now - f.awayAt > 2000) { try { f.video.currentTime = 0 } catch (e) {} }
            play(f)
          }
          f.awayAt = 0
        } else {
          if (!f.video.paused) f.video.pause()
          if (!f.awayAt) f.awayAt = now
        }
      })
    }
    const visIO = new IntersectionObserver(entries => {
      entries.forEach(e => { const f = films.find(x => x.el === e.target); if (f) f.ratio = e.intersectionRatio })
      sync()
    }, { threshold: [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1] })
    films.filter(f => !f.stage).forEach(f => visIO.observe(f.el))
    const stageEl = $('[data-stage]')
    if (stageEl) new IntersectionObserver(entries => { stageVisible = entries[entries.length - 1].isIntersecting; sync() }).observe(stageEl)
    const nearIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        const near = films.filter(f => (f.el === e.target || f.near === e.target) && !f.hero && inLayout(f))
        near.forEach(loadPoster)
        if (T.motion === 'full') near.forEach(attach)
      })
    }, { rootMargin: '800px 0px 800px 0px' })
    films.forEach(f => {
      if (f.hero) return
      f.near = f.el.dataset.loadNear ? $(f.el.dataset.loadNear) : f.el
      if (f.near) nearIO.observe(f.near)
    })
    const heroGo = () => {
      if (heroReady) return
      heroReady = true
      if (T.motion === 'full') films.filter(f => f.hero && inLayout(f)).forEach(attach)
      sync()
    }
    if (document.readyState === 'complete') setTimeout(heroGo, 0)
    else { addEventListener('load', heroGo, { once: true }); setTimeout(heroGo, 1500) }
    document.addEventListener('visibilitychange', sync)

    return {
      setMode(on) {
        if (on === stageOn) return
        stageOn = on
        if (on) { const f = films.find(x => x.stage && x.name === screen); if (f) loadPoster(f) }
        if (T.motion === 'full') {
          if (heroReady) films.filter(f => f.hero && inLayout(f)).forEach(attach)
          films.filter(f => !f.hero && inLayout(f) && f.near).forEach(f => {
            const r = f.near.getBoundingClientRect()
            if (r.bottom > -800 && r.top < innerHeight + 800) { loadPoster(f); attach(f) }
          })
        }
        sync()
      },
      setScreen(name) {
        screen = name
        const f = films.find(x => x.stage && x.name === name)
        if (f) loadPoster(f)
        sync()
      },
      pauseAll() { sync() },
      suspend(on) { suspended = on; sync() },
      sync,
    }
  })())
  T.onMotion(() => Films.sync())

  $$('.qa').forEach(qa => {
    const sum = $('summary', qa)
    sum.addEventListener('click', e => {
      e.preventDefault()
      const animate = T.motion === 'full'
      if (qa.open) {
        qa.classList.remove('is-open')
        if (animate) setTimeout(() => { if (!qa.classList.contains('is-open')) qa.open = false }, 300)
        else qa.open = false
      } else {
        qa.open = true
        animate ? raf(() => raf(() => qa.classList.add('is-open'))) : qa.classList.add('is-open')
      }
    })
    qa.addEventListener('toggle', () => { if (qa.open) qa.classList.add('is-open'); else qa.classList.remove('is-open') })
  })

  const dlg = $('#film-dialog')
  if (dlg && typeof dlg.showModal === 'function') {
    const vid = $('[data-dialog-video]', dlg)
    let opener = null, tapped = false
    const attachDialog = () => {
      if ($('source', vid)) return
      const small = matchMedia('(max-width: 899px)').matches && vid.dataset.mp4Small
      const s = document.createElement('source')
      s.src = small ? vid.dataset.mp4Small : vid.dataset.mp4
      s.type = small ? 'video/mp4; codecs="avc1.640028"' : 'video/mp4; codecs="avc1.640033"'
      vid.append(s)
      vid.load()
    }
    $$('[data-film-open]').forEach(b => b.addEventListener('click', e => {
      opener = b
      b._givenBack = false
      tapped = e.detail > 0
      b.classList.toggle('quiet-focus', tapped)
      attachDialog()
      Films.suspend(true)
      dlg.showModal()
      $('[data-film-close]', dlg).focus()
      const p = vid.play()
      p && p.catch && p.catch(() => {})
      if (matchMedia('(max-width: 899px) and (pointer: coarse)').matches) {
        try {
          if (vid.requestFullscreen) vid.requestFullscreen().catch(() => {})
          else if (vid.webkitEnterFullscreen && vid.readyState >= 1) vid.webkitEnterFullscreen()
        } catch (e) {}
      }
    }))
    if (matchMedia('(max-width: 899px) and (pointer: coarse)').matches && !navigator.connection?.saveData && 'IntersectionObserver' in window) {
      const hero = $('#hero')
      const warm = () => {
        const io = new IntersectionObserver(es => {
          if (!es.some(e => e.isIntersecting)) return
          io.disconnect()
          if (!$('source', vid)) { vid.preload = 'metadata'; attachDialog() }
        })
        hero && io.observe(hero)
      }
      document.readyState === 'complete' ? warm() : addEventListener('load', warm, { once: true })
    }
    $('[data-film-close]', dlg).addEventListener('click', () => dlg.close())
    dlg.addEventListener('click', e => {
      if (e.target !== dlg) return
      const r = dlg.getBoundingClientRect()
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      if (!inside) dlg.close()
    })
    const giveBack = () => {
      if (!opener || opener._givenBack) return
      opener._givenBack = true
      if (tapped) opener.addEventListener('blur', () => opener.classList.remove('quiet-focus'), { once: true })
      if (document.activeElement !== opener) opener.focus()
    }
    dlg.addEventListener('close', () => {
      vid.pause()
      try { vid.currentTime = 0 } catch (e) {}
      Films.suspend(false)
      if (document.fullscreenElement) {
        document.addEventListener('fullscreenchange', () => raf(giveBack), { once: true })
        setTimeout(giveBack, 800)
        document.exitFullscreen?.().catch(() => {})
      } else raf(giveBack)
    })
  } else {
    $$('[data-film-open]').forEach(b => b.addEventListener('click', () => { location.href = 'media/tells-reel-20s-silent.mp4' }))
  }

  const NP = 3.34, CS = 1.528665
  function edgeHalf(W, H, r, ins, n = 400) {
    const R = CS * (r - ins), x1 = W - ins, y0 = ins, y1 = H - ins, raw = [[W / 2, y0]]
    for (let i = 0; i <= 24; i++) { const t = (1 - i / 24) * Math.PI / 2; raw.push([x1 - R + Math.cos(t) ** (2 / NP) * R, y0 + R - Math.sin(t) ** (2 / NP) * R]) }
    const cornerAt = raw.length - 1
    for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI / 2; raw.push([x1 - R + Math.cos(t) ** (2 / NP) * R, y1 - R + Math.sin(t) ** (2 / NP) * R]) }
    raw.push([W / 2, y1])
    const acc = [0]
    for (let i = 1; i < raw.length; i++) acc.push(acc[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]))
    const L = acc[acc.length - 1], pts = []
    for (let k = 0, j = 1; k <= n; k++) {
      const dd = L * k / n
      while (j < acc.length - 1 && acc[j] < dd) j++
      const u = (dd - acc[j - 1]) / ((acc[j] - acc[j - 1]) || 1)
      pts.push([raw[j - 1][0] + (raw[j][0] - raw[j - 1][0]) * u, raw[j - 1][1] + (raw[j][1] - raw[j - 1][1]) * u])
    }
    return { pts, L, corner: acc[cornerAt] }
  }
  const fRun = p => (1 - Math.exp(-1.2 * p)) / (1 - Math.exp(-1.2))
  const fInv = u => -Math.log(1 - u * (1 - Math.exp(-1.2))) / 1.2
  const THEMES = { tells: { accent: '#F4F91C', top: '#F8FB5C' }, yours: { accent: '#26E3C8', top: '#6DF0DD' } }

  function Brand(mock) {
    const layers = { tells: $('[data-theme="tells"]', mock), yours: $('[data-theme="yours"]', mock) }
    const canvas = $('.screen__lights', mock)
    const ctx = canvas.getContext('2d')
    const radios = $$('input[name="brand-theme"]')
    const labels = { tells: mock.getAttribute('aria-label'), yours: mock.dataset.labelYours }
    let base = 'tells', top = 'yours', p = 0, shown = 'tells'
    let geo = null, tween = null, lights = false
    const N = 400
    const art = $$('img[src]', mock)
    art.forEach(i => { i.dataset.src = i.getAttribute('src'); i.removeAttribute('src') })
    let artIO = null
    const loadArt = () => { artIO?.disconnect(); art.forEach(i => { if (i.dataset.src) { i.src = i.dataset.src; delete i.dataset.src } }) }
    if (window.IntersectionObserver) { artIO = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) loadArt() }, { rootMargin: '1200px 0px' }); artIO.observe($('#your-brand') || mock) } else loadArt()
    addEventListener('beforeprint', loadArt)

    function layout() {
      const W = mock.clientWidth, H = mock.clientHeight
      if (!W || !H) { geo = null; return }
      const k = W / 402
      mock.style.setProperty('--k', k.toFixed(5))
      const dpr = Math.min(2, devicePixelRatio || 1)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      const e = edgeHalf(W, H, 62 * k, 2 * k, N)
      geo = { W, H, k, dpr, right: e.pts, left: e.pts.map(([x, y]) => [W - x, y]), L: e.L, corner: e.corner, flipY: 160 * k }
      paint(); draw()
    }
    function headPx() {
      if (!geo) return 0
      return geo.right[Math.round(fRun(Math.max(0, Math.min(1, p))) * N)][1]
    }
    function paint() {
      const H = geo ? geo.H : 1
      const y = p >= 1 ? H : p <= 0 ? 0 : Math.min(H, headPx())
      layers[top].style.zIndex = 2
      layers[base].style.zIndex = 1
      layers[base].style.clipPath = ''
      layers[top].style.clipPath = lights ? `inset(0 0 ${(((H - y) / H) * 100).toFixed(3)}% 0)` : ''
    }
    function draw() {
      if (!geo || !lights) return
      const { dpr, W, H, k } = geo
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (p <= 0 || p >= 1) return
      const u = fRun(p), head = Math.round(u * N)
      const fade = p < 0.88 ? 1 : Math.max(0, 1 - (p - 0.88) / 0.12)
      const col = THEMES[top]
      const yellow = top === 'tells'
      const dHead = u * geo.L
      const tail = (45 + 95 * Math.min(1, dHead / geo.corner)) * k * (yellow ? 0.5 * fade : 1)
      const minW = yellow ? 2 / dpr : 1
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const path of [geo.right, geo.left]) {
        ctx.lineWidth = Math.max(minW, 1.5 * k)
        ctx.strokeStyle = col.accent
        for (let i = 1; i <= head; i++) {
          const age = p - fInv(i / N)
          const a = yellow ? (age < 0.21 * fade ? 1 : 0) : Math.max(0, 1 - age / 0.42) * 0.7 * fade
          if (a <= 0.01) continue
          ctx.globalAlpha = yellow ? 1 : Math.min(0.92, a)
          ctx.beginPath(); ctx.moveTo(path[i - 1][0], path[i - 1][1]); ctx.lineTo(path[i][0], path[i][1]); ctx.stroke()
        }
        if (tail < 2) continue
        const segLen = tail / 24, step = geo.L / N
        const pt = dd => { const q = Math.max(0, Math.min(N, dd / step)); const i = Math.floor(q), f = q - i; const a = path[i], b = path[Math.min(N, i + 1)]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] }
        const passes = yellow ? [{ w: 2.5, k: 1 }] : [{ w: 8, k: 0.18 }, { w: 2.5, k: 1 }]
        for (const pass of passes) {
          ctx.lineWidth = Math.max(minW, pass.w * k)
          ctx.strokeStyle = yellow ? col.accent : col.top
          for (let s = 0; s < 24; s++) {
            const da = dHead - s * segLen, db = dHead - (s + 1) * segLen
            if (da <= 0) break
            ctx.globalAlpha = yellow ? 1 : Math.min(0.92, (1 - s / 24) * pass.k * fade)
            const A = pt(da), B = pt(Math.max(0, db))
            ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
    }
    let quiet = false
    function setRadio(v) { quiet = true; radios.forEach(r => { r.checked = r.value === v }); quiet = false }
    function setShown(v) {
      if (v === shown) return
      shown = v
      if (labels[v]) mock.setAttribute('aria-label', labels[v])
      api.onShown?.(v)
    }
    const pastFlip = () => (!geo ? p >= 0.5 : p >= 1 || headPx() >= geo.flipY)
    function render(np, syncRadio) {
      p = np
      setShown(pastFlip() ? top : base)
      paint(); draw()
      if (syncRadio) setRadio(shown)
    }
    function toTheme(target, dur = 1.8) {
      tween?.kill()
      if (!lights || !G) { setRadio(target); setShown(target); return }
      if (shown === target && (p === 0 || p === 1)) { setRadio(target); return }
      if (p === 0 && base !== target) { top = target; base = target === 'yours' ? 'tells' : 'yours' }
      if (p === 1 && top !== target) { const t = top; top = base; base = t; p = 0 }
      const goal = top === target ? 1 : 0
      const proxy = { p }
      let flipped = false
      tween = G.to(proxy, {
        p: goal, duration: Math.max(0.3, dur * Math.abs(goal - p)), ease: 'scene',
        onUpdate: () => {
          render(proxy.p, false)
          if (!flipped && shown === target) { flipped = true; setRadio(target) }
        },
        onComplete: () => { render(goal, false); setRadio(target); if (goal === 1) { const t = top; top = base; base = t; p = 0; paint(); draw() } },
      })
    }
    const api = {
      mock,
      onPick: null,
      onShown: null,
      setLights(on) {
        tween?.kill()
        lights = on
        mock.classList.toggle('is-lit', on)
        if (!on) { layers.tells.style.clipPath = layers.yours.style.clipPath = ''; layers.tells.style.zIndex = layers.yours.style.zIndex = ''; ctx.clearRect(0, 0, canvas.width, canvas.height) }
        else { base = shown; top = shown === 'tells' ? 'yours' : 'tells'; p = 0 }
        layout()
      },
      layout,
      scrub(np) { tween?.kill(); if (base !== 'tells') { base = 'tells'; top = 'yours' } render(np, true) },
      toTheme,
      get shown() { return shown },
      kill() { tween?.kill() },
    }
    radios.forEach(r => r.addEventListener('change', () => {
      if (quiet || !r.checked) return
      if (api.onPick) api.onPick(r.value)
      else if (lights && hasGsap) toTheme(r.value)
      else setShown(r.value)
    }))
    if (window.ResizeObserver) new ResizeObserver(() => layout()).observe(mock)
    return api
  }
  const brandMock = $('.screen-mock')
  const brand = (T.brand = brandMock ? Brand(brandMock) : null)

  const Stage = (T.stage = (() => {
    const stage = $('[data-stage]')
    if (!stage) return { refresh() {}, update() {} }
    const pin = $('.device-pin', stage)
    const device = $('[data-device="stage"]', stage)
    const screens = $$('.screen-media[data-film]', device)
    const chapters = $$('.chapter[data-chapter]', stage).map(el => ({
      el, film: el.dataset.chapter, text: $('.chapter__text', el),
      head: $('[data-focus]:not([data-focus="block"])', el), blocks: $$('[data-focus="block"]', el), arrived: false,
    }))
    const last = chapters.length - 1
    const playText = $('#play .chapter__text')
    const brandCh = chapters[last].el
    const slots = { stage: $('[data-brand-slot="stage"]', stage), inline: $('[data-brand-slot="inline"]', stage) }
    const ARRIVE = 0.72, ARRIVE_STACK = 0.88, BLOCK = 0.85, GLIDE = 0.9
    let on = false, side = '', sideAt = -Infinity, screen = '', lastY = null, queued = false, first = true
    let pinTop = 0, barBottom = 0, instantF = 0, printing = false, brandActive = false

    const blockIO = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return
      blockIO.unobserve(e.target)
      e.target.style.setProperty('--d', '0s')
      Focus.play(e.target, true)
    }), { rootMargin: '0px 0px -15% 0px' })
    const hold = c => { Focus.wait(c.head, false); c.blocks.forEach(b => Focus.wait(b, false)) }
    const finish = c => { c.arrived = true; Focus.finish(c.head); c.blocks.forEach(b => { blockIO.unobserve(b); Focus.finish(b) }) }
    function arrive(c, delay) {
      c.arrived = true
      const go = () => {
        Focus.play(c.head)
        const vh = innerHeight
        c.blocks.forEach(b => (b.getBoundingClientRect().top < vh * BLOCK ? Focus.play(b) : blockIO.observe(b)))
      }
      delay > 0 ? setTimeout(go, delay * 1000) : go()
    }
    function instant() {
      stage.classList.add('is-instant')
      cancelAnimationFrame(instantF)
      instantF = raf(() => { instantF = raf(() => stage.classList.remove('is-instant')) })
    }
    const pageTheme = () => d.classList.toggle('is-yours', T.motion === 'full' && brandActive && !!brand && brand.shown === 'yours')
    if (brand) brand.onShown = pageTheme

    function update() {
      queued = false
      const y = scrollY, vh = innerHeight, now = performance.now()
      const jump = lastY == null || Math.abs(y - lastY) > vh
      lastY = y
      if (on) {
        let s = 'right'
        if (stage.getBoundingClientRect().top > pinTop + 0.5) s = 'center'
        else if (playText.getBoundingClientRect().bottom <= pinTop - 8) s = 'left'
        if (s !== side) {
          if (jump) instant()
          side = s
          stage.dataset.side = s
          sideAt = jump ? -Infinity : now
        }
      }
      let r = -1
      chapters.forEach((c, i) => {
        if (!on) { if ((c.head || c.text).getBoundingClientRect().top < vh * ARRIVE_STACK) r = i; return }
        if (c.text.getBoundingClientRect().top < vh * ARRIVE && (i === 0 || chapters[i - 1].text.getBoundingClientRect().bottom < barBottom)) r = i
      })
      if (on && side !== 'left') r = Math.min(r, last - 1)
      if (on) {
        const scr = side === 'left' ? 'brand' : chapters[Math.max(0, r)].film
        if (scr !== screen) {
          screen = scr
          screens.forEach(el => el.classList.toggle('is-current', el.dataset.film === scr))
          Films.setScreen(scr)
        }
      }
      if (first) {
        first = false
        chapters.forEach((c, i) => (i <= r ? (c.arrived = true) : hold(c)))
      } else {
        const delay = on && T.motion === 'full' ? 0.6 * Math.max(0, GLIDE - (now - sideAt) / 1000) : 0
        chapters.forEach((c, i) => { if (!c.arrived && i <= r) jump ? finish(c) : arrive(c, delay) })
      }
      brandActive = on && side === 'left' && brandCh.getBoundingClientRect().bottom > vh * 0.4
      pageTheme()
    }
    const queue = () => { if (!queued) { queued = true; raf(update) } }
    function placeMock() {
      if (!brandMock) return
      const slot = on && !printing ? slots.stage : slots.inline
      if (slot && brandMock.parentNode !== slot) slot.append(brandMock)
    }
    const brandText = chapters[last].text, brandDetails = $('.details', brandText)
    const rehold = () => { brandText.classList.remove('is-loose'); brandText.style.top = '' }
    function loosen() {
      if (!on || !brandDetails?.open || brandText.classList.contains('is-loose')) return
      if ((parseFloat(getComputedStyle(brandText).top) || 0) + brandText.offsetHeight <= innerHeight - 16) return
      const held = brandText.getBoundingClientRect().top
      brandText.classList.add('is-loose')
      brandText.style.top = '0px'
      brandText.style.top = held - brandText.getBoundingClientRect().top + 'px'
    }
    brandDetails?.addEventListener('toggle', loosen)
    new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) rehold() })).observe(brandCh)
    function refresh() {
      const now = stageMQ.matches && d.classList.contains('js')
      if (now !== on) { on = now; side = ''; screen = '' }
      rehold()
      instant()
      placeMock()
      Films.setMode(on)
      pinTop = on ? parseFloat(getComputedStyle(pin).top) || 0 : 0
      barBottom = $('.site-header__in')?.getBoundingClientRect().bottom || pinTop
      lastY = null
      update()
      loosen()
    }
    addEventListener('scroll', queue, { passive: true })
    addEventListener('resize', debounce(refresh, 150))
    stageMQ.addEventListener?.('change', refresh)
    T.onMotion(() => raf(refresh))
    addEventListener('beforeprint', () => { printing = true; placeMock() })
    addEventListener('afterprint', () => { printing = false; placeMock() })
    refresh()
    return { refresh, update: queue }
  })())

  const revealed = new WeakSet()
  const belowFold = el => el.getBoundingClientRect().top > innerHeight * 0.92
  const hasLayout = el => el.getClientRects().length > 0
  let closeTimeline = null
  document.addEventListener('focusin', e => {
    const t = e.target
    if (!t || !t.closest) return
    Focus.finish(t.closest('.focus-wait, .focus-go'))
    if (t.closest('[data-close]') && closeTimeline) { closeTimeline.progress(1); const line = $('[data-close-line]'); Focus.play(line); Focus.finish(line) }
  })
  const cardIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.intersectionRatio < 0.98) return
    cardIO.unobserve(e.target)
    $$('[data-focus]', e.target).forEach(el => Focus.play(el, true))
  }), { threshold: 0.98 })
  function reveals() {
    if (T.motion === 'paused') return
    $$('[data-focus]').filter(el => !el.closest('[data-stage], [data-close]') && !revealed.has(el) && hasLayout(el) && belowFold(el)).forEach(el => { revealed.add(el); Focus.wait(el, true) })
    $$('[data-card]').forEach(c => cardIO.observe(c))
  }
  reveals()
  T.onMotion(() => raf(reveals))

  let mm = null
  function setup() {
    if (!hasGsap) return
    mm = G.matchMedia()
    mm.add({ desk: '(min-width: 720px) and (min-height: 600px)', phone: '(max-width: 719px), (max-height: 599px)' }, context => {
      const { desk } = context.conditions
      const cleanups = []
      cleanups.push(desk ? buildStageBrand() : buildPhoneBrand())
      cleanups.push(buildClose())
      return () => cleanups.forEach(fn => fn && fn())
    })
  }
  T.onMotion(() => {
    if (!mm) return
    mm.revert()
    setup()
    ST.refresh()
  })

  const MAX_RATE = 1 / 1.2
  function buildStageBrand() {
    if (!brand) return
    const full = T.motion === 'full'
    brand.setLights(full)
    if (!full) { brand.onPick = null; return () => brand.kill() }
    const chapter = $('#your-brand'), pin = $('.device-pin')
    const settle = () => chapter.getBoundingClientRect().top + scrollY + (parseFloat(getComputedStyle(chapter).paddingTop) || 0) - (parseFloat(getComputedStyle(pin).top) || 0)
    let detached = false, target = 0, drawn = 0, frame = 0, last = 0
    const step = now => {
      frame = 0
      if (detached) return
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const soft = (target - drawn) * (1 - Math.exp(-dt * 5))
      const cap = MAX_RATE * dt
      drawn += Math.max(-cap, Math.min(cap, soft))
      if (Math.abs(target - drawn) < 0.0005) drawn = target
      brand.scrub(drawn)
      if (drawn !== target) frame = raf(step)
    }
    const chase = () => { if (!frame && !detached && drawn !== target) { last = performance.now(); frame = raf(step) } }
    const stop = () => { cancelAnimationFrame(frame); frame = 0 }
    const scrollST = ST.create({
      trigger: chapter, start: () => settle(), end: () => settle() + 0.8 * innerHeight,
      onUpdate: self => { target = self.progress; chase() },
    })
    const snap = p => { stop(); detached = false; target = drawn = p; brand.scrub(p) }
    const visST = ST.create({
      trigger: chapter, start: 'top bottom', end: 'bottom top',
      onLeave: () => snap(1),
      onLeaveBack: () => snap(0),
    })
    brand.onPick = v => { stop(); detached = true; brand.toTheme(v) }
    return () => { stop(); scrollST.kill(); visST.kill(); brand.kill(); brand.onPick = null }
  }

  function buildPhoneBrand() {
    if (!brand) return
    const full = T.motion === 'full'
    brand.setLights(full)
    if (!full) { brand.onPick = null; return () => brand.kill() }
    const dev = $('.chapter--brand .device--inline')
    let t = 0
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return
      io.disconnect()
      t = setTimeout(() => brand.toTheme('yours'), 400)
    }, { threshold: 0.9 })
    if (dev) io.observe(dev)
    brand.onPick = v => { io.disconnect(); clearTimeout(t); brand.toTheme(v) }
    return () => { io.disconnect(); clearTimeout(t); brand.kill(); brand.onPick = null }
  }

  const INK_FROM = 14
  let closeDone = false
  function buildClose() {
    const section = $('[data-close]'), ground = $('.close__ground', section), cover = $('.cover', section)
    const mark = $('[data-ink]', section), g = $('[data-ink-g]', section), blur = $('[data-ink-blur]', section)
    const line = $('[data-close-line]', section), rest = $$('[data-close-rest]', section)
    if (closeDone) return
    if (T.motion === 'paused') return
    if (!belowFold(section)) return
    if (T.motion === 'reduced') return
    G.set(ground, { clipPath: 'inset(100% 0% 0% 0%)' })
    G.set(cover, { visibility: 'hidden' })
    G.set(mark, { opacity: 0 })
    Focus.wait(line, false)
    const restFrom = { clipPath: 'inset(100% -24px 0% -24px)', y: 16 }
    G.set(rest, restFrom)
    const st = ST.create({
      trigger: section, start: 'top 45%', once: true,
      onEnter: () => {
        closeDone = true
        const tl = (closeTimeline = G.timeline({ onComplete: () => { g.removeAttribute('filter'); closeTimeline = null } }))
        tl.to(ground, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'scene', onUpdate: T.navInk }, 0)
        tl.set(cover, { visibility: 'visible' }, 0.9)
        tl.add(() => { blur.setAttribute('stdDeviation', INK_FROM); g.setAttribute('filter', 'url(#ink)') }, 0.45)
        tl.to(mark, { opacity: 1, duration: 0.12, ease: 'none' }, 0.45)
        tl.to({ s: INK_FROM }, { s: 0, duration: 0.85, ease: 'house', onUpdate() { blur.setAttribute('stdDeviation', this.targets()[0].s.toFixed(3)) } }, 0.45)
        tl.add(() => Focus.play(line), 0.77)
        tl.fromTo(rest, restFrom, { clipPath: 'inset(0% -24px 0% -24px)', y: 0, snap: 'y', duration: 0.5, ease: 'house', stagger: 0.07, clearProps: 'clipPath,transform' }, 0.95)
      },
    })
    return () => { st.kill(); if (!closeDone) { Focus.finishAll(); G.set([mark, ground, cover, ...rest], { clearProps: 'all' }) } }
  }
  T.onMotion(m => {
    if (m === 'full' || !closeTimeline) return
    closeTimeline.progress(1)
  })

  addEventListener('beforeprint', () => {
    Focus.finishAll()
    T.charts?.finishAll()
    closeTimeline?.progress(1)
  })

  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/'
  const LIBS = [
    ['gsap.min.js', 'sha384-XmJ9SoHtVOHoQUcKvFAzVXwdkKo1Ie3bhmSoIAkcdsHGaIrVJIkmozyq0FJeb/Ly'],
    ['ScrollTrigger.min.js', 'sha384-wl5TeDVvOWt30Pbf8aSo2ZrzsOjddu3avOBvHe+p+OhJt9gP6w9YXmDkN5DK2/dF'],
    ['CustomEase.min.js', 'sha384-bk/dsRkKcZYqsQ8OzP86S+TVAAI6D7V0ApKLhj3ssXqZPNYYO77EXxOrTX+pp1g/'],
  ]
  const haveAll = () => !!(window.gsap && window.ScrollTrigger && window.CustomEase)
  function loadGsap(limit) {
    return new Promise(resolve => {
      if (haveAll()) return resolve(true)
      let done = false, left = LIBS.length
      const finish = ok => { if (!done) { done = true; resolve(ok) } }
      setTimeout(() => finish(false), limit)
      for (const [file, sri] of LIBS) {
        const s = document.createElement('script')
        s.src = CDN + file
        s.async = false
        s.crossOrigin = 'anonymous'
        s.integrity = sri
        s.onload = () => { if (--left === 0) finish(haveAll()) }
        s.onerror = () => finish(false)
        document.head.append(s)
      }
    })
  }
  loadGsap(4000).then(ok => {
    if (ok) {
      G = window.gsap; ST = window.ScrollTrigger; hasGsap = true; T.hasGsap = true
      G.registerPlugin(ST, window.CustomEase)
      window.CustomEase.create('house', 'M0,0 C0.22,1 0.36,1 1,1')
      window.CustomEase.create('draw', 'M0,0 C0.3,0 0.2,1 1,1')
      window.CustomEase.create('scene', 'M0,0 C0.65,0 0.35,1 1,1')
      ST.config({ ignoreMobileResize: true })
    } else {
      d.classList.remove('js')
      Stage.refresh()
    }
    setup()
    if (hasGsap) {
      document.fonts?.ready.then(() => ST.refresh())
      if (document.readyState === 'complete') ST.refresh()
      else addEventListener('load', () => ST.refresh(), { once: true })
    }
    readyResolve(hasGsap)
  })
})()
