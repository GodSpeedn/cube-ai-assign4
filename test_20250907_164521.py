import unittest

class TestSubtractNumbers(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_subtract_numbers_valid_inputs(self):
        self.assertEqual(subtract_numbers(5, 3), 2)
        self.assertEqual(subtract_numbers(-7, 4), -11)
        self.assertEqual(subtract_numbers(0, 0), 0)
        self.assertEqual(subtract_numbers(999999999, 999999998), 1)

    def test_subtract_numbers_invalid_inputs(self):
        self.assertRaises(ValueError, subtract_numbers, 5, "not an integer")
        self.assertRaises(ValueError, subtract_numbers, "not an integer", 3)
        self.assertRaises(TypeError, subtract_numbers, 5.0, 3)
        self.assertRaises(TypeError, subtract_numbers, 5, 3.0)

    def test_subtract_numbers_edge_cases(self):
        self.assertEqual(subtract_numbers(-999999999, 1), -999999998)
        self.assertEqual(subtract_numbers(-999999999, 0), -999999999)
        self.assertRaises(TypeError, subtract_numbers, float('inf'), 1)
        self.assertRaises(TypeError, subtract_numbers, 1, float('inf'))