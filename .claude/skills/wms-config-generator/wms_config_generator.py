#!/usr/bin/env python3
"""
WMS Config Generator - Generates Climweb-compatible JSON layer catalog from a WMS GetCapabilities.

Usage:
    python wms_config_generator.py <WMS_URL> [output_file]

Downloads GetCapabilities XML, parses all layers, classifies them by category/subcategory,
and outputs a JSON config file for the Climweb dataset helper plugin.
"""

import argparse
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse


# --- Constants ---

SKIP_NAMES = {"background", "boundaries", "foreground", "grid", "rivers", "coastlines"}
SKIP_PREFIXES = ("osmgray:", "osm:", "ne:")

ICON_MAP = {
    "Agriculture": "leaf",
    "Atmosphere": "cloud",
    "Climate": "cloud",
    "Drought": "cloud",
    "Emergency": "warning",
    "Environment": "globe",
    "Fire": "fire",
    "Floods": "water",
    "Hazard": "warning",
    "Marine": "water",
    "Multi-Hazard": "warning",
    "Ocean": "water",
    "Rainfall": "cloud",
    "Temperature": "thermometer",
    "Vegetation": "leaf",
    "Water": "water",
}

# Known license mappings by domain
LICENSE_MAP = {
    "eumetsat": "EUMETSAT Data Policy",
    "ecmwf": "Copernicus Data Policy",
    "copernicus": "Copernicus Data Policy",
    "jrc": "Open Data",
}

WMS_NS = {"wms": "http://www.opengis.net/wms"}
XLINK_NS = "http://www.w3.org/1999/xlink"


# --- URL helpers ---

def ensure_getcapabilities_url(url):
    """Ensure the URL has service=WMS&request=GetCapabilities parameters."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    params_lower = {k.lower(): v for k, v in params.items()}

    if "request" not in params_lower:
        params["request"] = ["GetCapabilities"]
    if "service" not in params_lower:
        params["service"] = ["WMS"]

    new_query = urlencode({k: v[0] if isinstance(v, list) else v for k, v in params.items()})
    return urlunparse(parsed._replace(query=new_query))


def derive_source_name(url):
    """Extract a source name from the URL domain."""
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    parts = hostname.split(".")
    # Use second-level domain (e.g., "ecmwf" from "eccharts.ecmwf.int")
    if len(parts) >= 2:
        return parts[-2]
    return parts[0] if parts else "unknown"


def derive_wms_url(root):
    """Extract the GetMap OnlineResource URL from capabilities."""
    el = root.find(
        ".//wms:Capability/wms:Request/wms:GetMap/wms:DCPType/wms:HTTP/wms:Get/wms:OnlineResource",
        WMS_NS,
    )
    if el is not None:
        return el.get(f"{{{XLINK_NS}}}href", "")
    return ""


# --- XML parsing ---

def parse_capabilities(xml_path):
    """Parse GetCapabilities XML and extract service info + all leaf layers."""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    # Service info
    service_title_el = root.find(".//wms:Service/wms:Title", WMS_NS)
    service_title = service_title_el.text if service_title_el is not None else "Unknown WMS Server"

    wms_url = derive_wms_url(root)

    # Extract leaf layers
    leaf_layers = []
    for layer in root.findall(".//wms:Layer", WMS_NS):
        name_el = layer.find("wms:Name", WMS_NS)
        if name_el is None:
            continue

        name = name_el.text
        title_el = layer.find("wms:Title", WMS_NS)
        title = title_el.text if title_el is not None else name
        abstract_el = layer.find("wms:Abstract", WMS_NS)
        abstract = abstract_el.text if abstract_el is not None and abstract_el.text else ""

        # Keywords
        keywords = []
        kw_list = layer.find("wms:KeywordList", WMS_NS)
        if kw_list is not None:
            for kw in kw_list.findall("wms:Keyword", WMS_NS):
                if kw.text:
                    keywords.append(kw.text)

        # Time dimension
        time_dim = None
        for dim in layer.findall("wms:Dimension", WMS_NS):
            if dim.get("name") == "time":
                time_dim = dim.text.strip() if dim.text else ""
                break

        # Bounding box
        bbox = {}
        geo_bb = layer.find("wms:EX_GeographicBoundingBox", WMS_NS)
        if geo_bb is not None:
            for tag in [
                "westBoundLongitude",
                "eastBoundLongitude",
                "southBoundLatitude",
                "northBoundLatitude",
            ]:
                el = geo_bb.find(f"wms:{tag}", WMS_NS)
                bbox[tag] = float(el.text) if el is not None and el.text else None

        leaf_layers.append(
            {
                "name": name,
                "title": title,
                "abstract": abstract,
                "keywords": keywords,
                "has_time": time_dim is not None,
                "time_dim": time_dim,
                "bbox": bbox,
            }
        )

    return service_title, wms_url, leaf_layers


# --- Filtering ---

def should_skip(layer):
    """Return (skip: bool, reason: str) for a layer."""
    name = layer["name"]
    if name in SKIP_NAMES:
        return True, "infrastructure/basemap"
    if any(name.startswith(p) for p in SKIP_PREFIXES):
        return True, "basemap prefix"
    if not layer["abstract"]:
        return True, "no abstract"
    return False, ""


# --- Classification ---

def classify_category(name, title, abstract, keywords):
    """Classify a layer into a category based on its metadata."""
    t = (title + " " + abstract + " " + " ".join(keywords)).lower()
    n = name.lower()

    # Fire
    if "fire" in n or ("fire" in t and "wildfire" not in t):
        return "Fire"
    if "pm_wf" in n or "wildfire" in t:
        return "Fire"

    # Hazard - tropical cyclones
    if any(
        k in t
        for k in [
            "hurricane",
            "tropical cyclone",
            "tropical storm",
            "named cyclone",
            "cyclone strike",
        ]
    ):
        return "Hazard"

    # Pollen → Environment
    if "pollen" in t:
        return "Environment"

    # UV index → Environment
    if "uv index" in t:
        return "Environment"

    # Pressure-level trace gases → Atmosphere
    if any(
        p in n
        for p in [
            "_300hpa", "_50hpa", "_500hpa", "_850hpa", "_700hpa",
            "_upperlevel", "_totalcolumn",
        ]
    ):
        return "Atmosphere"

    # Surface air quality / aerosols → Environment
    if any(
        k in t
        for k in [
            "air quality", "pm2.5", "pm10", "particulate matter",
            "aerosol optical depth", "aod", "dust aerosol", "sea salt aerosol",
            "sulphate aerosol", "biomass burning aerosol",
        ]
    ):
        return "Environment"

    # European surface composition forecasts → Environment
    if "europe" in n and "surface" in n:
        return "Environment"

    # Global composition surface products → Environment
    if "composition" in n and ("surface" in n or "sfc" in n):
        return "Environment"

    # CO2 / CH4 greenhouse gases → Environment
    if any(k in t for k in ["carbon dioxide", "co2", "methane", "ch4"]):
        return "Environment"

    # Remaining PM → Environment
    if any(k in n for k in ["pm10", "pm2p5"]):
        return "Environment"

    # Rainfall / precipitation
    if any(
        k in t
        for k in [
            "rain", "precipitation", "rainfall", "rfe", "chirps",
            "tamsat", "gpcc", "arc2", "precipitating",
        ]
    ):
        return "Rainfall"

    # Temperature
    if any(
        k in t
        for k in [
            "temperature", "2m temp", "lst", "land surface temperature",
            "thermal", "heat", "cold", "frost",
        ]
    ):
        if "pressure level" in t or "upper level" in t or "850" in t:
            return "Atmosphere"
        return "Temperature"

    # Vegetation
    if any(
        k in t
        for k in [
            "vegetation", "fapar", "lai", "dmp", "fcover", "fvc",
            "leaf area", "ndvi", "greenness",
        ]
    ):
        return "Vegetation"

    # Drought
    if any(k in t for k in ["drought", "spi", "soil moisture", "swi", "water stress"]):
        return "Drought"

    # Marine / Ocean
    if any(k in t for k in ["sst", "sea surface temperature", "chlorophyll", "ocean", "sea ice"]):
        return "Marine"

    # Atmosphere (upper level, pressure level products)
    if any(
        k in t
        for k in [
            "geopotential", "wind speed", "mean sea level pressure", "mslp", "msl",
            "upper level", "pressure level", "ensemble mean", "ensemble spread",
        ]
    ):
        return "Atmosphere"

    return "Atmosphere"


def classify_subcategory(name, title, abstract, keywords):
    """Classify a layer into a subcategory."""
    t = (title + " " + abstract + " " + " ".join(keywords)).lower()

    if any(
        k in t
        for k in [
            "forecast", "prediction", "projected", "seasonal", "efi", "outlook",
            "lead time", "ensemble", "probabilistic", "strike probability",
            "perturbed forecast", "eps",
        ]
    ):
        return "Forecast"
    if any(k in t for k in ["monitoring", "nowcast", "near-real-time tracking"]):
        return "Monitoring"
    return "Observation"


# --- Metadata derivation ---

def clean_title(title):
    """Remove common suffixes from layer titles."""
    for suffix in [
        "(provided by CAMS, the Copernicus Atmosphere Monitoring Service)",
        "(provided by CAMS)",
        "(Public)",
    ]:
        title = title.replace(suffix, "")
    return title.strip()


def derive_function(title, abstract):
    """Generate a function description from abstract."""
    if abstract and len(abstract) > 10:
        sentences = abstract.split(".")
        if sentences[0]:
            return sentences[0].strip() + "."
    return f"Provides {clean_title(title).lower()} data."


def derive_frequency(time_dim):
    """Derive update frequency from time dimension string."""
    if not time_dim:
        return "Variable"
    freq_map = [
        ("PT15M", "Every 15 minutes"),
        ("PT1H", "Hourly"),
        ("PT3H", "Every 3 hours"),
        ("PT6H", "Every 6 hours"),
        ("PT12H", "Every 12 hours"),
        ("P1D", "Daily"),
        ("P10D", "Dekadal (10-day)"),
        ("P1M", "Monthly"),
    ]
    for pattern, label in freq_map:
        if pattern in time_dim:
            return label
    return "Variable"


def derive_coverage(bbox, name):
    """Derive geographic coverage from bounding box and layer name."""
    if "europe" in name.lower():
        return "Europe"
    if not bbox:
        return "Global"
    w = bbox.get("westBoundLongitude", -180) or -180
    e = bbox.get("eastBoundLongitude", 180) or 180
    s = bbox.get("southBoundLatitude", -90) or -90
    n = bbox.get("northBoundLatitude", 90) or 90
    if abs(w - (-180)) < 1 and abs(e - 180) < 1 and abs(s - (-90)) < 1 and abs(n - 90) < 1:
        return "Global"
    if w > -30 and e < 60 and s > 25 and n < 75:
        return "Europe"
    if w > -25 and e < 55 and s > -40 and n < 45:
        return "Africa"
    return "Global"


def derive_license(url):
    """Derive license from URL domain."""
    hostname = urlparse(url).hostname or ""
    for key, license_name in LICENSE_MAP.items():
        if key in hostname:
            return license_name
    return "Open Data"


def derive_source(layer, service_title):
    """Derive source attribution."""
    t = layer["title"].lower()
    n = layer["name"].lower()
    if "cams" in t or "composition" in n:
        return f"{service_title} / Copernicus Atmosphere Monitoring Service (CAMS)"
    return service_title


# --- Main generation ---

def generate_config(xml_path, wms_base_url, output_path):
    """Generate the full JSON config from parsed capabilities."""
    service_title, getmap_url, all_layers = parse_capabilities(xml_path)

    # Use provided wms_base_url or fall back to GetMap URL
    wms_url = wms_base_url or getmap_url
    license_str = derive_license(wms_url)
    learn_more = f"https://{urlparse(wms_url).hostname}/" if urlparse(wms_url).hostname else wms_url

    categories = {}
    skipped = []
    kept_count = 0

    for layer in all_layers:
        skip, reason = should_skip(layer)
        if skip:
            skipped.append((layer["name"], reason))
            continue
        kept_count += 1

        cat = classify_category(layer["name"], layer["title"], layer["abstract"], layer["keywords"])
        subcat = classify_subcategory(
            layer["name"], layer["title"], layer["abstract"], layer["keywords"]
        )

        title_clean = clean_title(layer["title"])
        coverage = derive_coverage(layer["bbox"], layer["name"])
        source = derive_source(layer, service_title)

        dataset = {
            "title": title_clean,
            "description": layer["abstract"],
            "multi_temporal": layer["has_time"],
            "metadata": {
                "title": title_clean,
                "function": derive_function(layer["title"], layer["abstract"]),
                "resolution": "Variable",
                "geographic_coverage": coverage,
                "source": source,
                "license": license_str,
                "frequency_of_update": derive_frequency(layer.get("time_dim")),
                "overview": layer["abstract"],
                "learn_more": learn_more,
            },
            "layers": [
                {
                    "type": "wms",
                    "title": title_clean,
                    "layer_name": layer["name"],
                    "wms_url": wms_url,
                    "default": True,
                }
            ],
        }

        if cat not in categories:
            categories[cat] = {}
        if subcat not in categories[cat]:
            categories[cat][subcat] = []
        categories[cat][subcat].append(dataset)

    # Build sorted output
    output = {"categories": []}
    for cat_name in sorted(categories.keys()):
        cat_obj = {
            "title": cat_name,
            "icon": ICON_MAP.get(cat_name, "globe"),
            "subcategories": [],
        }
        for subcat_name in sorted(categories[cat_name].keys()):
            datasets = sorted(categories[cat_name][subcat_name], key=lambda d: d["title"])
            cat_obj["subcategories"].append({"title": subcat_name, "datasets": datasets})
        output["categories"].append(cat_obj)

    # Write
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    # Summary
    print(f"\nOutput: {output_path}")
    print(f"Service: {service_title}")
    print(f"Total layers in GetCapabilities: {len(all_layers)}")
    print(f"Layers kept: {kept_count}")
    print(f"Layers skipped: {len(skipped)}")
    print()
    print("Categories breakdown:")
    for cat_name in sorted(categories.keys()):
        total = sum(len(v) for v in categories[cat_name].values())
        print(f"  {cat_name} ({ICON_MAP.get(cat_name, 'globe')}): {total} layers")
        for subcat_name in sorted(categories[cat_name].keys()):
            print(f"    {subcat_name}: {len(categories[cat_name][subcat_name])}")
    if skipped:
        print()
        print("Skipped layers:")
        for name, reason in skipped:
            print(f"  {name} - {reason}")


def main():
    parser = argparse.ArgumentParser(description="Generate Climweb JSON config from WMS GetCapabilities")
    parser.add_argument("url", help="WMS server URL")
    parser.add_argument("output", nargs="?", default=None, help="Output JSON file path")
    parser.add_argument("--wms-url", default=None, help="Override WMS base URL in output")
    args = parser.parse_args()

    # Ensure GetCapabilities URL
    url = ensure_getcapabilities_url(args.url)
    source_name = derive_source_name(args.url)

    # Default output path
    output_path = args.output or f"plugins/dataset_helper_plugin/static/config/{source_name}/{source_name}_config.json"

    # Download XML
    xml_path = f"/tmp/wms_capabilities_{source_name}.xml"
    print(f"Fetching GetCapabilities from: {url}")
    urllib.request.urlretrieve(url, xml_path)
    print(f"Downloaded to: {xml_path}")

    # WMS URL for layers
    wms_url = args.wms_url
    if not wms_url:
        # Strip GetCapabilities params, keep token/auth params
        parsed = urlparse(args.url)
        params = parse_qs(parsed.query)
        keep_params = {
            k: v[0] if isinstance(v, list) else v
            for k, v in params.items()
            if k.lower() not in ("request", "service", "version")
        }
        wms_url = urlunparse(parsed._replace(query=urlencode(keep_params))) if keep_params else urlunparse(parsed._replace(query=""))

    generate_config(xml_path, wms_url, output_path)


if __name__ == "__main__":
    main()
