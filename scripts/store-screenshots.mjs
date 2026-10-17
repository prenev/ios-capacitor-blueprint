// Renders the App Store screenshots from the real built app with seeded demo data.
// usage: npm run build && node scripts/store-screenshots.mjs   (needs playwright + chromium; writes store/screenshots/<size>/*.png)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const PORT = 5196, SIZES = { '6.9in-1320x2868': [440, 956], '6.5in-1284x2778': [428, 926] }
const DAY = 864e5, now = Date.now()
let n = 0; const id = () => 's' + (++n)
const set = (w, r, type = 'normal', done = true) => ({ id: id(), type, weight: w, reps: r, done })
const PLAN = {
  Push: [['Barbell_Bench_Press_-_Medium_Grip', 60, 2.5, 8], ['Standing_Military_Press', 40, 1.25, 8], ['Incline_Dumbbell_Press', 22, 1, 10], ['Side_Lateral_Raise', 8, 0.5, 12], ['Triceps_Pushdown', 25, 1.25, 12]],
  Pull: [['Pullups', 0, 0, 8], ['Bent_Over_Barbell_Row', 55, 2.5, 8], ['Seated_Cable_Rows', 45, 2.5, 10], ['Face_Pull', 20, 1.25, 14], ['Barbell_Curl', 25, 1.25, 10]],
  Legs: [['Barbell_Squat', 80, 2.5, 6], ['Romanian_Deadlift', 70, 2.5, 8], ['Leg_Press', 140, 5, 10], ['Lying_Leg_Curls', 35, 2.5, 12], ['Standing_Calf_Raises', 60, 2.5, 12]],
}
const mon = new Date(now); mon.setHours(7, 30, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
const workouts = []
for (let wk = 11; wk >= 0; wk--) {
  [['Push', 0], ['Pull', 1], ['Legs', 3], ['Push', 5]].forEach(([name, d], k) => {
    const start = mon.getTime() - wk * 7 * DAY + d * DAY + k * 3.6e5
    if (start > now - 3.6e6) return
    if ((wk * 7 + k * 3 + d) % 7 === 4) return   // a few missed sessions so the charts look human
    const prog = 11 - wk, step = Math.floor(prog * 0.7)   // plateaus: weight only goes up every ~1.5 weeks
    workouts.push({ id: id(), name, start, end: start + (52 + (prog % 3) * 4) * 60000, note: '', exercises: PLAN[name].map(([exerciseId, w0, inc, reps]) => {
      const w = w0 ? Math.round((w0 + inc * step) / 0.5) * 0.5 : 0
      return { id: id(), exerciseId, note: '', repMin: 6, repMax: 12, sets: [set(w ? Math.round(w * 0.6 / 2.5) * 2.5 : 0, reps, 'warmup'), set(w, reps + 1), set(w, reps), set(w, reps - (prog % 2))] }
    }) })
  })
}
// the latest session sets a couple of records so the workout screen shows them
workouts.sort((a, b) => a.start - b.start)
for (const e of workouts[workouts.length - 1].exercises.slice(0, 2)) for (const x of e.sets) if (x.type !== 'warmup') x.weight += 2.5
const body = Array.from({ length: 10 }, (_, i) => ({ id: id(), t: now - (9 - i) * 8 * DAY, kg: 82.4 - i * 0.35 + (i % 3) * 0.2 }))
const routines = Object.entries(PLAN).map(([name, ex]) => ({ id: 'r' + name, name, exercises: ex.map(([exerciseId]) => ({ exerciseId, sets: 4, repMin: 6, repMax: 12 })) }))
const data = { v: 1, workouts, routines, custom: [], body, settings: { unit: 'kg', rest: 90, increment: 2.5, goal: 4 } }
const active = { id: 'live', name: 'Push', start: now - 23 * 60000, end: 0, note: '', routineId: 'rPush', exercises: PLAN.Push.slice(0, 3).map(([exerciseId, w0, inc], i) => ({ id: id(), exerciseId, note: '', repMin: 6, repMax: 12, sets: [set(Math.round((w0 + inc * 8) / 0.5) * 0.5, 8, 'normal', true), set(Math.round((w0 + inc * 8) / 0.5) * 0.5, 8, 'normal', false), set(Math.round((w0 + inc * 8) / 0.5) * 0.5, 7, 'normal', false)] })) }

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 3000))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
const chrome = `
  :root { --safe-t: 59px !important; --safe-b: 34px !important; }
  #sb { position: fixed; top: 0; left: 0; right: 0; height: 54px; z-index: 9999; display: flex; justify-content: space-between; align-items: center; padding: 8px 34px 0 40px; font: 600 17px -apple-system, Inter, sans-serif; color: #fff; pointer-events: none; }
  #hi { position: fixed; bottom: 8px; left: 50%; width: 138px; height: 5px; margin-left: -69px; border-radius: 3px; background: #fff; z-index: 9999; pointer-events: none; }`
const shot = async (page, dir, name) => { await page.waitForTimeout(900); await page.screenshot({ path: `store/screenshots/${dir}/${name}.png` }) }

const BAR = '<div id="sb"><span>9:41</span><svg width="68" height="13" viewBox="0 0 68 13" fill="#fff"><rect x="0" y="8" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="8" rx="1"/><rect x="10" y="2" width="3" height="11" rx="1"/><rect x="15" y="0" width="3" height="13" rx="1"/><path d="M27 4a10 10 0 0 1 14 0l-1.6 1.7a7.6 7.6 0 0 0-10.8 0zM30 7.4a6 6 0 0 1 8 0L36.3 9a3.6 3.6 0 0 0-4.6 0zM34 11l-1.5-1.4a2 2 0 0 1 3 0z"/><rect x="46" y="0.5" width="19" height="12" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".5"/><rect x="48" y="2.5" width="15" height="8" rx="2"/><rect x="66" y="4.5" width="1.6" height="4" rx=".8" fill="#fff" fill-opacity=".5"/></svg></div><div id="hi"></div>'
const open = async (browser, w, h, withActive) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3 })
  await ctx.addInitScript(([d, a]) => { localStorage.setItem('plate.data', JSON.stringify(d)); if (a) localStorage.setItem('plate.active', JSON.stringify(a)) }, [data, withActive ? active : null])
  const p = await ctx.newPage()
  await p.goto(`http://localhost:${PORT}/`); await p.addStyleTag({ content: chrome })
  await p.evaluate(h => document.body.insertAdjacentHTML('beforeend', h), BAR); await p.waitForTimeout(600)
  return { ctx, p }
}
const back = p => p.locator('.layer .bar button').first().click()

for (const [dir, [w, h]] of Object.entries(SIZES)) {
  mkdirSync(`store/screenshots/${dir}`, { recursive: true })
  let { ctx, p } = await open(browser, w, h, false)
  await shot(p, dir, '1-train')
  await p.click('.webtabs >> text=Exercises'); await p.fill('.searchbar input', 'bench press'); await p.waitForTimeout(500)
  await p.locator('.row', { hasText: 'Barbell Bench Press - Medium Grip' }).first().click(); await shot(p, dir, '3-exercise'); await back(p)
  await p.fill('.searchbar input', ''); await p.click('.chips >> text=Back'); await shot(p, dir, '6-library')
  await p.click('.webtabs >> text=History'); await p.locator('.hcard').first().click(); await shot(p, dir, '4-workout'); await back(p)
  await p.click('.webtabs >> text=Stats'); await shot(p, dir, '5-stats')
  await ctx.close()
  ;({ ctx, p } = await open(browser, w, h, true))
  await p.locator('.cta.live').click(); await p.waitForTimeout(500)
  await p.locator('.ex').first().locator('.set').nth(1).locator('.check').click()   // starts the rest timer
  await shot(p, dir, '2-workout')
  await ctx.close()
}
await browser.close(); server.kill()
