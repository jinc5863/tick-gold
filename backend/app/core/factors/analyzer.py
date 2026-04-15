"""Factor analysis engine for quantitative factor research."""
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
import pandas as pd
import numpy as np


@dataclass
class ICResult:
    """Information Coefficient result."""
    ic: float
    ic_ir: float
    rank_ic: float
    rank_ic_ir: float
    p_value: float
    n_observations: int


@dataclass
class GroupTestResult:
    """Group test result for monotonicity analysis."""
    group_returns: Dict[int, float]
    long_short_return: float
    long_short_std: float
    t_statistic: float
    is_monotonic: bool


@dataclass
class DecayResult:
    """Factor decay analysis result."""
    lag_returns: Dict[int, float]
    peak_lag: int
    half_life: int
    decay_rate: float


class FactorAnalyzer:
    """因子分析器 - Factor analysis for quantitative research.

    Provides tools for:
    - IC (Information Coefficient) calculation
    - IC IR (Information Ratio) analysis
    - Group return testing for monotonicity
    - Factor decay analysis
    """

    def __init__(self, min_periods: int = 30):
        """Initialize analyzer.

        Args:
            min_periods: Minimum observations required for valid analysis
        """
        self.min_periods = min_periods

    def calculate_ic(self, factor_values: pd.Series, returns: pd.Series) -> float:
        """计算IC (Information Coefficient).

        IC measures the rank correlation between factor values and forward returns.
        Higher absolute IC indicates better predictive power.

        Args:
            factor_values: Factor values at time t
            returns: Forward returns from t to t+1

        Returns:
            IC value (range: -1 to 1)
        """
        # Align by index
        aligned = pd.DataFrame({"factor": factor_values, "returns": returns}).dropna()
        if len(aligned) < self.min_periods:
            return 0.0

        return aligned["factor"].corr(aligned["returns"])

    def calculate_rank_ic(self, factor_values: pd.Series, returns: pd.Series) -> float:
        """计算Rank IC (Rank Information Coefficient).

        Uses rank correlation instead of Pearson correlation.
        More robust to outliers and non-linear relationships.

        Args:
            factor_values: Factor values at time t
            returns: Forward returns from t to t+1

        Returns:
            Rank IC value (range: -1 to 1)
        """
        aligned = pd.DataFrame({"factor": factor_values, "returns": returns}).dropna()
        if len(aligned) < self.min_periods:
            return 0.0

        return aligned["factor"].corr(aligned["returns"], method="spearman")

    def calculate_ic_ir(
        self, ic_series: pd.Series
    ) -> Tuple[float, float, float, float]:
        """计算IC_IR (IC Information Ratio).

        IR = mean(IC) / std(IC)
        Measures the consistency of factor predictive power over time.

        Args:
            ic_series: Time series of IC values

        Returns:
            Tuple of (ic_ir, mean_ic, std_ic, n_periods)
        """
        ic_array = ic_series.dropna()
        if len(ic_array) < 2:
            return 0.0, 0.0, 0.0, len(ic_array)

        mean_ic = ic_array.mean()
        std_ic = ic_array.std()

        if std_ic == 0:
            return 0.0, mean_ic, std_ic, len(ic_array)

        ic_ir = mean_ic / std_ic
        return ic_ir, mean_ic, std_ic, len(ic_array)

    def calculate_rank_ic_ir(
        self, rank_ic_series: pd.Series
    ) -> Tuple[float, float, float, float]:
        """计算Rank IC_IR using rank correlation.

        Args:
            rank_ic_series: Time series of rank IC values

        Returns:
            Tuple of (rank_ic_ir, mean_rank_ic, std_rank_ic, n_periods)
        """
        return self.calculate_ic_ir(rank_ic_series)

    def analyze_ic_series(
        self, factor_values: pd.Series, returns: pd.Series, rolling_window: int = 20
    ) -> Dict:
        """Analyze IC metrics over time with rolling window.

        Args:
            factor_values: Factor values
            returns: Forward returns
            rolling_window: Window size for rolling IC calculation

        Returns:
            Dictionary with IC metrics
        """
        aligned = pd.DataFrame({"factor": factor_values, "returns": returns}).dropna()

        if len(aligned) < rolling_window:
            return {
                "ic_ir": 0.0,
                "mean_ic": 0.0,
                "std_ic": 0.0,
                "cumulative_ic": 0.0,
                "positive_ic_ratio": 0.0,
                "n_observations": len(aligned),
            }

        # Rolling IC calculation
        rolling_ic = (
            aligned["factor"]
            .rolling(window=rolling_window)
            .corr(aligned["returns"])
        )

        ic_ir, mean_ic, std_ic, _ = self.calculate_ic_ir(rolling_ic)

        # Cumulative IC
        cumulative_ic = rolling_ic.sum()

        # Positive IC ratio
        positive_ratio = (rolling_ic > 0).mean()

        return {
            "ic_ir": ic_ir,
            "mean_ic": mean_ic,
            "std_ic": std_ic,
            "cumulative_ic": cumulative_ic,
            "positive_ic_ratio": positive_ratio,
            "n_observations": len(aligned),
            "rolling_ic_series": rolling_ic.to_dict(),
        }

    def group_test(
        self,
        factor_values: pd.Series,
        returns: pd.Series,
        n_groups: int = 5,
    ) -> GroupTestResult:
        """分组回测检验单调性.

        Divides data into n_groups based on factor values and calculates
        equal-weighted returns for each group. Tests for monotonicity.

        Args:
            factor_values: Factor values at time t
            returns: Forward returns from t to t+1
            n_groups: Number of groups (default: 5, i.e., quintiles)

        Returns:
            GroupTestResult with group returns and monotonicity test
        """
        aligned = pd.DataFrame({"factor": factor_values, "returns": returns}).dropna()

        if len(aligned) < n_groups * 2:
            return GroupTestResult(
                group_returns={},
                long_short_return=0.0,
                long_short_std=0.0,
                t_statistic=0.0,
                is_monotonic=False,
            )

        # Assign group labels (1 to n_groups)
        aligned["group"] = pd.qcut(aligned["factor"], q=n_groups, labels=False) + 1

        # Calculate equal-weighted returns per group
        group_returns = aligned.groupby("group")["returns"].mean().to_dict()

        # Convert group keys to int
        group_returns = {int(k): v for k, v in group_returns.items()}

        # Long-short return (top group - bottom group)
        long_short_return = group_returns.get(n_groups, 0) - group_returns.get(1, 0)

        # T-test for long-short return
        long_group = aligned[aligned["group"] == n_groups]["returns"]
        short_group = aligned[aligned["group"] == 1]["returns"]

        if len(long_group) > 1 and len(short_group) > 1:
            # Welch's t-test
            pooled_std = np.sqrt(
                long_group.var() / len(long_group) + short_group.var() / len(short_group)
            )
            if pooled_std > 0:
                t_statistic = long_short_return / pooled_std
            else:
                t_statistic = 0.0
        else:
            t_statistic = 0.0

        long_short_std = returns.std()

        # Check monotonicity (returns should increase with group number)
        is_monotonic = all(
            group_returns[i] <= group_returns[i + 1]
            for i in range(1, n_groups)
        ) or all(
            group_returns[i] >= group_returns[i + 1]
            for i in range(1, n_groups)
        )

        return GroupTestResult(
            group_returns=group_returns,
            long_short_return=long_short_return,
            long_short_std=long_short_std,
            t_statistic=t_statistic,
            is_monotonic=is_monotonic,
        )

    def decay_analysis(
        self,
        factor_values: pd.Series,
        returns: pd.Series,
        max_lag: int = 20,
    ) -> DecayResult:
        """因子衰减分析.

        Analyzes how factor predictive power decays over different holding periods.

        Args:
            factor_values: Factor values at time t
            returns: Forward returns for multiple horizons
            max_lag: Maximum lag periods to analyze

        Returns:
            DecayResult with lag-return relationships
        """
        aligned = pd.DataFrame({"factor": factor_values, "returns": returns}).dropna()

        if len(aligned) < max_lag + self.min_periods:
            return DecayResult(
                lag_returns={},
                peak_lag=0,
                half_life=0,
                decay_rate=0.0,
            )

        lag_returns: Dict[int, float] = {}

        # Calculate correlation at each lag
        for lag in range(1, max_lag + 1):
            # Lag the factor (factor at t predicts return from t to t+lag)
            ic = aligned["factor"].corr(aligned["returns"].shift(-lag))
            if not pd.isna(ic):
                lag_returns[lag] = ic

        if not lag_returns:
            return DecayResult(
                lag_returns={},
                peak_lag=0,
                half_life=0,
                decay_rate=0.0,
            )

        # Find peak lag
        peak_lag = max(lag_returns.keys(), key=lambda x: abs(lag_returns[x]))

        # Calculate half-life (lag where IC drops to 50% of peak)
        peak_ic = abs(lag_returns[peak_lag])
        half_ic = peak_ic * 0.5

        half_life = max_lag
        for lag in sorted(lag_returns.keys()):
            if abs(lag_returns[lag]) <= half_ic:
                half_life = lag
                break

        # Calculate decay rate
        if peak_lag > 1 and len(lag_returns) > 1:
            early_lags = [lag_returns[l] for l in range(1, peak_lag + 1) if l in lag_returns]
            late_lags = [lag_returns[l] for l in range(peak_lag, max_lag + 1) if l in lag_returns]

            if early_lags and late_lags and sum(early_lags) != 0:
                decay_rate = sum(late_lags) / sum(early_lags)
            else:
                decay_rate = 0.0
        else:
            decay_rate = 0.0

        return DecayResult(
            lag_returns=lag_returns,
            peak_lag=peak_lag,
            half_life=half_life,
            decay_rate=decay_rate,
        )

    def calculate_turnover(
        self, factor_values: pd.Series, n_groups: int = 5
    ) -> float:
        """计算因子换手率.

        Measures the percentage of positions that change between periods.

        Args:
            factor_values: Factor values time series
            n_groups: Number of groups for portfolio construction

        Returns:
            Average turnover rate (0 to 1)
        """
        if len(factor_values) < 2:
            return 0.0

        aligned = factor_values.dropna()
        if len(aligned) < 2:
            return 0.0

        # Assign group labels
        group_labels = pd.qcut(aligned, q=n_groups, labels=False, duplicates="drop")

        # Calculate period-over-period changes
        changes = (group_labels != group_labels.shift(1)).sum()
        total_positions = len(group_labels)

        return changes / total_positions

    def calculate_quantile_returns(
        self,
        factor_values: pd.Series,
        returns: pd.Series,
        n_groups: int = 5,
    ) -> Dict:
        """Calculate comprehensive quantile return statistics.

        Args:
            factor_values: Factor values
            returns: Forward returns
            n_groups: Number of quantiles

        Returns:
            Dictionary with quantile statistics
        """
        aligned = pd.DataFrame({"factor": factor_values, "returns": returns}).dropna()

        if len(aligned) < n_groups * 2:
            return {}

        aligned["quantile"] = pd.qcut(
            aligned["factor"], q=n_groups, labels=False, duplicates="drop"
        )

        stats = {}
        for q in range(n_groups):
            q_returns = aligned[aligned["quantile"] == q]["returns"]
            stats[q] = {
                "mean": q_returns.mean(),
                "std": q_returns.std(),
                "median": q_returns.median(),
                "skew": q_returns.skew(),
                "kurtosis": q_returns.kurtosis(),
                "min": q_returns.min(),
                "max": q_returns.max(),
                "count": len(q_returns),
            }

        # Long-short spread
        if 0 in stats and n_groups - 1 in stats:
            stats["long_short"] = stats[n_groups - 1]["mean"] - stats[0]["mean"]
            stats["long_short_t"] = (
                stats["long_short"]
                / np.sqrt(
                    stats[n_groups - 1]["std"] ** 2 / stats[n_groups - 1]["count"]
                    + stats[0]["std"] ** 2 / stats[0]["count"]
                )
                if stats[0]["count"] > 0 and stats[n_groups - 1]["count"] > 0
                else 0
            )

        return stats

    def run_full_analysis(
        self,
        factor_values: pd.Series,
        returns: pd.Series,
        factor_name: str = "factor",
        n_groups: int = 5,
    ) -> Dict:
        """Run complete factor analysis.

        Args:
            factor_values: Factor values
            returns: Forward returns
            factor_name: Name for reporting
            n_groups: Number of groups for quintile test

        Returns:
            Complete analysis results
        """
        results = {
            "factor_name": factor_name,
            "n_observations": len(factor_values),
        }

        # IC Analysis
        ic = self.calculate_ic(factor_values, returns)
        rank_ic = self.calculate_rank_ic(factor_values, returns)
        results["ic"] = ic
        results["rank_ic"] = rank_ic

        # IC IR Analysis
        ic_analysis = self.analyze_ic_series(factor_values, returns)
        results["ic_ir"] = ic_analysis["ic_ir"]
        results["mean_ic"] = ic_analysis["mean_ic"]
        results["positive_ic_ratio"] = ic_analysis["positive_ic_ratio"]

        # Group Test
        group_result = self.group_test(factor_values, returns, n_groups)
        results["group_returns"] = group_result.group_returns
        results["long_short_return"] = group_result.long_short_return
        results["is_monotonic"] = group_result.is_monotonic

        # Quantile Statistics
        results["quantile_stats"] = self.calculate_quantile_returns(
            factor_values, returns, n_groups
        )

        # Turnover
        results["turnover"] = self.calculate_turnover(factor_values, n_groups)

        return results
