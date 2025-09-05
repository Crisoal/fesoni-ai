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
  // Include .docx files as assets
  assetsInclude: ["**/*.docx", "**/*.doc"],
  // Exclude lucide-react from dependency pre-bundling
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  // Environment variables configuration
  define: {
    "process.env.VITE_FOXIT_CLIENT_ID": JSON.stringify(process.env.VITE_FOXIT_CLIENT_ID),
    "process.env.VITE_FOXIT_CLIENT_SECRET": JSON.stringify(process.env.VITE_FOXIT_CLIENT_SECRET)
  },
  // For production builds
  build: {
    rollupOptions: {
      external: []
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjsvLyBVcGRhdGVkIHZpdGUuY29uZmlnLnRzIC0gRml4ZWQgcHJveHkgY29uZmlndXJhdGlvblxuXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAvLyBQcm94eSBmb3IgRm94aXQgRG9jdW1lbnQgR2VuZXJhdGlvbiBBUElcbiAgICAgICcvYXBpL2ZveGl0L2RvY3VtZW50LWdlbmVyYXRpb24nOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vbmExLmZ1c2lvbi5mb3hpdC5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9mb3hpdC8sICcnKSxcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxLCBfcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGllbnRJZCA9IHByb2Nlc3MuZW52LlZJVEVfRk9YSVRfQ0xJRU5UX0lEO1xuICAgICAgICAgICAgY29uc3QgY2xpZW50U2VjcmV0ID0gcHJvY2Vzcy5lbnYuVklURV9GT1hJVF9DTElFTlRfU0VDUkVUO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY2xpZW50SWQgJiYgY2xpZW50U2VjcmV0KSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gQnVmZmVyLmZyb20oYCR7Y2xpZW50SWR9OiR7Y2xpZW50U2VjcmV0fWApLnRvU3RyaW5nKCdiYXNlNjQnKTtcbiAgICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJhc2ljICR7Y3JlZGVudGlhbHN9YCk7XG4gICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignY2xpZW50X2lkJywgY2xpZW50SWQpO1xuICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ2NsaWVudF9zZWNyZXQnLCBjbGllbnRTZWNyZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlcywgX3JlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gICAgICAgICAgICBwcm94eVJlcy5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJ10gPSAnR0VULCBQT1NULCBQVVQsIERFTEVURSwgT1BUSU9OUyc7XG4gICAgICAgICAgICBwcm94eVJlcy5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJ10gPSAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCBjbGllbnRfaWQsIGNsaWVudF9zZWNyZXQnO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIsIF9yZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0RvY3VtZW50IEdlbmVyYXRpb24gUHJveHkgZXJyb3I6JywgZXJyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8gUHJveHkgZm9yIEZveGl0IFBERiBTZXJ2aWNlcyBBUEkgKGluY2x1ZGluZyB0YXNrIHN0YXR1cywgZG9jdW1lbnQgb3BlcmF0aW9ucylcbiAgICAgICcvYXBpL2ZveGl0L3BkZi1zZXJ2aWNlcyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9uYTEuZnVzaW9uLmZveGl0LmNvbScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHtcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIC9hcGkvZm94aXQgcHJlZml4IHRvIGdldCB0aGUgY29ycmVjdCBGb3hpdCBBUEkgcGF0aFxuICAgICAgICAgIGNvbnN0IHJld3JpdHRlbiA9IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL2ZveGl0LywgJycpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXdyaXRpbmcgJHtwYXRofSB0byAke3Jld3JpdHRlbn1gKTtcbiAgICAgICAgICByZXR1cm4gcmV3cml0dGVuO1xuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSwgX29wdGlvbnMpID0+IHtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xpZW50SWQgPSBwcm9jZXNzLmVudi5WSVRFX0ZPWElUX0NMSUVOVF9JRDtcbiAgICAgICAgICAgIGNvbnN0IGNsaWVudFNlY3JldCA9IHByb2Nlc3MuZW52LlZJVEVfRk9YSVRfQ0xJRU5UX1NFQ1JFVDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNsaWVudElkICYmIGNsaWVudFNlY3JldCkge1xuICAgICAgICAgICAgICBjb25zdCBjcmVkZW50aWFscyA9IEJ1ZmZlci5mcm9tKGAke2NsaWVudElkfToke2NsaWVudFNlY3JldH1gKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignQXV0aG9yaXphdGlvbicsIGBCYXNpYyAke2NyZWRlbnRpYWxzfWApO1xuICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ2NsaWVudF9pZCcsIGNsaWVudElkKTtcbiAgICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdjbGllbnRfc2VjcmV0JywgY2xpZW50U2VjcmV0KTtcbiAgICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gRW5zdXJlIHByb3BlciBjb250ZW50IHR5cGUgZm9yIGFsbCByZXF1ZXN0c1xuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ0dFVCcgJiYgIXByb3h5UmVxLmdldEhlYWRlcignQ29udGVudC1UeXBlJykpIHtcbiAgICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTG9nIHRoZSBjb21wbGV0ZSBVUkwgYmVpbmcgcHJveGllZFxuICAgICAgICAgICAgY29uc3QgZnVsbFVybCA9IGAke3Byb3h5UmVxLnByb3RvY29sfS8vJHtwcm94eVJlcS5ob3N0fSR7cHJveHlSZXEucGF0aH1gO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFByb3h5aW5nICR7cmVxLm1ldGhvZH0gJHtyZXEudXJsfSAtPiAke2Z1bGxVcmx9YCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIC8vIFNldCBDT1JTIGhlYWRlcnNcbiAgICAgICAgICAgIHByb3h5UmVzLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyddID0gJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnO1xuICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyddID0gJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbiwgY2xpZW50X2lkLCBjbGllbnRfc2VjcmV0LCBBY2NlcHQnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBMb2cgcmVzcG9uc2UgZm9yIGRlYnVnZ2luZ1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFJlc3BvbnNlICR7cHJveHlSZXMuc3RhdHVzQ29kZX0gZm9yICR7cmVxLm1ldGhvZH0gJHtyZXEudXJsfWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBMb2cgZXJyb3IgcmVzcG9uc2VzXG4gICAgICAgICAgICBpZiAocHJveHlSZXMuc3RhdHVzQ29kZSA+PSA0MDApIHtcbiAgICAgICAgICAgICAgcHJveHlSZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciByZXNwb25zZSBib2R5OiAke2NodW5rLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgUERGIFNlcnZpY2VzIFByb3h5IGVycm9yIGZvciAke3JlcS51cmx9OmAsIGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLy8gSW5jbHVkZSAuZG9jeCBmaWxlcyBhcyBhc3NldHNcbiAgYXNzZXRzSW5jbHVkZTogWycqKi8qLmRvY3gnLCAnKiovKi5kb2MnXSxcbiAgXG4gIC8vIEV4Y2x1ZGUgbHVjaWRlLXJlYWN0IGZyb20gZGVwZW5kZW5jeSBwcmUtYnVuZGxpbmdcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbiAgXG4gIC8vIEVudmlyb25tZW50IHZhcmlhYmxlcyBjb25maWd1cmF0aW9uXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudi5WSVRFX0ZPWElUX0NMSUVOVF9JRCc6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52LlZJVEVfRk9YSVRfQ0xJRU5UX0lEKSxcbiAgICAncHJvY2Vzcy5lbnYuVklURV9GT1hJVF9DTElFTlRfU0VDUkVUJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuVklURV9GT1hJVF9DTElFTlRfU0VDUkVUKSxcbiAgfSxcbiAgXG4gIC8vIEZvciBwcm9kdWN0aW9uIGJ1aWxkc1xuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBbXSxcbiAgICB9LFxuICB9LFxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUVBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFFakIsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBO0FBQUEsTUFFTCxrQ0FBa0M7QUFBQSxRQUNoQyxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsaUJBQWlCLEVBQUU7QUFBQSxRQUNuRCxXQUFXLENBQUMsT0FBTyxhQUFhO0FBQzlCLGdCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsTUFBTSxTQUFTO0FBQzdDLGtCQUFNLFdBQVcsUUFBUSxJQUFJO0FBQzdCLGtCQUFNLGVBQWUsUUFBUSxJQUFJO0FBRWpDLGdCQUFJLFlBQVksY0FBYztBQUM1QixvQkFBTSxjQUFjLE9BQU8sS0FBSyxHQUFHLFFBQVEsSUFBSSxZQUFZLEVBQUUsRUFBRSxTQUFTLFFBQVE7QUFDaEYsdUJBQVMsVUFBVSxpQkFBaUIsU0FBUyxXQUFXLEVBQUU7QUFDMUQsdUJBQVMsVUFBVSxhQUFhLFFBQVE7QUFDeEMsdUJBQVMsVUFBVSxpQkFBaUIsWUFBWTtBQUFBLFlBQ2xEO0FBQUEsVUFDRixDQUFDO0FBRUQsZ0JBQU0sR0FBRyxZQUFZLENBQUMsVUFBVSxNQUFNLFNBQVM7QUFDN0MscUJBQVMsUUFBUSw2QkFBNkIsSUFBSTtBQUNsRCxxQkFBUyxRQUFRLDhCQUE4QixJQUFJO0FBQ25ELHFCQUFTLFFBQVEsOEJBQThCLElBQUk7QUFBQSxVQUNyRCxDQUFDO0FBRUQsZ0JBQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxNQUFNLFNBQVM7QUFDckMsb0JBQVEsTUFBTSxvQ0FBb0MsR0FBRztBQUFBLFVBQ3ZELENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBO0FBQUEsTUFHQSwyQkFBMkI7QUFBQSxRQUN6QixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUztBQUVqQixnQkFBTSxZQUFZLEtBQUssUUFBUSxpQkFBaUIsRUFBRTtBQUNsRCxrQkFBUSxJQUFJLGFBQWEsSUFBSSxPQUFPLFNBQVMsRUFBRTtBQUMvQyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxRQUNBLFdBQVcsQ0FBQyxPQUFPLGFBQWE7QUFDOUIsZ0JBQU0sR0FBRyxZQUFZLENBQUMsVUFBVSxLQUFLLFNBQVM7QUFDNUMsa0JBQU0sV0FBVyxRQUFRLElBQUk7QUFDN0Isa0JBQU0sZUFBZSxRQUFRLElBQUk7QUFFakMsZ0JBQUksWUFBWSxjQUFjO0FBQzVCLG9CQUFNLGNBQWMsT0FBTyxLQUFLLEdBQUcsUUFBUSxJQUFJLFlBQVksRUFBRSxFQUFFLFNBQVMsUUFBUTtBQUNoRix1QkFBUyxVQUFVLGlCQUFpQixTQUFTLFdBQVcsRUFBRTtBQUMxRCx1QkFBUyxVQUFVLGFBQWEsUUFBUTtBQUN4Qyx1QkFBUyxVQUFVLGlCQUFpQixZQUFZO0FBQ2hELHVCQUFTLFVBQVUsVUFBVSxrQkFBa0I7QUFHL0Msa0JBQUksSUFBSSxXQUFXLFNBQVMsQ0FBQyxTQUFTLFVBQVUsY0FBYyxHQUFHO0FBQy9ELHlCQUFTLFVBQVUsZ0JBQWdCLGtCQUFrQjtBQUFBLGNBQ3ZEO0FBQUEsWUFDRjtBQUdBLGtCQUFNLFVBQVUsR0FBRyxTQUFTLFFBQVEsS0FBSyxTQUFTLElBQUksR0FBRyxTQUFTLElBQUk7QUFDdEUsb0JBQVEsSUFBSSxZQUFZLElBQUksTUFBTSxJQUFJLElBQUksR0FBRyxPQUFPLE9BQU8sRUFBRTtBQUFBLFVBQy9ELENBQUM7QUFFRCxnQkFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLEtBQUssU0FBUztBQUU1QyxxQkFBUyxRQUFRLDZCQUE2QixJQUFJO0FBQ2xELHFCQUFTLFFBQVEsOEJBQThCLElBQUk7QUFDbkQscUJBQVMsUUFBUSw4QkFBOEIsSUFBSTtBQUduRCxvQkFBUSxJQUFJLFlBQVksU0FBUyxVQUFVLFFBQVEsSUFBSSxNQUFNLElBQUksSUFBSSxHQUFHLEVBQUU7QUFHMUUsZ0JBQUksU0FBUyxjQUFjLEtBQUs7QUFDOUIsdUJBQVMsR0FBRyxRQUFRLENBQUMsVUFBVTtBQUM3Qix3QkFBUSxNQUFNLHdCQUF3QixNQUFNLFNBQVMsQ0FBQyxFQUFFO0FBQUEsY0FDMUQsQ0FBQztBQUFBLFlBQ0g7QUFBQSxVQUNGLENBQUM7QUFFRCxnQkFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEtBQUssU0FBUztBQUNwQyxvQkFBUSxNQUFNLGdDQUFnQyxJQUFJLEdBQUcsS0FBSyxHQUFHO0FBQUEsVUFDL0QsQ0FBQztBQUFBLFFBQ0g7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBR0EsZUFBZSxDQUFDLGFBQWEsVUFBVTtBQUFBO0FBQUEsRUFHdkMsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBO0FBQUEsRUFHQSxRQUFRO0FBQUEsSUFDTixvQ0FBb0MsS0FBSyxVQUFVLFFBQVEsSUFBSSxvQkFBb0I7QUFBQSxJQUNuRix3Q0FBd0MsS0FBSyxVQUFVLFFBQVEsSUFBSSx3QkFBd0I7QUFBQSxFQUM3RjtBQUFBO0FBQUEsRUFHQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixVQUFVLENBQUM7QUFBQSxJQUNiO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
