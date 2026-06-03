/**
 * Seed a demo user with generic, universally relatable data.
 * Exports seedDemoUser(pool) — safe to call from the auth route on first access.
 * CLI:  npx ts-node src/db/seed-demo.ts
 */

import { Pool } from 'pg'
import { pool as defaultPool } from './pool'

export const DEMO_GOOGLE_ID = 'DEMO_USER_2024'

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
      VALUES ($1, 'demo@personaldashboard.app', 'Demo User', NULL)
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
      const daysInMonth = new Date(yr, mn, 0).getDate()
      const day = (d: number) => String(Math.min(d, daysInMonth)).padStart(2, '0')

      // Income
      txData.push([`${mo}-01`, 'Monthly Salary', 420000, 'income', 'Income', mo])
      if (m === 0) txData.push([`${mo}-15`, 'Bonus Payment', 60000, 'income', 'Income', mo])

      // Fixed
      txData.push([`${mo}-01`, 'Rent', 130000, 'expense', 'Fixed', mo])
      txData.push([`${mo}-03`, 'Utilities', 4500, 'expense', 'Fixed', mo])
      txData.push([`${mo}-03`, 'Internet', 2900, 'expense', 'Fixed', mo])
      txData.push([`${mo}-05`, 'Mobile Plan', 1500, 'expense', 'Fixed', mo])
      txData.push([`${mo}-05`, 'Gym Membership', 4500, 'expense', 'Fixed', mo])
      txData.push([`${mo}-07`, 'Streaming Service', 1500, 'expense', 'Entertainment', mo])
      txData.push([`${mo}-07`, 'Music Subscription', 1000, 'expense', 'Entertainment', mo])
      txData.push([`${mo}-10`, 'Health Insurance', 12000, 'expense', 'Health', mo])

      // Groceries (generic)
      for (const [d, amt] of [[4, 3800], [9, 4200], [14, 3500], [19, 4600], [24, 3900], [28, 4100]] as [number, number][]) {
        txData.push([`${mo}-${day(d)}`, 'Grocery Store', amt, 'expense', 'Market', mo])
      }

      // Dining
      txData.push([`${mo}-${day(6)}`,  'Restaurant',   3200, 'expense', 'Market', mo])
      txData.push([`${mo}-${day(11)}`, 'Café',         1100, 'expense', 'Market', mo])
      txData.push([`${mo}-${day(20)}`, 'Takeaway',     2200, 'expense', 'Market', mo])

      // Health & Education
      txData.push([`${mo}-${day(13)}`, 'Pharmacy',       900, 'expense', 'Health', mo])
      txData.push([`${mo}-${day(2)}`,  'Online Course', 2900, 'expense', 'Education', mo])

      // Investment
      txData.push([`${mo}-${day(22)}`, 'Monthly Investment', 50000, 'expense', 'Investment', mo])
    }

    for (const [date, name, amount, type, category, month] of txData) {
      await client.query(`
        INSERT INTO transactions (date, name, amount, type, category, source, month, user_id)
        VALUES ($1,$2,$3,$4,$5,'manual',$6,$7)
      `, [date, name, amount, type, category, month, uid])
    }

    // ── 3. Budgets ────────────────────────────────────────────────────────────
    await client.query(`DELETE FROM budgets WHERE user_id = $1`, [uid])
    for (const [category, amount] of [
      ['Fixed', 160000], ['Market', 50000], ['Health', 15000],
      ['Entertainment', 8000], ['Education', 5000], ['Investment', 55000],
    ] as [string, number][]) {
      await client.query(`
        INSERT INTO budgets (user_id, category, amount)
        VALUES ($1,$2,$3) ON CONFLICT (user_id, category) DO UPDATE SET amount=$3
      `, [uid, category, amount])
    }

    // ── 4. Foods ──────────────────────────────────────────────────────────────
    await client.query(`DELETE FROM foods WHERE user_id = $1`, [uid])
    const foods: [string, string, number, string][] = [
      ['Oats',           'carbs',     389, '🌾'],
      ['Eggs',           'protein',   155, '🥚'],
      ['Chicken Breast', 'protein',   165, '🍗'],
      ['Brown Rice',     'carbs',     216, '🍚'],
      ['Broccoli',       'vegetable',  34, '🥦'],
      ['Banana',         'fruit',      89, '🍌'],
      ['Greek Yogurt',   'dairy',      97, '🥛'],
      ['Mixed Nuts',     'fat',       607, '🥜'],
      ['Salmon Fillet',  'protein',   208, '🐟'],
      ['Sweet Potato',   'carbs',      86, '🍠'],
      ['Apple',          'fruit',      52, '🍎'],
      ['Cottage Cheese', 'dairy',      98, '🧀'],
      ['Whole Grain Bread','carbs',   247, '🍞'],
      ['Olive Oil',      'fat',       884, '🫒'],
      ['Spinach',        'vegetable',  23, '🥬'],
    ]
    const foodIds: number[] = []
    for (const [name, category, cal, emoji] of foods) {
      const { rows: [f] } = await client.query<{ id: number }>(`
        INSERT INTO foods (user_id, name, category, calories_per_100g, emoji)
        VALUES ($1,$2,$3,$4,$5) RETURNING id
      `, [uid, name, category, cal, emoji])
      foodIds.push(f.id)
    }

    // ── 5. Meal logs (last 7 days) ────────────────────────────────────────────
    await client.query(`DELETE FROM meal_logs WHERE user_id = $1`, [uid])
    const mealTemplates = [
      {
        breakfast: [[0, 80], [1, 60]],
        lunch:     [[2, 150], [3, 120], [4, 100]],
        dinner:    [[9, 150], [3, 100], [14, 80]],
        snack:     [[6, 150], [7, 30]],
      },
      {
        breakfast: [[1, 100], [0, 60]],
        lunch:     [[2, 130], [10, 80], [4, 100]],
        dinner:    [[2, 120], [3, 120], [14, 80]],
        snack:     [[11, 200], [4, 120]],
      },
    ]
    for (let day = 0; day < 7; day++) {
      const tpl = mealTemplates[day % 2]
      const date = daysAgo(day)
      for (const [mealType, pairs] of Object.entries(tpl) as [string, [number, number][]][]) {
        const items = pairs.map(([fi, g]) => ({
          food_id:  foodIds[fi],
          name:     foods[fi][0],
          emoji:    foods[fi][3],
          amount_g: g,
          calories: Math.round(foods[fi][2] * g / 100),
        }))
        await client.query(`
          INSERT INTO meal_logs (user_id, date, meal_type, items)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (user_id, date, meal_type) DO UPDATE SET items=$4
        `, [uid, date, mealType, JSON.stringify(items)])
      }
    }

    // ── 6. Shopping sessions ──────────────────────────────────────────────────
    await client.query(`DELETE FROM shopping_sessions WHERE user_id = $1`, [uid])
    for (const { date, items } of [
      { date: daysAgo(3),  items: ['Milk', 'Eggs', 'Bread', 'Chicken', 'Vegetables', 'Yogurt', 'Oats', 'Bananas'] },
      { date: daysAgo(10), items: ['Salmon', 'Rice', 'Spinach', 'Nuts', 'Olive Oil', 'Sweet Potato', 'Apples', 'Cheese'] },
      { date: daysAgo(17), items: ['Milk', 'Eggs', 'Chicken', 'Pasta', 'Tomatoes', 'Yogurt', 'Fruit', 'Bread'] },
    ]) {
      await client.query(`
        INSERT INTO shopping_sessions (user_id, date, items)
        VALUES ($1,$2,$3) ON CONFLICT (user_id, date) DO UPDATE SET items=$3
      `, [uid, date, JSON.stringify(items)])
    }

    // ── 7. Exercises ──────────────────────────────────────────────────────────
    await client.query(`DELETE FROM exercises WHERE user_id = $1`, [uid])
    const exercises: [string, string, string[]][] = [
      ['Push-ups',      'calisthenics', ['chest', 'triceps', 'shoulders']],
      ['Pull-ups',      'calisthenics', ['back', 'biceps']],
      ['Bodyweight Squats', 'calisthenics', ['quads', 'glutes', 'hamstrings']],
      ['Bench Press',   'weights',      ['chest', 'triceps']],
      ['Deadlift',      'weights',      ['back', 'glutes', 'hamstrings']],
      ['Shoulder Press','weights',      ['shoulders', 'triceps']],
      ['Running',       'cardio',       ['cardio']],
      ['Plank',         'calisthenics', ['core']],
      ['Dips',          'calisthenics', ['triceps', 'chest']],
      ['Bent-over Row', 'weights',      ['back', 'biceps']],
    ]
    const exIds: number[] = []
    for (const [name, type, muscles] of exercises) {
      const { rows: [ex] } = await client.query<{ id: number }>(`
        INSERT INTO exercises (user_id, name, type, muscle_groups)
        VALUES ($1,$2,$3,$4) RETURNING id
      `, [uid, name, type, muscles])
      exIds.push(ex.id)
    }

    // ── 8. Workout template ───────────────────────────────────────────────────
    await client.query(`DELETE FROM workout_logs      WHERE user_id = $1`, [uid])
    await client.query(`DELETE FROM workout_templates WHERE user_id = $1`, [uid])
    const { rows: [tmpl] } = await client.query<{ id: number }>(`
      INSERT INTO workout_templates (user_id, name, exercises)
      VALUES ($1,'Full Body Routine',$2) RETURNING id
    `, [uid, JSON.stringify([
      { exercise_id: exIds[0], sets: 3, reps: 15, weight: 0 },
      { exercise_id: exIds[2], sets: 3, reps: 12, weight: 0 },
      { exercise_id: exIds[4], sets: 3, reps: 8,  weight: 8000 },
      { exercise_id: exIds[7], sets: 3, reps: 60, weight: 0 },
    ])])

    // ── 9. Workout logs ───────────────────────────────────────────────────────
    await client.query(`DELETE FROM workout_logs WHERE user_id = $1`, [uid])
    for (const day of [1, 3, 6, 8, 11, 13]) {
      await client.query(`
        INSERT INTO workout_logs (user_id, template_id, date, duration_min, sets)
        VALUES ($1,$2,$3,$4,$5)
      `, [uid, tmpl.id, daysAgo(day), 40 + (day % 3) * 10, JSON.stringify([
        { exercise_id: exIds[0], sets: [{ reps: 15, weight: 0 }, { reps: 15, weight: 0 }, { reps: 12, weight: 0 }] },
        { exercise_id: exIds[2], sets: [{ reps: 12, weight: 0 }, { reps: 12, weight: 0 }] },
        { exercise_id: exIds[4], sets: [{ reps: 8,  weight: 8000 }, { reps: 7, weight: 8000 }] },
      ])])
    }

    // ── 10. Body weight ───────────────────────────────────────────────────────
    await client.query(`DELETE FROM body_weight WHERE user_id = $1`, [uid])
    const weights = [79.4, 79.2, 79.0, 78.9, 78.7, 78.6, 78.5, 78.3, 78.2, 78.0, 77.9, 77.7]
    for (let i = 0; i < weights.length; i++) {
      await client.query(`
        INSERT INTO body_weight (user_id, date, weight_kg)
        VALUES ($1,$2,$3) ON CONFLICT (user_id, date) DO UPDATE SET weight_kg=$3
      `, [uid, daysAgo(i * 2), weights[i]])
    }

    // ── 11. Fitness targets ───────────────────────────────────────────────────
    await client.query(`DELETE FROM fitness_targets WHERE user_id = $1`, [uid])
    for (const [name, unit, target, current] of [
      ['Push-ups in a row', 'reps',    50,   22],
      ['Pull-ups',          'reps',    15,    7],
      ['5K run time',       'minutes', 25,   33],
      ['Target weight',     'kg',      76,   79.4],
    ] as [string, string, number, number][]) {
      await client.query(`
        INSERT INTO fitness_targets (user_id, name, unit, target_value, current_value)
        VALUES ($1,$2,$3,$4,$5)
      `, [uid, name, unit, target, current])
    }

    // ── 12. Vocabulary cards ──────────────────────────────────────────────────
    await client.query(`DELETE FROM vocabulary WHERE user_id = $1`, [uid])
    const vocab: [string, string, string][] = [
      ['budget',       'the amount of money available to spend', 'en'],
      ['invest',       'to put money into something to earn more', 'en'],
      ['consistent',   'doing the same thing regularly over time', 'en'],
      ['discipline',   'the ability to control your actions and habits', 'en'],
      ['compound',     'interest calculated on both principal and past interest', 'en'],
      ['diversify',    'to spread investments across different assets', 'en'],
      ['net worth',    'total assets minus total liabilities', 'en'],
      ['habit',        'a regular practice done almost automatically', 'en'],
      ['milestone',    'an important step or achievement in a process', 'en'],
      ['momentum',     'the force that keeps progress moving forward', 'en'],
    ]
    for (let i = 0; i < vocab.length; i++) {
      const [word, definition, lang] = vocab[i]
      await client.query(`
        INSERT INTO vocabulary (user_id, word, translation, language, due_at, ease_factor, repetitions, interval)
        VALUES ($1,$2,$3,$4,$5,2.5,$6,$7)
      `, [uid, word, definition, lang, daysAgo(i < 3 ? -1 : i < 6 ? 2 : 6), i < 3 ? 0 : 1, i < 3 ? 1 : 5])
    }

    // ── 13. Notes ─────────────────────────────────────────────────────────────
    await client.query(`DELETE FROM notebook_notes WHERE user_id = $1`, [uid])
    for (const { title, folder, content } of [
      {
        title: 'Personal Finance Principles',
        folder: 'Finance',
        content: `# Personal Finance Principles

## Core Rules
- **Spend less than you earn** — always
- **Pay yourself first** — invest before spending
- **Emergency fund** — cover 3–6 months of expenses

## Monthly Review Checklist
- [ ] Compare actual vs budgeted spending
- [ ] Check investment contributions
- [ ] Review upcoming fixed costs
- [ ] Update net worth estimate
`,
      },
      {
        title: 'Workout Fundamentals',
        folder: 'Health',
        content: `# Workout Fundamentals

## Key Principles
- **Progressive overload** — gradually increase difficulty
- **Consistency over intensity** — show up every week
- **Recovery is part of training** — sleep and rest matter

## Weekly Structure
- Day 1: Upper body push
- Day 2: Lower body
- Day 3: Upper body pull
- Day 4: Cardio / active rest
- Day 5–7: Rest or light movement
`,
      },
      {
        title: 'Healthy Eating Basics',
        folder: 'Health',
        content: `# Healthy Eating Basics

## Principles
- Prioritise whole, minimally processed foods
- Aim for balanced macros: protein, carbs, fats
- Stay hydrated — at least 2L of water daily
- Plan meals in advance to avoid poor choices

## Sample Day
- Breakfast: Oats + eggs
- Lunch: Chicken + rice + vegetables
- Dinner: Fish + greens
- Snack: Yogurt or nuts
`,
      },
      {
        title: 'Productivity Notes',
        folder: null,
        content: `# Productivity Notes

## Systems That Work
- Time-block your calendar
- Single-task — avoid multitasking
- Weekly review every Sunday
- Capture everything in one place

## Daily Habits
- Morning: Plan the day, exercise
- Evening: Review what was done, prepare for tomorrow

## Mindset
> "Small consistent actions beat large sporadic efforts."
`,
      },
    ]) {
      await client.query(`
        INSERT INTO notebook_notes (user_id, title, content, folder)
        VALUES ($1,$2,$3,$4)
      `, [uid, title, content, folder])
    }

    // ── 14. Reminders ─────────────────────────────────────────────────────────
    await client.query(`DELETE FROM reminders WHERE user_id = $1`, [uid])
    for (const r of [
      { title: 'Monthly budget review',   note: 'Compare spending vs targets',           due: `${daysAgo(0)}T19:00:00` },
      { title: 'Grocery shopping',        note: 'Restock weekly essentials',              due: `${daysAgo(-1)}T10:00:00` },
      { title: 'Pay utility bill',        note: 'Due at end of month',                    due: `${daysAgo(-5)}T09:00:00` },
      { title: 'Schedule health check-up', note: 'Annual preventive visit',              due: `${daysAgo(-8)}T08:00:00` },
      { title: 'Review investment portfolio', note: 'Monthly rebalance check',           due: `${monthStr()}-25T08:00:00` },
    ]) {
      await client.query(`
        INSERT INTO reminders (user_id, title, note, due_at, done)
        VALUES ($1,$2,$3,$4,false)
      `, [uid, r.title, r.note, r.due])
    }

    // ── 15. Daily plans ───────────────────────────────────────────────────────
    await client.query(`DELETE FROM daily_plans WHERE user_id = $1`, [uid])
    for (const { date, tasks, notes } of [
      {
        date: daysAgo(0),
        tasks: [
          { id: '1', text: 'Morning workout (30 min)', done: true },
          { id: '2', text: 'Review monthly budget',    done: false },
          { id: '3', text: 'Meal prep for the week',   done: false },
          { id: '4', text: 'Read for 20 minutes',      done: true },
          { id: '5', text: 'Evening walk',              done: false },
        ],
        notes: 'Focus on the process, not just the outcome.',
      },
      {
        date: daysAgo(1),
        tasks: [
          { id: '1', text: 'Full body workout', done: true },
          { id: '2', text: 'Grocery shopping',  done: true },
          { id: '3', text: 'Study session (1h)', done: true },
          { id: '4', text: 'Call a friend',      done: false },
        ],
        notes: 'Good energy today. Keep building the habit stack.',
      },
      {
        date: daysAgo(2),
        tasks: [
          { id: '1', text: 'Morning run (5K)',       done: true },
          { id: '2', text: 'Portfolio check',        done: true },
          { id: '3', text: 'Plan next week',         done: true },
        ],
        notes: '',
      },
    ]) {
      await client.query(`
        INSERT INTO daily_plans (user_id, date, tasks, notes)
        VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, date) DO UPDATE SET tasks=$3, notes=$4
      `, [uid, date, JSON.stringify(tasks), notes])
    }

    // ── 16. Journal entries ───────────────────────────────────────────────────
    await client.query(`DELETE FROM journal_entries WHERE user_id = $1`, [uid])
    for (const { date, content, went_well, went_bad } of [
      {
        date: daysAgo(0),
        content: 'Stayed consistent with the morning routine. Noticed I tend to skip meal prep when tired — planning to batch cook on Sunday instead of weekday evenings. Budget review revealed a bit of overspending on dining out this month.',
        went_well: ['Morning workout done', 'Stayed on budget (mostly)'],
        went_bad: ['Skipped meal prep'],
      },
      {
        date: daysAgo(1),
        content: 'Solid day overall. Got the workout in before work which set a good tone. Tracked all meals and hit the protein target. Reviewed the savings goal — on track to hit the target by the end of the quarter.',
        went_well: ['Hit protein goal', 'Workout before work', 'Savings on track'],
        went_bad: ['Slept late'],
      },
      {
        date: daysAgo(2),
        content: 'Lighter day. Used it to plan and reflect. The investment portfolio is performing steadily — staying patient and not reacting to short-term movements. Feeling good about the long-term direction.',
        went_well: ['Weekly planning done', 'Good sleep', 'Portfolio review'],
        went_bad: [],
      },
    ]) {
      await client.query(`
        INSERT INTO journal_entries (user_id, date, content, went_well, went_bad)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id, date) DO UPDATE SET content=$3, went_well=$4, went_bad=$5
      `, [uid, date, content, went_well, went_bad])
    }

    // ── 17. ETF watchlist ─────────────────────────────────────────────────────
    await client.query(`DELETE FROM etf_watchlist WHERE user_id = $1`, [uid])
    for (const ticker of ['VWCE', 'CSPX', 'IUSN', 'ZPRV']) {
      await client.query(`
        INSERT INTO etf_watchlist (user_id, ticker)
        VALUES ($1,$2) ON CONFLICT DO NOTHING
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
