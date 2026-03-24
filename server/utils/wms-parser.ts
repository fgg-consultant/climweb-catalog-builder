import { XMLParser } from 'fast-xml-parser'
import type { WmsCapabilities, WmsCapabilityLayer } from '~/types/wms'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) => ['Layer', 'Style', 'CRS', 'SRS', 'Format'].includes(name),
})

export async function fetchWmsCapabilities(baseUrl: string): Promise<WmsCapabilities> {
  const separator = baseUrl.includes('?') ? '&' : '?'
  const url = `${baseUrl}${separator}SERVICE=WMS&REQUEST=GetCapabilities`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch capabilities: ${response.status} ${response.statusText}`)
  }

  const xml = await response.text()
  return parseWmsCapabilities(xml)
}

export function parseWmsCapabilities(xml: string): WmsCapabilities {
  const parsed = parser.parse(xml)

  // Handle both WMS 1.1.1 and 1.3.0 root elements
  const root = parsed.WMS_Capabilities || parsed.WMT_MS_Capabilities
  if (!root) {
    throw new Error('Invalid WMS GetCapabilities response')
  }

  const version = root['@_version'] || '1.3.0'
  const service = root.Service || {}
  const capability = root.Capability || {}

  return {
    service: {
      title: service.Title || '',
      abstract: service.Abstract || undefined,
      onlineResource: service.OnlineResource?.['@_href'] ||
        service.OnlineResource?.['@_xlink:href'] || undefined,
    },
    version,
    layers: parseLayerTree(capability.Layer, version),
  }
}

function parseLayerTree(
  layerNode: any,
  version: string
): WmsCapabilityLayer[] {
  if (!layerNode) return []

  const layers = Array.isArray(layerNode) ? layerNode : [layerNode]

  return layers.map((layer) => parseLayer(layer, version))
}

function parseLayer(layer: any, version: string): WmsCapabilityLayer {
  const crsKey = version === '1.3.0' ? 'CRS' : 'SRS'
  const crsValue = layer[crsKey]
  const crs = Array.isArray(crsValue)
    ? crsValue.map(String)
    : crsValue
      ? [String(crsValue)]
      : []

  // Parse bounding box
  let bbox: WmsCapabilityLayer['bbox'] = undefined
  const bb = layer.EX_GeographicBoundingBox || layer.LatLonBoundingBox
  if (bb) {
    if (bb['@_minx'] !== undefined) {
      // WMS 1.1.1 style
      bbox = {
        minx: parseFloat(bb['@_minx']),
        miny: parseFloat(bb['@_miny']),
        maxx: parseFloat(bb['@_maxx']),
        maxy: parseFloat(bb['@_maxy']),
      }
    } else {
      // WMS 1.3.0 style
      bbox = {
        minx: parseFloat(bb.westBoundLongitude),
        miny: parseFloat(bb.southBoundLatitude),
        maxx: parseFloat(bb.eastBoundLongitude),
        maxy: parseFloat(bb.northBoundLatitude),
      }
    }
  }

  // Parse time dimension
  let timeDimension: WmsCapabilityLayer['timeDimension'] = undefined
  const dimensions = layer.Dimension
  if (dimensions) {
    const dimList = Array.isArray(dimensions) ? dimensions : [dimensions]
    const timeDim = dimList.find(
      (d: any) => (d['@_name'] || '').toLowerCase() === 'time'
    )
    if (timeDim) {
      const timeText = typeof timeDim === 'string' ? timeDim : (timeDim['#text'] || '')
      const values = timeText
        .split(',')
        .map((v: string) => v.trim())
        .filter(Boolean)
      timeDimension = {
        default: timeDim['@_default'] || undefined,
        values,
      }
    }
  }

  // Parse styles
  const styleNodes = layer.Style || []
  const styles = styleNodes.map((s: any) => ({
    name: s.Name || '',
    title: s.Title || s.Name || '',
    legendUrl: s.LegendURL?.OnlineResource?.['@_href'] ||
      s.LegendURL?.OnlineResource?.['@_xlink:href'] || undefined,
  }))

  return {
    name: layer.Name || undefined,
    title: layer.Title || '',
    abstract: layer.Abstract || undefined,
    queryable: layer['@_queryable'] === '1' || layer['@_queryable'] === 'true',
    crs,
    bbox,
    timeDimension,
    styles,
    children: parseLayerTree(layer.Layer, version),
  }
}

/**
 * Flatten a layer tree into a list of leaf layers (those with a name).
 */
export function flattenLayers(layers: WmsCapabilityLayer[]): WmsCapabilityLayer[] {
  const result: WmsCapabilityLayer[] = []
  for (const layer of layers) {
    if (layer.name) {
      result.push(layer)
    }
    if (layer.children.length > 0) {
      result.push(...flattenLayers(layer.children))
    }
  }
  return result
}
