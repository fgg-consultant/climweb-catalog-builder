export interface WmsSource {
  id: string
  name: string
  url: string
  description?: string | null
  lastFetched?: string | null
  rawCapabilities?: WmsCapabilities | null
  layerCount: number
  createdAt: string
  updatedAt: string
}

export interface WmsCapabilities {
  service: {
    title: string
    abstract?: string
    onlineResource?: string
  }
  version: string
  layers: WmsCapabilityLayer[]
}

export interface WmsCapabilityLayer {
  name?: string
  title: string
  abstract?: string
  queryable: boolean
  crs: string[]
  bbox?: {
    minx: number
    miny: number
    maxx: number
    maxy: number
  }
  timeDimension?: {
    default?: string
    values: string[] // ISO date strings or ranges
  }
  styles: Array<{
    name: string
    title: string
    legendUrl?: string
  }>
  children: WmsCapabilityLayer[]
}

export interface WmsSourceCreateInput {
  name: string
  url: string
  description?: string
}
