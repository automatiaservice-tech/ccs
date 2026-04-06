import { getWhatsAppLogs, getWhatsAppConfig } from '@/lib/actions/whatsapp'
import { WhatsAppClient } from './whatsapp-client'

export default async function WhatsAppPage() {
  const [logsResult, configResult] = await Promise.allSettled([
    getWhatsAppLogs(),
    getWhatsAppConfig(),
  ])

  return (
    <WhatsAppClient
      initialLogs={logsResult.status === 'fulfilled' ? (logsResult.value as any) : []}
      initialConfig={configResult.status === 'fulfilled' ? configResult.value : null}
    />
  )
}
