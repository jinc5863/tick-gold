"""
配置管理器
用于加载和管理应用配置
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class ConfigManager:
    """配置管理器"""

    def __init__(self, config_path: Optional[str] = None):
        """
        初始化配置管理器

        参数:
            config_path: 配置文件路径（可选）
        """
        self.base_dir = Path(__file__).parent.parent

        if config_path:
            self.config_file = Path(config_path)
        else:
            # 默认配置路径
            self.config_file = self.base_dir / "config" / "app_config.json"

        self.config = {}
        self.risk_params = {}
        self.performance_params = {}
        self.gold_params = {}

    def load_config(self) -> Dict[str, Any]:
        """
        加载配置文件

        返回:
            配置字典
        """
        try:
            if not self.config_file.exists():
                logger.warning(f"配置文件不存在: {self.config_file}, 使用默认配置")
                return self._create_default_config()

            with open(self.config_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # 移除JSON注释（以#或//开头的行）
                lines = content.split('\n')
                cleaned_lines = []
                for line in lines:
                    # 去除行注释
                    stripped_line = line.strip()
                    if stripped_line.startswith('#') or stripped_line.startswith('//'):
                        continue
                    # 去除行内注释（简单处理）
                    if '#' in line:
                        line = line.split('#')[0]
                    if '//' in line:
                        line = line.split('//')[0]
                    cleaned_lines.append(line)
                cleaned_content = '\n'.join(cleaned_lines)
                self.config = json.loads(cleaned_content)

            # 提取关键配置部分
            self._extract_config_sections()

            logger.info(f"配置文件加载成功: {self.config_file}")
            return self.config

        except Exception as e:
            logger.error(f"加载配置文件失败: {e}")
            return self._create_default_config()

    def _extract_config_sections(self) -> None:
        """提取配置的各个部分"""
        # 风险参数
        self.risk_params = self.config.get('risk', {})

        # 性能参数
        self.performance_params = self.config.get('performance', {})

        # 黄金参数
        self.gold_params = {
            'gap_risk_limit': self.risk_params.get('gap_risk', 0.01),
            'overnight_risk_limit': self.risk_params.get('overnight_risk', 0.005),
            'max_drawdown': self.risk_params.get('max_drawdown', 0.02),
            'max_daily_loss': self.risk_params.get('max_daily_loss', 0.005),
            'position_size': self.risk_params.get('position_size', 0.01),
        }

    def _create_default_config(self) -> Dict[str, Any]:
        """创建默认配置"""
        default_config = {
            "app": {
                "name": "Tick Gold - XAUUSD量化交易系统",
                "version": "0.1.0",
                "description": "专为XAUUSD黄金交易对设计的量化交易系统，支持M1/M5/M15/M30四个交易周期",
            },
            "trading": {
                "symbol": "XAUUSD",
                "timeframes": ["M1", "M5", "M15", "M30"],
                "default_timeframe": "M1",
                "max_tick_rate": 21340,  # ticks/sec
                "data_precision": 5
            },
            "risk": {
                "max_drawdown": 0.02,  # 2%
                "max_daily_loss": 0.005,  # 0.5%
                "position_size": 0.01,  # 1%
                "stop_loss": 0.005,  # 0.5%
                "take_profit": 0.01,  # 1%
                "gap_risk": 0.01,  # 1%
                "overnight_risk": 0.005  # 0.5%
            },
            "performance": {
                "target_throughput": 100000,  # ticks/sec
                "target_latency": 50,  # ms
                "compression_ratio": 10
            },
            "ui": {
                "theme": "neumorphism",
                "default_dark_mode": True,
                "refresh_interval": 100,  # ms
                "chart_update_interval": 1000  # ms
            }
        }

        self.config = default_config
        self._extract_config_sections()

        return default_config

    def get_risk_params(self) -> Dict[str, float]:
        """获取风险参数"""
        return self.risk_params

    def get_performance_params(self) -> Dict[str, Any]:
        """获取性能参数"""
        return self.performance_params

    def get_gold_params(self) -> Dict[str, Any]:
        """获取黄金专用参数"""
        return self.gold_params

    def get_trading_params(self) -> Dict[str, Any]:
        """获取交易参数"""
        return self.config.get('trading', {})

    def get_ui_params(self) -> Dict[str, Any]:
        """获取UI参数"""
        return self.config.get('ui', {})

    def get_config_value(self, path: str, default: Any = None) -> Any:
        """
        根据路径获取配置值

        参数:
            path: 配置路径，例如 'risk.max_drawdown'
            default: 默认值

        返回:
            配置值
        """
        keys = path.split('.')
        value = self.config

        try:
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default

    def update_config(self, updates: Dict[str, Any]) -> bool:
        """
        更新配置

        参数:
            updates: 更新配置

        返回:
            是否成功
        """
        try:
            # 更新配置字典
            def _update_dict(d: Dict, u: Dict):
                for k, v in u.items():
                    if isinstance(v, dict) and k in d and isinstance(d[k], dict):
                        _update_dict(d[k], v)
                    else:
                        d[k] = v

            _update_dict(self.config, updates)

            # 重新提取配置部分
            self._extract_config_sections()

            # 保存到文件
            self.save_config()

            return True

        except Exception as e:
            logger.error(f"更新配置失败: {e}")
            return False

    def save_config(self, filepath: Optional[str] = None) -> bool:
        """
        保存配置到文件

        参数:
            filepath: 文件路径（可选）

        返回:
            是否成功
        """
        try:
            if filepath:
                save_file = Path(filepath)
            else:
                save_file = self.config_file

            # 确保目录存在
            save_file.parent.mkdir(parents=True, exist_ok=True)

            with open(save_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)

            logger.info(f"配置已保存到: {save_file}")
            return True

        except Exception as e:
            logger.error(f"保存配置失败: {e}")
            return False