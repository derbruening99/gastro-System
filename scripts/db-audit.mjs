#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Fehler: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY)
const args = process.argv.slice(2)
const removeOrphans = args.includes('--cleanup') || args.includes('--remove-orphans')

const tables = [
  'restaurants',
  'menu_categories',
  'menu_items',
  'upsells',
  'gastro_customers',
  'gastro_orders',
  'gastro_order_items',
  'gastro_stamp_cards',
  'gastro_admin_users',
  'meso_tasks',
  'meso_sops',
  'qr_scans',
  'news',
  'settings',
]

async function countRows(table) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

async function logCounts() {
  console.log('=== Datenbank-Counts ===')
  for (const table of tables) {
    try {
      const count = await countRows(table)
      console.log(`${table.padEnd(20)} ${count}`)
    } catch (err) {
      console.log(`${table.padEnd(20)} FEHLER: ${err.message ?? err}`)
    }
  }
}

async function findOrphans() {
  console.log('\n=== Mögliche Orphans ===')

  const orphanFunctions = [
    async () => {
      const { data, error } = await db
        .from('menu_categories')
        .select('id')
        .is('restaurant_id', null)
        .limit(5)
      return { label: 'menu_categories w/o restaurant_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('menu_items')
        .select('id')
        .is('category_id', null)
        .limit(5)
      return { label: 'menu_items w/o category_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('upsells')
        .select('id')
        .is('restaurant_id', null)
        .limit(5)
      return { label: 'upsells w/o restaurant_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('gastro_customers')
        .select('id')
        .is('restaurant_id', null)
        .limit(5)
      return { label: 'gastro_customers w/o restaurant_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('gastro_orders')
        .select('id')
        .is('restaurant_id', null)
        .limit(5)
      return { label: 'gastro_orders w/o restaurant_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('gastro_order_items')
        .select('id')
        .is('order_id', null)
        .limit(5)
      return { label: 'gastro_order_items w/o order_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('gastro_stamp_cards')
        .select('id')
        .is('customer_id', null)
        .limit(5)
      return { label: 'gastro_stamp_cards w/o customer_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('gastro_admin_users')
        .select('id')
        .is('restaurant_id', null)
        .limit(5)
      return { label: 'gastro_admin_users w/o restaurant_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('meso_tasks')
        .select('id')
        .is('restaurant_id', null)
        .limit(5)
      return { label: 'meso_tasks w/o restaurant_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('meso_sops')
        .select('id')
        .is('restaurant_id', null)
        .limit(5)
      return { label: 'meso_sops w/o restaurant_id', data, error }
    },
    async () => {
      const { data, error } = await db
        .from('qr_scans')
        .select('id')
        .is('restaurant_id', null)
        .limit(5)
      return { label: 'qr_scans w/o restaurant_id', data, error }
    },
  ]

  for (const fn of orphanFunctions) {
    const { label, data, error } = await fn()
    if (error) {
      console.log(`${label.padEnd(40)} FEHLER: ${error.message ?? error}`)
      continue
    }
    console.log(`${label.padEnd(40)} ${data?.length ?? 0} Beispiel-IDs: ${data?.slice(0, 5).map((row) => row.id).join(', ') || 'keine'}`)
  }
}

async function cleanupOrphans() {
  console.log('\n=== Entferne Orphans ===')
  const cleanups = [
    { table: 'menu_categories', condition: 'restaurant_id', desc: 'menu_categories ohne restaurant_id' },
    { table: 'menu_items', condition: 'category_id', desc: 'menu_items ohne category_id' },
    { table: 'upsells', condition: 'restaurant_id', desc: 'upsells ohne restaurant_id' },
    { table: 'gastro_customers', condition: 'restaurant_id', desc: 'gastro_customers ohne restaurant_id' },
    { table: 'gastro_orders', condition: 'restaurant_id', desc: 'gastro_orders ohne restaurant_id' },
    { table: 'gastro_order_items', condition: 'order_id', desc: 'gastro_order_items ohne order_id' },
    { table: 'gastro_stamp_cards', condition: 'customer_id', desc: 'gastro_stamp_cards ohne customer_id' },
    { table: 'gastro_admin_users', condition: 'restaurant_id', desc: 'gastro_admin_users ohne restaurant_id' },
    { table: 'meso_tasks', condition: 'restaurant_id', desc: 'meso_tasks ohne restaurant_id' },
    { table: 'meso_sops', condition: 'restaurant_id', desc: 'meso_sops ohne restaurant_id' },
    { table: 'qr_scans', condition: 'restaurant_id', desc: 'qr_scans ohne restaurant_id' },
  ]

  for (const entry of cleanups) {
    const { error } = await db.from(entry.table).delete().is(entry.condition, null)
    if (error) {
      console.log(`${entry.desc.padEnd(40)} FEHLER: ${error.message ?? error}`)
    } else {
      console.log(`${entry.desc.padEnd(40)} gelöscht`)
    }
  }
}

async function main() {
  console.log('Supabase DB Audit gestartet')
  await logCounts()
  await findOrphans()

  if (removeOrphans) {
    console.log('\n--cleanup aktiviert: entferne gefundene Orphans')
    await cleanupOrphans()
    console.log('\nAudit nach Cleanup:')
    await logCounts()
  }

  process.exit(0)
}

await main()
