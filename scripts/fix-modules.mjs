/**
 * Finds installed packages whose package.json has no usable "version".
 *
 * npm's dependency solver calls semver on every installed package while it
 * decides what can be deduped, so a single half-written package.json aborts
 * the whole install with "TypeError: Invalid Version:" and never says which
 * package is at fault. This walks the tree and names them.
 *
 *   node scripts/fix-modules.mjs         # report
 *   node scripts/fix-modules.mjs --fix   # report, then delete the broken dirs
 */
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const fix = process.argv.includes('--fix')
const root = join(process.cwd(), 'node_modules')

const broken = []
let scanned = 0

function checkPackage(dir) {
  let raw
  try {
    raw = readFileSync(join(dir, 'package.json'), 'utf8')
  } catch {
    return // no manifest — not a package dir, nothing to judge
  }
  scanned++

  let version
  try {
    version = JSON.parse(raw).version
  } catch {
    broken.push({ dir, why: 'package.json is not valid JSON' })
    return
  }
  if (typeof version !== 'string' || version.trim() === '') {
    broken.push({ dir, why: `version is ${JSON.stringify(version)}` })
  }
}

function walk(modulesDir, depth = 0) {
  if (depth > 6) return
  let entries
  try {
    entries = readdirSync(modulesDir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.name === '.bin' || entry.name === '.cache') continue
    const full = join(modulesDir, entry.name)

    let isDir = entry.isDirectory()
    if (entry.isSymbolicLink()) {
      try {
        isDir = statSync(full).isDirectory()
      } catch {
        continue // dangling link
      }
    }
    if (!isDir) continue

    if (entry.name.startsWith('@')) {
      walk(full, depth) // scope folder — its children are the packages
      continue
    }

    checkPackage(full)
    walk(join(full, 'node_modules'), depth + 1)
  }
}

walk(root)

console.log(`scanned ${scanned} packages under ${root}`)

if (broken.length === 0) {
  console.log('no packages with a missing or blank version — the tree looks fine')
  process.exit(0)
}

console.log(`\n${broken.length} broken package(s):`)
for (const b of broken) console.log(` - ${b.dir}  (${b.why})`)

if (!fix) {
  console.log('\nrun `npm run fix:modules` to delete these, then install again')
  process.exit(1)
}

for (const b of broken) {
  try {
    rmSync(b.dir, { recursive: true, force: true })
    console.log(`removed ${b.dir}`)
  } catch (err) {
    console.log(`could NOT remove ${b.dir}: ${err.message}`)
  }
}
console.log('\ndone — run the install again')
