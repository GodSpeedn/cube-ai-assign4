def add(a: int, b: int) -> int:
      """Add two numbers and return the result."""
      try:
          return a + b
      except TypeError as e:
          raise ValueError(f"Both arguments must be integers: {e}")