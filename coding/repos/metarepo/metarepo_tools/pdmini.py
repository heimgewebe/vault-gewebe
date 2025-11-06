"""Lightweight subset of a pandas-like DataFrame for local tooling tests."""
from __future__ import annotations

from collections.abc import Iterable, Iterator, Mapping, Sequence
from typing import Any, Dict, List, Tuple

__all__ = ["DataFrame"]


class DataFrame:
    """Very small subset of a pandas.DataFrame used in tests."""

    _records: List[Dict[str, Any]]

    def __init__(self, data: Any = None) -> None:
        records: List[Dict[str, Any]]
        if data is None:
            records = []
        elif isinstance(data, DataFrame):
            records = [row.copy() for row in data._records]
        elif isinstance(data, Mapping):
            records = self._from_mapping_of_iterables(data)
        elif isinstance(data, Sequence) and not isinstance(data, (str, bytes, bytearray)):
            records = [self._coerce_row(item) for item in data]
        elif isinstance(data, Iterable):
            records = [self._coerce_row(item) for item in data]
        else:
            raise TypeError("Unsupported data type for DataFrame")
        self._records = records

    @staticmethod
    def _coerce_row(item: Any) -> Dict[str, Any]:
        if isinstance(item, Mapping):
            return dict(item)
        raise TypeError("DataFrame rows must be mappings")

    @staticmethod
    def _from_mapping_of_iterables(data: Mapping[str, Any]) -> List[Dict[str, Any]]:
        keys = list(data.keys())
        lengths: List[int] = []
        for value in data.values():
            if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
                lengths.append(len(value))
            else:
                lengths.append(1)
        max_len = max(lengths, default=0)
        records: List[Dict[str, Any]] = []
        for index in range(max_len):
            row: Dict[str, Any] = {}
            for key in keys:
                value = data[key]
                if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
                    row[key] = value[index] if index < len(value) else None
                else:
                    row[key] = value if index == 0 else None
            records.append(row)
        return records

    def to_dict(self, orient: str = "records") -> Any:
        if orient != "records":
            raise ValueError("Only orient='records' is supported in the lightweight DataFrame")
        return [row.copy() for row in self._records]

    def __iter__(self) -> Iterator[Dict[str, Any]]:
        return iter(self._records)

    def __len__(self) -> int:
        return len(self._records)

    def iterrows(self) -> Iterator[Tuple[int, Dict[str, Any]]]:
        for index, row in enumerate(self._records):
            yield index, row.copy()

    def copy(self) -> "DataFrame":
        return DataFrame(self)
