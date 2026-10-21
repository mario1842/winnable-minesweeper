import { describe, expect, it } from 'vitest'
import { fieldFromMines, floodReveal } from './board'
import { solveFrom } from './solver'

describe('solver', () => {
  it('clears a board whose first flood already finished the safe cells', () => {
    const field = fieldFromMines(3, 3, [0])
    const revealed = new Uint8Array(9)
    floodReveal(field, 8, revealed)
    const result = solveFrom(field, revealed)
    expect(result.solved).toBe(true)
    expect(result.firstSafe).toBeNull()
  })

  it('finds a forced safe click after a partial opening', () => {
    const field = fieldFromMines(
      4,
      4,
      [0, 1],
    )
    const revealed = new Uint8Array(16)
    const opened = floodReveal(field, 15, revealed)
    expect(opened).toBeGreaterThan(0)
    const result = solveFrom(field, revealed)
    expect(result.solved).toBe(true)
    if (opened < 16 - 2) {
      expect(result.firstSafe).not.toBeNull()
      expect(field.mines[result.firstSafe!]).toBe(0)
      expect(revealed[result.firstSafe!]).toBe(0)
    }
    for (const index of result.opened) expect(field.mines[index]).toBe(0)
  })

  it('uses overlapping counts to force the safe square between two mines', () => {
    const field = fieldFromMines(3, 2, [0, 2])
    const revealed = new Uint8Array(6)
    revealed[3] = 1
    revealed[4] = 1
    revealed[5] = 1
    const result = solveFrom(field, revealed)
    expect(result.solved).toBe(true)
    expect(result.opened).toContain(1)
    expect(field.mines[1]).toBe(0)
  })

  it('refuses a position that still requires a guess', () => {
    const field = fieldFromMines(2, 2, [0])
    const revealed = new Uint8Array(4)
    revealed[3] = 1
    const result = solveFrom(field, revealed)
    expect(result.solved).toBe(false)
    expect(result.firstSafe).toBeNull()
  })
})
