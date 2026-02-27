import { BackendApi } from '@universe/api'

export type Ticks = NonNullable<NonNullable<BackendApi.AllV3TicksQuery['v3Pool']>['ticks']>
export type TickData = Ticks[number]
