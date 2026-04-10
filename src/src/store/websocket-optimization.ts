/**
 * WebSocket 高级优化工具
 *
 * 包含：
 * 1. 数据持久化 - 实时数据本地缓存
 * 2. 连接池管理 - WebSocket 连接池
 * 3. 消息压缩 - 大数据量优化传输
 */

import { GoldTickData, RealTimeSignal, WebSocketMessage } from './types/websocket';

/**
 * ==================== 1. 数据持久化 ====================
 */

const STORAGE_KEY_PREFIX = 'tick-gold-ws-';

/**
 * 持久化配置
 */
export interface PersistConfig {
  enabled: boolean;
  maxSize: number;          // 最大缓存条数
  expiryMs: number;         // 过期时间 (毫秒)
  storageType: 'localStorage' | 'sessionStorage' | 'indexedDB';
}

const defaultPersistConfig: PersistConfig = {
  enabled: true,
  maxSize: 1000,            // 最多保存 1000 条
  expiryMs: 24 * 60 * 60 * 1000, // 24 小时过期
  storageType: 'localStorage',
};

/**
 * 本地数据缓存管理器
 */
export class DataPersistManager {
  private config: PersistConfig;
  private storage: Storage;

  constructor(config: Partial<PersistConfig> = {}) {
    this.config = { ...defaultPersistConfig, ...config };
    this.storage = this.config.storageType === 'sessionStorage'
      ? sessionStorage
      : localStorage;
  }

  /**
   * 保存数据
   */
  save<T>(key: string, data: T): void {
    if (!this.config.enabled) return;

    try {
      const item = {
        data,
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(item);
      this.storage.setItem(`${STORAGE_KEY_PREFIX}${key}`, serialized);

      // 清理过期数据
      this.cleanup();
    } catch (error) {
      console.warn('数据持久化保存失败:', error);
    }
  }

  /**
   * 读取数据
   */
  get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    try {
      const serialized = this.storage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
      if (!serialized) return null;

      const item = JSON.parse(serialized);

      // 检查是否过期
      if (Date.now() - item.timestamp > this.config.expiryMs) {
        this.storage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
        return null;
      }

      return item.data as T;
    } catch (error) {
      console.warn('数据持久化读取失败:', error);
      return null;
    }
  }

  /**
   * 删除数据
   */
  remove(key: string): void {
    this.storage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const keys = Object.keys(this.storage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        this.storage.removeItem(key);
      }
    });
  }

  /**
   * 清理过期数据
   */
  private cleanup(): void {
    const keys = Object.keys(this.storage);
    const validKeys: string[] = [];

    // 收集所有有效的键
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        validKeys.push(key);
      }
    });

    // 如果超过最大数量，删除最旧的
    if (validKeys.length > this.config.maxSize) {
      const sorted = validKeys.sort((a, b) => {
        const aData = JSON.parse(this.storage.getItem(a) || '{}');
        const bData = JSON.parse(this.storage.getItem(b) || '{}');
        return aData.timestamp - bData.timestamp;
      });

      // 删除最旧的
      for (let i = 0; i < sorted.length - this.config.maxSize; i++) {
        this.storage.removeItem(sorted[i]);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { count: number; size: number } {
    const keys = Object.keys(this.storage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    let totalSize = 0;

    keys.forEach(key => {
      const value = this.storage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // 估算字节数
      }
    });

    return {
      count: keys.length,
      size: totalSize,
    };
  }
}

/**
 * ==================== 2. 连接池管理 ====================
 */

/**
 * WebSocket 连接状态
 */
export enum PoolConnectionState {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * 连接池配置
 */
export interface PoolConfig {
  maxConnections: number;     // 最大连接数
  reconnectDelay: number;     // 重连延迟 (ms)
  healthCheckInterval: number; // 健康检查间隔 (ms)
  idleTimeout: number;        // 空闲超时 (ms)
}

const defaultPoolConfig: PoolConfig = {
  maxConnections: 5,
  reconnectDelay: 3000,
  healthCheckInterval: 30000, // 30 秒
  idleTimeout: 60000,         // 60 秒
};

/**
 * 连接池项
 */
interface PoolItem {
  id: string;
  url: string;
  ws: WebSocket | null;
  state: PoolConnectionState;
  lastActivity: number;
  subscriptions: string[];
  reconnectCount: number;
  onMessage?: (data: any) => void;
  onError?: (error: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * WebSocket 连接池管理器
 */
export class WebSocketPoolManager {
  private config: PoolConfig;
  private pool: Map<string, PoolItem> = new Map();
  private healthCheckTimer: number | null = null;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...defaultPoolConfig, ...config };
    this.startHealthCheck();
  }

  /**
   * 创建或获取连接
   */
  connect(id: string, url: string, callbacks?: {
    onMessage?: (data: any) => void;
    onError?: (error: any) => void;
    onOpen?: () => void;
    onClose?: () => void;
  }): boolean {
    // 检查是否超过最大连接数
    if (this.pool.size >= this.config.maxConnections && !this.pool.has(id)) {
      console.warn('连接池已满，无法创建新连接');
      return false;
    }

    // 如果已存在连接，直接返回
    if (this.pool.has(id)) {
      const item = this.pool.get(id);
      if (item && item.state === PoolConnectionState.CONNECTED) {
        console.log(`连接 ${id} 已存在且已连接`);
        return true;
      }
    }

    // 创建新连接
    const poolItem: PoolItem = {
      id,
      url,
      ws: null,
      state: PoolConnectionState.CONNECTING,
      lastActivity: Date.now(),
      subscriptions: [],
      reconnectCount: 0,
      ...callbacks,
    };

    this.pool.set(id, poolItem);
    this.establishConnection(poolItem);

    return true;
  }

  /**
   * 建立连接
   */
  private establishConnection(item: PoolItem): void {
    try {
      const ws = new WebSocket(item.url);

      ws.onopen = () => {
        item.state = PoolConnectionState.CONNECTED;
        item.ws = ws;
        item.reconnectCount = 0;
        item.lastActivity = Date.now();
        console.log(`WebSocket 连接 ${item.id} 已建立`);
        item.onOpen?.();

        // 重新订阅
        item.subscriptions.forEach(sub => {
          this.send(item.id, { type: 'subscribe', symbol: sub });
        });
      };

      ws.onmessage = (event) => {
        item.lastActivity = Date.now();
        try {
          const data = JSON.parse(event.data);
          item.onMessage?.(data);
        } catch (error) {
          console.error('WebSocket 消息解析失败:', error);
        }
      };

      ws.onerror = (error) => {
        item.state = PoolConnectionState.ERROR;
        console.error(`WebSocket 连接 ${item.id} 错误:`, error);
        item.onError?.(error);
      };

      ws.onclose = () => {
        item.state = PoolConnectionState.DISCONNECTED;
        item.ws = null;
        console.log(`WebSocket 连接 ${item.id} 已关闭`);
        item.onClose?.();

        // 自动重连
        if (item.reconnectCount < 5) {
          item.reconnectCount++;
          setTimeout(() => {
            this.establishConnection(item);
          }, this.config.reconnectDelay * item.reconnectCount);
        }
      };

    } catch (error) {
      console.error(`创建 WebSocket 连接 ${item.id} 失败:`, error);
      item.state = PoolConnectionState.ERROR;
      item.onError?.(error);
    }
  }

  /**
   * 断开连接
   */
  disconnect(id: string): boolean {
    const item = this.pool.get(id);
    if (!item) return false;

    if (item.ws) {
      item.ws.close();
    }

    this.pool.delete(id);
    console.log(`WebSocket 连接 ${id} 已断开`);

    return true;
  }

  /**
   * 断开所有连接
   */
  disconnectAll(): void {
    this.pool.forEach((_, id) => {
      this.disconnect(id);
    });

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * 发送消息
   */
  send(id: string, data: any): boolean {
    const item = this.pool.get(id);
    if (!item || !item.ws || item.state !== PoolConnectionState.CONNECTED) {
      console.warn(`无法发送消息：连接 ${id} 未就绪`);
      return false;
    }

    try {
      item.ws.send(JSON.stringify(data));
      item.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error(`发送消息失败:`, error);
      return false;
    }
  }

  /**
   * 订阅交易品种
   */
  subscribe(id: string, symbol: string): boolean {
    const item = this.pool.get(id);
    if (!item) return false;

    item.subscriptions.push(symbol);
    return this.send(id, { type: 'subscribe', symbol });
  }

  /**
   * 取消订阅
   */
  unsubscribe(id: string, symbol: string): boolean {
    const item = this.pool.get(id);
    if (!item) return false;

    item.subscriptions = item.subscriptions.filter(s => s !== symbol);
    return this.send(id, { type: 'unsubscribe', symbol });
  }

  /**
   * 获取连接状态
   */
  getConnectionState(id: string): PoolConnectionState | null {
    const item = this.pool.get(id);
    return item?.state || null;
  }

  /**
   * 获取所有连接状态
   */
  getAllConnectionStates(): Map<string, PoolConnectionState> {
    const states = new Map<string, PoolConnectionState>();
    this.pool.forEach((item, id) => {
      states.set(id, item.state);
    });
    return states;
  }

  /**
   * 开始健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = window.setInterval(() => {
      const now = Date.now();

      this.pool.forEach((item, id) => {
        // 检查空闲超时
        if (now - item.lastActivity > this.config.idleTimeout) {
          console.log(`连接 ${id} 空闲超时，断开连接`);
          this.disconnect(id);
        }

        // 检查连接健康状态
        if (item.state === PoolConnectionState.CONNECTED && item.ws) {
          // 发送 ping 消息
          this.send(id, { type: 'ping' });
        }
      });
    }, this.config.healthCheckInterval);
  }

  /**
   * 获取连接池统计
   */
  getStats(): {
    total: number;
    connected: number;
    connecting: number;
    disconnected: number;
    error: number;
  } {
    const stats = {
      total: this.pool.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      error: 0,
    };

    this.pool.forEach(item => {
      switch (item.state) {
        case PoolConnectionState.CONNECTED:
          stats.connected++;
          break;
        case PoolConnectionState.CONNECTING:
          stats.connecting++;
          break;
        case PoolConnectionState.DISCONNECTED:
          stats.disconnected++;
          break;
        case PoolConnectionState.ERROR:
          stats.error++;
          break;
      }
    });

    return stats;
  }
}

/**
 * ==================== 3. 消息压缩 ====================
 */

/**
 * 消息压缩配置
 */
export interface CompressConfig {
  enabled: boolean;
  threshold: number;      // 超过此大小才压缩（字节）
  algorithm: 'gzip' | 'deflate' | 'lzstring';
}

const defaultCompressConfig: CompressConfig = {
  enabled: true,
  threshold: 1024,        // 1KB
  algorithm: 'lzstring',
};

/**
 * 简单 LZ 压缩实现（不依赖外部库）
 */
class SimpleLZCompressor {
  /**
   * 压缩数据
   */
  static compress(data: string): string {
    // 使用简单的游标编码
    const result: string[] = [];
    let i = 0;

    while (i < data.length) {
      let count = 1;
      while (i + count < data.length && data[i] === data[i + count] && count < 255) {
        count++;
      }

      if (count > 1) {
        result.push(`${String.fromCharCode(count)}${data[i]}`);
      } else {
        result.push(data[i]);
      }

      i += count;
    }

    return result.join('');
  }

  /**
   * 解压数据
   */
  static decompress(data: string): string {
    const result: string[] = [];
    let i = 0;

    while (i < data.length) {
      const count = data.charCodeAt(i);

      if (count > 1 && count <= 255 && i + 1 < data.length) {
        const char = data[i + 1];
        result.push(char.repeat(count));
        i += 2;
      } else {
        result.push(data[i]);
        i++;
      }
    }

    return result.join('');
  }
}

/**
 * 消息压缩管理器
 */
export class MessageCompressManager {
  private config: CompressConfig;

  constructor(config: Partial<CompressConfig> = {}) {
    this.config = { ...defaultCompressConfig, ...config };
  }

  /**
   * 压缩消息
   */
  compress(message: WebSocketMessage): { compressed: boolean; data: string } {
    const jsonStr = JSON.stringify(message);
    const bytes = new TextEncoder().encode(jsonStr);

    // 小于阈值，不压缩
    if (!this.config.enabled || bytes.length < this.config.threshold) {
      return { compressed: false, data: jsonStr };
    }

    try {
      // 使用简单压缩
      const compressedStr = SimpleLZCompressor.compress(jsonStr);
      return {
        compressed: true,
        data: JSON.stringify({
          c: true,
          d: compressedStr
        })
      };
    } catch (error) {
      console.warn('压缩失败，使用原始数据:', error);
      return { compressed: false, data: jsonStr };
    }
  }

  /**
   * 解压消息
   */
  decompress(data: string): WebSocketMessage | null {
    try {
      const parsed = JSON.parse(data);

      // 检查是否被压缩
      if (parsed.c === true && parsed.d) {
        const decompressedStr = SimpleLZCompressor.decompress(parsed.d);
        return JSON.parse(decompressedStr) as WebSocketMessage;
      }

      return parsed as WebSocketMessage;
    } catch (error) {
      console.error('解压失败:', error);
      return null;
    }
  }

  /**
   * 压缩率统计
   */
  getCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }
}

/**
 * ==================== 导出统一管理类 ====================
 */

/**
 * WebSocket 优化总管理器
 */
export class WebSocketOptimizationManager {
  public persist: DataPersistManager;
  public pool: WebSocketPoolManager;
  public compress: MessageCompressManager;

  constructor() {
    this.persist = new DataPersistManager();
    this.pool = new WebSocketPoolManager();
    this.compress = new MessageCompressManager();
  }

  /**
   * 获取所有统计信息
   */
  getStats(): {
    persist: { count: number; size: number };
    pool: {
      total: number;
      connected: number;
      connecting: number;
      disconnected: number;
      error: number;
    };
  } {
    return {
      persist: this.persist.getStats(),
      pool: this.pool.getStats(),
    };
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    this.pool.disconnectAll();
    this.persist.clear();
  }
}

// 导出单例实例
export const optimizationManager = new WebSocketOptimizationManager();