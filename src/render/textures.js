import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat = false, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export function softDotTexture() {
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return toTexture(c);
}

export function asphaltTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#23262f';
  g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n * 1.1;
  }
  g.putImageData(img, 0, 0);
  const t = toTexture(c, { repeat: true });
  return t;
}

export function hazardTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#16161a';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#ffc61a';
  for (let i = -4; i < 8; i++) {
    g.beginPath();
    g.moveTo(i * 64, 256);
    g.lineTo(i * 64 + 32, 256);
    g.lineTo(i * 64 + 32 + 256, 0);
    g.lineTo(i * 64 + 256, 0);
    g.closePath();
    g.fill();
  }
  return toTexture(c, { repeat: true });
}

export function facadeTexture(seed = 1) {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#0a0d18';
  g.fillRect(0, 0, 128, 256);
  let s = seed * 9301;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const palette = ['#ffd98a', '#ffb454', '#9ad7ff', '#ff7ac8'];
  for (let y = 6; y < 250; y += 16) {
    for (let x = 6; x < 122; x += 14) {
      if (rnd() < 0.42) {
        g.fillStyle = palette[Math.floor(rnd() * palette.length)];
        g.globalAlpha = 0.55 + rnd() * 0.45;
        g.fillRect(x, y, 8, 9);
      }
    }
  }
  g.globalAlpha = 1;
  return toTexture(c, { repeat: true });
}
