def subtract_numbers(a: float or int, b: float or int) -> float or int:
       """Subtract second number from first."""
       try:
           return a - b
       except TypeError as e:
           raise ValueError("Both arguments must be numbers: {e}")