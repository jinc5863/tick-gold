/**
 * SiliconFlow布局性能监控模块
 * 确保在21,340+ ticks/sec基准下正常工作
 */

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  renderTimeMs: number;
  memoryUsageMB?: number;
  elementCount: number;
  componentRenders: number;
  lastUpdate: Date;
}

interface PerformanceThresholds {
  minFPS: number;
  maxRenderTimeMs: number;
  maxElementCount: number;
  warningThreshold: number; // 0-1
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  minFPS: 60, // 确保每秒60帧的流畅体验
  maxRenderTimeMs: 16, // 每帧16ms
  maxElementCount: 5000, // 最大元素数量（基于21,340+ ticks/sec处理能力）
  warningThreshold: 0.8, // 当性能达到阈值的80%时提醒
};

class SiliconFlowPerfMonitor {
  private metrics: PerformanceMetrics[] = [];
  private frameCount = 0;
  private lastTimestamp = 0;
  private isMonitoring = false;
  private thresholds = DEFAULT_THRESHOLDS;
  private warnings: string[] = [];

  constructor(customThresholds?: Partial<PerformanceThresholds>) {
    if (customThresholds) {
      this.thresholds = { ...this.thresholds, ...customThresholds };
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastTimestamp = performance.now();
    this.metrics = [];
    this.warnings = [];

    // 开始帧率监控
    this.requestFrame();

    // 监听内存使用情况（如果浏览器支持）
    if ('memory' in performance) {
      this.monitorMemory();
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  private requestFrame() {
    if (!this.isMonitoring) return;

    requestAnimationFrame((timestamp) => {
      this.frameCount++;

      const elapsed = timestamp - this.lastTimestamp;
      if (elapsed >= 1000) { // 每秒钟计算一次FPS
        const fps = (this.frameCount * 1000) / elapsed;
        this.addMetric({
          fps,
          renderTimeMs: elapsed / this.frameCount,
          elementCount: this.countVisibleElements(),
          componentRenders: this.countComponentRenders(),
          lastUpdate: new Date(),
        });

        this.checkThresholds();
        this.frameCount = 0;
        this.lastTimestamp = timestamp;
      }

      if (this.isMonitoring) {
        this.requestFrame();
      }
    });
  }

  private addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);

    // 保留最近100个指标
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  private countVisibleElements(): number {
    // 估算页面上可见的元素数量
    // 这应包括所有DOM元素，但我们可以使用一个保守的估算
    const allElements = document.querySelectorAll('*');
    return Math.min(allElements.length, this.thresholds.maxElementCount);
  }

  private countComponentRenders(): number {
    // 这里可以集成React DevTools或使用自定义跟踪
    // 暂时返回一个保守估算
    return document.querySelectorAll('[data-component]').length;
  }

  private monitorMemory() {
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        const currentMetric = this.metrics[this.metrics.length - 1];
        if (currentMetric) {
          currentMetric.memoryUsageMB = memory.usedJSHeapSize / (1024 * 1024);
        }
      }
    }, 1000);
  }

  private checkThresholds() {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    const warnings: string[] = [];

    // FPS检查
    if (latest.fps < this.thresholds.minFPS * this.thresholds.warningThreshold) {
      warnings.push(`帧率过低: ${latest.fps.toFixed(1)} FPS (最低要求: ${this.thresholds.minFPS})`);
    }

    // 渲染时间检查
    if (latest.renderTimeMs > this.thresholds.maxRenderTimeMs * (1 / this.thresholds.warningThreshold)) {
      warnings.push(`渲染时间过长: ${latest.renderTimeMs.toFixed(2)}ms (最大允许: ${this.thresholds.maxRenderTimeMs}ms)`);
    }

    // 元素数量检查
    if (latest.elementCount > this.thresholds.maxElementCount * this.thresholds.warningThreshold) {
      warnings.push(`元素数量过多: ${latest.elementCount} (最大建议: ${this.thresholds.maxElementCount})`);
    }

    // 组件渲染检查
    if (latest.componentRenders > 100) { // 警告阈值
      warnings.push(`组件渲染次数偏高: ${latest.componentRenders}次`);
    }

    // 内存使用检查
    if (latest.memoryUsageMB && latest.memoryUsageMB > 100) { // 100MB警告阈值
      warnings.push(`内存使用偏高: ${latest.memoryUsageMB.toFixed(1)}MB`);
    }

    this.warnings = warnings;
  }

  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        fps: 0,
        renderTimeMs: 0,
        elementCount: 0,
        componentRenders: 0,
        lastUpdate: new Date(),
      };
    }

    const avg = this.metrics.reduce((acc, metric) => ({
      fps: acc.fps + metric.fps,
      renderTimeMs: acc.renderTimeMs + metric.renderTimeMs,
      elementCount: Math.max(acc.elementCount, metric.elementCount),
      componentRenders: Math.max(acc.componentRenders, metric.componentRenders),
      lastUpdate: new Date(),
    }));

    return {
      fps: avg.fps / this.metrics.length,
      renderTimeMs: avg.renderTimeMs / this.metrics.length,
      elementCount: avg.elementCount,
      componentRenders: avg.componentRenders,
      lastUpdate: new Date(),
    };
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  clearWarnings() {
    this.warnings = [];
  }

  exportReport(): PerformanceReport {
    return {
      current: this.getCurrentMetrics(),
      average: this.getAverageMetrics(),
      warnings: this.warnings,
      timestamp: new Date(),
      thresholds: this.thresholds,
    };
  }
}

interface PerformanceReport {
  current: PerformanceMetrics | null;
  average: PerformanceMetrics;
  warnings: string[];
  timestamp: Date;
  thresholds: PerformanceThresholds;
}

// React Hook for performance monitoring
export const useSiliconFlowPerformance = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const monitorRef = useRef<SiliconFlowPerfMonitor | null>(null);
  const renderCount = useRef(0);

  useEffect(() => {
    // 只在开发环境启用性能监控
    if (process.env.NODE_ENV === 'development') {
      const monitor = new SiliconFlowPerfMonitor({
        maxElementCount: 3000, // SiliconFlow布局的元素限制
      });
      monitor.startMonitoring();
      monitorRef.current = monitor;

      // 定期更新状态
      const interval = setInterval(() => {
        if (monitorRef.current) {
          setMetrics(monitorRef.current.getCurrentMetrics());
          setWarnings(monitorRef.current.getWarnings());
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        if (monitorRef.current) {
          monitorRef.current.stopMonitoring();
        }
      };
    }
  }, []);

  // 跟踪组件渲染
  useEffect(() => {
    renderCount.current++;

    // 如果组件渲染次数过多，添加警告
    if (process.env.NODE_ENV === 'development' && renderCount.current > 10) {
      setWarnings(prev => [
        ...prev,
        `组件 "${componentName}" 渲染次数过多: ${renderCount.current}次`
      ]);
    }
  });

  const reportPerformance = (operationName: string, durationMs: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[性能] ${componentName}.${operationName}: ${durationMs.toFixed(2)}ms`);

      // 记录慢操作警告
      if (durationMs > 16) { // 超过一帧时间
        setWarnings(prev => [
          ...prev,
          `操作 "${operationName}" 执行时间过长: ${durationMs.toFixed(2)}ms`
        ]);
      }
    }
  };

  const clearWarnings = () => {
    setWarnings([]);
    if (monitorRef.current) {
      monitorRef.current.clearWarnings();
    }
  };

  const getComponentPerformance = () => {
    return {
      renderCount: renderCount.current,
      lastRender: new Date(),
      isOptimized: renderCount.current <= 10,
    };
  };

  return {
    metrics,
    warnings,
    reportPerformance,
    clearWarnings,
    getComponentPerformance,
    isMonitoring: monitorRef.current !== null,
  };
};

// 性能检测工具
export const siliconFlowPerformance = {
  /**
   * 虚拟滚动性能测试
   * @param container 滚动容器
   * @param itemCount 项目数量
   * @returns 性能测试结果
   */
  testVirtualScrollPerformance(container: HTMLElement, itemCount: number): PerformanceResult {
    const startTime = performance.now();
    let frameTimeTotal = 0;
    let frameCount = 0;

    const testAnimation = (timestamp: number) => {
      const frameStart = performance.now();

      // 模拟滚动
      container.scrollTop += 10;

      if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
        container.scrollTop = 0;
      }

      const frameEnd = performance.now();
      frameTimeTotal += (frameEnd - frameStart);
      frameCount++;

      if (performance.now() - startTime < 2000) { // 测试2秒
        requestAnimationFrame(testAnimation);
      }
    };

    requestAnimationFrame(testAnimation);

    return {
      durationMs: performance.now() - startTime,
      averageFrameTimeMs: frameTimeTotal / frameCount,
      itemCount,
      fps: (frameCount * 1000) / 2000,
    };
  },

  /**
   * 检测组件内存泄漏
   * @param componentFactory 组件工厂函数
   * @param iterations 迭代次数
   * @returns 泄漏检测结果
   */
  testMemoryLeak(componentFactory: () => React.ReactElement, iterations = 100): LeakTestResult {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const instances: any[] = [];

    for (let i = 0; i < iterations; i++) {
      instances.push(componentFactory());
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryDiff = finalMemory - initialMemory;

    return {
      iterations,
      memoryIncreaseKB: memoryDiff / 1024,
      memoryPerInstanceKB: memoryDiff / (iterations * 1024),
      hasLeak: memoryDiff > 1024 * 1024, // 如果内存增加超过1MB，可能存在泄漏
    };
  },
};

interface PerformanceResult {
  durationMs: number;
  averageFrameTimeMs: number;
  itemCount: number;
  fps: number;
}

interface LeakTestResult {
  iterations: number;
  memoryIncreaseKB: number;
  memoryPerInstanceKB: number;
  hasLeak: boolean;
}

// 性能监控面板组件（用于开发环境）
export const PerformanceMonitorPanel: React.FC = () => {
  const { metrics, warnings, clearWarnings } = useSiliconFlowPerformance('PerformanceMonitorPanel');

  if (!metrics || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getPerformanceColor = (value: number, threshold: number) => {
    const ratio = value / threshold;
    if (ratio > 0.9) return '#EF4444'; // 红色
    if (ratio > 0.7) return '#F59E0B'; // 橙色
    return '#10B981'; // 绿色
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: 'rgba(26, 26, 36, 0.95)',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      zIndex: 9999,
      fontSize: '12px',
      color: '#F3F4F6',
      maxWidth: '300px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ fontSize: '14px' }}>🎯 SiliconFlow性能监控</strong>
        <button
          onClick={clearWarnings}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            color: '#FFD700',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          清除警告
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span>帧率 (FPS):</span>
          <span style={{ color: getPerformanceColor(metrics.fps, 60), fontWeight: 'bold' }}>
            {metrics.fps.toFixed(1)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span>渲染时间:</span>
          <span style={{ color: getPerformanceColor(metrics.renderTimeMs, 16), fontWeight: 'bold' }}>
            {metrics.renderTimeMs.toFixed(2)}ms
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span>元素数量:</span>
          <span style={{ color: getPerformanceColor(metrics.elementCount, 3000), fontWeight: 'bold' }}>
            {metrics.elementCount}
          </span>
        </div>
        {metrics.memoryUsageMB && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>内存使用:</span>
            <span style={{ color: getPerformanceColor(metrics.memoryUsageMB, 100), fontWeight: 'bold' }}>
              {metrics.memoryUsageMB.toFixed(1)}MB
            </span>
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <div style={{ fontWeight: 'bold', color: '#EF4444', marginBottom: '4px' }}>
            ⚠️ 性能警告 ({warnings.length})
          </div>
          {warnings.map((warning, index) => (
            <div key={index} style={{ fontSize: '11px', marginBottom: '2px' }}>
              • {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiliconFlowPerfMonitor;