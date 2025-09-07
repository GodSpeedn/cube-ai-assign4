def multiply_numbers(a: int, b: int) -> int:
       """Multiplies two numbers and returns their product."""
       try:
           return a * b
       except TypeError as e:
           raise ValueError(f"Both arguments must be integers: {e}")