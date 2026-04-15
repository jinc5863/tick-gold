"""Data import script for Exness XAUUSD tick data.

Usage:
1. Download files from https://ticks.ex2archive.com/Raw_Spread/{YEAR}/{MONTH}/
2. Extract ZIP files to backend/data/raw/
3. Run: python -m app.services.data_importer

The script will:
- Find all CSV files in backend/data/raw/
- Parse and validate the tick data
- Import into the database
"""
import os
import sys
import glob
import zipfile
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from app.models.tick import Tick
from app.database import SessionLocal


class DataImporter:
    """Imports Exness tick data into the database."""

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            self.data_dir = Path(__file__).parent.parent.parent / "data" / "raw"
        else:
            self.data_dir = Path(data_dir)

        self.session = SessionLocal()
        self.stats = {
            "files_processed": 0,
            "files_failed": 0,
            "ticks_imported": 0,
            "ticks_skipped": 0,
        }

    def process_zip_file(self, zip_path: str) -> dict:
        """Extract and process a ZIP file containing tick data."""
        print(f"Processing: {zip_path}")

        ticks_imported = 0
        ticks_skipped = 0
        errors = []

        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                for filename in zf.namelist():
                    if not filename.endswith('.csv'):
                        continue

                    with zf.open(filename) as csv_file:
                        content = csv_file.read().decode('utf-8')
                        lines = content.strip().split('\n')

                        # Skip header
                        for line in lines[1:]:
                            try:
                                # Exness format: Timestamp,Bid,Ask
                                # Example: 2023-01-01 00:00:00.000,2345.67,2345.69
                                parts = line.strip().split(',')
                                if len(parts) < 3:
                                    ticks_skipped += 1
                                    continue

                                timestamp_str = parts[0].strip()
                                bid = float(parts[1])
                                ask = float(parts[2])

                                # Parse timestamp
                                timestamp = datetime.fromisoformat(timestamp_str.replace(' ', 'T'))

                                # Create tick record
                                tick = Tick(
                                    symbol="XAUUSD",
                                    timestamp=timestamp,
                                    bid=bid,
                                    ask=ask,
                                    spread=round(ask - bid, 2),
                                    volume=0.0,
                                    tick_type="normal",
                                    is_cleaned=0,
                                )
                                self.session.add(tick)
                                ticks_imported += 1

                            except Exception as e:
                                ticks_skipped += 1
                                continue

            self.session.commit()
            print(f"  Imported: {ticks_imported}, Skipped: {ticks_skipped}")

        except Exception as e:
            self.session.rollback()
            print(f"  ERROR: {e}")
            errors.append(str(e))

        return {
            "ticks_imported": ticks_imported,
            "ticks_skipped": ticks_skipped,
            "errors": errors,
        }

    def scan_and_import(self) -> dict:
        """Scan data directory and import all found files."""
        zip_files = list(self.data_dir.glob("*.zip"))

        if not zip_files:
            print(f"No ZIP files found in {self.data_dir}")
            print("Please download files from https://ticks.ex2archive.com/")
            print("Download Raw_Spread ticks for XAUUSD, extract to this directory")
            return self.stats

        print(f"Found {len(zip_files)} ZIP files")
        print("-" * 50)

        for zip_path in sorted(zip_files):
            result = self.process_zip_file(str(zip_path))
            self.stats["files_processed"] += 1
            self.stats["ticks_imported"] += result["ticks_imported"]
            self.stats["ticks_skipped"] += result["ticks_skipped"]
            if result["errors"]:
                self.stats["files_failed"] += 1

        return self.stats

    def close(self):
        """Close database session."""
        self.session.close()

    def get_stats(self) -> dict:
        """Get current import statistics from database."""
        total_ticks = self.session.query(Tick).filter(Tick.symbol == "XAUUSD").count()
        oldest = self.session.query(Tick).filter(Tick.symbol == "XAUUSD").order_by(Tick.timestamp.asc()).first()
        newest = self.session.query(Tick).filter(Tick.symbol == "XAUUSD").order_by(Tick.timestamp.desc()).first()

        return {
            "total_ticks": total_ticks,
            "oldest_tick": oldest.timestamp if oldest else None,
            "newest_tick": newest.timestamp if newest else None,
        }


def main():
    """Main entry point."""
    print("=" * 60)
    print("Exness XAUUSD Tick Data Importer")
    print("=" * 60)

    # Get data directory from command line or use default
    data_dir = sys.argv[1] if len(sys.argv) > 1 else None

    importer = DataImporter(data_dir)

    try:
        # Show current stats
        print("\nCurrent database stats:")
        current = importer.get_stats()
        print(f"  Total ticks: {current['total_ticks']}")
        if current['oldest_tick']:
            print(f"  Date range: {current['oldest_tick']} to {current['newest_tick']}")
        print()

        # Run import
        print("Starting import...")
        print("-" * 50)
        stats = importer.scan_and_import()

        print()
        print("=" * 60)
        print("Import Complete!")
        print("=" * 60)
        print(f"Files processed: {stats['files_processed']}")
        print(f"Files failed: {stats['files_failed']}")
        print(f"Ticks imported: {stats['ticks_imported']}")
        print(f"Ticks skipped: {stats['ticks_skipped']}")

        # Show updated stats
        print()
        print("Updated database stats:")
        current = importer.get_stats()
        print(f"  Total ticks: {current['total_ticks']}")
        if current['oldest_tick']:
            print(f"  Date range: {current['oldest_tick']} to {current['newest_tick']}")

    finally:
        importer.close()


if __name__ == "__main__":
    main()
