import unittest

class TestAddFunction(unittest.TestCase):
    def setUp(self):
        pass  # You can initialize any required data here if needed

    def tearDown(self):
        pass  # You can clean up any created resources here if needed

    def test_valid_numbers(self):
        self.assertEqual(add(1.0, 2.0), 3.0)
        self.assertAlmostEqual(add(-1.5, 2.5), 1.0)
        self.assertAlmostEqual(add(float('inf'), float('inf')), float('inf'))
        self.assertAlmostEqual(add(float('-inf'), float('-inf')), float('-inf'))

    def test_invalid_numbers(self):
        with self.assertRaises(ValueError):
            add('a', 1)  # String + number should raise TypeError -> ValueError
        with self.assertRaises(ValueError):
            add([1, 2], 3)  # List + number should raise TypeError -> ValueError

    def test_zero(self):
        self.assertEqual(add(0.0, 2.0), 2.0)
        self.assertEqual(add(-1.0, 0.0), -1.0)
        self.assertEqual(add(0.0, 0.0), 0.0)

    def test_negative_numbers(self):
        self.assertEqual(add(-1.0, -2.0), -3.0)
        self.assertLessEqual(add(-1.0, -2.0), -3.0)
        self.assertGreaterEqual(add(-1.0, -2.0), -4.0)

if __name__ == '__main__':
    unittest.main()