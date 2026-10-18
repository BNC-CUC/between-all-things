import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url))), out = path.join(root, 'release');
await mkdir(out, {recursive: true});
const {version} = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
async function walk(dir, prefix = '') {
  const files = [];
  for (const entry of (await readdir(dir, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || ['release', 'node_modules', 'archive'].includes(entry.name)) continue;
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), name + '/'));
    else files.push({name, data: await readFile(path.join(dir, entry.name))});
  }
  return files;
}
const table = Array.from({length: 256}, (_, n) => { for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc32(data) { let crc = 0xffffffff; for (const b of data) crc = table[(crc ^ b) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
const date = new Date(Date.now() + 8 * 3600000);
const dosDate = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
function zip(entries) {
  const local = [], central = []; let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name), data = entry.data, compressed = deflateRawSync(data), crc = crc32(data), h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt16LE(dosTime, 10); h.writeUInt16LE(dosDate, 12); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(compressed.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26);
    local.push(h, name, compressed);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(dosTime, 12); c.writeUInt16LE(dosDate, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42); central.push(c, name); offset += h.length + name.length + compressed.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}
const files = await walk(path.join(root, 'dist'));
const get = name => { const file = files.find(f => f.name === name); if (!file) throw new Error('Missing asset: ' + name); return file.data.toString(); };
const artwork = files.find(f => f.name === 'assets/wetland.png').data;
let standalone = get('index.html').replace('<link rel="stylesheet" href="./style.css">', () => '<style>' + get('style.css') + '</style>');
standalone = standalone.replace('<link rel="icon" type="image/svg+xml" href="./icon.svg">', () => '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(get('icon.svg')) + '">');
let bundle = '';
for (const [file, exported] of [['world.js', 'createWorld'], ['renderer.js', 'createRenderer'], ['soundscape.js', 'createSoundscape']]) {
  let source = get(file).replace(/^export /gm, '');
  if (file === 'renderer.js') source = source.replace("'./assets/wetland.png'", () => JSON.stringify('data:image/png;base64,' + artwork.toString('base64')));
  bundle += 'const {' + exported + '} = (() => {\n' + source + '\nreturn {' + exported + '};\n})();\n';
}
bundle += get('game.js').replace(/^import .*?;\s*/gm, '');
standalone = standalone.replace('<script type="module" src="./game.js"></script>', () => '<script>\n' + bundle.replace(/<\/script/gi, '<\\/script') + '\n</script>');
const html = Buffer.from(standalone), instructions = await readFile(path.join(root, 'submission/试玩说明.md'));
const sources = await walk(root);
const material = await walk(path.join(root, 'submission/materials'));
const submission = await walk(path.join(root, 'submission'));
const h5 = zip([{name: 'BetweenAllThings/index.html', data: html}]);
const products = [
  {name: `万物之间-下一次生长-v${version}.html`, data: html},
  {name: `BetweenAllThings-H5-v${version}.zip`, data: h5},
  {name: `万物之间-朋友试玩-v${version}.zip`, data: zip([{name: '开始试玩.html', data: html}, {name: '试玩说明.md', data: instructions}])},
  {name: `BetweenAllThings-source-v${version}.zip`, data: zip(sources.map(f => ({...f, name: 'BetweenAllThingsSource/' + f.name})))},
  {name: `万物之间-投稿材料-v${version}.zip`, data: zip([...submission.map(f => ({...f, name: 'Submission/' + f.name})), {name: `Submission/BetweenAllThings-H5-v${version}.zip`, data: h5}])}
];
const manifest = {version, created_at: new Date().toISOString(), timezone: 'Asia/Shanghai',
  execution: 'Packaging only. Game JavaScript was concatenated as text, never imported or run. No gameplay, browser, screenshot or device tests.',
  files: [], source_files: sources.map(f => ({file: f.name, bytes: f.data.length, sha256: hash(f.data)})),
  materials: material.map(f => ({file: f.name, bytes: f.data.length, sha256: hash(f.data)}))};
for (const product of products) {
  await writeFile(path.join(out, product.name), product.data);
  manifest.files.push({file: product.name, bytes: product.data.length, sha256: hash(product.data)});
}
await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(out, 'SHA256SUMS.txt'), manifest.files.map(f => f.sha256 + '  ' + f.file).join('\n') + '\n');
for (const f of manifest.files) console.log(f.file + '  ' + (f.bytes / 1048576).toFixed(2) + ' MiB');
