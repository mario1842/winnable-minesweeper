import { floodReveal, layMines, neighborTable, type Minefield } from './board'
import { cellCount, type Difficulty } from './difficulty'
import { solveFrom } from './solver'

export interface GenerateOptions {
  random?: () => number
  maxAttempts?: number
}

/** Mulberry32. Same seed always yields the same board. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Place mines so `click` is a zero, the opening is large, and the
 * resulting position is solvable without guessing.
 */
export function generateField(
  difficulty: Difficulty,
  click: number,
  options: GenerateOptions = {},
): Minefield {
  const random = options.random ?? Math.random
  const maxAttempts = options.maxAttempts ?? 280
  const forbidden = openingBan(difficulty, click)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const field = layMines(
      difficulty.cols,
      difficulty.rows,
      difficulty.mines,
      forbidden,
      random,
    )
    if (accepts(difficulty, field, click)) return field
  }

  for (let radius = 2; radius <= 4; radius++) {
    const wider = discBan(difficulty, click, radius)
    const free = cellCount(difficulty) - countOnes(wider)
    if (free < difficulty.mines) break
    for (let attempt = 0; attempt < 40; attempt++) {
      const field = layMines(
        difficulty.cols,
        difficulty.rows,
        difficulty.mines,
        wider,
        random,
      )
      if (accepts(difficulty, field, click)) return field
    }
  }

  throw new Error(
    `Could not generate a winnable ${difficulty.id} board for cell ${click}`,
  )
}

export function openingSize(field: Minefield, click: number): number {
  const revealed = new Uint8Array(field.cols * field.rows)
  return floodReveal(field, click, revealed)
}

function accepts(difficulty: Difficulty, field: Minefield, click: number): boolean {
  if (field.mines[click] || field.numbers[click] !== 0) return false
  const revealed = new Uint8Array(field.cols * field.rows)
  const opened = floodReveal(field, click, revealed)
  if (opened < difficulty.minOpening) return false
  return solveFrom(field, revealed).solved
}

function openingBan(difficulty: Difficulty, click: number): Uint8Array {
  const banned = new Uint8Array(cellCount(difficulty))
  banned[click] = 1
  const neighbors = neighborTable(difficulty.cols, difficulty.rows)[click]!
  for (let i = 0; i < neighbors.length; i++) banned[neighbors[i]!] = 1
  return banned
}

function discBan(difficulty: Difficulty, click: number, radius: number): Uint8Array {
  const { cols, rows } = difficulty
  const banned = new Uint8Array(cols * rows)
  const row = Math.floor(click / cols)
  const col = click % cols
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.max(Math.abs(r - row), Math.abs(c - col)) <= radius) {
        banned[r * cols + c] = 1
      }
    }
  }
  return banned
}

function countOnes(flags: Uint8Array): number {
  let count = 0
  for (let i = 0; i < flags.length; i++) count += flags[i]!
  return count
}
