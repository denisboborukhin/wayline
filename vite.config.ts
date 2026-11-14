import {defineConfig} from 'vite';
import {importMiddleware} from './server/scraper.mjs';
export default defineConfig({plugins:[{name:'flight-import',configureServer(server){server.middlewares.use(importMiddleware());},configurePreviewServer(server){server.middlewares.use(importMiddleware());}}]});
