import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'
import type { CanvasTexture as CanvasTextureType } from 'three'

const textureCache = new Map<string, CanvasTextureType>()

function fitTitle(context: CanvasRenderingContext2D, title: string, maxWidth: number) {
  const preferred = title.length > 7 ? 48 : 56
  for (let size = preferred; size >= 30; size -= 2) {
    context.font = `500 ${size}px "Noto Serif KR", "Apple SD Gothic Neo", serif`
    if (context.measureText(title).width <= maxWidth) return size
  }
  return 30
}

/**
 * Draws the cover typography into a transparent texture. Keeping the Korean
 * title in one 2D canvas avoids tiny SDF glyphs being clipped or uneven when a
 * perspective-neighbor is scaled down in the WebGL scene.
 */
export function getCoverTitleTexture(title: string, index: number, accent: string) {
  const key = `${index}:${title}:${accent}`
  const cached = textureCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 1152
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context unavailable')

  context.clearRect(0, 0, canvas.width, canvas.height)
  const darkInk = index === 3 || index === 4
  const titleColor = darkInk ? '#1a1715' : '#ead19a'
  const metaColor = darkInk ? 'rgba(25,22,20,.76)' : 'rgba(240,216,164,.84)'
  const edgeColor = darkInk ? 'rgba(255,244,210,.18)' : 'rgba(25,17,15,.42)'

  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.font = '500 17px "IBM Plex Mono", monospace'
  context.fillStyle = metaColor
  context.letterSpacing = '2px'
  context.fillText(`HERMES ARCHIVE · ${String(index + 1).padStart(2, '0')}`, 38, 62)

  // A restrained hairline echoes the foil work without competing with it.
  context.strokeStyle = edgeColor
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(38, 80)
  context.lineTo(730, 80)
  context.stroke()

  const titleSize = fitTitle(context, title, 680)
  context.font = `500 ${titleSize}px "Noto Serif KR", "Apple SD Gothic Neo", serif`
  context.textAlign = 'left'
  context.fillStyle = titleColor
  context.shadowColor = darkInk ? 'rgba(255,241,205,.16)' : 'rgba(16,10,8,.28)'
  context.shadowBlur = 3
  context.fillText(title, 38, 1003)
  context.shadowBlur = 0

  context.font = '500 14px "IBM Plex Mono", monospace'
  context.letterSpacing = '2px'
  context.fillStyle = metaColor
  context.fillText('PUBLIC KNOWLEDGE', 38, 1055)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = 4
  texture.needsUpdate = true
  textureCache.set(key, texture)
  return texture
}
