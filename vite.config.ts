// Updated vite.config.ts - Fixed proxy configuration

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
          
          proxy.on('error', (err, _req, _res) => {
            console.error('Document Generation Proxy error:', err);
          });
        }
      },
      
      // Proxy for Foxit PDF Services API (including task status, document operations)
      '/api/foxit/pdf-services': {
        target: 'https://na1.fusion.foxit.com',
        changeOrigin: true,
        rewrite: (path) => {
          // Remove the /api/foxit prefix to get the correct Foxit API path
          const rewritten = path.replace(/^\/api\/foxit/, '');
          console.log(`Rewriting ${path} to ${rewritten}`);
          return rewritten;
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const clientId = process.env.VITE_FOXIT_CLIENT_ID;
            const clientSecret = process.env.VITE_FOXIT_CLIENT_SECRET;
            
            if (clientId && clientSecret) {
              const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
              proxyReq.setHeader('Authorization', `Basic ${credentials}`);
              proxyReq.setHeader('client_id', clientId);
              proxyReq.setHeader('client_secret', clientSecret);
              proxyReq.setHeader('Accept', 'application/json');
              
              // Ensure proper content type for all requests
              if (req.method !== 'GET' && !proxyReq.getHeader('Content-Type')) {
                proxyReq.setHeader('Content-Type', 'application/json');
              }
            }
            
            // Log the complete URL being proxied
            const fullUrl = `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`;
            console.log(`Proxying ${req.method} ${req.url} -> ${fullUrl}`);
          });
          
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Set CORS headers
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, client_id, client_secret, Accept';
            
            // Log response for debugging
            console.log(`Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            
            // Log error responses
            if (proxyRes.statusCode >= 400) {
              proxyRes.on('data', (chunk) => {
                console.error(`Error response body: ${chunk.toString()}`);
              });
            }
          });
          
          proxy.on('error', (err, req, _res) => {
            console.error(`PDF Services Proxy error for ${req.url}:`, err);
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