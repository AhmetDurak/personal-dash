/**
 * Seeds a universal default food library (user_id = NULL).
 * Safe to re-run — ON CONFLICT DO NOTHING.
 * CLI: npx ts-node src/db/seed-global-foods.ts
 */

import { pool } from './pool'

const GLOBAL_FOODS: [string, string, number, string][] = [
  // Protein
  ['Chicken Breast',   'protein',    165, '🍗'],
  ['Eggs',             'protein',    155, '🥚'],
  ['Salmon',           'protein',    208, '🐟'],
  ['Tuna',             'protein',    132, '🐟'],
  ['Ground Beef',      'protein',    250, '🥩'],
  ['Tofu',             'protein',     76, '🫘'],
  ['Lentils (cooked)', 'protein',    116, '🫘'],
  ['Shrimp',           'protein',     99, '🦐'],

  // Carbs
  ['Brown Rice (cooked)',       'carbs', 216, '🍚'],
  ['White Rice (cooked)',       'carbs', 130, '🍚'],
  ['Oats',                      'carbs', 389, '🌾'],
  ['Whole Wheat Bread',         'carbs', 247, '🍞'],
  ['Pasta (cooked)',             'carbs', 158, '🍝'],
  ['Potato (boiled)',            'carbs',  77, '🥔'],
  ['Sweet Potato (baked)',       'carbs',  90, '🍠'],
  ['Quinoa (cooked)',            'carbs', 120, '🌾'],

  // Vegetables
  ['Broccoli',     'vegetable',  34, '🥦'],
  ['Spinach',      'vegetable',  23, '🥬'],
  ['Carrot',       'vegetable',  41, '🥕'],
  ['Tomato',       'vegetable',  18, '🍅'],
  ['Cucumber',     'vegetable',  16, '🥒'],
  ['Bell Pepper',  'vegetable',  31, '🫑'],
  ['Zucchini',     'vegetable',  17, '🥒'],
  ['Onion',        'vegetable',  40, '🧅'],

  // Fruit
  ['Banana',       'fruit',  89, '🍌'],
  ['Apple',        'fruit',  52, '🍎'],
  ['Orange',       'fruit',  47, '🍊'],
  ['Strawberries', 'fruit',  32, '🍓'],
  ['Blueberries',  'fruit',  57, '🫐'],
  ['Grapes',       'fruit',  67, '🍇'],

  // Dairy
  ['Greek Yogurt',    'dairy',  97, '🥛'],
  ['Cottage Cheese',  'dairy',  98, '🧀'],
  ['Milk (whole)',    'dairy',  61, '🥛'],
  ['Cheddar Cheese',  'dairy', 403, '🧀'],

  // Fat
  ['Olive Oil',     'fat', 884, '🫒'],
  ['Avocado',       'fat', 160, '🥑'],
  ['Mixed Nuts',    'fat', 607, '🥜'],
  ['Peanut Butter', 'fat', 588, '🥜'],
  ['Almonds',       'fat', 579, '🫘'],
]

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Add UNIQUE constraint name for ON CONFLICT — use name + user_id IS NULL
    // We identify duplicates by (name, user_id IS NULL) — simplest: check before insert
    let inserted = 0
    for (const [name, category, calories, emoji] of GLOBAL_FOODS) {
      const { rowCount } = await client.query(
        `INSERT INTO foods (name, category, calories_per_100g, emoji, user_id)
         SELECT $1,$2,$3,$4,NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM foods WHERE name=$1 AND user_id IS NULL
         )`,
        [name, category, calories, emoji]
      )
      if (rowCount) inserted++
    }

    await client.query('COMMIT')
    console.log(`✓ Inserted ${inserted} global foods (${GLOBAL_FOODS.length - inserted} already existed)`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Seed failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

run()
