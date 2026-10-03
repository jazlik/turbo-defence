"""Filter a Protomaps-schema PMTiles extract down to the lean evacuation basemap.

Geometry is never touched: tiles are decoded as protobuf, whole layers or features are dropped,
and the tile is re-encoded. Keeping the Protomaps schema lets the app use @protomaps/basemaps styles.

The layered layout relies on MapLibre reading the archive as three sources (see src/lib/map-style.ts):
  ctx    maxzoom 12  — landuse (forest, park…), overzoomed when closer
  base   maxzoom 14  — roads, paths, water, labels, earth, boundaries
  detail z15 only    — buildings with house numbers

usage: lean_filter.py IN.pmtiles OUT.pmtiles [--strip-attrs] [--streams-minzoom N]
"""

import argparse
import gzip
import os
from multiprocessing import Pool

from mapbox_vector_tile.Mapbox import vector_tile_pb2 as pb
from pmtiles.reader import MmapSource, Reader, all_tiles
from pmtiles.tile import Compression, TileType, zxy_to_tileid
from pmtiles.writer import Writer

DROP_LAYERS = {"pois"}
# Orientation-relevant landuse only; farmland, meadow, residential, scrub and grass were 59% of the layer.
LANDUSE_KEEP = {
    "forest", "wood", "park", "cemetery", "pedestrian", "nature_reserve", "national_park", "hospital",
    "school", "university", "college", "military", "railway", "platform", "zoo", "garden",
}
LANDUSE_MAXZOOM = 12
BOUNDARIES_KEEP = {"country", "region"}
DETAIL_ZOOM = 15
DETAIL_LAYERS = {"buildings"}
# Attributes read by @protomaps/basemaps layers with lang "pl"; everything else is display-irrelevant.
ATTR_KEEP_EXACT = {
    "kind", "kind_detail", "min_zoom", "population_rank", "sort_key", "sort_rank", "shield_text", "ref", "ref:en",
    "network", "oneway", "capital", "addr_housenumber", "script", "name", "name:pl", "name:en",
}
ATTR_KEEP_PREFIX = ("pgf:",)
STREAM_KINDS = {"stream", "ditch", "drain"}

OPTIONS = {}


def init(options):
    OPTIONS.update(options)


def kind_of(layer, feature):
    keys = list(layer.keys)
    if "kind" not in keys:
        return None
    kind_index = keys.index("kind")
    for i in range(0, len(feature.tags), 2):
        if feature.tags[i] == kind_index:
            return layer.values[feature.tags[i + 1]].string_value
    return None


def keep_feature(layer, feature, z):
    kind = kind_of(layer, feature)
    if layer.name == "landuse":
        return z <= LANDUSE_MAXZOOM and kind in LANDUSE_KEEP
    if layer.name == "boundaries":
        return kind in BOUNDARIES_KEEP
    if layer.name == "water" and z < OPTIONS["streams_minzoom"]:
        return kind not in STREAM_KINDS
    return True


def strip_attributes(layer):
    """Rebuild keys/values so only attributes the style reads survive."""
    keys = list(layer.keys)
    keep_key = [k in ATTR_KEEP_EXACT or k.startswith(ATTR_KEEP_PREFIX) for k in keys]
    new_keys, key_map, new_values, value_map = [], {}, [], {}
    for feature in layer.features:
        tags = []
        for i in range(0, len(feature.tags), 2):
            key_index, value_index = feature.tags[i], feature.tags[i + 1]
            if not keep_key[key_index]:
                continue
            if key_index not in key_map:
                key_map[key_index] = len(new_keys)
                new_keys.append(keys[key_index])
            if value_index not in value_map:
                value_map[value_index] = len(new_values)
                new_values.append(layer.values[value_index])
            tags += [key_map[key_index], value_map[value_index]]
        del feature.tags[:]
        feature.tags.extend(tags)
    del layer.keys[:]
    layer.keys.extend(new_keys)
    del layer.values[:]
    layer.values.extend(new_values)


def filter_tile(item):
    (z, x, y), data = item
    tile = pb.tile()
    tile.ParseFromString(gzip.decompress(data))
    out = pb.tile()
    for layer in tile.layers:
        if layer.name in DROP_LAYERS:
            continue
        # Detail layers render only from the z15 source, so their lower-zoom copies are dead weight; z15 holds nothing else.
        if (z == DETAIL_ZOOM) != (layer.name in DETAIL_LAYERS):
            continue
        features = [f for f in layer.features if keep_feature(layer, f, z)]
        if not features:
            continue
        new_layer = out.layers.add()
        new_layer.CopyFrom(layer)
        del new_layer.features[:]
        new_layer.features.extend(features)
        if OPTIONS["strip_attrs"]:
            strip_attributes(new_layer)
    return zxy_to_tileid(z, x, y), gzip.compress(out.SerializeToString(), 9, mtime=0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--strip-attrs", action="store_true", help="keep only attributes the style reads")
    parser.add_argument("--streams-minzoom", type=int, default=0, help="drop streams/ditches below this zoom")
    args = parser.parse_args()
    options = {"strip_attrs": args.strip_attrs, "streams_minzoom": args.streams_minzoom}

    with open(args.input, "rb") as source:
        reader = Reader(MmapSource(source))
        header, metadata = reader.header(), reader.metadata()
        items = list(all_tiles(reader.get_bytes))
        with Pool(os.cpu_count(), initializer=init, initargs=(options,)) as pool:
            tiles = sorted(pool.map(filter_tile, items, chunksize=64))

    metadata["description"] = "Lean evacuation basemap (W razie W) derived from Protomaps Basemap"
    header["tile_compression"] = Compression.GZIP
    header["tile_type"] = TileType.MVT
    with open(args.output, "wb") as target:
        writer = Writer(target)
        for tile_id, data in tiles:
            writer.write_tile(tile_id, data)
        writer.finalize(header, metadata)
    print(f"{args.output}: {os.path.getsize(args.output) / 1e6:.1f} MB, {len(tiles)} tiles")


if __name__ == "__main__":
    main()
