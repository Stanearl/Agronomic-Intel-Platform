import logging
import threading
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Columns kept as strings/identifiers (not numeric filterable metrics)
_IDENTIFIER_COLUMNS = ["lab_id", "latitude", "longitude", "field_ref"]


class DataManager:
    """
    Loads the pilot soils CSV once into memory on startup and serves
    fast, read-only access and in-memory filtering over the dataset.
    Thread-safe for concurrent read access (the underlying DataFrame
    is never mutated after initial load).
    """

    def __init__(self, csv_path: str) -> None:
        self._csv_path = csv_path
        self._lock = threading.Lock()
        self._df: pd.DataFrame = self._load(csv_path)

    def _load(self, csv_path: str) -> pd.DataFrame:
        df = pd.read_csv(csv_path)
        # Normalize column names: strip whitespace (e.g. "n_pct ")
        df.columns = df.columns.str.strip()

        numeric_columns = [c for c in df.columns if c not in _IDENTIFIER_COLUMNS and c != "lab_id"]
        for col in numeric_columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
        df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

        df = df.dropna(subset=["lab_id"]).reset_index(drop=True)

        # Replace NaN/NaT with None so downstream JSON serialization
        # (FastAPI/Starlette) never emits invalid `NaN` literals which
        # break strict JSON parsers and cause 500s on the client.
        df = df.replace({np.nan: None})

        logger.info("Loaded %d soil sample records from %s", len(df), csv_path)
        return df


    def reload(self) -> None:
        with self._lock:
            self._df = self._load(self._csv_path)

    @property
    def record_count(self) -> int:
        return len(self._df)

    @property
    def metric_columns(self) -> List[str]:
        return [c for c in settings.FILTERABLE_METRICS if c in self._df.columns]

    def get_all(self) -> List[Dict[str, Any]]:
        return self._df.to_dict(orient="records")

    def filter(self, bounds: Dict[str, Dict[str, float]]) -> List[Dict[str, Any]]:
        """
        bounds: mapping of metric -> {"min": float | None, "max": float | None}
        Applies all provided bounds as an AND filter, purely in-memory
        using vectorized pandas boolean masking.
        """
        mask = pd.Series(True, index=self._df.index)

        for metric, limits in bounds.items():
            if metric not in self._df.columns:
                continue
            min_val: Optional[float] = limits.get("min")
            max_val: Optional[float] = limits.get("max")
            column = self._df[metric]

            if min_val is not None:
                mask &= column >= min_val
            if max_val is not None:
                mask &= column <= max_val

        filtered = self._df.loc[mask]
        return filtered.to_dict(orient="records")


_data_manager_instance: Optional[DataManager] = None


def get_data_manager() -> DataManager:
    global _data_manager_instance
    if _data_manager_instance is None:
        _data_manager_instance = DataManager(settings.CSV_PATH)
    return _data_manager_instance
