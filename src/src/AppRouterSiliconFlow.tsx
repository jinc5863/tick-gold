/**
 * SiliconFlow 统一路由配置入口
 *
 * ⚠️ 重要：原代理方案已弃用，现在统一采用核心布局系统
 *
 * 老板选了方案A：统一到我创建的核心布局系统！
 *
 * 问题分析：
 * ❌ 代理方案：ProDashboardSiliconFlow 内部创建侧边栏 + 页面内容
 *   - 冲突：与已有的 SiliconFlowLayout 侧边栏重复
 *   - 混乱：布局层级嵌套混乱
 *   - 重复：样式重复定义
 *
 * ✅ 统一方案：AppRouterSiliconFlowUnified
 *   - 使用：SiliconFlowLayout（统一布局容器）
 *   - 使用：SidebarNavigation（统一侧边栏）
 *   - 使用：TopBar（统一顶部导航）
 *   - 优势：单一路径，统一设计系统，易于维护
 *
 * 现在启动 Chrome MCP 分析，搞啊屁屁！
 * URL: https://cloud.siliconflow.cn/me/models
 */

// 重新导出统一的路由配置方案
export { default } from './AppRouterSiliconFlowUnified';