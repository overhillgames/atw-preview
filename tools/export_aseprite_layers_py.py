import argparse
import binascii
import json
import re
import struct
import zlib
from pathlib import Path


HEADER_SIZE = 128
FRAME_MAGIC = 0xF1FA
LAYER_CHUNK = 0x2004
CEL_CHUNK = 0x2005


def read_u16(data, offset):
    return struct.unpack_from("<H", data, offset)[0]


def read_i16(data, offset):
    return struct.unpack_from("<h", data, offset)[0]


def read_u32(data, offset):
    return struct.unpack_from("<I", data, offset)[0]


def read_string(data, offset):
    size = read_u16(data, offset)
    start = offset + 2
    end = start + size
    return data[start:end].decode("utf-8", errors="replace"), end


def png_chunk(kind, payload):
    data = kind + payload
    return struct.pack(">I", len(payload)) + data + struct.pack(">I", binascii.crc32(data) & 0xFFFFFFFF)


def write_png(path, width, height, pixels):
    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * stride : (y + 1) * stride])
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + png_chunk(b"IEND", b"")
    )


def alpha_blend(dst, offset, r, g, b, a):
    if a == 0:
        return
    if a == 255:
        dst[offset : offset + 4] = bytes((r, g, b, 255))
        return
    dst_a = dst[offset + 3]
    out_a = a + ((dst_a * (255 - a) + 127) // 255)
    if out_a == 0:
        return
    for i, src in enumerate((r, g, b)):
        dst_c = dst[offset + i]
        dst[offset + i] = (src * a + dst_c * dst_a * (255 - a) // 255) // out_a
    dst[offset + 3] = out_a


def sanitize_name(name):
    cleaned = re.sub(r'[\x00-\x1f<>:"/\\\\|?*]', "_", name).strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    return cleaned or "unnamed"


def parse_aseprite(path):
    data = path.read_bytes()
    if read_u16(data, 4) != 0xA5E0:
        raise ValueError("Input is not an Aseprite file")
    color_depth = read_u16(data, 12)
    if color_depth != 32:
        raise ValueError(f"Only 32-bit RGBA Aseprite files are supported, got {color_depth}")

    width = read_u16(data, 8)
    height = read_u16(data, 10)
    frame_count = read_u16(data, 6)
    layers = []
    cels = []
    offset = HEADER_SIZE

    for frame_index in range(frame_count):
        frame_start = offset
        frame_size = read_u32(data, frame_start)
        if read_u16(data, frame_start + 4) != FRAME_MAGIC:
            raise ValueError(f"Frame {frame_index} has invalid magic")
        old_chunk_count = read_u16(data, frame_start + 6)
        new_chunk_count = read_u32(data, frame_start + 12)
        chunk_count = new_chunk_count or old_chunk_count
        chunk_offset = frame_start + 16

        for _ in range(chunk_count):
            chunk_start = chunk_offset
            chunk_size = read_u32(data, chunk_start)
            chunk_type = read_u16(data, chunk_start + 4)
            chunk_data = data[chunk_start + 6 : chunk_start + chunk_size]

            if chunk_type == LAYER_CHUNK:
                name, _ = read_string(chunk_data, 16)
                layers.append(
                    {
                        "name": name,
                        "visible": (read_u16(chunk_data, 0) & 1) != 0,
                        "opacity": chunk_data[12],
                        "blendMode": read_u16(chunk_data, 10),
                    }
                )
            elif chunk_type == CEL_CHUNK and frame_index == 0:
                layer_index = read_u16(chunk_data, 0)
                x = read_i16(chunk_data, 2)
                y = read_i16(chunk_data, 4)
                opacity = chunk_data[6]
                cel_type = read_u16(chunk_data, 7)
                if cel_type == 2:
                    cel_w = read_u16(chunk_data, 16)
                    cel_h = read_u16(chunk_data, 18)
                    pixels = zlib.decompress(chunk_data[20:])
                    cels.append(
                        {
                            "layerIndex": layer_index,
                            "x": x,
                            "y": y,
                            "opacity": opacity,
                            "width": cel_w,
                            "height": cel_h,
                            "pixels": pixels,
                        }
                    )
            chunk_offset += chunk_size
        offset = frame_start + frame_size

    return {"width": width, "height": height, "layers": layers, "cels": cels}


def render_layer(width, height, layer, cels):
    out = bytearray(width * height * 4)
    layer_opacity = layer["opacity"]
    for cel in cels:
        opacity = cel["opacity"] * layer_opacity // 255
        pixels = cel["pixels"]
        cel_w = cel["width"]
        cel_h = cel["height"]
        x = cel["x"]
        y = cel["y"]
        for py in range(cel_h):
            dy = y + py
            if dy < 0 or dy >= height:
                continue
            for px in range(cel_w):
                dx = x + px
                if dx < 0 or dx >= width:
                    continue
                src_offset = (py * cel_w + px) * 4
                src_a = pixels[src_offset + 3] * opacity // 255
                dst_offset = (dy * width + dx) * 4
                alpha_blend(out, dst_offset, pixels[src_offset], pixels[src_offset + 1], pixels[src_offset + 2], src_a)
    return out


def export_layers(source, out_dir):
    parsed = parse_aseprite(source)
    out_dir.mkdir(parents=True, exist_ok=True)
    used = set()
    manifest = {
        "source": str(source),
        "canvas": {"width": parsed["width"], "height": parsed["height"]},
        "layers": [],
    }

    for index, layer in enumerate(parsed["layers"]):
        base = f"{index:02d}_{sanitize_name(layer['name'])}"
        filename = f"{base}.png"
        counter = 1
        while filename in used:
            filename = f"{base}_{counter}.png"
            counter += 1
        used.add(filename)
        layer_cels = [cel for cel in parsed["cels"] if cel["layerIndex"] == index]
        pixels = render_layer(parsed["width"], parsed["height"], layer, layer_cels)
        write_png(out_dir / filename, parsed["width"], parsed["height"], pixels)
        manifest["layers"].append(
            {
                "zIndex": index,
                "name": layer["name"],
                "file": filename,
                "originalVisible": layer["visible"],
                "opacity": layer["opacity"],
                "celCount": len(layer_cels),
            }
        )

    (out_dir / "layer-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Export flat Aseprite layers to full-canvas PNGs.")
    parser.add_argument("source", type=Path)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    manifest = export_layers(args.source, args.out)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
