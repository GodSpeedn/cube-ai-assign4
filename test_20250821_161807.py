import unittest

def sum_two_numbers(a, b):
    # Your implementation here

class TestSumTwoNumbers(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_valid_positive_input(self):
        self.assertEqual(sum_two_numbers(3, 4), 7)

    def test_valid_negative_input(self):
        self.assertEqual(sum_two_numbers(-3, -4), 7)

    def test_zero_as_first_argument(self):
        self.assertEqual(sum_two_numbers(0, 5), 5)

    def test_zero_as_second_argument(self):
        self.assertEqual(sum_two_numbers(6, 0), 6)

    def test_large_positive_input(self):
        self.assertEqual(sum_two_numbers(123456789, 987654321), 1011111112)

    def test_large_negative_input(self):
        self.assertEqual(sum_two_numbers(-987654321, -123456789), -1011111112)

    def test_invalid_input_type_a(self):
        with self.assertRaises(ValueError):
            sum_two_numbers('a', 4)

    def test_invalid_input_type_b(self):
        with self.assertRaises(ValueError):
            sum_two_numbers(3, 'b')

if __name__ == '__main__':
    unittest.main()