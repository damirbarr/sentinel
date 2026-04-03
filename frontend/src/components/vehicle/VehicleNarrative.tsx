import { useState, useEffect, useRef } from 'react'

interface Props {
  decision: string
  reasonCodes: string[]
  speedKmh: number
  connected: boolean
}

const REASON_PHRASES: Record<string, string> = {
  WEATHER_HEAVY_RAIN:         'heavy rainfall',
  WEATHER_FOG:                'dense fog',
  WEATHER_STRONG_WIND:        'strong winds',
  WEATHER_LOW_VISIBILITY:     'low visibility',
  IN_GEOFENCE_FORBIDDEN_ZONE: 'a restricted zone',
  IN_GEOFENCE_CAUTION_ZONE:   'a caution zone',
  IN_GEOFENCE_SLOW_ZONE:      'a speed-restricted area',
  NETWORK_POOR:               'degraded uplink',
  NETWORK_LOST:               'loss of network connectivity',
  MULTI_FACTOR_RISK:          'multiple simultaneous risk factors',
  SENSOR_OBSTACLE_DETECTED:   'an obstacle in my path',
  SENSOR_FAULT:               'sensor malfunction',
  PERCEPTION_ALARM:           'a perception alarm',
}

function humanizeReasons(codes: string[]): string {
  const phrases = codes.map((c) => REASON_PHRASES[c] ?? c.toLowerCase().replace(/_/g, ' '))
  if (phrases.length === 0) return ''
  if (phrases.length === 1) return phrases[0]
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`
  return `${phrases.slice(0, -1).join(', ')}, and ${phrases[phrases.length - 1]}`
}

function generateNarrative(
  decision: string,
  reasonCodes: string[],
  speedKmh: number,
  connected: boolean,
): string {
  const prefix = connected ? '' : 'Operating in autonomous fallback mode. '
  const stationary = speedKmh < 2 && decision !== 'NORMAL' ? 'I am currently stationary. ' : ''
  const reasons = humanizeReasons(reasonCodes)

  let body: string
  if (decision === 'NORMAL' && reasonCodes.length === 0) {
    body = 'All systems nominal. Routing at full capacity.'
  } else if (decision === 'DEGRADED_SPEED') {
    const dueTo = reasons ? ` due to ${reasons}` : ''
    body = `I'm reducing speed${dueTo}. Proceeding with caution.`
  } else if (decision === 'SAFE_STOP_RECOMMENDED') {
    const becauseOf = reasons ? `${reasons.charAt(0).toUpperCase() + reasons.slice(1)} require${reasons.startsWith('multiple') ? '' : 's'} immediate halt.` : 'Immediate halt required.'
    body = `Initiating safe stop. ${becauseOf}`
  } else if (decision === 'REROUTE_RECOMMENDED') {
    const ahead = reasons ? `${reasons.charAt(0).toUpperCase() + reasons.slice(1)} detected ahead.` : 'Route obstruction detected.'
    body = `I'm calculating an alternate route. ${ahead}`
  } else {
    const dueTo = reasons ? ` due to ${reasons}` : ''
    body = `Operating in ${decision.replace(/_/g, ' ').toLowerCase()} mode${dueTo}.`
  }

  return `${prefix}${stationary}${body}`
}

let stylesInjected = false

export default function VehicleNarrative({ decision, reasonCodes, speedKmh, connected }: Props) {
  const narrative = generateNarrative(decision, reasonCodes, speedKmh, connected)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!stylesInjected) {
      const style = document.createElement('style')
      style.textContent = `
        @keyframes sentinel-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes sentinel-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `
      document.head.appendChild(style)
      stylesInjected = true
    }
  }, [])

  useEffect(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setDisplayedText('')
    setIsTyping(true)
    indexRef.current = 0

    function typeNext() {
      indexRef.current += 1
      const next = narrative.slice(0, indexRef.current)
      setDisplayedText(next)
      if (indexRef.current < narrative.length) {
        timeoutRef.current = setTimeout(typeNext, 28)
      } else {
        setIsTyping(false)
        timeoutRef.current = null
      }
    }

    if (narrative.length > 0) {
      timeoutRef.current = setTimeout(typeNext, 28)
    } else {
      setIsTyping(false)
    }

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [narrative])

  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)',
      border: '1px solid rgba(74,222,128,0.2)',
      borderRadius: 6,
      padding: '10px 12px',
      backdropFilter: 'blur(4px)',
      fontFamily: 'monospace',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#4ade80',
          boxShadow: '0 0 8px #4ade80',
          display: 'inline-block',
          animation: 'sentinel-pulse 1.5s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 9, letterSpacing: '0.2em', color: '#4ade80', textTransform: 'uppercase', fontWeight: 700 }}>
          Sentinel AI
        </span>
      </div>

      <p style={{
        fontSize: 12,
        lineHeight: 1.6,
        color: '#e2e8f0',
        margin: 0,
        minHeight: 60,
      }}>
        {displayedText}
        {isTyping && (
          <span style={{
            borderRight: '2px solid #4ade80',
            marginLeft: 1,
            animation: 'sentinel-blink 0.7s step-end infinite',
          }} />
        )}
      </p>
    </div>
  )
}
