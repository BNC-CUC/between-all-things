import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
await mkdir('build',{recursive:true});
await build({entryPoints:['src/main.mjs'],bundle:true,format:'iife',platform:'browser',target:['es2020'],outfile:'build/app.js',minify:true,legalComments:'eof'});
const html=await readFile('index.html','utf8'),js=await readFile('build/app.js','utf8');
await writeFile('build/index.html',html);await writeFile('build/riverbend-graybox-offline.html',html.replace('<script src="./app.js"></script>',()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>'));
await copyFile('node_modules/three/LICENSE','build/THREE-LICENSE.txt');await copyFile('node_modules/esbuild/LICENSE.md','build/ESBUILD-LICENSE.txt');
console.log('Built local H5 and standalone HTML. No gameplay executed.');
