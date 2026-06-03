/**
 * Seed a demo user with rich realistic data.
 * Exports seedDemoUser(pool) — safe to call from the auth route on first access.
 * CLI:  npx ts-node src/db/seed-demo.ts
 */

import { Pool } from 'pg'
import { pool as defaultPool } from './pool'

export const DEMO_GOOGLE_ID = 'DEMO_USER_2024'

// ── helpers ────────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function monthStr(offset = 0): string {
  const d = new Date()
  d.setMonth(d.getMonth() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function seedDemoUser(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ── 1. Demo user ──────────────────────────────────────────────────────────
    const { rows: [user] } = await client.query<{ id: number }>(`
      INSERT INTO users (google_id, email, name, picture)
      VALUES ($1, 'demo@personaldashboard.app', 'Alex Demo', NULL)
      ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [DEMO_GOOGLE_ID])
    const uid = user.id
    console.log(`Demo user id: ${uid}`)

    // ── 2. Transactions (3 months) ────────────────────────────────────────────
    await client.query(`DELETE FROM transactions WHERE user_id = $1`, [uid])

    const txData: [string, string, number, string, string, string][] = []

    for (let m = 0; m <= 2; m++) {
      const mo = monthStr(m)
      const yr = parseInt(mo.slice(0, 4))
      const mn = parseInt(mo.slice(5, 7))

      // Income
      txData.push([`${mo}-01`, 'Monthly Salary', 350000, 'income', 'Income', mo])
      if (m === 0) txData.push([`${mo}-15`, 'Freelance Project', 85000, 'income', 'Income', mo])

      // Fixed
      txData.push([`${mo}-01`, 'Rent', 120000, 'expense', 'Fixed', mo])
      txData.push([`${mo}-02`, 'Internet', 2500, 'expense', 'Fixed', mo])
      txData.push([`${mo}-03`, 'Gym Membership', 3900, 'expense', 'Fixed', mo])
      txData.push([`${mo}-05`, 'Spotify', 999, 'expense', 'Entertainment', mo])
      txData.push([`${mo}-05`, 'Netflix', 1299, 'expense', 'Entertainment', mo])
      txData.push([`${mo}-10`, 'Health Insurance', 15000, 'expense', 'Health', mo])
      txData.push([`${mo}-10`, 'Phone Bill', 2900, 'expense', 'Fixed', mo])

      // Market/Groceries
      for (const d of [4, 8, 13, 18, 23, 27]) {
        const stores = ['Lidl', 'Aldi', 'Kaufland', 'Rewe']
        const s = stores[d % stores.length]
        const amt = 1500 + Math.floor(Math.random() * 3500)
        const day = String(Math.min(d, new Date(yr, mn, 0).getDate())).padStart(2, '0')
        txData.push([`${mo}-${day}`, s, amt, 'expense', 'Market', mo])
      }

      // Restaurants
      txData.push([`${mo}-06`, 'Pizza Roma', 2200, 'expense', 'Market', mo])
      txData.push([`${mo}-12`, 'Café Central', 850, 'expense', 'Market', mo])
      txData.push([`${mo}-19`, 'Sushi Garden', 3400, 'expense', 'Market', mo])

      // Health
      txData.push([`${mo}-14`, 'Pharmacy', 1800, 'expense', 'Health', mo])

      // Education
      txData.push([`${mo}-01`, 'Udemy Course', 1499, 'expense', 'Education', mo])

      // Investment
      txData.push([`${mo}-20`, 'ETF Buy — VWCE', 50000, 'expense', 'Investment', mo])
      if (m === 1) txData.push([`${mo}-20`, 'ETF Buy — VWCE', 50000, 'expense', 'Investment', mo])
    }

    for (const [date, name, amount, type, category, month] of txData) {
      await client.query(`
        INSERT INTO transactions (date, name, amount, type, category, source, month, user_id)
        VALUES ($1, $2, $3, $4, $5, 'manual', $6, $7)
      `, [date, name, amount, type, category, month, uid])
    }

    // ── 3. Budgets ────────────────────────────────────────────────────────────
    const budgets: [string, number][] = [
      ['Fixed', 150000], ['Market', 45000], ['Health', 20000],
      ['Entertainment', 10000], ['Education', 5000], ['Investment', 60000],
    ]
    for (const [category, amount] of budgets) {
      await client.query(`
        INSERT INTO budgets (user_id, category, amount)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, category) DO UPDATE SET amount = $3
      `, [uid, category, amount])
    }

    // ── 4. Foods ──────────────────────────────────────────────────────────────
    await client.query(`DELETE FROM foods WHERE user_id = $1`, [uid])
    const foods: [string, string, number, string][] = [
      ['Oats', 'carbs', 389, '🌾'],
      ['Eggs', 'protein', 155, '🥚'],
      ['Chicken Breast', 'protein', 165, '🍗'],
      ['Brown Rice', 'carbs', 216, '🍚'],
      ['Broccoli', 'vegetable', 34, '🥦'],
      ['Banana', 'fruit', 89, '🍌'],
      ['Greek Yogurt', 'dairy', 97, '🥛'],
      ['Almonds', 'fat', 579, '🫘'],
      ['Salmon', 'protein', 208, '🐟'],
      ['Sweet Potato', 'carbs', 86, '🍠'],
      ['Apple', 'fruit', 52, '🍎'],
      ['Cottage Cheese', 'dairy', 98, '🧀'],
      ['Whole Wheat Bread', 'carbs', 247, '🍞'],
      ['Olive Oil', 'fat', 884, '🫒'],
      ['Spinach', 'vegetable', 23, '🥬'],
    ]
    const foodIds: number[] = []
    for (const [name, category, cal, emoji] of foods) {
      const { rows: [f] } = await client.query<{ id: number }>(`
        INSERT INTO foods (user_id, name, category, calories_per_100g, emoji)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `, [uid, name, category, cal, emoji])
      foodIds.push(f.id)
    }

    // ── 5. Meal logs (last 7 days) ────────────────────────────────────────────
    await client.query(`DELETE FROM meal_logs WHERE user_id = $1`, [uid])
    const mealPlans = [
      {
        breakfast: [[0, 80], [1, 50]],   // oats + eggs
        lunch:     [[2, 150], [3, 120], [4, 100]], // chicken + rice + broccoli
        dinner:    [[8, 150], [3, 100], [14, 80]], // salmon + rice + spinach
        snack:     [[6, 200], [7, 30]],  // yogurt + almonds
      },
      {
        breakfast: [[1, 100], [0, 60]],
        lunch:     [[2, 120], [9, 150], [14, 80]],
        dinner:    [[2, 130], [10, 80], [4, 120]],
        snack:     [[5, 150], [10, 120]],
      },
    ]
    for (let day = 0; day < 7; day++) {
      const plan = mealPlans[day % 2]
      const date = daysAgo(day)
      for (const [mealType, pairs] of Object.entries(plan) as [string, [number, number][]][]) {
        const items = pairs.map(([fi, g]) => ({
          food_id: foodIds[fi] ?? foodIds[0],
          name: foods[fi]?.[0] ?? 'Unknown',
          emoji: foods[fi]?.[3] ?? '',
          amount_g: g,
          calories: Math.round((foods[fi]?.[2] ?? 100) * g / 100),
        }))
        await client.query(`
          INSERT INTO meal_logs (user_id, date, meal_type, items)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, date, meal_type) DO UPDATE SET items = $4
        `, [uid, date, mealType, JSON.stringify(items)])
      }
    }

    // ── 6. Shopping sessions ──────────────────────────────────────────────────
    await client.query(`DELETE FROM shopping_sessions WHERE user_id = $1`, [uid])
    const shopSessions = [
      { date: daysAgo(3), items: ['Milk', 'Eggs', 'Bread', 'Chicken', 'Broccoli', 'Yogurt', 'Oats', 'Bananas'] },
      { date: daysAgo(10), items: ['Salmon', 'Rice', 'Spinach', 'Almonds', 'Olive Oil', 'Sweet Potato', 'Apples', 'Cheese'] },
      { date: daysAgo(17), items: ['Milk', 'Eggs', 'Chicken', 'Pasta', 'Tomatoes', 'Onions', 'Garlic', 'Yogurt', 'Bananas'] },
    ]
    for (const { date, items } of shopSessions) {
      await client.query(`
        INSERT INTO shopping_sessions (user_id, date, items)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, date) DO UPDATE SET items = $3
      `, [uid, date, JSON.stringify(items)])
    }

    // ── 7. Exercises ──────────────────────────────────────────────────────────
    await client.query(`DELETE FROM exercises WHERE user_id = $1`, [uid])
    const exercises: [string, string, string[]][] = [
      ['Push-ups', 'calisthenics', ['chest', 'triceps', 'shoulders']],
      ['Pull-ups', 'calisthenics', ['back', 'biceps']],
      ['Squats', 'calisthenics', ['quads', 'glutes', 'hamstrings']],
      ['Bench Press', 'weights', ['chest', 'triceps']],
      ['Deadlift', 'weights', ['back', 'glutes', 'hamstrings']],
      ['Overhead Press', 'weights', ['shoulders', 'triceps']],
      ['Running', 'cardio', ['cardio']],
      ['Plank', 'calisthenics', ['core']],
      ['Dips', 'calisthenics', ['triceps', 'chest']],
      ['Barbell Row', 'weights', ['back', 'biceps']],
    ]
    const exIds: number[] = []
    for (const [name, type, muscles] of exercises) {
      const { rows: [ex] } = await client.query<{ id: number }>(`
        INSERT INTO exercises (user_id, name, type, muscle_groups)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [uid, name, type, muscles])
      exIds.push(ex.id)
    }

    // ── 8. Workout templates ──────────────────────────────────────────────────
    await client.query(`DELETE FROM workout_templates WHERE user_id = $1`, [uid])
    const { rows: [tmpl] } = await client.query<{ id: number }>(`
      INSERT INTO workout_templates (user_id, name, exercises)
      VALUES ($1, 'Full Body A', $2) RETURNING id
    `, [uid, JSON.stringify([
      { exercise_id: exIds[0], sets: 3, reps: 15, weight: 0 },
      { exercise_id: exIds[2], sets: 3, reps: 12, weight: 0 },
      { exercise_id: exIds[4], sets: 3, reps: 8, weight: 8000 },
      { exercise_id: exIds[7], sets: 3, reps: 60, weight: 0 },
    ])])

    // ── 9. Workout logs (last 14 days, every 2-3 days) ────────────────────────
    await client.query(`DELETE FROM workout_logs WHERE user_id = $1`, [uid])
    const workoutDays = [1, 3, 6, 8, 11, 13]
    for (const day of workoutDays) {
      await client.query(`
        INSERT INTO workout_logs (user_id, template_id, date, duration_min, sets, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [uid, tmpl.id, daysAgo(day), 45 + (day % 3) * 10, JSON.stringify([
        { exercise_id: exIds[0], sets: [{ reps: 15, weight: 0 }, { reps: 15, weight: 0 }, { reps: 12, weight: 0 }] },
        { exercise_id: exIds[2], sets: [{ reps: 12, weight: 0 }, { reps: 12, weight: 0 }, { reps: 10, weight: 0 }] },
        { exercise_id: exIds[4], sets: [{ reps: 8, weight: 8000 }, { reps: 6, weight: 8000 }] },
      ]), day === 1 ? 'Great session!' : day === 3 ? 'Felt strong today' : null])
    }

    // ── 10. Body weight ───────────────────────────────────────────────────────
    await client.query(`DELETE FROM body_weight WHERE user_id = $1`, [uid])
    const weights = [78.2, 78.0, 77.9, 78.1, 77.8, 77.7, 77.6, 77.5, 77.4, 77.3, 77.2, 77.1]
    for (let i = 0; i < weights.length; i++) {
      await client.query(`
        INSERT INTO body_weight (user_id, date, weight_kg)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, date) DO UPDATE SET weight_kg = $3
      `, [uid, daysAgo(i * 2), weights[i]])
    }

    // ── 11. Fitness targets ───────────────────────────────────────────────────
    await client.query(`DELETE FROM fitness_targets WHERE user_id = $1`, [uid])
    const targets: [string, string, number, number][] = [
      ['Push-ups in a row', 'reps', 50, 28],
      ['Pull-ups', 'reps', 15, 8],
      ['5K run time', 'minutes', 25, 31],
      ['Body weight', 'kg', 75, 78.2],
    ]
    for (const [name, unit, target, current] of targets) {
      await client.query(`
        INSERT INTO fitness_targets (user_id, name, unit, target_value, current_value)
        VALUES ($1, $2, $3, $4, $5)
      `, [uid, name, unit, target, current])
    }

    // ── 12. Vocabulary cards ──────────────────────────────────────────────────
    await client.query(`DELETE FROM vocabulary WHERE user_id = $1`, [uid])
    const vocab: [string, string, string, string][] = [
      ['die Gesundheit', 'health', 'de', 'Gesundheit ist das Wichtigste.'],
      ['der Haushalt', 'household / budget', 'de', 'Ich manage meinen Haushalt gut.'],
      ['sparen', 'to save (money)', 'de', 'Ich versuche jeden Monat zu sparen.'],
      ['die Ausgaben', 'expenses', 'de', 'Meine monatlichen Ausgaben sind hoch.'],
      ['das Einkommen', 'income', 'de', 'Mein Einkommen ist gestiegen.'],
      ['die Investition', 'investment', 'de', 'Eine gute Investition zahlt sich aus.'],
      ['nachhaltig', 'sustainable', 'de', 'Ein nachhaltiger Lebensstil ist wichtig.'],
      ['der Fortschritt', 'progress', 'de', 'Ich mache guten Fortschritt.'],
      ['das Ziel', 'goal', 'de', 'Mein Ziel ist ein gesundes Leben.'],
      ['die Ernährung', 'nutrition / diet', 'de', 'Eine gute Ernährung ist entscheidend.'],
    ]
    for (let i = 0; i < vocab.length; i++) {
      const [word, translation, lang, example] = vocab[i]
      await client.query(`
        INSERT INTO vocabulary (user_id, word, translation, language, example, due_at, ease_factor, repetitions, interval)
        VALUES ($1, $2, $3, $4, $5, $6, 2.5, $7, $8)
      `, [uid, word, translation, lang, example, daysAgo(i < 4 ? -1 : i < 7 ? 2 : 5), i < 4 ? 0 : 1, i < 4 ? 1 : 4])
    }

    // ── 13. Notes ─────────────────────────────────────────────────────────────
    await client.query(`DELETE FROM notebook_notes WHERE user_id = $1`, [uid])
    const notes = [
      { title: 'Investment Strategy', folder: 'Finance', content: `# My Investment Strategy

## Core Principles
- **Pay yourself first** — invest 20% before spending
- **Index funds** over individual stocks
- **Long-term horizon** — stay the course

## Current Allocation
- 70% VWCE (World ETF)
- 20% Emergency fund (TAGESGELD)
- 10% Crypto (BTC/ETH)

## Monthly targets
- ETF: €500/month automatic buy
- Emergency fund target: 6 months expenses (~€9,000)
` },
      { title: 'Linux-Basics', folder: 'Linux', content: `# Linux Essential Commands

## File System
\`\`\`bash
ls -la          # list with permissions
cd ~            # home directory
pwd             # current path
find . -name "*.ts"   # find files
\`\`\`

## Process Management
\`\`\`bash
ps aux          # list processes
kill -9 <pid>   # force kill
top             # live processes
htop            # interactive top
\`\`\`
` },
      { title: 'Fitness Goals 2026', folder: null, content: `# Fitness Goals

## End of Year Targets
- [ ] 50 push-ups in a row
- [ ] 15 pull-ups
- [ ] Run 5K under 25 min
- [ ] Body weight: 75 kg

## Weekly Schedule
- Mon: Upper body
- Wed: Lower body + core
- Fri: Full body
- Sat/Sun: Cardio / rest

## Notes
Consistency > Intensity. Don't miss two days in a row.
` },
      { title: 'German Learning Notes', folder: 'Learn', content: `# German Study Plan

## Daily Habits
- 30 min vocabulary review (flashcards)
- 1 podcast episode while commuting
- Write 3 sentences in a journal

## Resources
- Anki decks for vocab
- Deutsche Welle podcast
- Netflix shows in German with subtitles

## Current level: B1 → aiming for B2 by end of year
` },
    ]
    for (const { title, folder, content } of notes) {
      await client.query(`
        INSERT INTO notebook_notes (user_id, title, content, folder)
        VALUES ($1, $2, $3, $4)
      `, [uid, title, content, folder])
    }

    // ── 14. Reminders ─────────────────────────────────────────────────────────
    await client.query(`DELETE FROM reminders WHERE user_id = $1`, [uid])
    const tomorrow = daysAgo(-1)
    const nextWeek = daysAgo(-7)
    const reminders = [
      { title: 'Review monthly budget', note: 'Check spending vs targets for this month', due: `${daysAgo(0)}T18:00:00`, done: false },
      { title: 'Buy groceries', note: 'Lidl & Aldi run', due: `${tomorrow}T10:00:00`, done: false },
      { title: 'German B2 exam registration', note: 'Deadline for Goethe Institut registration', due: `${nextWeek}T09:00:00`, done: false },
      { title: 'ETF auto-buy scheduled', note: '€500 VWCE', due: `${monthStr()}-20T08:00:00`, done: false },
      { title: 'Dentist appointment', note: 'Annual check-up', due: `${daysAgo(-3)}T14:30:00`, done: false },
    ]
    for (const r of reminders) {
      await client.query(`
        INSERT INTO reminders (user_id, title, note, due_at, done)
        VALUES ($1, $2, $3, $4, $5)
      `, [uid, r.title, r.note, r.due, r.done])
    }

    // ── 15. Daily plans ───────────────────────────────────────────────────────
    await client.query(`DELETE FROM daily_plans WHERE user_id = $1`, [uid])
    const plans = [
      {
        date: daysAgo(0),
        tasks: [
          { id: '1', text: '30 min German vocabulary review', done: true },
          { id: '2', text: 'Morning workout (upper body)', done: true },
          { id: '3', text: 'Review monthly budget report', done: false },
          { id: '4', text: 'Cook meal prep for the week', done: false },
          { id: '5', text: 'Read 20 pages', done: false },
        ],
        notes: 'Focus on consistency. Every small action counts toward the big goal.',
      },
      {
        date: daysAgo(1),
        tasks: [
          { id: '1', text: '100 push-ups, 30 pull-ups, 60 leg raises', done: true },
          { id: '2', text: 'Read 20m', done: true },
          { id: '3', text: 'ETF portfolio check', done: true },
          { id: '4', text: 'Call parents', done: false },
        ],
        notes: 'Great day overall. Keep the momentum going!',
      },
      {
        date: daysAgo(2),
        tasks: [
          { id: '1', text: 'Grocery run (Lidl)', done: true },
          { id: '2', text: 'Study German B2 material', done: true },
          { id: '3', text: 'Evening run 5K', done: true },
        ],
        notes: '',
      },
    ]
    for (const { date, tasks, notes } of plans) {
      await client.query(`
        INSERT INTO daily_plans (user_id, date, tasks, notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, date) DO UPDATE SET tasks = $3, notes = $4
      `, [uid, date, JSON.stringify(tasks), notes])
    }

    // ── 16. Journal entries ───────────────────────────────────────────────────
    await client.query(`DELETE FROM journal_entries WHERE user_id = $1`, [uid])
    const journals = [
      {
        date: daysAgo(0),
        content: "Felt really productive today. Managed to stick to the meal plan and got a solid workout in. The budget review was a bit stressful — spent more on restaurants than planned this month. Need to cook at home more.",
        went_well: ['Morning workout', 'Meal prep done'],
        went_bad: ['Overspent on dining out'],
      },
      {
        date: daysAgo(1),
        content: "Good day. Hit all my fitness targets. Finished the Udemy course section on TypeScript generics. German practice is going well — understood a whole podcast episode without subtitles for the first time!",
        went_well: ['German comprehension breakthrough', 'Full workout completed', 'Stayed on budget'],
        went_bad: ['Stayed up too late'],
      },
      {
        date: daysAgo(2),
        content: "Lighter day. Did groceries and some meal prep. Reviewed my investment portfolio — VWCE is up 3.2% this month. Feeling confident about the long-term plan.",
        went_well: ['Grocery run done', 'Portfolio review', 'Good sleep'],
        went_bad: [],
      },
    ]
    for (const { date, content, went_well, went_bad } of journals) {
      await client.query(`
        INSERT INTO journal_entries (user_id, date, content, went_well, went_bad)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, date) DO UPDATE SET content=$3, went_well=$4, went_bad=$5
      `, [uid, date, content, went_well, went_bad])
    }

    // ── 17. ETF watchlist ─────────────────────────────────────────────────────
    await client.query(`DELETE FROM etf_watchlist WHERE user_id = $1`, [uid])
    for (const ticker of ['VWCE', 'CSPX', 'EUNL', 'ZPRV', 'IUSN']) {
      await client.query(`
        INSERT INTO etf_watchlist (user_id, ticker)
        VALUES ($1, $2)
        ON CONFLICT (ticker) DO NOTHING
      `, [uid, ticker])
    }

    await client.query('COMMIT')
    console.log('✓ Demo data seeded successfully')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Seed failed:', err)
    throw err
  } finally {
    client.release()
  }
}

// CLI entrypoint: npx ts-node src/db/seed-demo.ts
if (require.main === module) {
  seedDemoUser(defaultPool)
    .then(() => { console.log('Done'); defaultPool.end() })
    .catch(e => { console.error(e); process.exit(1) })
}
