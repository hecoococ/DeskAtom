import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const mcpDir = path.join(repoRoot, 'mcp-server')

const filesToSync = [
  ['electron/mcpServer.js', 'mcpServer.js'],
  ['electron/taskStore.js', 'taskStore.js'],
  ['electron/aiService.js', 'aiService.js']
]

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

async function main() {
  await fs.mkdir(mcpDir, { recursive: true })

  for (const [source, target] of filesToSync) {
    await fs.copyFile(path.join(repoRoot, source), path.join(mcpDir, target))
  }

  const rootPackage = await readJson(path.join(repoRoot, 'package.json'))
  const mcpPackagePath = path.join(mcpDir, 'package.json')
  const mcpPackage = await readJson(mcpPackagePath)
  mcpPackage.version = rootPackage.version
  await writeJson(mcpPackagePath, mcpPackage)

  console.log(`Synced DeskAtom MCP server v${mcpPackage.version} to ${mcpDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
