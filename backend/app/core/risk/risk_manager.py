"""Risk management engine with three-layer risk control.

Layers:
1. Pre-trade risk checks (before order execution)
2. In-trade monitoring (during position holding)
3. Post-trade reporting (after position closed)
"""
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple
from datetime import datetime, time
import numpy as np


@dataclass
class RiskParams:
    """Risk parameters configuration.

    All risk thresholds are defined here for centralized management.
    """

    # Drawdown limits
    max_drawdown: float = 0.02  # 2% maximum drawdown

    # Session risk
    overnight_risk: float = 0.005  # 0.5% overnight position limit
    gap_risk: float = 0.01  # 1% gap stop distance

    # Trade management
    stop_loss: float = 0.005  # 0.5% stop loss
    take_profit: float = 0.01  # 1% take profit
    position_size: float = 0.01  # 1% of account per trade

    # Volatility adjustments
    volatility_window: int = 20  # Window for volatility calculation
    max_volatility_multiplier: float = 2.0  # Max volatility-based position adjustment

    # Session-specific settings
    asian_session_max: float = 0.003  # 0.3% max position in Asian session
    london_session_max: float = 0.01  # 1% max position in London
    newyork_session_max: float = 0.01  # 1% max position in New York

    # Time-based risk
    news_time_buffer_minutes: int = 30  # Minutes to avoid trading around news


@dataclass
class RiskMetrics:
    """Real-time risk metrics for a position."""

    unrealized_pnl: float = 0.0
    unrealized_pnl_pct: float = 0.0
    drawdown: float = 0.0
    session: str = "unknown"
    time_of_day: str = "unknown"
    volatility_multiplier: float = 1.0


@dataclass
class RiskCheckResult:
    """Result of risk check."""

    allowed: bool
    risk_score: float
    warnings: List[str] = field(default_factory=list)
    adjusted_position_size: Optional[float] = None
    rejection_reason: Optional[str] = None


@dataclass
class TradeRecord:
    """Record of completed trade for reporting."""

    symbol: str
    direction: str
    entry_price: float
    exit_price: float
    position_size: float
    entry_time: datetime
    exit_time: datetime
    pnl: float
    pnl_pct: float
    stop_loss: float
    take_profit: float
    session: str
    risk_metrics: Dict


class RiskManager:
    """三层风控管理器.

    Implements three-layer risk control:
    1. Pre-trade check: Validates orders before execution
    2. In-trade monitor: Monitors positions during trading
    3. Post-trade report: Analyzes completed trades
    """

    def __init__(self, params: Optional[RiskParams] = None):
        """Initialize risk manager.

        Args:
            params: Risk parameters. Uses defaults if not provided.
        """
        self.params = params or RiskParams()
        self.positions: List[Dict] = []
        self.closed_trades: List[TradeRecord] = []
        self.equity_curve: List[float] = []
        self.peak_equity: float = 0.0
        self.current_drawdown: float = 0.0

        # Session definitions (UTC)
        self._session_times = {
            "asian": (time(0, 0), time(8, 0)),
            "london": (time(8, 0), time(16, 0)),
            "newyork": (time(13, 0), time(21, 0)),
        }

    def _get_session(self, timestamp: datetime) -> str:
        """Determine trading session from timestamp.

        Args:
            timestamp: Trade timestamp

        Returns:
            Session name
        """
        t = timestamp.time()
        for session, (start, end) in self._session_times.items():
            if start <= t < end:
                return session
        return "offhours"

    def _get_session_risk_limit(self, session: str) -> float:
        """Get position size limit for session.

        Args:
            session: Session name

        Returns:
            Maximum position size for session
        """
        limits = {
            "asian": self.params.asian_session_max,
            "london": self.params.london_session_max,
            "newyork": self.params.newyork_session_max,
        }
        return limits.get(session, self.params.overnight_risk)

    def _calculate_volatility_multiplier(
        self, current_volatility: float, historical_volatility: float
    ) -> float:
        """Calculate volatility-based position size multiplier.

        Args:
            current_volatility: Current market volatility
            historical_volatility: Historical average volatility

        Returns:
            Position size multiplier (0.5 to max_volatility_multiplier)
        """
        if historical_volatility == 0:
            return 1.0

        ratio = current_volatility / historical_volatility
        # In high volatility, reduce position size
        multiplier = 1.0 / ratio if ratio > 1 else 1.0
        return np.clip(multiplier, 0.5, self.params.max_volatility_multiplier)

    def pre_trade_check(
        self,
        order: Dict,
        current_equity: float,
        current_volatility: Optional[float] = None,
        historical_volatility: Optional[float] = None,
    ) -> RiskCheckResult:
        """交易前风控检查.

        Validates order before execution against risk rules.

        Args:
            order: Order details {
                'symbol': str,
                'direction': 'BUY' or 'SELL',
                'price': float,
                'position_size': float,
                'timestamp': datetime
            }
            current_equity: Current account equity
            current_volatility: Current market volatility (optional)
            historical_volatility: Historical average volatility (optional)

        Returns:
            RiskCheckResult with allowed status and details
        """
        warnings: List[str] = []
        risk_score = 0.0

        # 1. Parameter validation
        if order.get("position_size", 0) <= 0:
            return RiskCheckResult(
                allowed=False,
                risk_score=1.0,
                rejection_reason="Invalid position size",
            )

        if order.get("price", 0) <= 0:
            return RiskCheckResult(
                allowed=False,
                risk_score=1.0,
                rejection_reason="Invalid price",
            )

        # 2. Session-based limit check
        session = self._get_session(order.get("timestamp", datetime.now()))
        session_limit = self._get_session_risk_limit(session)
        position_size_pct = order.get("position_size", 0)

        if position_size_pct > session_limit:
            risk_score += 0.3
            warnings.append(
                f"Position size {position_size_pct:.2%} exceeds session limit {session_limit:.2%}"
            )

        # 3. Drawdown check
        if self.current_drawdown > self.params.max_drawdown * 0.5:
            risk_score += 0.4
            warnings.append(
                f"Drawdown {self.current_drawdown:.2%} exceeds 50% of max"
            )

        # 4. Volatility adjustment
        adjusted_position_size = position_size_pct
        if current_volatility and historical_volatility:
            vol_multiplier = self._calculate_volatility_multiplier(
                current_volatility, historical_volatility
            )
            adjusted_position_size = position_size_pct * vol_multiplier

            if vol_multiplier < 0.8:
                risk_score += 0.2
                warnings.append(
                    f"High volatility detected, position reduced by {(1-vol_multiplier):.0%}"
                )

        # 5. Overall position concentration
        total_exposure = sum(p.get("position_size", 0) for p in self.positions)
        if total_exposure + adjusted_position_size > self.params.position_size * 3:
            risk_score += 0.3
            warnings.append("Total exposure exceeds recommended limit")

        # 6. Calculate final risk score
        risk_score = np.clip(risk_score, 0.0, 1.0)

        # Determine if trade is allowed
        allowed = risk_score < 0.8 and self.current_drawdown < self.params.max_drawdown

        return RiskCheckResult(
            allowed=allowed,
            risk_score=risk_score,
            warnings=warnings,
            adjusted_position_size=adjusted_position_size if allowed else None,
            rejection_reason="Risk limits exceeded" if not allowed else None,
        )

    def in_trade_monitor(
        self,
        position: Dict,
        current_price: float,
        current_volatility: Optional[float] = None,
    ) -> Tuple[bool, Optional[str]]:
        """交易中风控监控.

        Monitors open position and checks for stop loss / take profit triggers.

        Args:
            position: Position details {
                'symbol': str,
                'direction': 'BUY' or 'SELL',
                'entry_price': float,
                'position_size': float,
                'stop_loss': float,
                'take_profit': float,
                'entry_time': datetime
            }
            current_price: Current market price
            current_volatility: Current volatility for dynamic stops (optional)

        Returns:
            Tuple of (continue_position, reason_if_stopped)
        """
        direction = position.get("direction", "BUY")
        entry_price = position.get("entry_price", 0)
        stop_loss = position.get("stop_loss", 0)
        take_profit = position.get("take_profit", 0)

        if entry_price == 0:
            return True, None

        # Calculate unrealized PnL
        if direction == "BUY":
            pnl_pct = (current_price - entry_price) / entry_price
            distance_to_stop = entry_price - stop_loss if stop_loss else float("inf")
            distance_to_tp = take_profit - entry_price if take_profit else float("inf")
        else:  # SELL
            pnl_pct = (entry_price - current_price) / entry_price
            distance_to_stop = stop_loss - entry_price if stop_loss else float("inf")
            distance_to_tp = entry_price - take_profit if take_profit else float("inf")

        # 1. Check take profit
        if direction == "BUY" and current_price >= take_profit > 0:
            return False, "take_profit_triggered"
        elif direction == "SELL" and current_price <= take_profit > 0:
            return False, "take_profit_triggered"

        # 2. Check stop loss
        if direction == "BUY" and current_price <= stop_loss > 0:
            return False, "stop_loss_triggered"
        elif direction == "SELL" and current_price >= stop_loss > 0:
            return False, "stop_loss_triggered"

        # 3. Dynamic volatility-based stop adjustment
        if current_volatility and current_volatility > 0:
            # In high volatility, widen stops proportionally
            vol_adjusted_stop = entry_price * (1 - self.params.stop_loss * 1.5)
            if direction == "BUY" and current_price < vol_adjusted_stop:
                return False, "volatility_stop_triggered"

        # 4. Time-based exit (if configured)
        entry_time = position.get("entry_time")
        if entry_time:
            hours_held = (datetime.now() - entry_time).total_seconds() / 3600
            # Max hold time exceeded
            if hours_held > 24:  # Daily max
                return False, "time_limit_exceeded"

        # 5. Drawdown limit check
        if self.current_drawdown >= self.params.max_drawdown:
            return False, "max_drawdown_exceeded"

        return True, None

    def post_trade_report(self, trade: TradeRecord) -> Dict:
        """交易后风控报告.

        Generates performance attribution and risk review for completed trade.

        Args:
            trade: TradeRecord with trade details

        Returns:
            Dictionary with performance attribution and risk metrics
        """
        report = {
            "trade_summary": {
                "symbol": trade.symbol,
                "direction": trade.direction,
                "entry_price": trade.entry_price,
                "exit_price": trade.exit_price,
                "position_size": trade.position_size,
                "pnl": trade.pnl,
                "pnl_pct": trade.pnl_pct,
                "holding_hours": (
                    trade.exit_time - trade.entry_time
                ).total_seconds() / 3600,
            },
            "session_analysis": {
                "session": trade.session,
                "session_risk_applied": trade.position_size,
            },
            "risk_metrics": trade.risk_metrics,
            "attribution": {},
            "recommendations": [],
        }

        # Performance attribution
        if trade.pnl > 0:
            report["attribution"]["outcome"] = "profit"
            directional_return = (
                (trade.exit_price - trade.entry_price) / trade.entry_price
                if trade.direction == "BUY"
                else (trade.entry_price - trade.exit_price) / trade.entry_price
            )
            report["attribution"]["directional_return"] = directional_return
            report["attribution"]["position_size_contribution"] = (
                directional_return * trade.position_size
            )
        else:
            report["attribution"]["outcome"] = "loss"
            # Analyze loss attribution
            if abs(trade.pnl_pct) > trade.stop_loss if trade.stop_loss else False:
                report["recommendations"].append(
                    "Stop loss triggered - consider tightening entry timing"
                )

        # Session-based recommendations
        if trade.session == "asian" and trade.pnl < 0:
            report["recommendations"].append(
                "Consider reducing Asian session exposure due to lower volatility"
            )

        # Risk metric analysis
        risk_metrics = trade.risk_metrics or {}
        if risk_metrics.get("volatility_multiplier", 1.0) < 0.8:
            report["recommendations"].append(
                "High volatility conditions detected - position sizing worked correctly"
            )

        # Update internal state
        self.closed_trades.append(trade)
        self._update_equity_curve(trade.exit_time)

        return report

    def _update_equity_curve(self, timestamp: datetime):
        """Update equity curve and drawdown tracking.

        Args:
            timestamp: Current timestamp
        """
        if not self.closed_trades:
            return

        # Calculate current equity from closed trades
        total_pnl = sum(t.pnl for t in self.closed_trades)
        current_equity = 1.0 + total_pnl  # Assuming starting at 1.0 (100%)

        self.equity_curve.append(current_equity)

        # Update peak equity
        if current_equity > self.peak_equity:
            self.peak_equity = current_equity

        # Calculate current drawdown
        if self.peak_equity > 0:
            self.current_drawdown = (self.peak_equity - current_equity) / self.peak_equity
        else:
            self.current_drawdown = 0.0

    def add_position(self, position: Dict):
        """Add a new position to tracking.

        Args:
            position: Position dictionary
        """
        self.positions.append(position)

    def remove_position(self, position_id: str) -> Optional[Dict]:
        """Remove a position from tracking.

        Args:
            position_id: Identifier for position to remove

        Returns:
            Removed position or None if not found
        """
        for i, pos in enumerate(self.positions):
            if pos.get("id") == position_id:
                return self.positions.pop(i)
        return None

    def get_current_exposure(self) -> float:
        """Get total current position exposure.

        Returns:
            Sum of all position sizes
        """
        return sum(p.get("position_size", 0) for p in self.positions)

    def get_risk_summary(self) -> Dict:
        """Get current risk summary.

        Returns:
            Dictionary with current risk metrics
        """
        return {
            "current_drawdown": self.current_drawdown,
            "peak_equity": self.peak_equity,
            "total_exposure": self.get_current_exposure(),
            "open_positions": len(self.positions),
            "closed_trades": len(self.closed_trades),
            "max_drawdown_limit": self.params.max_drawdown,
            "position_size_limit": self.params.position_size,
        }

    def calculate_position_size(
        self,
        signal_confidence: float,
        account_balance: float,
        stop_loss_pct: float,
        current_volatility: Optional[float] = None,
        historical_volatility: Optional[float] = None,
    ) -> float:
        """Calculate position size based on risk parameters.

        Uses the standard risk formula:
        position_size = (account_balance * risk_per_trade) / stop_loss_distance

        Args:
            signal_confidence: Signal confidence (0 to 1)
            account_balance: Account balance
            stop_loss_pct: Stop loss as percentage (e.g., 0.005 for 0.5%)
            current_volatility: Current market volatility (optional)
            historical_volatility: Historical volatility (optional)

        Returns:
            Position size as fraction of account
        """
        # Base risk per trade
        risk_per_trade = self.params.max_drawdown

        # Adjust based on confidence
        confidence_adjustment = np.clip(signal_confidence, 0.5, 1.0)
        adjusted_risk = risk_per_trade * confidence_adjustment

        # Volatility adjustment
        if current_volatility and historical_volatility:
            vol_multiplier = self._calculate_volatility_multiplier(
                current_volatility, historical_volatility
            )
            adjusted_risk *= vol_multiplier

        # Calculate position size
        if stop_loss_pct > 0:
            position_size = adjusted_risk / stop_loss_pct
        else:
            position_size = adjusted_risk

        # Apply session limit
        position_size = min(position_size, self.params.position_size)

        return max(position_size, 0.0)

    def reset(self):
        """Reset risk manager state.

        Clears all positions, trades, and equity tracking.
        """
        self.positions.clear()
        self.closed_trades.clear()
        self.equity_curve.clear()
        self.peak_equity = 0.0
        self.current_drawdown = 0.0
