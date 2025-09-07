def add_two_numbers(a: int, b: int) -> int:
      try:
          return a + b
      except TypeError as e:
          raise ValueError(f"Both arguments must be integers: {e}")