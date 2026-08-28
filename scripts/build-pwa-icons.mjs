import {
  readFile
} from "node:fs/promises";
import {
  resolve
} from "node:path";
import {
  chromium
} from "@playwright/test";

const root = process.cwd();
const source = await readFile(
  resolve(root, "assets/app-icon.svg"),
  "utf8"
);
const dataUrl =
  "data:image/svg+xml;base64," +
  Buffer.from(source).toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: {
    width: 512,
    height: 512
  },
  deviceScaleFactor: 1
});

await page.setContent(
  `<style>*{box-sizing:border-box}html,body{margin:0;background:transparent}img{display:block;width:100vw;height:100vh}</style><img src="${dataUrl}" alt="">`
);
await page.locator("img").waitFor();

for (const size of [192, 512]) {
  await page.setViewportSize({
    width: size,
    height: size
  });
  await page.screenshot({
    path: resolve(
      root,
      `assets/app-icon-${size}.png`
    ),
    omitBackground: true
  });
}

await browser.close();
console.log("PWA icons generated: 192px, 512px");
