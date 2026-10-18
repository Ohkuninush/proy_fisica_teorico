const pad = (n) => String(n).padStart(2, '0');

export const fixed = (value, digits = 2) => Number(value).toFixed(digits);

export function toLatin1(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '·')
    .replace(/[^ -~¡-ÿ\n]/gu, '?');
}

export function generatedAtLabel(now) {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `Generado el ${date} ${time}`;
}

export function reportFileName(entries, now = new Date()) {
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  if (entries.length === 1) {
    const safeName = toLatin1(entries[0].name).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prueba';
    return `PhysicsLab3D_${safeName}_${stamp}.pdf`;
  }
  return `PhysicsLab3D_reporte_${entries.length}-pruebas_${stamp}.pdf`;
}
