import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({
  root:'app',base:'./',publicDir:'../public',
  resolve:{alias:{'/src':resolve('src')}},
  server:{fs:{allow:[resolve('.')] }},
  build:{outDir:'../dist',emptyOutDir:true,rollupOptions:{
    input:{game:resolve('app/index.html'),character:resolve('app/character.html')},
    output:{manualChunks:{three:['three'],physics:['@dimforge/rapier3d-compat']}}
  }}
});
