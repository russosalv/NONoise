---
# Source: https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/rules/python/coding-style.md | Commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29 | MIT | Adapted for NONoise; see UPSTREAM.md.
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Python specific content.

## Standards

- Follow **PEP 8** conventions
- Use **type annotations** on all function signatures

## Immutability

Prefer immutable data structures:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

## Formatting

- **black** for code formatting
- **isort** for import sorting
- **ruff** for linting
