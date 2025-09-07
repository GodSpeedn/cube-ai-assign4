def add(a: float, b: float) -> float:
    """Add two numbers and return the result."""
    try:
        return a + b
    except TypeError as e:
        raise ValueError(f"Both arguments must be numeric: {e}")