import unittest

def add_two_numbers(a, b):
    # Your implementation here

class TestAddTwoNumbers(unittest.TestCase):

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_add_valid_positive_integers(self):
        self.assertEqual(add_two_numbers(3, 5), 8)

    def test_add_valid_negative_integers(self):
        self.assertEqual(add_two_numbers(-2, -4), 6)

    def test_add_zero_with_positive(self):
        self.assertEqual(add_two_numbers(3, 0), 3)

    def test_add_zero_with_negative(self):
        self.assertEqual(add_two_numbers(-3, 0), -3)

    def test_large_numbers_addition(self):
        self.assertEqual(add_two_numbers(123456789, 987654321), 10101210410)

    def test_input_type_error_integer(self):
        with self.assertRaises(ValueError):
            add_two_numbers('3', 5)

    def test_input_type_error_float(self):
        with self.assertRaises(ValueError):
            add_two_numbers(3.14, 5)