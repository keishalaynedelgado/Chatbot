/**
 * Adds a new chart slide to an already-open pptx JSZip instance.
 *
 * This is purely additive to pptxTemplater.js — it doesn't touch the
 * existing single-slide text-fill logic at all, it only appends a new
 * slide part (and the presentation-level wiring a new slide needs) to
 * the same zip.
 */

import { renderBarChartPng, renderPieChartPng, renderLineChartPng } from './chartGenerator.js';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * EMU (English Metric Units) — the unit PPTX coordinates are expressed
 * in. 914400 EMU per inch.
 */
function pxToEmu(px, emuPerPx) {
  return Math.round(px * emuPerPx);
}

async function readXml(zip, path) {
  const file = zip.file(path);
  if (!file) return null;
  return file.async('string');
}

/**
 * Finds the highest existing slideN.xml number in the zip.
 */
function findHighestSlideNumber(zip) {
  let max = 0;
  Object.keys(zip.files).forEach((name) => {
    const m = name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max;
}

/**
 * Finds the highest numeric rId used in a relationships XML string.
 */
function findHighestRelId(relsXml) {
  let max = 0;
  const matches = relsXml.matchAll(/Id="rId(\d+)"/g);
  for (const m of matches) {
    max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

/**
 * Finds the highest sldId "id" attribute used in presentation.xml's
 * <p:sldIdLst>. Per the OOXML spec, slide ids must be unique and >= 256.
 */
function findHighestSldId(presentationXml) {
  let max = 255;
  const matches = presentationXml.matchAll(/<p:sldId id="(\d+)"/g);
  for (const m of matches) {
    max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

function findHighestMediaNumber(zip) {
  let max = 0;
  Object.keys(zip.files).forEach((name) => {
    const m = name.match(/^ppt\/media\/image(\d+)\./);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max;
}

function labelBoxXml(id, x, y, w, h, text, align = 'ctr') {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Label ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr wrap="square"><a:noAutofit/></a:bodyPr><a:lstStyle/><a:p><a:pPr algn="${align}"/><a:r><a:rPr lang="en-US" sz="1200"/><a:t>${escapeXml(text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

const CHART_RENDERERS = {
  bar: renderBarChartPng,
  pie: renderPieChartPng,
  line: renderLineChartPng,
};

/**
 * Adds one new slide containing a chart (bar/pie/line, as an image) plus
 * native PPTX text boxes for the title, category labels/values, and an
 * optional "example data" notice.
 *
 * `zip` — an already-loaded JSZip instance for the pptx (mutated in place).
 * Returns nothing; the caller re-generates the zip Buffer afterward.
 */
async function addChartSlide(zip, { title, categories, values, colors, isExampleData = false, chartType = 'bar' }) {
  const render = CHART_RENDERERS[chartType] || CHART_RENDERERS.bar;
  const presentationXml = await readXml(zip, 'ppt/presentation.xml');
  const presRelsXml = await readXml(zip, 'ppt/_rels/presentation.xml.rels');
  const contentTypesXml = await readXml(zip, '[Content_Types].xml');
  const slide1RelsXml = await readXml(zip, 'ppt/slides/_rels/slide1.xml.rels');

  if (!presentationXml || !presRelsXml || !contentTypesXml || !slide1RelsXml) {
    throw new Error('Template is missing expected PPTX structure (presentation.xml/rels or slide1 rels) — cannot add a chart slide.');
  }

  // Slide dimensions, so the new slide/image are sized proportionally.
  // cx/cy can appear in either attribute order, so extract the <p:sldSz>
  // tag first, then pull cx and cy independently from within it.
  let slideCx = 9144000;
  let slideCy = 6858000;
  const sldSzTagMatch = presentationXml.match(/<p:sldSz\b[^/>]*\/>/);
  if (sldSzTagMatch) {
    const cxMatch = sldSzTagMatch[0].match(/cx="(\d+)"/);
    const cyMatch = sldSzTagMatch[0].match(/cy="(\d+)"/);
    if (cxMatch) slideCx = parseInt(cxMatch[1], 10);
    if (cyMatch) slideCy = parseInt(cyMatch[1], 10);
  }

  // Reuse the same slide layout as the template's existing first slide.
  const layoutMatch = slide1RelsXml.match(/Target="\.\.\/slideLayouts\/(slideLayout\d+\.xml)"/);
  const layoutFile = layoutMatch ? layoutMatch[1] : 'slideLayout1.xml';

  const newSlideNum = findHighestSlideNumber(zip) + 1;
  const newImageNum = findHighestMediaNumber(zip) + 1;
  const newRelId = findHighestRelId(presRelsXml) + 1;
  const newSldId = findHighestSldId(presentationXml) + 1;

  // --- Render the chart image ---
  const imgWidthPx = 800;
  const imgHeightPx = 400;
  const { buffer: pngBuffer, layout } = render({ values, colors, width: imgWidthPx, height: imgHeightPx });
  const imageName = `image${newImageNum}.png`;
  zip.file(`ppt/media/${imageName}`, pngBuffer);

  // --- Position the image on the slide (centered, leaving room for title/labels) ---
  const picCx = Math.round(slideCx * 0.75);
  const picCy = Math.round(picCx * (imgHeightPx / imgWidthPx));
  const picX = Math.round((slideCx - picCx) / 2);
  const picY = Math.round(slideCy * 0.28);
  // picCy is derived from picCx preserving the image's own aspect ratio,
  // so EMU-per-pixel is identical on both axes.
  const emuPerPx = picCx / imgWidthPx;

  // --- Build label textboxes, positioned differently per chart type but
  // always using the exact layout math the PNG renderer itself used, so
  // labels line up with what's actually drawn. ---
  let labelBoxes = '';

  if (chartType === 'pie') {
    labelBoxes = layout.legendItems.map((item, i) => {
      const boxX = picX + pxToEmu(item.x + item.size + 8, emuPerPx);
      const boxY = picY + pxToEmu(item.y - 4, emuPerPx);
      const boxW = pxToEmu(220, emuPerPx);
      const boxH = pxToEmu(item.size + 8, emuPerPx);
      return labelBoxXml(10 + i, boxX, boxY, boxW, boxH, `${categories[i]}: ${values[i]}`, 'l');
    }).join('');
  } else if (chartType === 'line') {
    labelBoxes = layout.points.map((point, i) => {
      const boxW = pxToEmu(imgWidthPx / Math.max(values.length, 1), emuPerPx);
      const boxX = picX + pxToEmu(point.x, emuPerPx) - Math.round(boxW / 2);
      const boxY = picY + picCy + 45720; // ~0.05in below the image
      const boxH = 400000;
      return labelBoxXml(10 + i, boxX, boxY, boxW, boxH, `${categories[i]}: ${values[i]}`);
    }).join('');
  } else {
    labelBoxes = layout.bars.map((bar, i) => {
      const boxX = picX + pxToEmu(bar.slotX, emuPerPx);
      const boxW = pxToEmu(bar.slotWidth, emuPerPx);
      const boxY = picY + picCy + 45720; // ~0.05in below the image
      const boxH = 400000;
      return labelBoxXml(10 + i, boxX, boxY, boxW, boxH, `${categories[i]}: ${values[i]}`);
    }).join('');
  }

  const titleText = escapeXml(title);
  const noticeSp = isExampleData
    ? `<p:sp><p:nvSpPr><p:cNvPr id="9" name="ExampleNotice"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${Math.round(slideCx * 0.1)}" y="${Math.round(slideCy * 0.16)}"/><a:ext cx="${Math.round(slideCx * 0.8)}" cy="365760"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="1200" b="1" i="1"><a:solidFill><a:srgbClr val="C0392B"/></a:solidFill></a:rPr><a:t>EXAMPLE DATA — this person has no recorded tasks; values below are illustrative only.</a:t></a:r></a:p></p:txBody></p:sp>`
    : '';

  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${Math.round(slideCx * 0.1)}" y="${Math.round(slideCy * 0.04)}"/><a:ext cx="${Math.round(slideCx * 0.8)}" cy="457200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="2000" b="1"/><a:t>${titleText}</a:t></a:r></a:p></p:txBody></p:sp>${noticeSp}<p:pic><p:nvPicPr><p:cNvPr id="3" name="Chart"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${picX}" y="${picY}"/><a:ext cx="${picCx}" cy="${picCy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>${labelBoxes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;

  zip.file(`ppt/slides/slide${newSlideNum}.xml`, slideXml);

  const slideRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageName}"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/${layoutFile}"/></Relationships>`;
  zip.file(`ppt/slides/_rels/slide${newSlideNum}.xml.rels`, slideRelsXml);

  // --- Patch [Content_Types].xml: declare the new slide part + png default if missing ---
  let newContentTypesXml = contentTypesXml;
  if (!/Extension="png"/.test(newContentTypesXml)) {
    newContentTypesXml = newContentTypesXml.replace(
      '<Default ContentType="application/xml" Extension="xml"/>',
      '<Default ContentType="application/xml" Extension="xml"/><Default ContentType="image/png" Extension="png"/>'
    );
  }
  newContentTypesXml = newContentTypesXml.replace(
    '</Types>',
    `<Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" PartName="/ppt/slides/slide${newSlideNum}.xml"/></Types>`
  );
  zip.file('[Content_Types].xml', newContentTypesXml);

  // --- Patch ppt/presentation.xml: append the new slide id ---
  const newPresentationXml = presentationXml.replace(
    '</p:sldIdLst>',
    `<p:sldId id="${newSldId}" r:id="rId${newRelId}"/></p:sldIdLst>`
  );
  zip.file('ppt/presentation.xml', newPresentationXml);

  // --- Patch ppt/_rels/presentation.xml.rels: append the new slide relationship ---
  const newPresRelsXml = presRelsXml.replace(
    '</Relationships>',
    `<Relationship Id="rId${newRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${newSlideNum}.xml"/></Relationships>`
  );
  zip.file('ppt/_rels/presentation.xml.rels', newPresRelsXml);
}

export { addChartSlide };
