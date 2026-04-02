import { buildServer } from './server.js'
import { config } from './config.js'

async function main() {
  const { app } = await buildServer()
  await app.listen({ port: config.port, host: config.host })
  console.log(`Sentinel Manager running on port ${config.port}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
