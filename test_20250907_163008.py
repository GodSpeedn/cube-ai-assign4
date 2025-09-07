import unittest

class TestAddNumbers(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_add_positive_numbers(self):
        self.assertEqual(add_numbers(2, 3), 5)
        self.assertEqual(add_numbers(-2, -3), -5)
        self.assertEqual(add_numbers(0, 0), 0)
        self.assertEqual(add_numbers(1000, 2000), 3000)

    def test_add_negative_numbers(self):
        self.assertEqual(add_numbers(-5, -6), -11)
        self.assertEqual(add_numbers(-1000, -2000), -3000)

    def test_add_zero(self):
        self.assertEqual(add_numbers(-5, 0), -5)
        self.assertEqual(add_numbers(0, 0), 0)
        self.assertEqual(add_numbers(5, 0), 5)

    def test_invalid_input(self):
        self.assertRaises(TypeError, add_numbers, 'a', 3)
        self.assertRaises(TypeError, add_numbers, 2, 'b')