export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  host: process.env.HOST ?? '0.0.0.0',
  clientWsPath: '/ws/clients',
  sentinelWsPath: '/ws/sentinels',
} as const
