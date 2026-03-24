---
name: wms-config-generator
description: Slash command that fetches a WMS GetCapabilities URL, parses all layers, classifies them by theme and type, and generates a Climweb JSON layer catalog config file. Usage - /wms-config-generator <WMS_URL> [output_file]
user_invocable: true
argument_format: "<WMS_URL> [output_file]"
---

# /wms-config-generator

Generate a Climweb-compatible JSON layer catalog config from a WMS server.

## Usage

```
/wms-config-generator <WMS_URL> [output_file]
```

- `WMS_URL` (required): Base URL of the WMS server. The `?service=WMS&request=GetCapabilities` query will be appended automatically if not present.
- `output_file` (optional): Path for the output JSON. Defaults to `plugins/dataset_helper_plugin/static/config/<source_name>_config.json`.

## Execution steps

### Step 1: Fetch the GetCapabilities

Use WebFetch to download the GetCapabilities XML from the URL. If the URL doesn't already contain `request=GetCapabilities`, append `?service=WMS&request=GetCapabilities`.

### Step 2: Parse the XML

Extract from the `<Service>` element:
- **Service Title** → use as default `source` in metadata and to derive the output filename
- **WMS endpoint URL** → from `<GetMap>/<Get>/<OnlineResource>` → use as `wms_url` for all layers

For each `<Layer>` element that has a `<Name>` (leaf layers only), extract:
- `Name` → `layer_name`
- `Title` → `title` for the layer and dataset
- `Abstract` → `description` and `metadata.overview`
- `KeywordList/Keyword` → use for classification hints
- `Dimension[@name='time']` → if present, set `multi_temporal: true` and extract time range info
- `EX_GeographicBoundingBox` → derive `geographic_coverage`

### Step 3: Filter layers

Skip layers that are clearly basemaps or infrastructure:
- Layer names starting with `osmgray:`, `osm:`, `ne:`, `coastlines`, `boundaries`
- Layers without an Abstract (empty `<Abstract/>` or missing)

### Step 4: Classify each layer

For each remaining layer, determine the **Category** and **SubCategory** by analyzing the layer's Name, Title, Abstract, and Keywords.

#### Category classification rules

Use the layer title, abstract, and keywords to assign ONE category:

| Category | Keywords / signals in title/abstract |
|---|---|
| **Agriculture** | crop, pasture, agriculture, WSI crop, food security, yield, harvest |
| **Atmosphere** | RGB composite, airmass, cloud mask, cloud type, cloud top, convective storms, volcanic ash, dust, microphysics, atmospheric motion vectors, AMV, wind vectors, IASI, sounder, instability index, humidity profile, temperature profile (atmospheric), trace gas, EUMETCast |
| **Climate** | climate, SEVIRI imagery, satellite image, radiance, reflectance, solar radiation, albedo (surface/climate context), SARAH, CLAAS, cloud climate record |
| **Drought** | drought, SPI, soil moisture, SWI, water stress, WSI, GRACE, TWS, water storage, dryness, evapotranspiration |
| **Emergency** | flood forecast, tropical storm warning, alert, emergency, disaster |
| **Environment** | aerosol, AOD, PM2.5, PM10, air quality, ozone, chlorophyll (non-ocean), TSM, suspended matter, land cover |
| **Fire** | fire, burnt, burned, active fire, FIRMS, FRP, fire radiative |
| **Floods** | flood, inundation, flood monitoring, flood detection, water extent (flood context) |
| **Hazard** | lightning, thunderstorm detection, severe weather, cyclone tracking, hazard warning |
| **Marine** | SST, sea surface temperature, coastal, fisheries, chlorophyll-a (ocean context), KD490, PAR, sea level, wave, tidal, coral |
| **Multi-Hazard** | multi-hazard, data portal, multi-product platform, EUMETView |
| **Ocean** | ocean flux, evaporation (ocean), freshwater flux, sea ice, ice concentration, ice drift, HOAPS, ocean heat, ocean circulation |
| **Rainfall** | rain, precipitation, rainfall, RFE, CHIRPS, TAMSAT, SPI (when about rainfall), GPCC, ARC2, total precipitation, precipitating clouds |
| **Temperature** | temperature, 2m temp, LST, land surface temperature, thermal, heat, cold, frost |
| **Vegetation** | vegetation, FAPAR, LAI, DMP, FCOVER, FVC, fractional vegetation cover, leaf area index, greenness, NDVI, vegetation index |
| **Water** | water surface, inland water, lake, river, water level, water body |

If ambiguous, prefer the more specific category. For example "soil moisture" → Drought, not Environment.

#### SubCategory classification rules

| SubCategory | Signals |
|---|---|
| **Observation** | Default. Historical data, reanalysis, measured, observed, satellite-derived, NRT (near-real-time), daily/dekadal/monthly aggregations of past data |
| **Forecast** | forecast, prediction, projected, seasonal, EFI, outlook, lead time, ensemble, probabilistic |
| **Monitoring** | monitoring, real-time surveillance, nowcast, near-real-time tracking, alert-based, fire detection (NRT) |

When in doubt, default to **Observation**.

### Step 5: Derive metadata

For each layer, populate metadata fields:

| Field | How to derive |
|---|---|
| `title` | Use the parent product name (group title), or the layer Title with context removed |
| `function` | Summarize what the product measures in one sentence, from the Abstract |
| `resolution` | Extract from Abstract if mentioned (e.g. "3km", "0.05 degree"), otherwise "Variable" |
| `geographic_coverage` | From bounding box: global extent → "Global", roughly Africa → "Africa", MSG disc → "Africa, Europe, Indian Ocean (full disc)", etc. |
| `source` | Service Title + satellite/instrument if identifiable from the layer name (e.g. "EUMETSAT / Meteosat-11/12 (MSG)") |
| `license` | Known licenses: EUMETSAT → "EUMETSAT Data Policy", JRC → "Open Data", Copernicus → "Copernicus Data Policy". Default: "Open Data" |
| `frequency_of_update` | From the time Dimension interval: PT15M → "Every 15 minutes", P1D → "Daily", P10D → "Dekadal (10-day)", P1M → "Monthly". Or from Abstract. |
| `overview` | The full Abstract text, cleaned up |
| `learn_more` | Use the service base URL or a known documentation URL for the provider |

### Step 6: Build the JSON output

Structure the output as:

```json
{
  "categories": [
    {
      "title": "Category Name",
      "icon": "<icon>",
      "subcategories": [
        {
          "title": "Observation",
          "datasets": [
            {
              "title": "Dataset Title",
              "description": "Description from Abstract",
              "multi_temporal": true,
              "metadata": {
                "title": "Product title",
                "function": "What it measures",
                "resolution": "Spatial resolution",
                "geographic_coverage": "Coverage area",
                "source": "Data provider",
                "license": "License",
                "frequency_of_update": "Update frequency",
                "overview": "Detailed description",
                "learn_more": "URL"
              },
              "layers": [
                {
                  "type": "wms",
                  "title": "Layer display title",
                  "layer_name": "WMS layer name exactly as in GetCapabilities",
                  "wms_url": "https://server/wms-endpoint",
                  "default": true
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Convention: **one dataset per layer** (one dataset = one layer in the `layers[]` array).

#### Icon mapping

| Category | Icon           |
|---|----------------|
| Agriculture | `agriculture`  |
| Atmosphere | `violent-wind` |
| Climate | `cloud`        |
| Drought | `drought`      |
| Emergency | `warning`      |
| Environment | `environment`  |
| Fire | `fire`         |
| Floods | `flood`        |
| Hazard | `warning`      |
| Marine | `water-source` |
| Multi-Hazard | `warning`      |
| Ocean | `water-source` |
| Rainfall | `cloud`        |
| Temperature | `heatwave`     |
| Vegetation | `snippet`      |
| Water | `water-source` |

### Step 7: Write the output and summarize

Write the JSON to the output file path. Sort categories alphabetically and datasets alphabetically by title within each subcategory.

Print a summary table:
- Total layers found vs. layers kept (after filtering)
- Layer count per category/subcategory
- Any layers that were skipped and why
- Output file path

## Important rules

- The `layer_name` must be EXACTLY as it appears in the GetCapabilities `<Name>` element — never modify it
- the dataset `description` must be concise, less than 100 characters, and derived from the Abstract. Use the full Abstract in `metadata.overview`.
- The `wms_url` should be the base WMS endpoint URL (without query parameters)
- All layers: `"type": "wms"` and `"default": true`
- Set `multi_temporal: true` when a `<Dimension name="time">` is present
- Keep dataset titles concise but informative

## Example

Given a GetCapabilities with:
```xml
<Layer queryable="1">
    <Name>msg_fes:clm</Name>
    <Title>Cloud Mask - MSG - 0 degree</Title>
    <Abstract>The Cloud Mask product describes the scene type...</Abstract>
    <Dimension name="time" default="2026-03-18T16:45:00Z" units="ISO8601">2020-09-01/2026-03-18/PT15M</Dimension>
</Layer>
```

This produces a dataset under **Category: Atmosphere** / **SubCategory: Observation**:
```json
{
  "title": "Cloud Mask - MSG - 0 degree",
  "description": "The Cloud Mask product describes the scene type...",
  "multi_temporal": true,
  "metadata": {
    "title": "Cloud Mask (MSG SEVIRI)",
    "function": "Classifies each pixel as clear sky over water, clear sky over land, cloud, or not processed",
    "resolution": "3km (nadir)",
    "geographic_coverage": "Africa, Europe, Indian Ocean (full disc)",
    "source": "EUMETSAT / Meteosat (MSG)",
    "license": "EUMETSAT Data Policy",
    "frequency_of_update": "Every 15 minutes",
    "overview": "The Cloud Mask product describes the scene type (either clear or cloudy) on a pixel level...",
    "learn_more": "https://view.eumetsat.int/"
  },
  "layers": [
    {
      "type": "wms",
      "title": "Cloud Mask - MSG - 0 degree",
      "layer_name": "msg_fes:clm",
      "wms_url": "https://view.eumetsat.int/geoserver/ows",
      "default": true
    }
  ]
}
```
