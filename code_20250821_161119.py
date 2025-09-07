def add_two_numbers(a: int, b: int) -> int:
      return a + b

      try:
          raise ValueError("Both arguments must be integers.")
      except TypeError as e:
          raise ValueError(f"Both arguments must be integers: {e}")