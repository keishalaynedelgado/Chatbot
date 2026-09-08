/**
 * Dependency-free chart renderer (bar / pie / line).
 *
 * Produces a raw PNG (via Node's built-in zlib for compression + a small
 * hand-written CRC32) containing ONLY the chart shapes — no text is baked
 * into the image. Labels/title/values are added separately as native PPTX
 * text boxes by pptxSlideBuilder.js, positioned using the same layout math
 * exported here, so everything aligns exactly.
 *
 * Everything is drawn at SUPERSAMPLE× resolution internally and then
 * downsampled (box-filtered) to the target size — this is what gives
 * smooth, anti-aliased edges on circles/rounded corners/diagonal lines
 * instead of jagged pixel steps, with no image library involved.
 *
 * No new npm dependency, no native compilation, no network call.
 */

import zlib from 'zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SUPERSAMPLE = 3;

// A muted, professional palette rather than saturated "primary" colors —
// and the blue specifically matches Synthie AI's own brand indigo
// (#4648d4 / secondary) and the red matches the app's actual error color
// (#ba1a1a), so generated charts feel visually consistent with the rest
// of the product rather than generic defaults.
const BACKGROUND = [250, 250, 253]; // near-white, matches app's off-white surface
const GRID_LINE = [232, 232, 238];
const AXIS_LINE = [200, 200, 208];

// Standard PNG/zlib CRC-32 table (per the PNG spec, Annex D).
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Encodes a raw RGBA pixel buffer (width*height*4 bytes, row-major,
 * top-to-bottom) as a PNG file Buffer.
 */
function encodePng(pixels, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  // Each scanline is prefixed with a filter-type byte (0 = None).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const idatData = zlib.deflateSync(raw);

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Box-filter downsample: averages each `factor`×`factor` block of the
 * source image into one output pixel. This is what turns the jagged
 * edges of the supersampled buffer into smooth, anti-aliased ones.
 */
function downsample(pixels, srcWidth, srcHeight, factor) {
  const dstWidth = Math.round(srcWidth / factor);
  const dstHeight = Math.round(srcHeight / factor);
  const out = Buffer.alloc(dstWidth * dstHeight * 4);
  const area = factor * factor;

  for (let dy = 0; dy < dstHeight; dy++) {
    for (let dx = 0; dx < dstWidth; dx++) {
      let r = 0, g = 0, b = 0, a = 0;
      const sxBase = dx * factor;
      const syBase = dy * factor;
      for (let fy = 0; fy < factor; fy++) {
        const rowIdx = ((syBase + fy) * srcWidth + sxBase) * 4;
        for (let fx = 0; fx < factor; fx++) {
          const idx = rowIdx + fx * 4;
          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
          a += pixels[idx + 3];
        }
      }
      const outIdx = (dy * dstWidth + dx) * 4;
      out[outIdx] = Math.round(r / area);
      out[outIdx + 1] = Math.round(g / area);
      out[outIdx + 2] = Math.round(b / area);
      out[outIdx + 3] = Math.round(a / area);
    }
  }

  return { pixels: out, width: dstWidth, height: dstHeight };
}

function allocCanvas(width, height, bg = BACKGROUND) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = bg[0];
    pixels[i + 1] = bg[1];
    pixels[i + 2] = bg[2];
    pixels[i + 3] = 255;
  }
  return pixels;
}

/**
 * Computes the pixel-space layout (per-bar x/width, baseline y, chart
 * plot area) for N bars in an image of the given size. Shared by the PNG
 * renderer and pptxSlideBuilder.js so labels line up with bars exactly.
 * Always computed at TARGET (1x) resolution regardless of supersampling.
 */
function computeBarLayout(count, width, height, padding = 28) {
  const axisY = height - padding;
  const plotTop = padding;
  const plotHeight = axisY - plotTop;
  const slotWidth = (width - padding * 2) / Math.max(count, 1);
  const barWidth = slotWidth * 0.58;

  const bars = [];
  for (let i = 0; i < count; i++) {
    const slotX = padding + i * slotWidth;
    bars.push({
      x: slotX + (slotWidth - barWidth) / 2,
      width: barWidth,
      slotX,
      slotWidth,
    });
  }

  return { axisY, plotTop, plotHeight, bars, width, height };
}

function setPixel(pixels, width, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= width) return;
  const idx = (y * width + x) * 4;
  pixels[idx] = r;
  pixels[idx + 1] = g;
  pixels[idx + 2] = b;
  pixels[idx + 3] = a;
}

function fillRect(pixels, width, x0, y0, x1, y1, color) {
  const xStart = Math.max(0, Math.round(x0));
  const xEnd = Math.round(x1);
  const yStart = Math.max(0, Math.round(y0));
  const yEnd = Math.round(y1);
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      setPixel(pixels, width, x, y, color);
    }
  }
}

/**
 * A rectangle with rounded top corners only (bars sitting on a baseline
 * look better without rounding the bottom, which sits flush on the axis).
 */
function fillRoundedTopRect(pixels, width, x0, y0, x1, y1, color, radius) {
  const xStart = Math.max(0, Math.round(x0));
  const xEnd = Math.round(x1);
  const yStart = Math.max(0, Math.round(y0));
  const yEnd = Math.round(y1);
  const r = Math.min(radius, (xEnd - xStart) / 2, yEnd - yStart);

  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const inTopLeftCorner = x < xStart + r && y < yStart + r;
      const inTopRightCorner = x >= xEnd - r && y < yStart + r;

      if (inTopLeftCorner) {
        const dx = x - (xStart + r);
        const dy = y - (yStart + r);
        if (dx * dx + dy * dy > r * r) continue;
      } else if (inTopRightCorner) {
        const dx = x - (xEnd - r);
        const dy = y - (yStart + r);
        if (dx * dx + dy * dy > r * r) continue;
      }

      setPixel(pixels, width, x, y, color);
    }
  }
}

function fillCircle(pixels, width, cx, cy, r, color) {
  const yStart = Math.round(cy - r);
  const yEnd = Math.round(cy + r);
  const xStart = Math.round(cx - r);
  const xEnd = Math.round(cx + r);
  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(pixels, width, x, y, color);
    }
  }
}

/**
 * Draws light horizontal reference lines across the plot area (a subtle
 * dashboard-style grid), behind whatever gets drawn on top of it.
 */
function drawGridLines(pixels, width, layout, padding, lineCount = 4) {
  for (let i = 1; i <= lineCount; i++) {
    const y = layout.plotTop + (layout.plotHeight / lineCount) * i;
    fillRect(pixels, width, padding, y, width - padding, y + 1, GRID_LINE);
  }
}

/**
 * Renders a bar chart (bars only, no text) as a PNG Buffer.
 * `values` — array of non-negative numbers, one per bar.
 * `colors` — array of [r,g,b] arrays, one per bar (alpha is always opaque).
 */
function renderBarChartPng({ values, colors, width = 800, height = 400 }) {
  const layout = computeBarLayout(values.length, width, height);
  const SS = SUPERSAMPLE;
  const pixels = allocCanvas(width * SS, height * SS);

  drawGridLines(pixels, width * SS, {
    plotTop: layout.plotTop * SS,
    plotHeight: layout.plotHeight * SS,
  }, 24 * SS);

  fillRect(pixels, width * SS, 28 * SS, layout.axisY * SS, (width - 28) * SS, layout.axisY * SS + SS, AXIS_LINE);

  const maxVal = Math.max(1, ...values);
  values.forEach((value, i) => {
    const bar = layout.bars[i];
    const barHeight = Math.round((value / maxVal) * layout.plotHeight);
    const [r, g, b] = colors[i] || [70, 130, 200];
    fillRoundedTopRect(
      pixels, width * SS,
      bar.x * SS, (layout.axisY - barHeight) * SS,
      (bar.x + bar.width) * SS, layout.axisY * SS,
      [r, g, b, 255], 6 * SS
    );
  });

  const final = downsample(pixels, width * SS, height * SS, SS);
  return { buffer: encodePng(final.pixels, final.width, final.height), layout };
}

/**
 * Computes pie-chart layout: circle center/radius plus a legend swatch
 * position per category. Shared with pptxSlideBuilder.js so label text
 * boxes line up with each legend swatch exactly.
 */
function computePieLayout(count, width, height) {
  const cx = width * 0.28;
  const cy = height / 2;
  const radius = Math.min(cx, height / 2) - 24;
  const legendX = width * 0.56;
  const swatchSize = 20;
  const legendGap = (height - 40) / Math.max(count, 1);
  const legendItems = [];
  for (let i = 0; i < count; i++) {
    legendItems.push({ x: legendX, y: 20 + i * legendGap, size: swatchSize });
  }
  return { cx, cy, radius, legendItems, width, height };
}

/**
 * Renders a pie chart (wedges + legend color swatches, no text) as a PNG.
 * `values` — non-negative numbers; `colors` — one [r,g,b] per value.
 */
function renderPieChartPng({ values, colors, width = 800, height = 400 }) {
  const layout = computePieLayout(values.length, width, height);
  const SS = SUPERSAMPLE;
  const pixels = allocCanvas(width * SS, height * SS);

  const total = values.reduce((a, b) => a + b, 0) || 1;
  const TWO_PI = Math.PI * 2;

  // Slice boundaries in a 0..2π space, starting at 12 o'clock, clockwise.
  let cursor = 0;
  const slices = values.map((v) => {
    const angle = (v / total) * TWO_PI;
    const slice = { start: cursor, end: cursor + angle };
    cursor += angle;
    return slice;
  });

  const cx = layout.cx * SS;
  const cy = layout.cy * SS;
  const radius = layout.radius * SS;
  const yStart = Math.floor(cy - radius);
  const yEnd = Math.ceil(cy + radius);
  const xStart = Math.floor(cx - radius);
  const xEnd = Math.ceil(cx + radius);

  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > radius * radius) continue;

      // atan2 gives -π..π from the positive x-axis; shift so 0 = 12
      // o'clock and it increases clockwise, matching `slices` above.
      let angle = Math.atan2(dy, dx) + Math.PI / 2;
      angle = ((angle % TWO_PI) + TWO_PI) % TWO_PI;

      const sliceIndex = slices.findIndex((s) => angle >= s.start && angle < s.end);
      const color = sliceIndex >= 0 ? colors[sliceIndex] : colors[colors.length - 1];
      if (color) setPixel(pixels, width * SS, x, y, [...color, 255]);
    }
  }

  layout.legendItems.forEach((item, i) => {
    const [r, g, b] = colors[i] || [70, 130, 200];
    fillRoundedTopRect(
      pixels, width * SS,
      item.x * SS, item.y * SS, (item.x + item.size) * SS, (item.y + item.size) * SS,
      [r, g, b, 255], 4 * SS
    );
  });

  const final = downsample(pixels, width * SS, height * SS, SS);
  return { buffer: encodePng(final.pixels, final.width, final.height), layout };
}

/**
 * Computes line-chart layout: one x position per data point plus the
 * baseline y. Shared with pptxSlideBuilder.js for label alignment.
 */
function computeLineLayout(count, width, height, padding = 28) {
  const axisY = height - padding;
  const plotTop = padding;
  const plotHeight = axisY - plotTop;
  const usableWidth = width - padding * 2;
  const stepX = count > 1 ? usableWidth / (count - 1) : 0;
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push({ x: padding + i * stepX });
  }
  return { axisY, plotTop, plotHeight, points, width, height };
}

function drawThickLine(pixels, width, p0, p1, color, thickness) {
  const steps = Math.max(Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y), 1);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = p0.x + (p1.x - p0.x) * t;
    const y = p0.y + (p1.y - p0.y) * t;
    fillCircle(pixels, width, x, y, thickness / 2, color);
  }
}

/**
 * Renders a line chart (line + point markers, no text) as a PNG.
 * `values` — one number per point, plotted left-to-right in order.
 */
function renderLineChartPng({ values, color = [52, 152, 219], width = 800, height = 400 }) {
  const layout = computeLineLayout(values.length, width, height);
  const SS = SUPERSAMPLE;
  const pixels = allocCanvas(width * SS, height * SS);

  drawGridLines(pixels, width * SS, {
    plotTop: layout.plotTop * SS,
    plotHeight: layout.plotHeight * SS,
  }, 28 * SS);

  fillRect(pixels, width * SS, 28 * SS, layout.axisY * SS, (width - 28) * SS, layout.axisY * SS + SS, AXIS_LINE);

  const maxVal = Math.max(1, ...values);
  const colorA = [...color, 255];
  const white = [255, 255, 255, 255];

  const points = values.map((v, i) => ({
    x: layout.points[i].x * SS,
    y: (layout.axisY - Math.round((v / maxVal) * layout.plotHeight)) * SS,
  }));

  for (let i = 0; i < points.length - 1; i++) {
    drawThickLine(pixels, width * SS, points[i], points[i + 1], colorA, 4 * SS);
  }
  // White-ringed markers read more clearly against the line itself.
  points.forEach((p) => {
    fillCircle(pixels, width * SS, p.x, p.y, 7 * SS, white);
    fillCircle(pixels, width * SS, p.x, p.y, 5 * SS, colorA);
  });

  const final = downsample(pixels, width * SS, height * SS, SS);
  return { buffer: encodePng(final.pixels, final.width, final.height), layout };
}

export {
  renderBarChartPng,
  computeBarLayout,
  renderPieChartPng,
  computePieLayout,
  renderLineChartPng,
  computeLineLayout,
};
