/*!
 * finixui build — produces dist/ minified bundles + SRI hashes.
 * Dev-time only; consumers never need a build step.
 *
 *   npm run build
 *
 * Outputs:
 *   dist/<name>.min.css / .min.js       one per source file
 *   dist/finix-all.min.css / .min.js    everything, load-order correct
 *   dist/sri.json                       sha384 integrity hashes
 */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = path.join(root, "dist");
await mkdir(dist, { recursive: true });

/* load order matters for the all-bundles */
const CSS_ORDER = [
  "tokens", "fonts", "finix", "finix-widgets", "finix-datagrid", "finix-apps",
  "finix-domains", "finix-devtools", "finix-crm", "finix-trading",
  "finix-flows", "finix-mobile", "finix-shop", "finix-bank", "finix-travel",
  "finix-health", "finix-learn", "finix-logi", "finix-pos", "finix-marketing",
];
const JS_ORDER = [
  "finix", "finix-charts", "finix-datagrid", "finix-apps", "finix-domains",
  "finix-devtools", "finix-canvas", "finix-editor", "finix-crm",
  "finix-trading", "finix-flows", "finix-mobile", "finix-shop", "finix-bank",
  "finix-travel", "finix-health", "finix-learn", "finix-logi", "finix-pos",
  "finix-marketing",
];

const exists = async (p) => readFile(p).then(() => true).catch(() => false);
const outputs = {};

async function minify(src, out, loader) {
  const r = await build({
    entryPoints: [src],
    minify: true,
    write: false,
    loader: { [path.extname(src)]: loader },
    logLevel: "silent",
  });
  const code = r.outputFiles[0].text;
  await writeFile(out, code);
  outputs[path.basename(out)] = code;
  return code;
}

let allCss = "", allJs = "";
for (const name of CSS_ORDER) {
  const src = path.join(root, "css", name + ".css");
  if (!(await exists(src))) continue;
  allCss += (await minify(src, path.join(dist, name + ".min.css"), "css")) + "\n";
}
for (const name of JS_ORDER) {
  const src = path.join(root, "js", name + ".js");
  if (!(await exists(src))) continue;
  allJs += (await minify(src, path.join(dist, name + ".min.js"), "js")) + ";\n";
}

const banner = `/*! finixui ${JSON.parse(await readFile(path.join(root, "package.json"))).version} · MIT · https://github.com/javajack/finix-ui */\n`;
await writeFile(path.join(dist, "finix-all.min.css"), banner + allCss);
await writeFile(path.join(dist, "finix-all.min.js"), banner + allJs);
outputs["finix-all.min.css"] = banner + allCss;
outputs["finix-all.min.js"] = banner + allJs;

/* SRI */
const sri = {};
for (const [file, code] of Object.entries(outputs)) {
  sri[file] = "sha384-" + createHash("sha384").update(code).digest("base64");
}
await writeFile(path.join(dist, "sri.json"), JSON.stringify(sri, null, 1) + "\n");

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + "KB";
console.log(`dist/: ${Object.keys(outputs).length} files`);
console.log(`finix-all.min.css ${kb(outputs["finix-all.min.css"])} · finix-all.min.js ${kb(outputs["finix-all.min.js"])}`);
