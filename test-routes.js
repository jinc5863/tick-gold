#!/usr/bin/env node

// 快速测试所有路由页面
const http = require('http');
const url = require('url');

const routes = [
  '/',
  '/overview',
  '/strategy-center',
  '/ai-analysis',
  '/system-settings',
  '/strategies',
  '/signals',
  '/dashboard',
  '/realtime',
  '/api-config',
  '/user-management'
];

console.log('🚀 测试TICK GOLD路由页面...\n');

let serverRunning = false;

// 尝试不同的端口
const port = 5178;
const baseUrl = `http://localhost:${port}`;

// 启动测试服务器检查
const checkRoute = async (route) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: route,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const hasRoot = data.includes('id="root"');
        const hasReact = data.includes('<script type="module"');
        const status = res.statusCode;

        // 简单检查
        if (status === 200) {
          if (hasRoot && hasReact) {
            resolve(`✅ ${route} (${status}) - React应用可加载`);
          } else {
            resolve(`⚠️ ${route} (${status}) - 页面可能不完整`);
          }
        } else {
          resolve(`❌ ${route} (${status})`);
        }
      });
    });

    req.on('timeout', () => {
      resolve(`⏱️ ${route} - 请求超时`);
      req.destroy();
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        resolve(`🚫 ${route} - 服务器未运行`);
      } else {
        resolve(`❌ ${route} - 错误: ${err.message}`);
      }
    });

    req.end();
  });
};

// 测试所有路由
const testAllRoutes = async () => {
  console.log(`📡 测试服务器: ${baseUrl}\n`);

  for (const route of routes) {
    const result = await checkRoute(route);
    console.log(result);
  }

  console.log('\n📋 测试完成！');
  console.log('如果看到大量"服务器未运行"，请先启动开发服务器：');
  console.log('cd /Users/office01/work/tick-gold/src && npm run dev');
  console.log('\n路由对应关系：');
  console.log('- /strategy-center → 策略中心页面');
  console.log('- /ai-analysis → AI深度分析页面');
  console.log('- /system-settings → 系统设置页面');
  console.log('- /strategies → 策略中心页面（兼容）');
  console.log('- /signals → 回测分析页面（兼容）');
  console.log('- /api-config → 系统设置页面（兼容）');
  console.log('- /user-management → 系统设置页面（兼容）');
};

testAllRoutes();