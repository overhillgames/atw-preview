import argparse
import binascii
import io
import json
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


def write_u16(buf, offset, value):
    struct.pack_into("<H", buf, offset, value)


def write_u32(buf, offset, value):
    struct.pack_into("<I", buf, offset, value)


def write_i16(buf, offset, value):
    struct.pack_into("<h", buf, offset, value)


def read_string(data, offset):
    size = read_u16(data, offset)
    start = offset + 2
    end = start + size
    return data[start:end].decode("utf-8", errors="replace"), end


def make_bleed_pixels(width, height, safe_x, safe_y, safe_w, safe_h):
    pixels = bytearray(width * height * 4)
    white = bytes((248, 250, 252, 255))
    transparent = bytes((248, 250, 252, 0))
    for y in range(height):
        row = y * width * 4
        in_safe_y = safe_y <= y < safe_y + safe_h
        for x in range(width):
            in_safe = in_safe_y and safe_x <= x < safe_x + safe_w
            pixels[row + x * 4 : row + x * 4 + 4] = transparent if in_safe else white
    return bytes(pixels)


def parse_layers_and_frames(data):
    layer_names = []
    layer_visibility = []
    frames = []
    offset = HEADER_SIZE
    frame_count = read_u16(data, 6)
    for frame_index in range(frame_count):
        frame_start = offset
        frame_size = struct.unpack_from("<I", data, frame_start)[0]
        if read_u16(data, frame_start + 4) != FRAME_MAGIC:
            raise ValueError(f"Frame {frame_index} has invalid magic")
        old_chunk_count = read_u16(data, frame_start + 6)
        new_chunk_count = struct.unpack_from("<I", data, frame_start + 12)[0]
        chunk_count = new_chunk_count or old_chunk_count
        chunk_offset = frame_start + 16
        chunks = []
        for _ in range(chunk_count):
            chunk_start = chunk_offset
            chunk_size = struct.unpack_from("<I", data, chunk_start)[0]
            chunk_type = read_u16(data, chunk_start + 4)
            chunk_data = data[chunk_start + 6 : chunk_start + chunk_size]
            chunks.append((chunk_start, chunk_size, chunk_type, chunk_data))
            if chunk_type == LAYER_CHUNK:
                # Layer chunk layout through name:
                # flags(2), type(2), child level(2), default w/h(4), blend(2),
                # opacity(1), reserved(3), name string.
                name, _ = read_string(chunk_data, 16)
                layer_names.append(name)
                layer_visibility.append((read_u16(chunk_data, 0) & 1) != 0)
            chunk_offset += chunk_size
        frames.append((frame_start, frame_size, chunks))
        offset = frame_start + frame_size
    return layer_names, layer_visibility, frames


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


def export_flat_preview(source, target):
    data = source.read_bytes()
    width = read_u16(data, 8)
    height = read_u16(data, 10)
    _layer_names, layer_visibility, frames = parse_layers_and_frames(data)
    cels = []
    for _frame_start, _frame_size, chunks in frames[:1]:
        for _chunk_start, _chunk_size, chunk_type, chunk_data in chunks:
            if chunk_type != CEL_CHUNK:
                continue
            layer_index = read_u16(chunk_data, 0)
            if layer_index >= len(layer_visibility) or not layer_visibility[layer_index]:
                continue
            cel_type = read_u16(chunk_data, 7)
            if cel_type != 2:
                continue
            x = read_i16(chunk_data, 2)
            y = read_i16(chunk_data, 4)
            opacity = chunk_data[6]
            cel_w = read_u16(chunk_data, 16)
            cel_h = read_u16(chunk_data, 18)
            pixels = zlib.decompress(chunk_data[20:])
            cels.append((layer_index, x, y, opacity, cel_w, cel_h, pixels))

    out = bytearray(width * height * 4)
    for _layer_index, x, y, opacity, cel_w, cel_h, pixels in sorted(cels, key=lambda item: item[0]):
        for py in range(cel_h):
            dy = y + py
            if dy < 0 or dy >= height:
                continue
            for px in range(cel_w):
                dx = x + px
                if dx < 0 or dx >= width:
                    continue
                src_offset = (py * cel_w + px) * 4
                src_a = (pixels[src_offset + 3] * opacity + 127) // 255
                dst_offset = (dy * width + dx) * 4
                alpha_blend(out, dst_offset, pixels[src_offset], pixels[src_offset + 1], pixels[src_offset + 2], src_a)
    write_png(target, width, height, out)


def rewrite_aseprite(
    source,
    target,
    canvas_width,
    canvas_height,
    safe_x,
    safe_y,
    safe_w,
    safe_h,
    source_safe_x,
    source_safe_y,
    bleed_layer_name,
):
    data = bytearray(source.read_bytes())
    if read_u16(data, 4) != 0xA5E0:
        raise ValueError("Input is not an Aseprite file")
    color_depth = read_u16(data, 12)
    if color_depth != 32:
        raise ValueError(f"Only 32-bit RGBA Aseprite files are supported, got {color_depth}")

    layer_names, _layer_visibility, frames = parse_layers_and_frames(data)
    try:
        bleed_layer_index = layer_names.index(bleed_layer_name)
    except ValueError as exc:
        raise ValueError(f"Could not find layer {bleed_layer_name!r}") from exc

    dx = safe_x - source_safe_x
    dy = safe_y - source_safe_y
    bleed_payload = zlib.compress(make_bleed_pixels(canvas_width, canvas_height, safe_x, safe_y, safe_w, safe_h), 9)

    out = bytearray(data[:HEADER_SIZE])
    write_u16(out, 8, canvas_width)
    write_u16(out, 10, canvas_height)

    manifest = {
        "source": str(source),
        "target": str(target),
        "canvas": {"width": canvas_width, "height": canvas_height},
        "safe": {"x": safe_x, "y": safe_y, "width": safe_w, "height": safe_h},
        "bleed": {
            "left": safe_x,
            "right": canvas_width - safe_x - safe_w,
            "top": safe_y,
            "bottom": canvas_height - safe_y - safe_h,
        },
        "sourceSafe": {"x": source_safe_x, "y": source_safe_y, "width": safe_w, "height": safe_h},
        "celShift": {"x": dx, "y": dy},
        "bleedLayer": bleed_layer_name,
    }

    for frame_start, _frame_size, chunks in frames:
        frame_bytes = bytearray(data[frame_start : frame_start + 16])
        new_chunks = []
        for _chunk_start, _chunk_size, chunk_type, chunk_data in chunks:
            body = bytearray(chunk_data)
            if chunk_type == CEL_CHUNK:
                layer_index = read_u16(body, 0)
                cel_type = read_u16(body, 7)
                if layer_index == bleed_layer_index and cel_type == 2:
                    write_i16(body, 2, 0)
                    write_i16(body, 4, 0)
                    write_u16(body, 16, canvas_width)
                    write_u16(body, 18, canvas_height)
                    body = body[:20] + bleed_payload
                else:
                    write_i16(body, 2, read_i16(body, 2) + dx)
                    write_i16(body, 4, read_i16(body, 4) + dy)

            chunk = bytearray(6)
            write_u32(chunk, 0, len(body) + 6)
            write_u16(chunk, 4, chunk_type)
            chunk.extend(body)
            new_chunks.append(chunk)

        new_frame_size = 16 + sum(len(chunk) for chunk in new_chunks)
        write_u32(frame_bytes, 0, new_frame_size)
        out.extend(frame_bytes)
        for chunk in new_chunks:
            out.extend(chunk)

    write_u32(out, 0, len(out))
    target.write_bytes(out)
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Resize an Aseprite battle template canvas and shift existing cels.")
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--width", type=int, default=1260)
    parser.add_argument("--height", type=int, default=1000)
    parser.add_argument("--safe-x", type=int, default=420)
    parser.add_argument("--safe-y", type=int, default=180)
    parser.add_argument("--safe-w", type=int, default=420)
    parser.add_argument("--safe-h", type=int, default=760)
    parser.add_argument("--source-safe-x", type=int, default=105)
    parser.add_argument("--source-safe-y", type=int, default=50)
    parser.add_argument("--bleed-layer", default="bleed_area")
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()

    manifest = rewrite_aseprite(
        args.source,
        args.target,
        args.width,
        args.height,
        args.safe_x,
        args.safe_y,
        args.safe_w,
        args.safe_h,
        args.source_safe_x,
        args.source_safe_y,
        args.bleed_layer,
    )
    if args.manifest:
        args.manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    if args.preview:
        export_flat_preview(args.target, args.preview)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
