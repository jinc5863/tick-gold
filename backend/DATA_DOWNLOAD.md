# XAUUSD Tick Data Download Guide

## Data Source
- **Website**: https://ticks.ex2archive.com/
- **Repository**: https://github.com/terrylica/exness-data-preprocess
- **Data Type**: Raw Spread Ticks (zero spreads)

## Download Instructions

### 1. Manual Download

The data is available in monthly ZIP files. Navigate to:

```
https://ticks.ex2archive.com/Raw_Spread/{YEAR}/{MONTH}/
```

Example URLs for XAUUSD:
- `https://ticks.ex2archive.com/Raw_Spread/2023/01/Exness_Raw_Spread_2023_01.zip`
- `https://ticks.ex2archive.com/Raw_Spread/2023/02/Exness_Raw_Spread_2023_02.zip`
- ... and so on for 2023, 2024, 2025

**Note**: The website may require JavaScript to display file listings. Try using a browser directly.

### 2. Required Files

For 3 years of data (2023, 2024, 2025), download all 36 monthly ZIP files:
- 2023: 12 files (01-12)
- 2024: 12 files (01-12)
- 2025: 12 files (01-12)

### 3. Extract Files

Extract all ZIP files to the `backend/data/raw/` directory:

```bash
cd backend/data/raw
unzip "*.zip"  # Extract all zip files
```

### 4. Import to Database

Run the import script:

```bash
cd backend
source venv/bin/activate
python -m app.services.data_importer
```

## File Format

Exness CSV format:
```csv
Timestamp,Bid,Ask
2023-01-01 00:00:00.000,2345.67,2345.69
2023-01-01 00:00:00.100,2345.68,2345.70
...
```

- **Timestamp**: ISO 8601 format in UTC
- **Bid**: Bid price
- **Ask**: Ask price

## Data Statistics

- ~138 MB per instrument per year
- ~166 million ticks for XAUUSD raw spread (2022-2025)
- Monthly ZIP files: ~10-15 MB each

## Simulated Data

If you cannot download the real data, use the simulated data:

```bash
# Generate simulated data (quick test)
curl -X POST "http://localhost:8000/api/v1/data/simulate?count=10000"

# Generate year-long realistic data
cd backend
source venv/bin/activate
python -m app.services.generate_year_data 2024
```

## Data Fields

| Field | Description |
|-------|-------------|
| symbol | Trading symbol (XAUUSD) |
| timestamp | UTC timestamp |
| bid | Bid price |
| ask | Ask price |
| spread | Ask - Bid |
| volume | Volume (usually 0 for raw spread) |
| tick_type | normal/gap/spike |
