def get_average(numbers: List[float]) -> float:
      """Calculate the average of a list of numbers."""
      try:
          return sum(numbers) / len(numbers)
      except TypeError as e:
          raise ValueError("The input list must contain only floating point numbers: ", e)

   def is_prime(n: int) -> bool:
      """Check if a number is prime."""
      if n <= 1:
          return False
      for i in range(2, int(n**0.5)+1):
          if n % i == 0:
              return False
      return True