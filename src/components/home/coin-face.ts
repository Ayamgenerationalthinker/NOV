import * as THREE from 'three';

/** The two currencies shown on the coins: US dollars and Ghana cedis. */
export type CoinSymbol = '$' | '₵';
export const COIN_SYMBOLS: CoinSymbol[] = ['$', '₵'];

const SIZE = 256;
const INK = '#0848e0';
const cache = new Map<CoinSymbol, THREE.CanvasTexture>();

/**
 * The face of a coin: a pale disc with a blue ring and a currency sign. Drawn once per sign
 * and shared by every coin that uses it. The cedi sign is drawn by hand (a C with a stroke
 * through it) because not every phone font has that character.
 */
export function coinFaceTexture(symbol: CoinSymbol): THREE.CanvasTexture {
  const cached = cache.get(symbol);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const mid = SIZE / 2;

  const disc = ctx.createRadialGradient(mid - 30, mid - 40, 10, mid, mid, mid);
  disc.addColorStop(0, '#ffffff');
  disc.addColorStop(1, '#cfe0ff');
  ctx.fillStyle = disc;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = '#2f74ff';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(mid, mid, mid - 20, 0, Math.PI * 2);
  ctx.stroke();

  if (symbol === '$') {
    ctx.fillStyle = INK;
    ctx.font = '800 150px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', mid, mid + 8);
  } else {
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(mid, mid, 48, Math.PI * 0.27, Math.PI * 1.73);
    ctx.stroke();
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(mid + 4, mid - 80);
    ctx.lineTo(mid + 4, mid + 80);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  // The flat ends of a cylinder are mapped a quarter turn round; this stands the sign upright.
  texture.center.set(0.5, 0.5);
  texture.rotation = Math.PI / 2;
  cache.set(symbol, texture);
  return texture;
}
