import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { CanvasTexture as CanvasTextureType } from 'three'

const textureCache = new Map<string, CanvasTextureType>()

export function getClothTexture(accent: string) {
  const cached = textureCache.get(accent)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context unavailable')

  context.fillStyle = accent
  context.fillRect(0, 0, canvas.width, canvas.height)

  const grain = context.createLinearGradient(0, 0, 256, 256)
  grain.addColorStop(0, 'rgba(255,255,255,.08)')
  grain.addColorStop(0.45, 'rgba(255,255,255,0)')
  grain.addColorStop(1, 'rgba(0,0,0,.12)')
  context.fillStyle = grain
  context.fillRect(0, 0, canvas.width, canvas.height)

  // Soft, sub-pixel threads: broad spacing and low opacity keep the result
  // textile-like instead of reading as a hard pixel grid at cover scale.
  context.lineWidth = 0.45
  for (let i = 0; i < 256; i += 8) {
    const bright = i % 16 === 0
    context.strokeStyle = bright ? 'rgba(255,255,255,.032)' : 'rgba(0,0,0,.032)'
    context.beginPath()
    context.moveTo(i + 0.25, 0)
    context.lineTo(i + 0.25, 256)
    context.stroke()
    context.beginPath()
    context.moveTo(0, i + 0.25)
    context.lineTo(256, i + 0.25)
    context.stroke()
  }

  // Deterministic micro-fibers break up the broad weave without introducing
  // a second visible regular pattern.
  context.globalAlpha = 0.055
  for (let i = 0; i < 420; i += 1) {
    const value = (i * 47) % 255
    const x = (i * 71) % 256
    const y = (i * 113) % 256
    context.fillStyle = value > 127 ? '#fff' : '#000'
    context.fillRect(x, y, 1, 1)
  }
  context.globalAlpha = 1

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1.45, 2.1)
  texture.anisotropy = 4
  texture.needsUpdate = true
  textureCache.set(accent, texture)
  return texture
}
