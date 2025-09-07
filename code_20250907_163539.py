def add_numbers(a: float, b: float) -> int:
    try:
        return int(a) + int(b)
    except ValueError as e:
        raise ValueError(f"Both arguments must be integers or float values that can be casted to integers: {e}")