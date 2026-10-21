import { describe, expect, it } from 'vitest'
import { floodReveal } from './board'
import { DIFFICULTIES } from './difficulty'
import { generateField, mulberry32, openingSize } from './generate'
import { solveFrom } from './solver'

describe('generateField', () => {
  for (const difficulty of DIFFICULTIES) {
    const clicks = [0, difficulty.cols - 1, Math.floor((difficulty.cols * difficulty.rows) / 2)]

    it(`builds a winnable ${difficulty.id} opening`, () => {
      for (const seed of [1, 2]) {
        for (const click of clicks) {
          const started = Date.now()
          const field = generateField(difficulty, click, { random: mulberry32(seed + click * 17) })
          const elapsed = Date.now() - started

          expect(field.mines[click]).toBe(0)
          expect(field.numbers[click]).toBe(0)
          const neighbors = neighborhood(difficulty.cols, difficulty.rows, click)
          for (const neighbor of neighbors) expect(field.mines[neighbor]).toBe(0)

          const revealed = new Uint8Array(field.cols * field.rows)
          const opened = floodReveal(field, click, revealed)
          expect(opened).toBe(openingSize(field, click))
          expect(opened).toBeGreaterThanOrEqual(difficulty.minOpening)

          const solved = solveFrom(field, revealed)
          expect(solved.solved).toBe(true)
          const safe = difficulty.cols * difficulty.rows - difficulty.mines
          if (opened < safe) {
            expect(solved.firstSafe).not.toBeNull()
            expect(field.mines[solved.firstSafe!]).toBe(0)
            expect(revealed[solved.firstSafe!]).toBe(0)
          }
          expect(elapsed).toBeLessThan(difficulty.id === 'expert' ? 8_000 : 4_000)
        }
      }
    })
  }
})

function neighborhood(cols: number, rows: number, index: number): number[] {
  const row = Math.floor(index / cols)
  const col = index % cols
  const cells: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const rr = row + dr
      const cc = col + dc
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) cells.push(rr * cols + cc)
    }
  }
  return cells
}
