// react-pdf-highlighter가 사용하는 pdfjs 버전과 "정확히 일치"하는 워커를
// public/ 으로 복사해 동일 출처에서 서빙한다. (CDN/버전 불일치 문제 방지)
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const candidates = [
  "node_modules/react-pdf-highlighter/node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "node_modules/pdfjs-dist/build/pdf.worker.min.js",
];

const dest = "public/pdf.worker.min.mjs";
const src = candidates.find((p) => existsSync(p));

if (!src) {
  console.warn("[copy-pdf-worker] 워커 파일을 찾지 못했습니다. (커밋된 파일을 사용)");
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-pdf-worker] ${src} -> ${dest}`);
