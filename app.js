const canvas = document.querySelector("#dithered-astronaut");
const ctx = canvas.getContext("2d", { alpha: false });
const image = new Image();

const palette = {
  shadow: [1, 8, 10],
  depth: [5, 52, 51],
  aqua: [45, 221, 197],
  emerald: [132, 255, 161],
  flare: [231, 255, 240],
};

const bayer8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

let resizeTimer;

function mixColor(from, to, amount) {
  return from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * amount),
  );
}

function renderDither() {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height || !image.naturalWidth) return;

  const pixelSize = window.innerWidth <= 720 ? 2.4 : 1.8;
  const renderWidth = Math.max(1, Math.round(bounds.width / pixelSize));
  const renderHeight = Math.max(1, Math.round(bounds.height / pixelSize));
  canvas.width = renderWidth;
  canvas.height = renderHeight;

  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = renderWidth / renderHeight;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) * (window.innerWidth <= 720 ? 0.78 : 0.67);
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) * 0.5;
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    renderWidth,
    renderHeight,
  );

  const frame = ctx.getImageData(0, 0, renderWidth, renderHeight);
  const data = frame.data;

  for (let y = 0; y < renderHeight; y += 1) {
    for (let x = 0; x < renderWidth; x += 1) {
      const index = (y * renderWidth + x) * 4;
      const luminance =
        (data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722) / 255;
      const threshold = (bayer8[y % 8][x % 8] / 63 - 0.5) * 0.23;
      const adjusted = luminance + threshold;
      const horizontal = x / renderWidth;
      const vertical = y / renderHeight;
      const spectralShift = Math.min(
        1,
        Math.max(0, horizontal * 0.72 + (1 - vertical) * 0.24),
      );

      let color;
      if (adjusted < 0.25) {
        color = palette.shadow;
      } else if (adjusted < 0.49) {
        color = palette.depth;
      } else if (adjusted < 0.78) {
        color = mixColor(palette.aqua, palette.emerald, spectralShift * 0.72);
      } else {
        color = mixColor(palette.flare, palette.emerald, spectralShift * 0.58);
      }

      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(frame, 0, 0);
}

image.addEventListener("load", renderDither);
image.src = "assets/invaryn-astronaut.png";

window.addEventListener(
  "resize",
  () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderDither, 120);
  },
  { passive: true },
);
