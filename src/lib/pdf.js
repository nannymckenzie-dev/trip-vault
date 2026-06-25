// Lazy-loaded pdf.js wrapper. Imported dynamically by the viewer so pdf.js
// (large) is code-split out of the main bundle. Renders each page to a canvas.
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function renderPdfToCanvases(blob, scale = 1.5) {
  const data = await blob.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const dpr = window.devicePixelRatio || 1
  const canvases = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`
    canvas.style.display = 'block'
    canvas.style.margin = '0 auto 8px'
    ctx.scale(dpr, dpr)
    await page.render({ canvasContext: ctx, viewport }).promise
    canvases.push(canvas)
  }
  return canvases
}
