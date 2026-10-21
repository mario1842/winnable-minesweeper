export interface Minefield {
  cols: number
  rows: number
  mineCount: number
  /** 1 when the cell is a mine. */
  mines: Uint8Array
  /** Adjacent mine count. Mine cells stay 0. */
  numbers: Uint8Array
}

const neighborCache = new Map<string, number[][]>()

export function neighborTable(cols: number, rows: number): readonly number[][] {
  const key = `${cols}x${rows}`
  const cached = neighborCache.get(key)
  if (cached) return cached

  const table: number[][] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const list: number[] = []
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = row + dr
          const cc = col + dc
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) list.push(rr * cols + cc)
        }
      }
      table.push(list)
    }
  }
  neighborCache.set(key, table)
  return table
}

export function fieldFromMines(
  cols: number,
  rows: number,
  mineIndices: readonly number[],
): Minefield {
  const mines = new Uint8Array(cols * rows)
  for (const index of mineIndices) mines[index] = 1
  return withNumbers({ cols, rows, mineCount: mineIndices.length, mines, numbers: mines })
}

export function layMines(
  cols: number,
  rows: number,
  mineCount: number,
  forbidden: Uint8Array,
  random: () => number,
): Minefield {
  const n = cols * rows
  const candidates: number[] = []
  for (let i = 0; i < n; i++) {
    if (!forbidden[i]) candidates.push(i)
  }
  if (candidates.length < mineCount) {
    throw new Error('Not enough room to place mines')
  }

  const mines = new Uint8Array(n)
  for (let i = 0; i < mineCount; i++) {
    const j = i + Math.floor(random() * (candidates.length - i))
    const swap = candidates[i]!
    candidates[i] = candidates[j]!
    candidates[j] = swap
    mines[candidates[i]!] = 1
  }

  return withNumbers({ cols, rows, mineCount, mines, numbers: mines })
}

function withNumbers(field: Minefield): Minefield {
  const numbers = new Uint8Array(field.cols * field.rows)
  const table = neighborTable(field.cols, field.rows)
  for (let i = 0; i < field.mines.length; i++) {
    if (!field.mines[i]) continue
    const neighbors = table[i]!
    for (let k = 0; k < neighbors.length; k++) numbers[neighbors[k]!]++
  }
  return { ...field, numbers }
}

/** Reveal `start` and flood through zeros. Returns how many cells were newly opened. */
export function floodReveal(
  field: Minefield,
  start: number,
  revealed: Uint8Array,
  sink?: number[],
): number {
  if (revealed[start] || field.mines[start]) return 0
  const table = neighborTable(field.cols, field.rows)
  const stack = [start]
  let opened = 0
  while (stack.length > 0) {
    const index = stack.pop()!
    if (revealed[index] || field.mines[index]) continue
    revealed[index] = 1
    sink?.push(index)
    opened++
    if (field.numbers[index] !== 0) continue
    const neighbors = table[index]!
    for (let k = 0; k < neighbors.length; k++) {
      const next = neighbors[k]!
      if (!revealed[next] && !field.mines[next]) stack.push(next)
    }
  }
  return opened
}

export function countRevealed(revealed: Uint8Array): number {
  let count = 0
  for (let i = 0; i < revealed.length; i++) count += revealed[i]!
  return count
}
