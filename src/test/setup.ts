/**
 * 测试环境配置
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// 全局mocks
vi.stubGlobal('console', {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
});

// Mock WebSocket
vi.stubGlobal('WebSocket', class WebSocket {
  onopen = () => {};
  onmessage = () => {};
  onerror = () => {};
  onclose = () => {};
  send = vi.fn();
  close = vi.fn();
  readyState = 1; // OPEN
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

vi.stubGlobal('localStorage', localStorageMock);

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

vi.stubGlobal('sessionStorage', sessionStorageMock);

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_BASE_URL: 'http://localhost:8000',
    },
  },
});