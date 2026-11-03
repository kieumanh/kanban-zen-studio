// Bộ giải mã PNG tối giản cho test hình ảnh (8-bit RGB/RGBA, không đan xen), để đo điểm ảnh mà không thêm thư viện vào dự án.
import { inflateSync } from 'node:zlib';

export function decodePng(buf) {
  assert8(buf);
  let pos = 8;
  let width = 0,
    height = 0,
    colorType = 0,
    bitDepth = 0,
    interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace)
    throw new Error(
      'PNG không được hỗ trợ: ' +
        JSON.stringify({ bitDepth, colorType, interlace }),
    );
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c,
          pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  return {
    width,
    height,
    pixel: (x, y) => [
      out[y * stride + x * bpp],
      out[y * stride + x * bpp + 1],
      out[y * stride + x * bpp + 2],
    ],
  };
}

function assert8(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('Không phải PNG');
}

// Số điểm ảnh liên tiếp theo chiều dọc ở cột x có màu gần `rgb` (sai số `tol` mỗi kênh).
export function colorRun(img, x, rgb, tol = 8) {
  let n = 0;
  for (let y = 0; y < img.height; y++) {
    const p = img.pixel(x, y);
    if (p.every((v, i) => Math.abs(v - rgb[i]) <= tol)) n++;
  }
  return n;
}
