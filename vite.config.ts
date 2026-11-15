import {defineConfig} from 'vite';
import {importMiddleware} from './server/scraper.mjs';
export default defineConfig({plugins:[{name:'flight-import',configureServer(server){server.middlewares.use(importMiddleware({origin:process.env.WAYLINE_ORIGIN}));},configurePreviewServer(server){server.middlewares.use(importMiddleware({origin:process.env.WAYLINE_ORIGIN}));}}]});
