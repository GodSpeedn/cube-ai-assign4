import unittest

def get_average(numbers):
    """Calculate the average of a list of numbers."""

def is_prime(n):
    """Check if a number is prime."""

class TestGetAverage(unittest.TestCase):
    def test_empty_list(self):
        with self.assertRaises(ValueError):
            get_average([])

    def test_single_number(self):
        self.assertEqual(get_average([1.0]), 1.0)

    def test_positive_numbers(self):
        self.assertEqual(get_average([1.0, 2.0, 3.0]), 2.0)

    def test_negative_numbers(self):
        self.assertEqual(get_average([-1.0, -2.0, -3.0]), 1.5)

    def test_mixed_numbers(self):
        self.assertEqual(get_average([1.0, -2.0, 3.0]), 1.0)

    def test_large_numbers(self):
        self.assertEqual(get_average([1e6, 2e6, 3e6]), 2e6)

class TestIsPrime(unittest.TestCase):
    def test_zero(self):
        self.assertFalse(is_prime(0))

    def test_negative_number(self):
        self.assertFalse(is_prime(-1))

    def test_small_primes(self):
        for i in range(2, 6):
            self.assertTrue(is_prime(i))

    def test_large_numbers(self):
        self.assertTrue(is_prime(97))
        self.assertTrue(is_prime(103))
        self.assertFalse(is_prime(198))  # Not prime

if __name__ == "__main__":
    unittest.main()