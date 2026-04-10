#!/usr/bin/env node

/**
 * Tick Gold 系统全面检查
 * 检查所有配置、UI文件、MCP设置和系统一致性
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 TICK GOLD 系统全面检查开始...\n');
const projectRoot = '/Users/office01/work/tick-gold';
const srcDir = path.join(projectRoot, 'src');
const frontendDir = path.join(srcDir, 'src');

// 1. 检查项目结构
console.log('📁 1. 项目结构检查');
const structureChecks = [
  { path: srcDir, shouldExist: true, description: 'src目录' },
  { path: frontendDir, shouldExist: true, description: 'src/src前端目录' },
  { path: path.join(frontendDir, 'main-upgraded.tsx'), shouldExist: true, description: '主入口文件' },
  { path: path.join(frontendDir, 'design-system.css'), shouldExist: true, description: '设计系统CSS' },
  { path: path.join(frontendDir, 'components'), shouldExist: true, description: '组件目录' },
  { path: path.join(frontendDir, 'pages'), shouldExist: true, description: '页面目录' },
];

structureChecks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const status = exists === check.shouldExist ? '✅' : '❌';
  console.log(`${status} ${check.description}: ${exists ? '存在' : '不存在'}`);
});

// 2. 检查UI主题配置
console.log('\n🎨 2. UI主题配置检查');

// 检查theme相关文件
const themeFiles = [
  'src/src/main-upgraded.tsx',
  'src/src/design-system.css',
  'src/src/design-system-siliconflow.css',
];

themeFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasProMax = content.includes('proMaxTheme') || content.includes('PRO MAX');
    const hasOldTheme = content.includes('lightNeumorphismTheme') || content.includes('darkNeumorphismTheme');

    console.log(`✅ ${file}: ${hasProMax ? 'PRO MAX主题 ✅' : '未找到PRO MAX主题'} ${hasOldTheme ? '⚠️ 发现旧主题' : ''}`);
  } else {
    console.log(`❌ ${file}: 文件不存在`);
  }
});

// 检查被删除的主题文件
const deletedThemeFiles = [
  'src/src/components/ui/Themes.tsx',
  'src/src/main-upgraded.backup.tsx',
  'src/src/main.tsx',
];

deletedThemeFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '❌' : '✅'} ${file}: ${exists ? '应删除但还存在' : '已正确删除'}`);
});

// 3. 检查配置文件
console.log('\n⚙️ 3. 配置文件检查');

const configFiles = [
  { path: path.join(projectRoot, 'config/app_config.json'), description: '应用配置' },
  { path: path.join(srcDir, 'package.json'), description: '前端依赖配置' },
  { path: path.join(frontendDir, 'vite.config.ts'), description: 'Vite配置' },
  { path: '/Users/office01/.claude.json', description: 'Claude配置文件' },
  { path: '/Users/office01/.claude/settings.json', description: 'Claude设置文件' },
];

configFiles.forEach(config => {
  const exists = fs.existsSync(config.path);
  if (exists) {
    const stats = fs.statSync(config.path);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`✅ ${config.description}: 存在 (${size}KB)`);

    // 检查MCP配置
    if (config.path.includes('.claude.json')) {
      try {
        const content = JSON.parse(fs.readFileSync(config.path, 'utf8'));
        const mcpServers = content.mcpServers || {};
        const serverCount = Object.keys(mcpServers).length;
        console.log(`   📡 MCP服务器: ${serverCount}个`);

        Object.keys(mcpServers).forEach(server => {
          const serverConfig = mcpServers[server];
          const type = serverConfig.type || 'stdio';
          console.log(`     - ${server}: ${type} ${type === 'http' ? `(${serverConfig.url})` : ''}`);

          // 检查pencil是否还存在
          if (server === 'pencil') {
            console.log(`     ⚠️ 警告: pencil MCP应该已被删除`);
          }
        });
      } catch (e) {
        console.log(`   ❌ JSON解析错误`);
      }
    }
  } else {
    console.log(`❌ ${config.description}: 不存在`);
  }
});

// 4. 检查路由和页面
console.log('\n🛣️ 4. 路由和页面检查');

// 检查路由配置
const routerFiles = [
  'src/src/AppRouterSiliconFlowUnified.tsx',
  'src/src/AppRouterSiliconFlow.tsx',
  'src/src/AppRouter.tsx',
];

routerFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const isExported = content.includes('export');
    const hasRoutes = content.includes('createBrowserRouter') || content.includes('RouterProvider');
    console.log(`✅ ${file}: ${isExported ? '已导出' : '未导出'} ${hasRoutes ? '有路由配置' : '无路由配置'}`);
  }
});

// 检查页面组件
const pagesDir = path.join(frontendDir, 'components/siliconflow-pages');
if (fs.existsSync(pagesDir)) {
  const pages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
  console.log(`✅ SiliconFlow页面: ${pages.length}个页面文件`);
  pages.forEach(page => console.log(`   - ${page}`));
} else {
  console.log(`❌ SiliconFlow页面目录不存在: ${pagesDir}`);
}

// 5. 检查依赖和包管理
console.log('\n📦 5. 依赖和包管理检查');

try {
  const packageJsonPath = path.join(srcDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    console.log(`✅ package.json: ${pkg.name}@${pkg.version}`);
    console.log(`   依赖: ${Object.keys(pkg.dependencies || {}).length}个`);
    console.log(`   开发依赖: ${Object.keys(pkg.devDependencies || {}).length}个`);

    // 检查关键依赖
    const criticalDeps = ['react', 'react-dom', 'antd', 'zustand', '@tanstack/react-query'];
    const missingDeps = criticalDeps.filter(dep => !pkg.dependencies?.[dep]);
    if (missingDeps.length > 0) {
      console.log(`   ⚠️ 缺少关键依赖: ${missingDeps.join(', ')}`);
    } else {
      console.log(`   ✅ 所有关键依赖都存在`);
    }
  }
} catch (e) {
  console.log(`❌ 无法读取package.json: ${e.message}`);
}

// 6. 检查启动和运行状态
console.log('\n🚀 6. 启动和运行状态检查');

// 检查Vite配置
const viteConfigPath = path.join(frontendDir, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  const hasReact = viteConfig.includes('@vitejs/plugin-react');
  const hasAliases = viteConfig.includes('@/');
  console.log(`✅ Vite配置: ${hasReact ? '已配置React插件' : '缺少React插件'} ${hasAliases ? '已配置别名' : '缺少别名'}`);
}

// 检查HTML入口
const htmlPath = path.join(srcDir, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const hasRootDiv = html.includes('id="root"');
  const hasScript = html.includes('main-upgraded.tsx');
  console.log(`✅ HTML入口: ${hasRootDiv ? '有root元素' : '缺少root元素'} ${hasScript ? '指向main-upgraded.tsx' : '脚本指向可能错误'}`);
}

// 7. 检查MCP技能
console.log('\n🔧 7. MCP和技能检查');

const skillsDir = '/Users/office01/.claude/skills';
if (fs.existsSync(skillsDir)) {
  const skills = fs.readdirSync(skillsDir);
  console.log(`✅ Claude技能: ${skills.length}个`);

  // 检查UI/UX相关技能
  const uiSkills = skills.filter(s => s.includes('ui') || s.includes('ux') || s.includes('design'));
  console.log(`   UI/UX相关技能: ${uiSkills.length}个`);
  uiSkills.forEach(skill => {
    const hasProMax = skill.includes('ui-ux-pro-max');
    console.log(`   ${hasProMax ? '✅' : '⚠️'} ${skill}${hasProMax ? ' (主设计系统)' : ''}`);
  });
}

console.log('\n📋 检查总结:');
console.log('1. 项目结构完整性检查');
console.log('2. UI主题系统一致性检查');
console.log('3. 配置文件正确性检查');
console.log('4. 路由和页面组件检查');
console.log('5. 依赖包管理检查');
console.log('6. 启动配置检查');
console.log('7. MCP和技能配置检查');
console.log('\n根据上述检查结果，识别任何不一致、冲突或缺失的配置。');

// 输出建议
console.log('\n💡 建议：');
console.log('1. 确保所有主题文件使用统一的PRO MAX设计系统');
console.log('2. 检查路由配置是否正确指向所有SiliconFlow页面');
console.log('3. 验证MCP配置是否与需求匹配');
console.log('4. 确保package.json包含所有必要依赖');
console.log('5. 确认HTML入口正确加载React应用');