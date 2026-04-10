"""
黄金专用量化策略引擎主控制器
整合黄金交易的所有专用功能模块
"""

import pandas as pd
import numpy as np
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import logging
from pathlib import Path

# 导入黄金专用模块
from .strategies.gold_volatility_engine import GoldVolatilityEngine
from .strategies.gold_strategies import GoldStrategies
from .data.gold_data import GoldDataHandler

# 导入配置
# 简化配置导入，跳过缺失的模块
try:
    from .execution.gold_execution import GoldExecution
    GOLD_EXECUTION_AVAILABLE = True
except ImportError:
    GOLD_EXECUTION_AVAILABLE = False

try:
    from ..compliance.risk import RiskMonitor
    RISK_MONITOR_AVAILABLE = True
except ImportError:
    RISK_MONITOR_AVAILABLE = False

try:
    from ..compliance.audit import DataAuditor
    DATA_AUDITOR_AVAILABLE = True
except ImportError:
    DATA_AUDITOR_AVAILABLE = False

try:
    from ..quant.python.indicators import TechnicalIndicators
    TECHNICAL_INDICATORS_AVAILABLE = True
except ImportError:
    TECHNICAL_INDICATORS_AVAILABLE = False

try:
    from ..quant.python.strategies import QuantStrategies
    QUANT_STRATEGIES_AVAILABLE = True
except ImportError:
    QUANT_STRATEGIES_AVAILABLE = False

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GoldQuantEngine:
    """
    黄金专用量化策略引擎主控制器

    功能：
    1. 集成黄金波动率引擎
    2. 管理多时间框架策略
    3. 处理黄金特有风险控制
    4. 协调策略执行和风险管理
    """

    def __init__(self, config_path: str = None):
        """
        初始化黄金量化引擎

        参数:
            config_path: 配置文件路径
        """
        logger.info("正在初始化黄金专用量化策略引擎...")

        # 加载配置
        try:
            from config.config_manager import ConfigManager
            self.config_manager = ConfigManager(config_path)
            self.config = self.config_manager.load_config()
        except ImportError:
            # 如果config_manager不可用，使用默认配置
            print("警告: ConfigManager不可用，使用默认配置")
            self.config_manager = None
            self.config = {
                'app': {'name': 'Tick Gold - 黄金量化引擎'},
                'performance': {'max_tick_rate': 21340, 'target_latency_ms': 50},
                'risk': {
                    'gap_risk': 0.01,
                    'overnight_risk': 0.005,
                    'max_drawdown': 0.02,
                    'max_daily_loss': 0.005,
                    'position_size': 0.01
                }
            }
            print(f"使用默认配置: {self.config}")

        # 初始化核心模块
        self.volatility_engine = GoldVolatilityEngine(config_path)
        self.data_handler = GoldDataHandler()

        if RISK_MONITOR_AVAILABLE:
            self.risk_monitor = RiskMonitor()
        else:
            self.risk_monitor = None

        if DATA_AUDITOR_AVAILABLE:
            self.auditor = DataAuditor('GoldQuantEngine')
        else:
            self.auditor = None
        try:
            self.strategies = GoldStrategies(self.data_handler, self.risk_monitor)
        except:
            self.strategies = None
            logger.warning("GoldStrategies初始化失败，使用模拟策略")

        # 执行引擎可选
        if GOLD_EXECUTION_AVAILABLE:
            self.execution_engine = GoldExecution()
        else:
            self.execution_engine = None
            print("警告: GoldExecution不可用，禁用执行功能")

        # 量化模块可选
        if TECHNICAL_INDICATORS_AVAILABLE:
            self.tech_indicators = TechnicalIndicators()
        else:
            self.tech_indicators = None
            print("警告: TechnicalIndicators不可用")

        if QUANT_STRATEGIES_AVAILABLE:
            self.quant_strategies = QuantStrategies()
        else:
            self.quant_strategies = None
            print("警告: QuantStrategies不可用")

        # 性能监控
        self.performance = {
            'throughput_tps': 0,
            'latency_ms': 0,
            'signal_accuracy': 0,
            'data_quality': 0,
            'risk_exposures': {}
        }

        # 交易状态
        self.trading_state = {
            'active': False,
            'position': None,
            'pnl': 0,
            'current_strategy': None,
            'current_timeframe': 'M1'
        }

        # 多时间框架数据缓存
        self.timeframe_data = {
            'M1': pd.DataFrame(),
            'M5': pd.DataFrame(),
            'M15': pd.DataFrame(),
            'M30': pd.DataFrame()
        }

        # 初始化缓存
        self._initialize_cache()

        logger.info("黄金专用量化策略引擎初始化完成")

    async def start_engine(self) -> None:
        """
        启动量化引擎
        """
        logger.info("启动量化引擎...")

        # 1. 启动数据流
        data_task = asyncio.create_task(self._start_data_stream())

        # 2. 启动策略引擎
        strategy_task = asyncio.create_task(self._start_strategy_engine())

        # 3. 启动风险监控
        risk_task = asyncio.create_task(self._start_risk_monitoring())

        # 4. 启动性能监控
        perf_task = asyncio.create_task(self._start_performance_monitoring())

        # 等待任务完成
        await asyncio.gather(data_task, strategy_task, risk_task, perf_task)

        logger.info("量化引擎启动完成")

    async def process_tick(self, tick_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理一个tick数据

        参数:
            tick_data: tick数据

        返回:
            processing_result: 处理结果
        """
        start_time = datetime.now()

        # 性能统计开始
        self.volatility_engine.update_performance_stats(
            ticks_processed=1,
            processing_time_ms=0,
            signal_generated=False,
            trade_executed=False
        )

        try:
            # 1. 数据清洗和验证
            cleaned_data = self._clean_validate_tick(tick_data)

            # 2. 更新多时间框架缓存
            self._update_timeframe_cache(cleaned_data)

            # 3. 检查跳空风险
            if len(self.timeframe_data['M1']) >= 2:
                prev_close = self.timeframe_data['M1'].iloc[-2]['close'] if len(self.timeframe_data['M1']) >= 2 else cleaned_data['bid']
                current_price = cleaned_data['bid']
                gap_exceeded, gap_percent, gap_info = self.volatility_engine.detect_gap_risk(
                    current_price, prev_close
                )

                if gap_exceeded:
                    logger.warning(f"跳空风险超限: {gap_percent:.2%} > 1%")
                    self.trading_state['active'] = False  # 暂停交易

            # 4. 更新黄金波动率
            if not self.timeframe_data['M1'].empty:
                latest_prices = self.timeframe_data['M1']['close']
                gold_vol = self.volatility_engine.calculate_gold_volatility_indicator(latest_prices)

                # 更新性能指标
                if len(latest_prices) > 20:
                    recent_vol = gold_vol.iloc[-1] if not gold_vol.empty else 0
                    self.performance['current_volatility'] = float(recent_vol)

            # 5. 检查亚盘时段
            timestamp = cleaned_data.get('timestamp', datetime.utcnow())
            is_asian = self.volatility_engine.is_asian_trading_hour(
                pd.Timestamp(timestamp)
            )

            # 调整策略参数（亚盘时段）
            strategy_params = self._get_strategy_parameters()
            if is_asian:
                adjusted_params = self.volatility_engine.adjust_strategy_for_asian_session(
                    strategy_params, pd.Timestamp(timestamp)
                )
                self._update_strategy_parameters(adjusted_params)

            # 6. 生成信号
            signals = await self._generate_signals()

            # 7. 风险管理检查
            risk_approved = self._check_risk_constraints(signals)

            # 8. 执行决策
            execution_result = None
            if risk_approved and self.trading_state['active'] and signals.get('combined_signal', {}).get('signal', 0) != 0:
                execution_result = await self._make_trading_decision(signals, cleaned_data)

            # 计算处理延迟
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self.performance['latency_ms'] = processing_time

            # 性能统计更新
            self.volatility_engine.update_performance_stats(
                ticks_processed=1,
                processing_time_ms=processing_time,
                signal_generated=(signals.get('combined_signal', {}).get('signal', 0) != 0),
                trade_executed=execution_result is not None
            )

            # 返回处理结果
            result = {
                'status': 'success',
                'processing_time_ms': processing_time,
                'signals': signals,
                'gap_risk': {
                    'exceeded': gap_exceeded if 'gap_exceeded' in locals() else False,
                    'percent': gap_percent if 'gap_percent' in locals() else 0
                },
                'asian_session': is_asian,
                'execution_result': execution_result,
                'performance_stats': self.volatility_engine.evaluate_performance(),
                'timestamp': datetime.utcnow().isoformat()
            }

            return result

        except Exception as e:
            logger.error(f"处理tick数据时出错: {e}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e),
                'processing_time_ms': (datetime.now() - start_time).total_seconds() * 1000,
                'timestamp': datetime.utcnow().isoformat()
            }

    def get_engine_status(self) -> Dict[str, Any]:
        """
        获取引擎状态

        返回:
            status: 引擎状态信息
        """
        perf_metrics = self.volatility_engine.evaluate_performance()

        return {
            'engine_active': self.trading_state['active'],
            'performance_metrics': perf_metrics,
            'trading_state': self.trading_state,
            'current_strategy': self.trading_state.get('current_strategy'),
            'current_timeframe': self.trading_state.get('current_timeframe'),
            'risk_parameters': self.volatility_engine.risk_params,
            'gold_parameters': self.volatility_engine.gold_params,
            'performance_targets': {
                'throughput_tps_target': self.volatility_engine.perf_params['target_throughput'],
                'latency_ms_target': self.volatility_engine.perf_params['target_latency_ms'],
                'data_quality_target': self.volatility_engine.perf_params['data_quality_min']
            },
            'data_stats': self._get_data_statistics(),
            'connection_status': {
                'data_stream_active': True,  # 这应该来自数据处理器
                'risk_monitor_active': True,
                'execution_engine_active': True
            },
            'timestamp': datetime.utcnow().isoformat()
        }

    def set_strategy(self, strategy_name: str, timeframe: str = 'M1',
                     parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        设置当前交易策略

        参数:
            strategy_name: 策略名称
            timeframe: 时间框架
            parameters: 策略参数

        返回:
            result: 设置结果
        """
        valid_timeframes = ['M1', 'M5', 'M15', 'M30']
        if timeframe not in valid_timeframes:
            return {
                'status': 'error',
                'error': f'无效的时间框架: {timeframe}. 有效值: {valid_timeframes}'
            }

        valid_strategies = ['scalping', 'trend_following', 'gold_specific']
        if strategy_name not in valid_strategies:
            return {
                'status': 'error',
                'error': f'无效的策略: {strategy_name}. 有效值: {valid_strategies}'
            }

        self.trading_state['current_strategy'] = strategy_name
        self.trading_state['current_timeframe'] = timeframe

        if parameters:
            self._update_strategy_parameters(parameters)

        logger.info(f"策略已设置为: {strategy_name} (时间框架: {timeframe})")

        return {
            'status': 'success',
            'strategy': strategy_name,
            'timeframe': timeframe,
            'parameters': parameters or {},
            'timestamp': datetime.utcnow().isoformat()
        }

    def get_strategy_performance(self, strategy_name: str = None,
                               timeframe: str = None) -> Dict[str, Any]:
        """
        获取策略性能报告

        参数:
            strategy_name: 策略名称 (None表示当前策略)
            timeframe: 时间框架 (None表示当前时间框架)

        返回:
            performance: 性能报告
        """
        if strategy_name is None:
            strategy_name = self.trading_state['current_strategy']
        if timeframe is None:
            timeframe = self.trading_state['current_timeframe']

        # 这里应该从数据库或缓存获取实际性能数据
        # 目前返回模拟数据
        return {
            'strategy': strategy_name,
            'timeframe': timeframe,
            'performance': {
                'total_return_percent': 12.5,
                'sharpe_ratio': 1.8,
                'max_drawdown_percent': 2.1,
                'win_rate_percent': 65.2,
                'profit_factor': 2.1,
                'total_trades': 150,
                'avg_trade_duration_minutes': 45,
            },
            'recent_signals': [
                {'signal': 1, 'time': '2026-04-08T10:30:00', 'result': 'win'},
                {'signal': -1, 'time': '2026-04-08T11:15:00', 'result': 'loss'},
                {'signal': 1, 'time': '2026-04-08T13:45:00', 'result': 'win'},
            ],
            'risk_metrics': {
                'current_volatility': self.performance.get('current_volatility', 0),
                'gap_risk_exposure': 0.002,
                'overnight_risk_exposure': 0.001,
                'concentration_risk': 0.05,
            },
            'timestamp': datetime.utcnow().isoformat()
        }

    # 私有方法
    def _initialize_cache(self) -> None:
        """初始化缓存"""
        logger.info("初始化数据缓存...")
        for timeframe in self.timeframe_data.keys():
            self.timeframe_data[timeframe] = pd.DataFrame()

    def _clean_validate_tick(self, tick_data: Dict[str, Any]) -> Dict[str, Any]:
        """清理和验证tick数据"""
        required_fields = ['timestamp', 'bid', 'ask']
        for field in required_fields:
            if field not in tick_data:
                raise ValueError(f"缺少必要字段: {field}")

        cleaned = tick_data.copy()

        # 转换时间戳
        if isinstance(cleaned['timestamp'], str):
            try:
                cleaned['timestamp'] = datetime.fromisoformat(cleaned['timestamp'].replace('Z', '+00:00'))
            except:
                cleaned['timestamp'] = datetime.utcnow()

        # 验证价格
        if cleaned['bid'] <= 0 or cleaned['ask'] <= 0:
            raise ValueError(f"无效价格: bid={cleaned['bid']}, ask={cleaned['ask']}")

        # 确保bid <= ask
        if cleaned['bid'] > cleaned['ask']:
            cleaned['bid'], cleaned['ask'] = cleaned['ask'], cleaned['bid']

        # 添加mid价格
        cleaned['mid'] = (cleaned['bid'] + cleaned['ask']) / 2

        return cleaned

    def _update_timeframe_cache(self, tick_data: Dict[str, Any]) -> None:
        """更新时间框架缓存"""
        timestamp = tick_data['timestamp']
        mid_price = tick_data['mid']

        # 以mid价格作为close价格更新各时间框架
        for timeframe, df in self.timeframe_data.items():
            if timeframe == 'M1':
                # M1: 每分钟一个数据点
                self._append_to_timeframe('M1', timestamp, mid_price)
            elif timeframe == 'M5':
                # M5: 每5分钟一个数据点
                if timestamp.minute % 5 == 0:
                    self._append_to_timeframe('M5', timestamp, mid_price)
            elif timeframe == 'M15':
                # M15: 每15分钟一个数据点
                if timestamp.minute % 15 == 0:
                    self._append_to_timeframe('M15', timestamp, mid_price)
            elif timeframe == 'M30':
                # M30: 每30分钟一个数据点
                if timestamp.minute % 30 == 0:
                    self._append_to_timeframe('M30', timestamp, mid_price)

    def _append_to_timeframe(self, timeframe: str, timestamp: datetime, price: float) -> None:
        """添加数据到时间框架"""
        if self.timeframe_data[timeframe].empty:
            self.timeframe_data[timeframe] = pd.DataFrame({
                'timestamp': [timestamp],
                'open': [price],
                'high': [price],
                'low': [price],
                'close': [price],
                'volume': [1]  # 模拟成交量
            })
        else:
            # 更新最新K线
            df = self.timeframe_data[timeframe]
            last_idx = df.index[-1]

            # 检查是否是新K线
            if timeframe == 'M1':
                new_candle = (timestamp.minute != df.iloc[-1]['timestamp'].minute)
            elif timeframe == 'M5':
                new_candle = (timestamp.minute // 5 != df.iloc[-1]['timestamp'].minute // 5)
            elif timeframe == 'M15':
                new_candle = (timestamp.minute // 15 != df.iloc[-1]['timestamp'].minute // 15)
            elif timeframe == 'M30':
                new_candle = (timestamp.minute // 30 != df.iloc[-1]['timestamp'].minute // 30)
            else:
                new_candle = False

            if new_candle:
                # 添加新K线
                new_row = pd.DataFrame({
                    'timestamp': [timestamp],
                    'open': [price],
                    'high': [price],
                    'low': [price],
                    'close': [price],
                    'volume': [1]
                })
                self.timeframe_data[timeframe] = pd.concat([df, new_row], ignore_index=True)
            else:
                # 更新当前K线
                df.at[last_idx, 'close'] = price
                df.at[last_idx, 'high'] = max(df.at[last_idx, 'high'], price)
                df.at[last_idx, 'low'] = min(df.at[last_idx, 'low'], price)
                df.at[last_idx, 'volume'] += 1

        # 保持缓存大小
        max_bars = 1000
        if len(self.timeframe_data[timeframe]) > max_bars:
            self.timeframe_data[timeframe] = self.timeframe_data[timeframe].iloc[-max_bars:]

    async def _generate_signals(self) -> Dict[str, Any]:
        """生成交易信号"""
        # 检查是否有足够数据
        if self.timeframe_data['M1'].empty:
            return {}

        # 使用波动率引擎生成信号
        filtered_data = {}
        for timeframe, df in self.timeframe_data.items():
            if not df.empty and len(df) > 10:  # 至少需要10个数据点
                filtered_data[timeframe] = df

        if filtered_data:
            signals = self.volatility_engine.generate_multi_timeframe_signals(filtered_data)
            return signals
        else:
            return {}

    def _check_risk_constraints(self, signals: Dict[str, Any]) -> bool:
        """检查风险约束"""
        if not self.trading_state['active']:
            return False

        # 检查最大回撤
        current_max_drawdown = 0  # 这里应该从风险监控器获取实际值
        if current_max_drawdown > self.volatility_engine.risk_params['max_drawdown']:
            logger.warning(f"最大回撤超限: {current_max_drawdown:.2%} > {self.volatility_engine.risk_params['max_drawdown']:.1%}")
            return False

        # 检查每日损失
        daily_loss = 0  # 这里应该从风险监控器获取实际值
        if daily_loss > self.volatility_engine.risk_params['max_daily_loss']:
            logger.warning(f"每日损失超限: {daily_loss:.2%} > {self.volatility_engine.risk_params['max_daily_loss']:.1%}")
            return False

        # 检查隔夜风险
        if self.trading_state['position'] is not None:
            position_size = 1  # 示例头寸规模
            current_volatility = self.performance.get('current_volatility', 0.01)
            overnight_risk, risk_info = self.volatility_engine.calculate_overnight_risk(
                position_size, current_volatility
            )

            if risk_info.get('risk_ratio', 0) > 1.0:
                logger.warning(f"隔夜风险超限: {risk_info['risk_ratio']:.2f} > 1.0")
                return False

        return True

    async def _make_trading_decision(self, signals: Dict[str, Any],
                                     current_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """做交易决策"""
        combined_signal = signals.get('combined_signal', {})
        signal_val = combined_signal.get('signal', 0)
        confidence = combined_signal.get('confidence', 0)

        if signal_val == 0 or confidence < 0.5:
            return None

        # 计算头寸规模
        account_size = 100000  # 示例账户规模
        current_volatility = self.performance.get('current_volatility', 0.01)

        position_size = self.volatility_engine.calculate_dynamic_position_size(
            account_size, current_volatility, confidence
        )

        # 生成交易决策
        decision = {
            'action': 'BUY' if signal_val > 0 else 'SELL',
            'signal_strength': signal_val,
            'confidence': confidence,
            'position_size': position_size,
            'price': current_data['mid'],
            'timestamp': datetime.utcnow().isoformat(),
            'signals_source': signals.get('timeframe_signals', {}),
            'risk_parameters': {
                'stop_loss_percent': 0.005,  # 0.5%
                'take_profit_percent': 0.01,  # 1%
                'volatility_adjusted': True
            }
        }

        # 更新交易状态
        self.trading_state['position'] = {
            'direction': decision['action'],
            'entry_price': decision['price'],
            'position_size': decision['position_size'],
            'entry_time': decision['timestamp'],
            'stop_loss': decision['price'] * (1 - decision['risk_parameters']['stop_loss_percent'])
        }

        logger.info(f"交易决策: {decision['action']} at {decision['price']:.2f}, "
                   f"头寸规模: {position_size:.2f}, 置信度: {confidence:.2f}")

        return decision

    def _get_strategy_parameters(self) -> Dict[str, Any]:
        """获取当前策略参数"""
        strategy_name = self.trading_state.get('current_strategy', 'gold_specific')

        base_params = {
            'scalping': {
                'position_size': 0.01,
                'stop_loss': 0.002,  # 0.2%
                'take_profit': 0.004,  # 0.4%
                'max_trade_duration_minutes': 10,
            },
            'trend_following': {
                'position_size': 0.01,
                'stop_loss': 0.005,  # 0.5%
                'take_profit': 0.01,  # 1%
                'max_trade_duration_hours': 24,
            },
            'gold_specific': {
                'position_size': 0.01,
                'stop_loss': 0.005,  # 0.5%
                'take_profit': 0.01,  # 1%
                'asian_session_adjustment': 0.7,
                'gap_risk_adjustment': 0.5,
            }
        }

        return base_params.get(strategy_name, base_params['gold_specific'])

    def _update_strategy_parameters(self, new_params: Dict[str, Any]) -> None:
        """更新策略参数"""
        # 这里应该实现参数更新逻辑
        # 目前只是记录日志
        logger.info(f"更新策略参数: {new_params}")

    def _get_data_statistics(self) -> Dict[str, Any]:
        """获取数据统计"""
        stats = {}
        for timeframe, df in self.timeframe_data.items():
            if not df.empty:
                stats[timeframe] = {
                    'bars_count': len(df),
                    'latest_timestamp': df.iloc[-1]['timestamp'].isoformat() if 'timestamp' in df.columns else 'N/A',
                    'price_range': {
                        'min': df['low'].min() if 'low' in df.columns else 0,
                        'max': df['high'].max() if 'high' in df.columns else 0,
                        'current': df['close'].iloc[-1] if 'close' in df.columns else 0,
                    },
                    'avg_volume': df['volume'].mean() if 'volume' in df.columns else 0,
                }
            else:
                stats[timeframe] = {'bars_count': 0, 'latest_timestamp': None}

        return stats

    async def _start_data_stream(self) -> None:
        """启动数据流"""
        logger.info("启动数据流...")
        while True:
            # 这里应该集成真实的数据流
            await asyncio.sleep(1)

    async def _start_strategy_engine(self) -> None:
        """启动策略引擎"""
        logger.info("启动策略引擎...")
        while True:
            await asyncio.sleep(0.1)

    async def _start_risk_monitoring(self) -> None:
        """启动风险监控"""
        logger.info("启动风险监控...")
        while True:
            await asyncio.sleep(5)

    async def _start_performance_monitoring(self) -> None:
        """启动性能监控"""
        logger.info("启动性能监控...")
        while True:
            # 定期更新性能指标
            perf_metrics = self.volatility_engine.evaluate_performance()
            self.performance.update({
                'throughput_tps': perf_metrics.get('current_throughput_tps', 0),
                'latency_ms': perf_metrics.get('avg_latency_ms', 0),
                'performance_score': perf_metrics.get('throughput_ratio', 0)
            })

            # 记录性能日志
            if self.performance['throughput_tps'] > 0:
                logger.debug(f"性能指标: TPS={self.performance['throughput_tps']:.0f}, "
                           f"延迟={self.performance['latency_ms']:.1f}ms")

            await asyncio.sleep(10)