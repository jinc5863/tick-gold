import pandas as pd
import numpy as np
from datetime import datetime
import json
import hashlib

class DataAuditor:
    """数据审计类"""

    def __init__(self, data_source):
        self.data_source = data_source
        self.audit_log = []

    def audit_tick_data(self, tick_data: pd.DataFrame) -> dict:
        """审计tick数据"""
        audit_results = {
            'timestamp': datetime.now().isoformat(),
            'data_source': self.data_source,
            'total_records': len(tick_data),
            'audit_items': {}
        }

        # 1. 数据完整性检查
        missing_values = tick_data.isnull().sum()
        audit_results['audit_items']['missing_values'] = missing_values.to_dict()

        # 2. 重复数据检查
        duplicates = tick_data.duplicated().sum()
        audit_results['audit_items']['duplicates'] = duplicates

        # 3. 时间戳连续性检查
        time_diffs = tick_data['timestamp'].diff().dt.total_seconds()
        max_gap = time_diffs.max()
        avg_gap = time_diffs.mean()
        audit_results['audit_items']['time_continuity'] = {
            'max_gap_seconds': max_gap,
            'avg_gap_seconds': avg_gap,
            'gaps_count': (time_diffs > 1).sum()  # 超过1秒的间隔
        }

        # 4. 价格合理性检查
        bid_ask_spread = tick_data['ask'] - tick_data['bid']
        abnormal_spreads = (bid_ask_spread > 0.5).sum()  # 超过50微秒的异常点差
        audit_results['audit_items']['price_reasonableness'] = {
            'max_spread': bid_ask_spread.max(),
            'abnormal_spreads_count': abnormal_spreads
        }

        # 5. 生成审计ID
        data_hash = hashlib.md5(tick_data.to_json().encode()).hexdigest()
        audit_results['audit_id'] = data_hash[:8]

        # 记录审计日志
        self.audit_log.append(audit_results)

        return audit_results

    def generate_audit_report(self, audit_id: str) -> str:
        """生成审计报告"""
        audit_record = next((log for log in self.audit_log if log['audit_id'] == audit_id), None)

        if not audit_record:
            return "Audit record not found"

        report = f"""
=== 数据审计报告 ===
审计ID: {audit_record['audit_id']}
审计时间: {audit_record['timestamp']}
数据源: {audit_record['data_source']}
总记录数: {audit_record['total_records']}

=== 审计结果 ===
缺失值统计:
{pd.Series(audit_record['audit_items']['missing_values']).to_string()}

重复记录数: {audit_record['audit_items']['duplicates']}

时间连续性:
- 最大间隔: {audit_record['audit_items']['time_continuity']['max_gap_seconds']:.2f}秒
- 平均间隔: {audit_record['audit_items']['time_continuity']['avg_gap_seconds']:.2f}秒
- 异常间隔数: {audit_record['audit_items']['time_continuity']['gaps_count']}

价格合理性:
- 最大点差: {audit_record['audit_items']['price_reasonableness']['max_spread']:.5f}
- 异常点差数: {audit_record['audit_items']['price_reasonableness']['abnormal_spreads_count']}

=== 审计结论 ===
数据质量评分: {self._calculate_quality_score(audit_record):.2f}/100
审计状态: {'通过' if self._calculate_quality_score(audit_record) > 80 else '不通过'}
        """
        return report

    def _calculate_quality_score(self, audit_record: dict) -> float:
        """计算数据质量评分"""
        score = 100.0

        # 缺失值扣分
        missing_ratio = sum(audit_record['audit_items']['missing_values'].values()) / audit_record['total_records']
        score -= missing_ratio * 20

        # 重复数据扣分
        duplicate_ratio = audit_record['audit_items']['duplicates'] / audit_record['total_records']
        score -= duplicate_ratio * 30

        # 时间连续性扣分
        max_gap = audit_record['audit_items']['time_continuity']['max_gap_seconds']
        if max_gap > 5:  # 超过5秒的间隔
            score -= 20

        # 价格合理性扣分
        abnormal_spreads = audit_record['audit_items']['price_reasonableness']['abnormal_spreads_count']
        if abnormal_spreads > 0:
            score -= min(abnormal_spreads * 2, 30)

        return max(0, score)