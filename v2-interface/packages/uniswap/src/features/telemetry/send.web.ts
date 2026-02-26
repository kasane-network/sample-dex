import { AppsFlyerEventProperties, UniverseEventProperties } from 'uniswap/src/features/telemetry/types'

// Analytics to Amplitude is intentionally disabled in this fork.

export function sendAnalyticsEvent<EventName extends keyof UniverseEventProperties>(
  ..._args: undefined extends UniverseEventProperties[EventName]
    ? [EventName] | [EventName, UniverseEventProperties[EventName]]
    : [EventName, UniverseEventProperties[EventName]]
): void {
  // no-op: Amplitude analytics disabled
}

export async function sendAppsFlyerEvent<EventName extends keyof AppsFlyerEventProperties>(
  ..._args: undefined extends AppsFlyerEventProperties[EventName]
    ? [EventName] | [EventName, AppsFlyerEventProperties[EventName]]
    : [EventName, AppsFlyerEventProperties[EventName]]
): Promise<void> {
  // no-op: AppsFlyer not supported on web
}
