def sum_two_numbers(a: int, b: int) -> int:
      return a + b

      try:
          raise TypeError("Expected integers")
      except TypeError as e:
          raise ValueError(f"Both arguments must be integers: {e}")