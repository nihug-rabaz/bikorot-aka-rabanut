import { readFile, writeFile } from "node:fs/promises"
import sharp from "sharp"

const SOURCE = "public/hadracha-logo.png"
const BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 }

const TARGETS = [
  { file: "public/icon-192.png", size: 192, padding: 0.12 },
  { file: "public/icon-512.png", size: 512, padding: 0.12 },
  { file: "public/apple-icon.png", size: 180, padding: 0.12 },
]

class IconGenerator {
  constructor(source, background) {
    this.source = source
    this.background = background
  }

  async generate(target) {
    const inner = Math.round(target.size * (1 - target.padding * 2))
    const logo = await sharp(this.buffer)
      .resize(inner, inner, { fit: "contain", background: this.background })
      .toBuffer()

    const output = await sharp({
      create: { width: target.size, height: target.size, channels: 4, background: this.background },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toBuffer()

    await writeFile(target.file, output)
    return target.file
  }

  async run(targets) {
    this.buffer = await readFile(this.source)
    for (const target of targets) {
      const file = await this.generate(target)
      console.log(`Created ${file} (${target.size}x${target.size})`)
    }
  }
}

await new IconGenerator(SOURCE, BACKGROUND).run(TARGETS)
console.log("Done.")
