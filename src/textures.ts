import * as THREE from "three";

export function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  colorSpace = THREE.SRGBColorSpace,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = colorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function asphaltTexture() {
  return canvasTexture(1024, (ctx, size) => {
    ctx.fillStyle = "#14161c";
    ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 28;
      img.data[i] = 18 + n;
      img.data[i + 1] = 20 + n;
      img.data[i + 2] = 26 + n;
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 ? "#2a2e38" : "#0c0d12";
      ctx.fillRect(Math.random() * size, Math.random() * size, 80 + Math.random() * 160, 3);
    }
    ctx.globalAlpha = 1;
  });
}

export function windowTexture(seed: number, tint: string) {
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = "#0b0d14";
    ctx.fillRect(0, 0, size, size);
    const cols = 8;
    const rows = 12;
    const padX = 18;
    const padY = 14;
    const bw = (size - padX * 2) / cols;
    const bh = (size - padY * 2) / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = ((seed * 17 + x * 13 + y * 29) % 10) > 2;
        const g = ctx.createLinearGradient(0, 0, 0, bh);
        if (lit) {
          g.addColorStop(0, "#fff6cf");
          g.addColorStop(0.45, tint);
          g.addColorStop(1, "#3a2208");
        } else {
          g.addColorStop(0, "#1c2230");
          g.addColorStop(1, "#0c1018");
        }
        ctx.fillStyle = g;
        ctx.fillRect(padX + x * bw + 4, padY + y * bh + 3, bw - 8, bh - 6);
      }
    }
  });
}

export function neonSign(text: string, color: string) {
  return canvasTexture(512, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(20, 140, 472, 220);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.strokeRect(28, 148, 456, 204);
    ctx.font = "700 92px Rajdhani, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 28;
    ctx.fillStyle = color;
    ctx.fillText(text, size / 2, size / 2);
  }, THREE.SRGBColorSpace);
}

export function sideDecal(text: string, fill = "#0b0d14") {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#f4f7ff";
    ctx.font = "700 54px Rajdhani, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, size / 2, size / 2);
  });
}

export function streetSign(text: string, bg = "#1c3a22", fg = "#f4f1ea") {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, size - 20, size - 20);
    ctx.fillStyle = fg;
    ctx.font = "800 36px Rajdhani, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const words = text.split(" ");
    if (words.length > 1) {
      ctx.fillText(words[0]!, size / 2, size / 2 - 22);
      ctx.fillText(words.slice(1).join(" "), size / 2, size / 2 + 22);
    } else {
      ctx.font = "800 48px Rajdhani, Impact, sans-serif";
      ctx.fillText(text, size / 2, size / 2);
    }
  });
}

export function stopSign() {
  return canvasTexture(256, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 8) + i * (Math.PI / 4);
      const r = 110;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = "#b71c1c";
    ctx.fill();
    ctx.strokeStyle = "#f4f1ea";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.fillStyle = "#f4f1ea";
    ctx.font = "800 58px Rajdhani, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("STOP", 0, 4);
  });
}
