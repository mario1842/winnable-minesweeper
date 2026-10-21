import { countRevealed, floodReveal, neighborTable, type Minefield } from './board'

export interface SolveResult {
  /** Every safe cell can be opened by deduction from the seed reveal. */
  solved: boolean
  /** Safe cells opened by logic, in the order they were found. */
  opened: number[]
  /** First safe click logic forces after the seed reveal, if the game is not already won. */
  firstSafe: number | null
}

interface Constraint {
  cells: number[]
  need: number
}

const CSP_MAX_CELLS = 18
const CSP_MAX_NODES = 40_000

/**
 * Play the board using only information a player would have.
 * `seedRevealed` is not mutated.
 */
export function solveFrom(field: Minefield, seedRevealed: Uint8Array): SolveResult {
  const n = field.cols * field.rows
  const revealed = seedRevealed.slice()
  const knownMine = new Uint8Array(n)
  const opened: number[] = []
  const table = neighborTable(field.cols, field.rows)
  const safeTotal = n - field.mineCount

  const openSafe = (index: number) => {
    floodReveal(field, index, revealed, opened)
  }

  const markMine = (index: number) => {
    if (!knownMine[index] && !revealed[index]) knownMine[index] = 1
  }

  for (let guard = 0; guard < n + 2; guard++) {
    if (countRevealed(revealed) >= safeTotal) break
    if (!deduce(field, revealed, knownMine, table, openSafe, markMine)) break
  }

  const solved = countRevealed(revealed) === safeTotal
  return { solved, opened, firstSafe: opened[0] ?? null }
}

function deduce(
  field: Minefield,
  revealed: Uint8Array,
  knownMine: Uint8Array,
  table: readonly number[][],
  openSafe: (index: number) => void,
  markMine: (index: number) => void,
): boolean {
  const n = revealed.length
  let knownMines = 0
  for (let i = 0; i < n; i++) knownMines += knownMine[i]!

  const unknown: number[] = []
  for (let i = 0; i < n; i++) {
    if (!revealed[i] && !knownMine[i]) unknown.push(i)
  }
  const minesLeft = field.mineCount - knownMines
  if (minesLeft < 0) return false
  if (minesLeft === 0) {
    if (unknown.length === 0) return false
    for (const index of unknown) openSafe(index)
    return true
  }
  if (unknown.length === minesLeft) {
    for (const index of unknown) markMine(index)
    return true
  }

  const constraints: Constraint[] = []
  let local = false
  for (let i = 0; i < n; i++) {
    if (!revealed[i] || field.numbers[i] === 0) continue
    const neighbors = table[i]!
    let mines = 0
    const hidden: number[] = []
    for (let k = 0; k < neighbors.length; k++) {
      const nb = neighbors[k]!
      if (knownMine[nb]) mines++
      else if (!revealed[nb]) hidden.push(nb)
    }
    const need = field.numbers[i]! - mines
    if (need < 0 || need > hidden.length) return false
    if (hidden.length === 0) continue
    if (need === 0) {
      for (const cell of hidden) openSafe(cell)
      local = true
    } else if (need === hidden.length) {
      for (const cell of hidden) markMine(cell)
      local = true
    } else {
      constraints.push({ cells: hidden, need })
    }
  }
  if (local) return true
  if (constraints.length === 0) return false

  if (applySubsets(constraints, n, openSafe, markMine)) return true
  return applyCsp(field, constraints, unknown, minesLeft, openSafe, markMine)
}

function applySubsets(
  constraints: Constraint[],
  n: number,
  openSafe: (index: number) => void,
  markMine: (index: number) => void,
): boolean {
  const stamp = new Uint32Array(n)
  let token = 1
  const seen = new Set<string>()
  for (const constraint of constraints) seen.add(constraintKey(constraint))

  for (let round = 0; round < 24; round++) {
    let forced = false
    const extras: Constraint[] = []
    const limit = constraints.length
    for (let i = 0; i < limit; i++) {
      const left = constraints[i]!
      for (let j = 0; j < limit; j++) {
        if (i === j) continue
        const right = constraints[j]!
        if (left.cells.length >= right.cells.length) continue
        token++
        if (!isSubset(left.cells, right.cells, stamp, token)) continue
        const diff = difference(right.cells, left.cells, stamp, ++token)
        const need = right.need - left.need
        if (need === 0) {
          for (const cell of diff) openSafe(cell)
          forced = true
        } else if (need === diff.length) {
          for (const cell of diff) markMine(cell)
          forced = true
        } else if (need > 0 && need < diff.length && constraints.length + extras.length < 500) {
          const reduced = { cells: diff, need }
          const key = constraintKey(reduced)
          if (!seen.has(key)) {
            seen.add(key)
            extras.push(reduced)
          }
        }
      }
    }
    if (forced) return true
    if (extras.length === 0) return false
    for (const extra of extras) constraints.push(extra)
  }
  return false
}

function applyCsp(
  field: Minefield,
  constraints: Constraint[],
  unknown: readonly number[],
  minesLeft: number,
  openSafe: (index: number) => void,
  markMine: (index: number) => void,
): boolean {
  const components = splitComponents(constraints)
  for (const component of components) {
    if (component.cells.length > CSP_MAX_CELLS) return false
  }

  const covered = new Uint8Array(field.cols * field.rows)
  for (const component of components) {
    for (const cell of component.cells) covered[cell] = 1
  }
  const interior: number[] = []
  for (const cell of unknown) {
    if (!covered[cell]) interior.push(cell)
  }

  const stats: ComponentStats[] = []
  for (const component of components) {
    const enumerated = enumerateComponent(component)
    if (!enumerated) return false
    stats.push(enumerated)
  }

  const forced = combine(stats, interior, minesLeft)
  if (!forced) return false
  if (forced.safe.length === 0 && forced.mines.length === 0) return false
  for (const cell of forced.mines) markMine(cell)
  for (const cell of forced.safe) openSafe(cell)
  return true
}

interface ComponentGroup {
  cells: number[]
  cons: Constraint[]
}

interface ComponentStats {
  cells: number[]
  ways: Uint32Array
  mineHits: Uint32Array[]
}

function splitComponents(constraints: readonly Constraint[]): ComponentGroup[] {
  const parent = new Map<number, number>()
  const find = (cell: number): number => {
    let root = parent.get(cell)
    if (root === undefined) {
      parent.set(cell, cell)
      return cell
    }
    const trail: number[] = []
    while (root !== parent.get(root)) {
      trail.push(root)
      root = parent.get(root)!
    }
    for (const step of trail) parent.set(step, root)
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const constraint of constraints) {
    const head = constraint.cells[0]
    if (head === undefined) continue
    find(head)
    for (let i = 1; i < constraint.cells.length; i++) union(head, constraint.cells[i]!)
  }

  const cellsByRoot = new Map<number, number[]>()
  for (const cell of parent.keys()) {
    const root = find(cell)
    const group = cellsByRoot.get(root)
    if (group) group.push(cell)
    else cellsByRoot.set(root, [cell])
  }
  const consByRoot = new Map<number, Constraint[]>()
  for (const constraint of constraints) {
    const head = constraint.cells[0]
    if (head === undefined) continue
    const root = find(head)
    const group = consByRoot.get(root)
    if (group) group.push(constraint)
    else consByRoot.set(root, [constraint])
  }

  const groups: ComponentGroup[] = []
  for (const [root, cells] of cellsByRoot) {
    groups.push({ cells, cons: consByRoot.get(root) ?? [] })
  }
  return groups
}

function enumerateComponent(group: ComponentGroup): ComponentStats | null {
  const cells = group.cells
  const size = cells.length
  const localOf = new Map<number, number>()
  for (let i = 0; i < size; i++) localOf.set(cells[i]!, i)

  const localCons: { idx: number[]; need: number }[] = []
  for (const constraint of group.cons) {
    const idx: number[] = []
    for (const cell of constraint.cells) {
      const local = localOf.get(cell)
      if (local === undefined) return null
      idx.push(local)
    }
    localCons.push({ idx, need: constraint.need })
  }

  const ways = new Uint32Array(size + 1)
  const mineHits: Uint32Array[] = []
  for (let count = 0; count <= size; count++) mineHits.push(new Uint32Array(size))

  const assign = new Int8Array(size)
  assign.fill(-1)
  let nodes = 0
  let aborted = false

  const feasible = (): boolean => {
    for (let c = 0; c < localCons.length; c++) {
      const constraint = localCons[c]!
      let mines = 0
      let hidden = 0
      const idx = constraint.idx
      for (let k = 0; k < idx.length; k++) {
        const value = assign[idx[k]!]!
        if (value === 1) mines++
        else if (value < 0) hidden++
      }
      if (mines > constraint.need || mines + hidden < constraint.need) return false
    }
    return true
  }

  const search = (placed: number) => {
    if (aborted) return
    if (++nodes > CSP_MAX_NODES) {
      aborted = true
      return
    }

    let variable = -1
    let bestSlack = 1_000_000
    for (let c = 0; c < localCons.length; c++) {
      const idx = localCons[c]!.idx
      let hidden = 0
      let candidate = -1
      for (let k = 0; k < idx.length; k++) {
        if (assign[idx[k]!]! < 0) {
          hidden++
          candidate = idx[k]!
        }
      }
      if (hidden > 0 && hidden < bestSlack) {
        bestSlack = hidden
        variable = candidate
        if (hidden === 1) break
      }
    }
    if (variable < 0) {
      for (let i = 0; i < size; i++) {
        if (assign[i]! < 0) {
          variable = i
          break
        }
      }
    }

    if (variable < 0) {
      ways[placed]++
      const hits = mineHits[placed]!
      for (let i = 0; i < size; i++) if (assign[i] === 1) hits[i]++
      return
    }

    assign[variable] = 1
    if (feasible()) search(placed + 1)
    assign[variable] = 0
    if (!aborted && feasible()) search(placed)
    assign[variable] = -1
  }

  if (!feasible()) return null
  search(0)
  if (aborted) return null

  let total = 0
  for (let i = 0; i < ways.length; i++) total += ways[i]!
  if (total === 0) return null
  return { cells, ways, mineHits }
}

function combine(
  components: readonly ComponentStats[],
  interior: readonly number[],
  minesLeft: number,
): { safe: number[]; mines: number[] } | null {
  let maxSum = interior.length
  for (const component of components) maxSum += component.ways.length - 1
  if (minesLeft > maxSum) return null

  const frontier = reachable(components, maxSum)
  let minExtra = Number.POSITIVE_INFINITY
  let maxExtra = -1
  for (let mines = 0; mines < frontier.length; mines++) {
    if (!frontier[mines]) continue
    const extra = minesLeft - mines
    if (extra >= 0 && extra <= interior.length) {
      if (extra < minExtra) minExtra = extra
      if (extra > maxExtra) maxExtra = extra
    }
  }
  if (maxExtra < 0) return null

  const safe: number[] = []
  const mines: number[] = []

  if (interior.length > 0 && minExtra === maxExtra) {
    if (minExtra === 0) {
      for (const cell of interior) safe.push(cell)
    } else if (minExtra === interior.length) {
      for (const cell of interior) mines.push(cell)
    }
  }

  for (let index = 0; index < components.length; index++) {
    const component = components[index]!
    const others = reachable(
      components.filter((_, other) => other !== index),
      maxSum,
    )
    const size = component.ways.length - 1
    for (let local = 0; local < component.cells.length; local++) {
      let any = false
      let alwaysMine = true
      let alwaysSafe = true
      for (let count = 0; count <= size; count++) {
        const solutions = component.ways[count]!
        if (solutions === 0) continue
        const rest = minesLeft - count
        if (rest < 0 || rest > maxSum || !othersCan(others, rest, interior.length)) continue
        any = true
        const hits = component.mineHits[count]![local]!
        if (hits !== solutions) alwaysMine = false
        if (hits !== 0) alwaysSafe = false
      }
      if (!any) continue
      if (alwaysMine) mines.push(component.cells[local]!)
      else if (alwaysSafe) safe.push(component.cells[local]!)
    }
  }

  return { safe, mines }
}

function reachable(components: readonly ComponentStats[], maxSum: number): Uint8Array {
  let current = new Uint8Array(maxSum + 1)
  current[0] = 1
  for (const component of components) {
    const next = new Uint8Array(maxSum + 1)
    const size = component.ways.length - 1
    for (let have = 0; have <= maxSum; have++) {
      if (!current[have]) continue
      for (let count = 0; count <= size; count++) {
        if (component.ways[count] === 0) continue
        const total = have + count
        if (total <= maxSum) next[total] = 1
      }
    }
    current = next
  }
  return current
}

function othersCan(frontier: Uint8Array, mines: number, interior: number): boolean {
  const start = Math.max(0, mines - interior)
  const end = Math.min(frontier.length - 1, mines)
  for (let value = start; value <= end; value++) {
    if (frontier[value]) return true
  }
  return false
}

function isSubset(small: readonly number[], big: readonly number[], stamp: Uint32Array, token: number): boolean {
  for (let i = 0; i < big.length; i++) stamp[big[i]!] = token
  for (let i = 0; i < small.length; i++) {
    if (stamp[small[i]!] !== token) return false
  }
  return true
}

function difference(
  big: readonly number[],
  small: readonly number[],
  stamp: Uint32Array,
  token: number,
): number[] {
  for (let i = 0; i < small.length; i++) stamp[small[i]!] = token
  const diff: number[] = []
  for (let i = 0; i < big.length; i++) {
    const cell = big[i]!
    if (stamp[cell] !== token) diff.push(cell)
  }
  return diff
}

function constraintKey(constraint: Constraint): string {
  const cells = constraint.cells.slice().sort((a, b) => a - b)
  return `${constraint.need}:${cells.join(',')}`
}
