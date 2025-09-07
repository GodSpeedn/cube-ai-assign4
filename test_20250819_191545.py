import unittest

class TestSubtractNumbers(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_valid_positive_numbers(self):
        self.assertEqual(subtract_numbers(5, 3), 2)

    def test_valid_negative_numbers(self):
        self.assertEqual(subtract_numbers(-5, -3), 2)

    def test_mixed_numbers(self):
        self.assertEqual(subtract_numbers(5, -3), 8)

    def test_zero(self):
        self.assertEqual(subtract_numbers(0, 5), -5)
        self.assertEqual(subtract_numbers(5, 0), 5)

    def test_large_numbers(self):
        self.assertEqual(subtract_numbers(1000000000000000000, 999999999999999999), 1)

    def test_invalid_input_types(self):
        with self.assertRaises(ValueError):
            subtract_numbers('str', 3)

        with self.assertRaises(ValueError):
            subtract_numbers(3, 'str')