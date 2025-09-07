import unittest

class TestAddFunction(unittest.TestCase):
    def setUp(self):
        pass  # No setup needed in this case

    def tearDown(self):
        pass  # No teardown needed in this case

    def test_add_positive_integers(self):
        self.assertEqual(add(2, 3), 5)

    def test_add_zero(self):
        self.assertEqual(add(4, 0), 4)

    def test_add_negative_numbers(self):
        self.assertEqual(add(-2, -3), -5)

    def test_large_numbers_addition(self):
        large_number = 1000000
        self.assertEqual(add(large_number, large_number), 2*large_number)

    def test_add_float(self):
        with self.assertRaises(ValueError):
            add(2.5, 3)

    def test_add_string(self):
        with self.assertRaises(TypeError):
            add('2', '3')

if __name__ == '__main__':
    unittest.main()