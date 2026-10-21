/** Lightweight synthesized SFX via Web Audio API (no audio files). */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  audio: AudioContext,
  {
    frequency,
    duration,
    type = 'sine',
    gain = 0.12,
    fadeIn = 0.005,
    delay = 0,
  }: {
    frequency: number
    duration: number
    type?: OscillatorType
    gain?: number
    fadeIn?: number
    delay?: number
  },
): void {
  const start = audio.currentTime + delay
  const end = start + duration
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + fadeIn)
  amp.gain.exponentialRampToValueAtTime(0.0001, end)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start(start)
  osc.stop(end + 0.02)
}

function noiseBurst(
  audio: AudioContext,
  { duration, gain = 0.06, delay = 0, bandHz = 1800 }: { duration: number; gain?: number; delay?: number; bandHz?: number },
): void {
  const start = audio.currentTime + delay
  const frames = Math.max(1, Math.floor(audio.sampleRate * duration))
  const buffer = audio.createBuffer(1, frames, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)

  const src = audio.createBufferSource()
  src.buffer = buffer
  const filter = audio.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = bandHz
  filter.Q.value = 0.8
  const amp = audio.createGain()
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  src.connect(filter)
  filter.connect(amp)
  amp.connect(audio.destination)
  src.start(start)
  src.stop(start + duration + 0.02)
}

export function playUiClick(): void {
  const audio = getCtx()
  if (!audio) return
  tone(audio, { frequency: 620, duration: 0.045, type: 'triangle', gain: 0.07 })
  tone(audio, { frequency: 920, duration: 0.03, type: 'sine', gain: 0.04, delay: 0.012 })
}

export function playReveal(large = false): void {
  const audio = getCtx()
  if (!audio) return
  noiseBurst(audio, { duration: large ? 0.07 : 0.035, gain: large ? 0.05 : 0.04, bandHz: large ? 1400 : 1800 })
  tone(audio, { frequency: large ? 520 : 440, duration: large ? 0.09 : 0.05, type: 'triangle', gain: 0.06 })
  if (large) tone(audio, { frequency: 680, duration: 0.08, type: 'sine', gain: 0.04, delay: 0.03 })
}

export function playFlag(): void {
  const audio = getCtx()
  if (!audio) return
  tone(audio, { frequency: 300, duration: 0.04, type: 'triangle', gain: 0.05 })
  tone(audio, { frequency: 460, duration: 0.05, type: 'sine', gain: 0.04, delay: 0.02 })
}

/** Crack, then a falling boom — played when a mine explodes. */
export function playLose(): void {
  const audio = getCtx()
  if (!audio) return

  noiseBurst(audio, { duration: 0.07, gain: 0.2, bandHz: 2400 })
  noiseBurst(audio, { duration: 0.05, gain: 0.12, delay: 0.015, bandHz: 980 })

  const start = audio.currentTime + 0.012
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(170, start)
  osc.frequency.exponentialRampToValueAtTime(38, start + 0.48)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(0.28, start + 0.018)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + 0.55)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start(start)
  osc.stop(start + 0.57)

  tone(audio, { frequency: 96, duration: 0.32, type: 'triangle', gain: 0.12, delay: 0.03 })
  tone(audio, { frequency: 52, duration: 0.5, type: 'sine', gain: 0.1, delay: 0.06 })
  noiseBurst(audio, { duration: 0.42, gain: 0.16, delay: 0.02, bandHz: 160 })
  noiseBurst(audio, { duration: 0.12, gain: 0.07, delay: 0.1, bandHz: 640 })
}

export function playWin(): void {
  const audio = getCtx()
  if (!audio) return
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((frequency, i) => {
    tone(audio, { frequency, duration: 0.22, type: 'triangle', gain: 0.08, delay: i * 0.07 })
  })
}
