#!/usr/bin/env python3
"""Generate the extension icons (same tile-and-arrow mark as the app)."""

import struct
import zlib
from pathlib import Path

SIZES = [16, 32, 48, 128]
SS = 4


def png(width, height, rgba):
    raw = b"".join(
        b"\x00" + rgba[y * width * 4 : (y + 1) * width * 4] for y in range(height)
    )

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def blend(buf, i, r, g, b, a):
    da = buf[i + 3]
    na = a + da * (1 - a)
    if na <= 0:
        return
    for k, v in enumerate((r, g, b)):
        buf[i + k] = (v * a + buf[i + k] * da * (1 - a)) / na
    buf[i + 3] = na


def draw(size):
    n = size * SS
    buf = [0.0] * (n * n * 4)
    radius = n * 0.22
    c = n / 2
    for y in range(n):
        for x in range(n):
            i = (y * n + x) * 4
            dx = max(abs(x - c) - (n / 2 - radius), 0.0)
            dy = max(abs(y - c) - (n / 2 - radius), 0.0)
            if (dx * dx + dy * dy) ** 0.5 > radius:
                continue
            t = y / n
            blend(buf, i, 0.145 + (0.105 - 0.145) * t, 0.165 + (0.125 - 0.165) * t,
                  0.215 + (0.165 - 0.215) * t, 1.0)
            shaft = n * 0.135
            arrow = (
                (n * 0.20 <= y <= n * 0.55 and abs(x - c) <= shaft / 2)
                or (n * 0.50 <= y <= n * 0.735
                    and abs(x - c) <= n * 0.235 * (1 - (y - n * 0.50) / (n * 0.235)))
                or (n * 0.775 <= y <= n * 0.835 and abs(x - c) <= n * 0.245)
            )
            if arrow:
                blend(buf, i, 1.0, 1.0, 1.0, 1.0)

    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(SS):
                for sx in range(SS):
                    src = ((y * SS + sy) * n + (x * SS + sx)) * 4
                    for k in range(4):
                        acc[k] += buf[src + k]
            dst = (y * size + x) * 4
            count = SS * SS
            for k in range(3):
                out[dst + k] = int(max(0, min(255, acc[k] / count * 255)))
            out[dst + 3] = int(max(0, min(255, acc[3] / count * 255)))
    return bytes(out)


def main():
    out = Path(__file__).resolve().parent.parent / "icons"
    out.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = out / f"{size}.png"
        path.write_bytes(png(size, size, draw(size)))
        print(f"{path.name}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
