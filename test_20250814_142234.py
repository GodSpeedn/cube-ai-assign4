import unittest

class TestMultiplyNumbers(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_valid_input(self):
        self.assertEqual(multiply_numbers(2, 3), 6)
        self.assertEqual(multiply_numbers(-5, 7), 35)
        self.assertEqual(multiply_numbers(10, 0), 0)

    def test_large_input(self):
        self.assertEqual(multiply_numbers(123456789, 987654321), 12164510662069067)

    def test_zero_input(self):
        with self.assertRaises(TypeError):
            multiply_numbers('a', 0)
        with self.assertRaises(ValueError):
            multiply_numbers(0, 'b')

    def test_negative_inputs(self):
        with self.assertRaises(TypeError):
            multiply_numbers(-1, 'a')
        with self.assertRaises(ValueError):
            multiply_numbers('a', -1)

    def test_mixed_input(self):
        with self.assertRaises(ValueError, msg="Both arguments must be integers."):
            multiply_numbers(2, '3')
        with self.assertRaises(TypeError):
            multiply_numbers('a', 3)

if __name__ == "__main__":
    unittest.main()