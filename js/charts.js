(() => {
  const deck = document.querySelector('[data-deck]'), D = window.TELLS_DATA
  if (!deck || !D) return
  const T = window.Tells || (window.Tells = {})
  const d = document.documentElement
  const full = () => d.getAttribute('data-motion') === 'full'
  const NS = 'http://www.w3.org/2000/svg'
  const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e }
  const rr = (x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); const a = `A${r},${r} 0 0 1 `; return `M${x + r},${y}H${x + w - r}${a}${x + w},${y + r}V${y + h - r}${a}${x + w - r},${y + h}H${x + r}${a}${x},${y + h - r}V${y + r}${a}${x + r},${y}Z` }
  const svgIn = (plot, w, h) => {
    plot.querySelector('svg')?.remove()
    const s = el('svg', { class: 'plot-svg', width: w, height: h, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true', focusable: 'false' })
    plot.prepend(s); return s
  }
  const lin = c => (c /= 255) <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4
  const enc = v => Math.round(255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055))
  const KEYS = { lit: [[248, 251, 92], [244, 249, 28], .22, .6], rest: [[168, 168, 156], [168, 168, 156], .30, .5] }
  const keyDefs = (s, id) => {
    const df = el('defs', {}, s), lg = n => el('linearGradient', { id: id + n, x1: 0, y1: 0, x2: 0, y2: 1 }, df)
    for (const k in KEYS) {
      const [a, b, sh, end] = KEYS[k], A = a.map(lin), B = b.map(lin), g = lg('-' + k), h = lg('-' + k + 's'), n = a + '' === b + '' ? 1 : 9
      for (let i = 0; i < n; i++) el('stop', { offset: i / 8, 'stop-color': `rgb(${A.map((v, j) => enc(v + (B[j] - v) * i / 8))})` }, g)
      el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': sh }, h); el('stop', { offset: end, 'stop-color': '#fff', 'stop-opacity': 0 }, h)
    }
    return df
  }
  const key = (p, shape, x, y, w, h, r, id, lit, a = {}) => {
    const k = lit ? 'lit' : 'rest', g = el('g', { ...a, class: `key k-${k} ${a.class || ''}`.trim() }, p), dd = shape(x, y, w, h, r)
    el('path', { d: dd, fill: `url(#${id}-${k})` }, g)
    el('path', { d: dd, fill: `url(#${id}-${k}s)` }, g)
    el('path', { d: shape(x + .5, y + .5, w - 1, h - 1, r - .5), class: 'k-edge' }, g)
    return g
  }
  const bez = (x1, y1, x2, y2) => p => {
    const f = (a, b, t) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3
    let t = p
    for (let i = 0; i < 8; i++) { const dx = f(x1, x2, t) - p, s = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * (1 - t) * t + 3 * (1 - x2) * t * t; if (Math.abs(dx) < 1e-4 || !s) break; t -= dx / s }
    return f(y1, y2, Math.min(1, Math.max(0, t)))
  }
  const house = bez(.22, 1, .36, 1)

  const R = 16 / 45.41

  function waffle(plot) {
    const w = plot.clientWidth
    if (!w) return
    const pad = 10, inner = w - 2 * pad
    const sq = Math.floor(inner / 11.2), gap = Math.max(3, Math.floor((inner - 10 * sq) / 9)), r = Math.round(sq * R)
    const well = 10 * sq + 9 * gap + 2 * pad, o = Math.floor((w - well) / 2), n = D.frequency[0].pct
    const s = svgIn(plot, w, w)
    plot.parentNode.style.setProperty('--under', w - o - well + 'px')
    keyDefs(s, 'kw')
    el('path', { d: rr(o, o, well, well, r + pad), class: 'well' }, s)
    const at = i => [o + pad + (i % 10) * (sq + gap), o + pad + Math.floor(i / 10) * (sq + gap)]
    for (let i = 0; i < 100; i++) key(s, rr, ...at(i), sq, sq, r, 'kw', false)
    for (let i = 0; i < n; i++) key(s, rr, ...at(i), sq, sq, r, 'kw', true, { class: 'key-on', style: `--i:${i}` })
  }

  function bars(plot) {
    const w = plot.clientWidth, h = plot.clientHeight
    if (!w || !h) return
    const rows = D.season.rows, n = rows.length, max = rows[0].pct
    const pad = 10, top = 36, base = Math.round(h - 46 - pad), slot = (w - 2 * pad) / n, bw = Math.min(n > 4 ? 44 : 72, Math.round(slot * .5)), every = slot < 34 ? 2 : 1
    const r = Math.min(Math.round(bw * .25), 8)
    const s = svgIn(plot, w, h)
    el('rect', { x: 0, y: 0, width: w, height: base }, el('clipPath', { id: 'm-bars-clip' }, keyDefs(s, 'kb')))
    el('path', { d: rr(0, 0, w, base + pad, r + pad), class: 'well' }, s)
    const g = el('g', { 'clip-path': 'url(#m-bars-clip)' }, s)
    rows.forEach((row, i) => {
      const x = Math.round(pad + i * slot + (slot - bw) / 2), bh = Math.round((base - top) * row.pct / max), y = base - bh, cx = x + bw / 2
      key(g, rr, x, y, bw, bh, r, 'kb', i === n - 1, { class: 'col', style: `--i:${i};--h:${bh}px` })
      el('text', { x: cx, y: y - 8, 'text-anchor': 'middle', class: 't-val', style: `--i:${i}` }, s).textContent = row.pct + '%'
      if (i % every === 0) el('text', { x: cx, y: base + pad + 19, 'text-anchor': 'middle' }, s).textContent = row.bucket
    })
    el('text', { x: w / 2, y: base + pad + 42, 'text-anchor': 'middle', class: 't-title' }, s).textContent = 'NFL bettors still betting, 2023–24 season'
  }

  const plots = [...deck.querySelectorAll('[data-plot]')]
  const drawers = { waffle, bars }
  const redraw = p => drawers[p.dataset.plot]?.(p)
  plots.forEach(redraw)
  if ('ResizeObserver' in window) {
    const seen = new WeakMap()
    const ro = new ResizeObserver(es => es.forEach(e => {
      const k = Math.round(e.contentRect.width) + 'x' + Math.round(e.contentRect.height)
      if (seen.get(e.target) !== k) { seen.set(e.target, k); redraw(e.target) }
    }))
    plots.forEach(p => drawers[p.dataset.plot] && ro.observe(p))
  }

  const unit = e => e.dataset.unit || '%'
  const show = e => { e.textContent = (+e.dataset.count).toFixed(+e.dataset.dec || 0) + unit(e) }
  const counts = {
    waffle: { from: (t, n) => Math.min(n, Math.max(0, Math.floor((t - .1) / .035) + 1)), end: n => .1 + n * .035 },
    bars: { from: (t, n, k) => Math.round(n * k * house(Math.min(1, t / .6))) / k, end: () => .6 },
    lock: { from: (t, n, k) => Math.round(n * k * house(Math.min(1, Math.max(0, t - .1) / .9))) / k, end: () => 1 },
  }
  function count(e) {
    if (e.dataset.done) return
    e.dataset.done = '1'
    e.removeAttribute('data-wait')
    const c = counts[e.dataset.kind], t0 = performance.now(), dec = +e.dataset.dec || 0, n = +e.dataset.count, end = c.end(n)
    const tick = now => {
      const t = (now - t0) / 1000
      if (!full() || t >= end) return show(e)
      e.textContent = c.from(t, n, 10 ** dec).toFixed(dec) + unit(e)
      requestAnimationFrame(tick)
    }
    tick(t0)
  }

  const finishAll = () => {
    plots.forEach(p => p.classList.add('is-in', 'is-done'))
    deck.querySelectorAll('[data-count]').forEach(e => { e.dataset.done = '1'; e.removeAttribute('data-wait'); show(e) })
  }
  T.charts = { finishAll }
  if (!full() || !('IntersectionObserver' in window)) return finishAll()
  const twoUp = matchMedia('(min-width: 900px), (min-width: 720px) and (max-height: 520px)')
  const inView = e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight }
  const numberOf = p => p.closest('[data-card]').querySelector('[data-count]')
  const plotOf = n => n.closest('[data-card]').querySelector('[data-plot]')
  plots.forEach(p => { if (inView(p)) { p.classList.add('is-in', 'is-done'); numberOf(p).dataset.done = '1' } })
  deck.querySelectorAll('[data-count]').forEach(e => { if (inView(e)) e.dataset.done = '1'; else if (!e.dataset.done) e.dataset.wait = '' })
  deck.classList.add('is-armed')
  const go = p => {
    if (!p || p.classList.contains('is-in')) return
    io.unobserve(p)
    p.classList.add('is-in')
    if (p.dataset.plot !== 'live') setTimeout(() => p.classList.add('is-done'), 2400)
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return
    go(e.target)
    if (twoUp.matches) count(numberOf(e.target))
  }), { threshold: .5 })
  plots.forEach(p => !p.classList.contains('is-in') && io.observe(p))
  const nio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return
    nio.unobserve(e.target)
    count(e.target)
    if (twoUp.matches) go(plotOf(e.target))
  }), { threshold: .5 })
  deck.querySelectorAll('[data-count]').forEach(e => !e.dataset.done && nio.observe(e))
  new MutationObserver(() => { if (!full()) finishAll() }).observe(d, { attributes: true, attributeFilter: ['data-motion'] })
  addEventListener('beforeprint', finishAll)
})()

;(() => {
  const p = document.querySelector('[data-plot="live"]'), s = p?.firstElementChild
  if (!s) return
  const d = document.documentElement, next = p.closest('[data-card]').nextElementSibling
  const still = s.getAttribute('aria-label'), cycle = s.dataset.cycle
  let seen = 0, under = 0, raf = 0
  const set = () => p.classList.toggle('is-off', !seen || under)
  new IntersectionObserver(e => { seen = e[0].isIntersecting; set() }).observe(p)
  const cover = () => { raf = 0; under = !!next && next.getBoundingClientRect().top <= p.getBoundingClientRect().top; set() }
  addEventListener('scroll', () => { raf ||= requestAnimationFrame(cover) }, { passive: true })
  const motion = () => {
    const full = d.dataset.motion === 'full'
    s.setAttribute('aria-label', full ? cycle : still)
    if (!full && p.classList.contains('is-in')) p.classList.add('is-done')
  }
  new MutationObserver(motion).observe(d, { attributes: true, attributeFilter: ['data-motion'] })
  motion(); cover()
})()

;(() => {
  const deck = document.querySelector('[data-deck]')
  if (!deck) return
  const cards = [...deck.querySelectorAll('[data-card]')]
  const stacked = () => getComputedStyle(cards[0]).position === 'sticky'
  const flowTop = i => {
    let y = deck.getBoundingClientRect().top + scrollY
    for (let k = 0; k <= i; k++) { const cs = getComputedStyle(cards[k]); y += parseFloat(cs.marginTop) + (k < i ? cards[k].offsetHeight : 0) }
    return y
  }
  const restTop = i => (stacked() ? parseFloat(getComputedStyle(cards[i]).top) : 88)
  const goTo = i => scrollTo({ top: Math.max(0, flowTop(i) - restTop(i)), behavior: 'instant' })
  const reading = () => { let r = -1; cards.forEach((c, i) => { const b = c.getBoundingClientRect(); if (b.top < innerHeight / 2 && b.bottom > 0) r = i }); return r }

  const px = (c, k) => parseFloat(getComputedStyle(c)[k]) || 0
  function fit() {
    deck.removeAttribute('data-fit')
    if (stacked()) {
      const need = Math.max(...cards.map(c => Math.ceil(px(c, 'paddingTop') + c.querySelector('.mcard__in').offsetHeight + px(c, 'paddingBottom'))))
      deck.style.setProperty('--card-fit', need + 'px')
      if (cards.some(c => c.scrollHeight > c.clientHeight + 1)) deck.setAttribute('data-fit', 'no')
    }
  }
  let was = stacked(), place = -1, tick = 0
  const note = () => { tick = 0; place = reading() }
  addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(note) }, { passive: true })
  const settle = () => {
    fit()
    const now = stacked()
    if (now !== was && place >= 0) goTo(place)
    was = now
  }
  let raf = 0
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(settle) })
  new MutationObserver(settle).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
  fit(); was = stacked(); note()
  document.fonts?.ready.then(() => { fit(); was = stacked() })

  deck.addEventListener('focusin', e => {
    if (!stacked()) return
    const i = cards.findIndex(c => c.contains(e.target))
    if (i >= 0 && i < cards.length - 1 && cards[i + 1].getBoundingClientRect().top < innerHeight) goTo(i)
  })
  const fromHash = () => { const t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1))); const i = t ? cards.findIndex(c => c.contains(t)) : -1; if (i >= 0 && stacked()) goTo(i) }
  addEventListener('hashchange', fromHash)
  if (location.hash) addEventListener('load', fromHash, { once: true })
})()
