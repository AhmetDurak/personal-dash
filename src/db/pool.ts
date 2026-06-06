import { Pool } from 'pg'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Neon (PostgreSQL 15+) doesn't set search_path by default
pool.on('connect', client => { client.query('SET search_path TO public') })
