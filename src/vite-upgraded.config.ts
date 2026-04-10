import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// 验证文件是否存在
const indexPath = path.resolve(__dirname, 'index.html');
const entryPath = path.resolve(__dirname, 'src', 'main-upgraded.tsx');

// 检查文件和目录是否存在
console.log('Vite配置启动:');
console.log('- 项目根目录:', __dirname);
console.log('- index.html 路径:', indexPath, '存在:', fs.existsSync(indexPath));
console.log('- 入口文件路径:', entryPath, '存在:', fs.existsSync(entryPath));

// https://vitejs.dev/config/
export default defineConfig({
  // 设置根目录为当前目录（/Users/office01/work/tick-gold/src/）
  root: __dirname,
  // 基础路径配置
  base: '/',
  plugins: [
    react({
      // 优化热重载配置
      babel: {
        plugins: ['babel-plugin-macros'],
      },
      // 减少不必要的重载
      include: '**/*.tsx',
      fastRefresh: {
        exclude: ['**/node_modules/**', '**/dist/**'],
      },
    }),
  ],
  server: {
    port: 1420,
    // Tauri需要host设置为true或特定配置
    host: true, // 允许外部连接（Tauri需要）
    // 优化HMR（热模块替换）配置
    hmr: {
      overlay: true, // 启用错误覆盖层（更好的开发体验）
      clientPort: 1420,
      protocol: 'ws',
      host: 'localhost',
      // 优化HMR连接
      timeout: 2000,
      port: 24678,
    },
    watch: {
      // 忽略不必要的文件变化
      ignored: [
        '**/.git/**',
        '**/.claude/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/src-tauri/**',
        '**/backend/**',
        '**/*.py',
        '**/*.sql',
        '**/*.json',
      ],
      // 优化文件监视
      usePolling: false,
      interval: 300, // 300ms检查一次（更快响应）
      binaryInterval: 3000, // 二进制文件3秒检查一次
    },
    // 禁用文件系统缓存
    fs: {
      strict: false,
      allow: ['..'],
      cachedChecks: false,
    },
    middlewareMode: false,
    // 延迟更新
    force: false,
    // 防止频繁刷新
    cors: true,
    origin: 'http://localhost:1420',
    headers: {
      'Cache-Control': 'no-cache',
    },
  },
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
    },
  },
  define: {
    'process.env': {},
  },
  // 构建优化
  build: {
    // 确保源文件解析正确
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['antd', '@ant-design/icons'],
          charts: ['recharts'],
          state: ['zustand', '@tanstack/react-query'],
        },
      },
    },
    // 减少构建缓存
    write: true,
    emptyOutDir: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
  },
  // 优化开发体验
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      'recharts',
      'framer-motion',
      'zustand',
      '@tanstack/react-query',
    ],
    exclude: [],
    // 防止不必要的重新加载
    keepNames: true,
    esbuildOptions: {
      keepNames: true,
    },
  },
  // 启用传统浏览器支持
  legacy: {
    buildSsrCjsExternalHeuristics: true,
    proxySsrExternalModules: true,
  },
});