// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy for Foxit Document Generation API
      "/api/foxit/document-generation": {
        target: "https://na1.fusion.foxit.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/foxit/, ""),
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, _req, _res) => {
            const clientId = process.env.VITE_FOXIT_CLIENT_ID;
            const clientSecret = process.env.VITE_FOXIT_CLIENT_SECRET;
            if (clientId && clientSecret) {
              const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
              proxyReq.setHeader("Authorization", `Basic ${credentials}`);
              proxyReq.setHeader("client_id", clientId);
              proxyReq.setHeader("client_secret", clientSecret);
            }
          });
          proxy.on("proxyRes", (proxyRes, _req, _res) => {
            proxyRes.headers["Access-Control-Allow-Origin"] = "*";
            proxyRes.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
            proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, client_id, client_secret";
          });
          proxy.on("error", (err, _req, _res) => {
            console.error("Document Generation Proxy error:", err);
          });
        }
      },
      // Proxy for Foxit PDF Services API (including task status, document operations)
      "/api/foxit/pdf-services": {
        target: "https://na1.fusion.foxit.com",
        changeOrigin: true,
        rewrite: (path) => {
          const rewritten = path.replace(/^\/api\/foxit/, "");
          console.log(`Rewriting ${path} to ${rewritten}`);
          return rewritten;
        },
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            const clientId = process.env.VITE_FOXIT_CLIENT_ID;
            const clientSecret = process.env.VITE_FOXIT_CLIENT_SECRET;
            if (clientId && clientSecret) {
              const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
              proxyReq.setHeader("Authorization", `Basic ${credentials}`);
              proxyReq.setHeader("client_id", clientId);
              proxyReq.setHeader("client_secret", clientSecret);
              proxyReq.setHeader("Accept", "application/json");
              if (req.method !== "GET" && !proxyReq.getHeader("Content-Type")) {
                proxyReq.setHeader("Content-Type", "application/json");
              }
            }
            const fullUrl = `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`;
            console.log(`Proxying ${req.method} ${req.url} -> ${fullUrl}`);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            proxyRes.headers["Access-Control-Allow-Origin"] = "*";
            proxyRes.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
            proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, client_id, client_secret, Accept";
            console.log(`Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            if (proxyRes.statusCode >= 400) {
              proxyRes.on("data", (chunk) => {
                console.error(`Error response body: ${chunk.toString()}`);
              });
            }
          });
          proxy.on("error", (err, req, _res) => {
            console.error(`PDF Services Proxy error for ${req.url}:`, err);
          });
        }
      }
    }
  },
  // Include .docx/.doc and templates as assets
  assetsInclude: ["**/*.docx", "**/*.doc", "public/assets/templates/**/*"],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  define: {
    "process.env.VITE_FOXIT_CLIENT_ID": JSON.stringify(process.env.VITE_FOXIT_CLIENT_ID),
    "process.env.VITE_FOXIT_CLIENT_SECRET": JSON.stringify(process.env.VITE_FOXIT_CLIENT_SECRET)
  },
  build: {
    rollupOptions: {
      external: []
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjsvLyB2aXRlLmNvbmZpZy50c1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIFxuICBzZXJ2ZXI6IHtcbiAgICBwcm94eToge1xuICAgICAgLy8gUHJveHkgZm9yIEZveGl0IERvY3VtZW50IEdlbmVyYXRpb24gQVBJXG4gICAgICAnL2FwaS9mb3hpdC9kb2N1bWVudC1nZW5lcmF0aW9uJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL25hMS5mdXNpb24uZm94aXQuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvZm94aXQvLCAnJyksXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBfb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgX3JlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xpZW50SWQgPSBwcm9jZXNzLmVudi5WSVRFX0ZPWElUX0NMSUVOVF9JRDtcbiAgICAgICAgICAgIGNvbnN0IGNsaWVudFNlY3JldCA9IHByb2Nlc3MuZW52LlZJVEVfRk9YSVRfQ0xJRU5UX1NFQ1JFVDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNsaWVudElkICYmIGNsaWVudFNlY3JldCkge1xuICAgICAgICAgICAgICBjb25zdCBjcmVkZW50aWFscyA9IEJ1ZmZlci5mcm9tKGAke2NsaWVudElkfToke2NsaWVudFNlY3JldH1gKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignQXV0aG9yaXphdGlvbicsIGBCYXNpYyAke2NyZWRlbnRpYWxzfWApO1xuICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ2NsaWVudF9pZCcsIGNsaWVudElkKTtcbiAgICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdjbGllbnRfc2VjcmV0JywgY2xpZW50U2VjcmV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXMsIF9yZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIHByb3h5UmVzLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyddID0gJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnO1xuICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyddID0gJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbiwgY2xpZW50X2lkLCBjbGllbnRfc2VjcmV0JztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCBfcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdEb2N1bWVudCBHZW5lcmF0aW9uIFByb3h5IGVycm9yOicsIGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIFByb3h5IGZvciBGb3hpdCBQREYgU2VydmljZXMgQVBJIChpbmNsdWRpbmcgdGFzayBzdGF0dXMsIGRvY3VtZW50IG9wZXJhdGlvbnMpXG4gICAgICAnL2FwaS9mb3hpdC9wZGYtc2VydmljZXMnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vbmExLmZ1c2lvbi5mb3hpdC5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmV3cml0dGVuID0gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvZm94aXQvLCAnJyk7XG4gICAgICAgICAgY29uc29sZS5sb2coYFJld3JpdGluZyAke3BhdGh9IHRvICR7cmV3cml0dGVufWApO1xuICAgICAgICAgIHJldHVybiByZXdyaXR0ZW47XG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBfb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGllbnRJZCA9IHByb2Nlc3MuZW52LlZJVEVfRk9YSVRfQ0xJRU5UX0lEO1xuICAgICAgICAgICAgY29uc3QgY2xpZW50U2VjcmV0ID0gcHJvY2Vzcy5lbnYuVklURV9GT1hJVF9DTElFTlRfU0VDUkVUO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY2xpZW50SWQgJiYgY2xpZW50U2VjcmV0KSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gQnVmZmVyLmZyb20oYCR7Y2xpZW50SWR9OiR7Y2xpZW50U2VjcmV0fWApLnRvU3RyaW5nKCdiYXNlNjQnKTtcbiAgICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJhc2ljICR7Y3JlZGVudGlhbHN9YCk7XG4gICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignY2xpZW50X2lkJywgY2xpZW50SWQpO1xuICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ2NsaWVudF9zZWNyZXQnLCBjbGllbnRTZWNyZXQpO1xuICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ0dFVCcgJiYgIXByb3h5UmVxLmdldEhlYWRlcignQ29udGVudC1UeXBlJykpIHtcbiAgICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZnVsbFVybCA9IGAke3Byb3h5UmVxLnByb3RvY29sfS8vJHtwcm94eVJlcS5ob3N0fSR7cHJveHlSZXEucGF0aH1gO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFByb3h5aW5nICR7cmVxLm1ldGhvZH0gJHtyZXEudXJsfSAtPiAke2Z1bGxVcmx9YCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIHByb3h5UmVzLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyddID0gJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnO1xuICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyddID0gJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbiwgY2xpZW50X2lkLCBjbGllbnRfc2VjcmV0LCBBY2NlcHQnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVzcG9uc2UgJHtwcm94eVJlcy5zdGF0dXNDb2RlfSBmb3IgJHtyZXEubWV0aG9kfSAke3JlcS51cmx9YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm94eVJlcy5zdGF0dXNDb2RlID49IDQwMCkge1xuICAgICAgICAgICAgICBwcm94eVJlcy5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHJlc3BvbnNlIGJvZHk6ICR7Y2h1bmsudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBQREYgU2VydmljZXMgUHJveHkgZXJyb3IgZm9yICR7cmVxLnVybH06YCwgZXJyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvLyBJbmNsdWRlIC5kb2N4Ly5kb2MgYW5kIHRlbXBsYXRlcyBhcyBhc3NldHNcbiAgYXNzZXRzSW5jbHVkZTogWycqKi8qLmRvY3gnLCAnKiovKi5kb2MnLCAncHVibGljL2Fzc2V0cy90ZW1wbGF0ZXMvKiovKiddLFxuICBcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbiAgXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudi5WSVRFX0ZPWElUX0NMSUVOVF9JRCc6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52LlZJVEVfRk9YSVRfQ0xJRU5UX0lEKSxcbiAgICAncHJvY2Vzcy5lbnYuVklURV9GT1hJVF9DTElFTlRfU0VDUkVUJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuVklURV9GT1hJVF9DTElFTlRfU0VDUkVUKSxcbiAgfSxcbiAgXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFtdLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBRWpCLFFBQVE7QUFBQSxJQUNOLE9BQU87QUFBQTtBQUFBLE1BRUwsa0NBQWtDO0FBQUEsUUFDaEMsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLGlCQUFpQixFQUFFO0FBQUEsUUFDbkQsV0FBVyxDQUFDLE9BQU8sYUFBYTtBQUM5QixnQkFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLE1BQU0sU0FBUztBQUM3QyxrQkFBTSxXQUFXLFFBQVEsSUFBSTtBQUM3QixrQkFBTSxlQUFlLFFBQVEsSUFBSTtBQUVqQyxnQkFBSSxZQUFZLGNBQWM7QUFDNUIsb0JBQU0sY0FBYyxPQUFPLEtBQUssR0FBRyxRQUFRLElBQUksWUFBWSxFQUFFLEVBQUUsU0FBUyxRQUFRO0FBQ2hGLHVCQUFTLFVBQVUsaUJBQWlCLFNBQVMsV0FBVyxFQUFFO0FBQzFELHVCQUFTLFVBQVUsYUFBYSxRQUFRO0FBQ3hDLHVCQUFTLFVBQVUsaUJBQWlCLFlBQVk7QUFBQSxZQUNsRDtBQUFBLFVBQ0YsQ0FBQztBQUVELGdCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsTUFBTSxTQUFTO0FBQzdDLHFCQUFTLFFBQVEsNkJBQTZCLElBQUk7QUFDbEQscUJBQVMsUUFBUSw4QkFBOEIsSUFBSTtBQUNuRCxxQkFBUyxRQUFRLDhCQUE4QixJQUFJO0FBQUEsVUFDckQsQ0FBQztBQUVELGdCQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssTUFBTSxTQUFTO0FBQ3JDLG9CQUFRLE1BQU0sb0NBQW9DLEdBQUc7QUFBQSxVQUN2RCxDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQTtBQUFBLE1BR0EsMkJBQTJCO0FBQUEsUUFDekIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLFNBQVM7QUFDakIsZ0JBQU0sWUFBWSxLQUFLLFFBQVEsaUJBQWlCLEVBQUU7QUFDbEQsa0JBQVEsSUFBSSxhQUFhLElBQUksT0FBTyxTQUFTLEVBQUU7QUFDL0MsaUJBQU87QUFBQSxRQUNUO0FBQUEsUUFDQSxXQUFXLENBQUMsT0FBTyxhQUFhO0FBQzlCLGdCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsS0FBSyxTQUFTO0FBQzVDLGtCQUFNLFdBQVcsUUFBUSxJQUFJO0FBQzdCLGtCQUFNLGVBQWUsUUFBUSxJQUFJO0FBRWpDLGdCQUFJLFlBQVksY0FBYztBQUM1QixvQkFBTSxjQUFjLE9BQU8sS0FBSyxHQUFHLFFBQVEsSUFBSSxZQUFZLEVBQUUsRUFBRSxTQUFTLFFBQVE7QUFDaEYsdUJBQVMsVUFBVSxpQkFBaUIsU0FBUyxXQUFXLEVBQUU7QUFDMUQsdUJBQVMsVUFBVSxhQUFhLFFBQVE7QUFDeEMsdUJBQVMsVUFBVSxpQkFBaUIsWUFBWTtBQUNoRCx1QkFBUyxVQUFVLFVBQVUsa0JBQWtCO0FBRS9DLGtCQUFJLElBQUksV0FBVyxTQUFTLENBQUMsU0FBUyxVQUFVLGNBQWMsR0FBRztBQUMvRCx5QkFBUyxVQUFVLGdCQUFnQixrQkFBa0I7QUFBQSxjQUN2RDtBQUFBLFlBQ0Y7QUFFQSxrQkFBTSxVQUFVLEdBQUcsU0FBUyxRQUFRLEtBQUssU0FBUyxJQUFJLEdBQUcsU0FBUyxJQUFJO0FBQ3RFLG9CQUFRLElBQUksWUFBWSxJQUFJLE1BQU0sSUFBSSxJQUFJLEdBQUcsT0FBTyxPQUFPLEVBQUU7QUFBQSxVQUMvRCxDQUFDO0FBRUQsZ0JBQU0sR0FBRyxZQUFZLENBQUMsVUFBVSxLQUFLLFNBQVM7QUFDNUMscUJBQVMsUUFBUSw2QkFBNkIsSUFBSTtBQUNsRCxxQkFBUyxRQUFRLDhCQUE4QixJQUFJO0FBQ25ELHFCQUFTLFFBQVEsOEJBQThCLElBQUk7QUFFbkQsb0JBQVEsSUFBSSxZQUFZLFNBQVMsVUFBVSxRQUFRLElBQUksTUFBTSxJQUFJLElBQUksR0FBRyxFQUFFO0FBRTFFLGdCQUFJLFNBQVMsY0FBYyxLQUFLO0FBQzlCLHVCQUFTLEdBQUcsUUFBUSxDQUFDLFVBQVU7QUFDN0Isd0JBQVEsTUFBTSx3QkFBd0IsTUFBTSxTQUFTLENBQUMsRUFBRTtBQUFBLGNBQzFELENBQUM7QUFBQSxZQUNIO0FBQUEsVUFDRixDQUFDO0FBRUQsZ0JBQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxLQUFLLFNBQVM7QUFDcEMsb0JBQVEsTUFBTSxnQ0FBZ0MsSUFBSSxHQUFHLEtBQUssR0FBRztBQUFBLFVBQy9ELENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLGVBQWUsQ0FBQyxhQUFhLFlBQVksOEJBQThCO0FBQUEsRUFFdkUsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ04sb0NBQW9DLEtBQUssVUFBVSxRQUFRLElBQUksb0JBQW9CO0FBQUEsSUFDbkYsd0NBQXdDLEtBQUssVUFBVSxRQUFRLElBQUksd0JBQXdCO0FBQUEsRUFDN0Y7QUFBQSxFQUVBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQztBQUFBLElBQ2I7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
