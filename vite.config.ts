// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  server: {
    proxy: {
      // Proxy for Foxit Document Generation API
      '/api/foxit/document-generation': {
        target: 'https://na1.fusion.foxit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/foxit/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            // Add authentication headers
            const clientId = process.env.VITE_FOXIT_CLIENT_ID;
            const clientSecret = process.env.VITE_FOXIT_CLIENT_SECRET;
            
            if (clientId && clientSecret) {
              const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
              proxyReq.setHeader('Authorization', `Basic ${credentials}`);
              proxyReq.setHeader('client_id', clientId);
              proxyReq.setHeader('client_secret', clientSecret);
            }
          });
          
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            // Add CORS headers to the response
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, client_id, client_secret';
          });
          
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
        }
      },
      
      // Proxy for Foxit PDF Services API
      '/api/foxit/pdf-services': {
        target: 'https://na1.fusion.foxit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/foxit/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            const clientId = process.env.VITE_FOXIT_CLIENT_ID;
            const clientSecret = process.env.VITE_FOXIT_CLIENT_SECRET;
            
            if (clientId && clientSecret) {
              const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
              proxyReq.setHeader('Authorization', `Basic ${credentials}`);
              proxyReq.setHeader('client_id', clientId);
              proxyReq.setHeader('client_secret', clientSecret);
            }
          });
          
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, client_id, client_secret';
          });
        }
      }
    }
  },

  // Include .docx files as assets
  assetsInclude: ['**/*.docx', '**/*.doc'],
  
  // Exclude lucide-react from dependency pre-bundling
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  
  // Environment variables configuration
  define: {
    'process.env.VITE_FOXIT_CLIENT_ID': JSON.stringify(process.env.VITE_FOXIT_CLIENT_ID),
    'process.env.VITE_FOXIT_CLIENT_SECRET': JSON.stringify(process.env.VITE_FOXIT_CLIENT_SECRET),
  },
  
  // For production builds
  build: {
    rollupOptions: {
      external: [],
    },
  },
});