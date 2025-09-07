import unittest

class TestAddNumbers(unittest.TestCase):
    def setUp(self):
        pass  # No setup needed for this test case

    def tearDown(self):
        pass  # No teardown needed for this test case

    def test_valid_integer_inputs(self):
        self.assertEqual(add_numbers(5, 3), 8)
        self.assertEqual(add_numbers(-2, 4), 2)
        self.assertEqual(add_numbers(1000, -500), 500)

    def test_valid_float_inputs(self):
        self.assertEqual(add_numbers(3.5, 2.7), 6)
        self.assertEqual(add_numbers(-1.8, 4.3), 2.5)
        self.assertEqual(add_numbers(100.5, -66.2), 34.3)

    def test_mixed_input_types(self):
        with self.assertRaisesRegex(ValueError, "Both arguments must be integers or float values that can be casted to integers"):
            add_numbers(5, 3.7)
        with self.assertRaisesRegex(ValueError, "Both arguments must be integers or float values that can be casted to integers"):
            add_numbers(3, "4")

    def test_zero_and_negative_inputs(self):
        self.assertEqual(add_numbers(0, 5), 5)
        self.assertEqual(add_numbers(-2, -3), 5)
        self.assertEqual(add_numbers(-100, 150), 50)

    def test_large_inputs(self):
        self.assertEqual(add_numbers(999999999, 1), 10000000000)
        self.assertEqual(add_numbers(-999999999, -1), -10000000000)

Save this code as `test_add_numbers.py` and run the tests using the command:

sh
python -m unittest test_add_numbers.py