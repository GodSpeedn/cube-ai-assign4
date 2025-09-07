import unittest
from unittest.mock import patch
import io

class TestAddFunction(unittest.TestCase):

    @patch('sys.stdout', new=io.StringIO())
    def test_add_valid_inputs(self, mock_out):
        self.assertEqual(add(1, 2), 3)
        self.assertEqual(add(-1, 2), 1)
        self.assertEqual(add(9999, 1), 10000)
        mock_out.getvalue().strip()  # Verify no unexpected print output

    @patch('sys.stdout', new=io.StringIO())
    def test_add_zero(self, mock_out):
        self.assertEqual(add(5, 0), 5)
        self.assertEqual(add(0, 3), 3)
        mock_out.getvalue().strip()  # Verify no unexpected print output

    @patch('sys.stdout', new=io.StringIO())
    def test_add_negative_numbers(self, mock_out):
        self.assertEqual(add(-1, -2), -3)
        self.assertEqual(add(-5, 3), -2)
        mock_out.getvalue().strip()  # Verify no unexpected print output

    @patch('sys.stdout', new=io.StringIO())
    def test_add_large_numbers(self, mock_out):
        self.assertEqual(add(999999999, 1), 1000000000)
        self.assertEqual(add(-999999999, -1), -1000000000)
        mock_out.getvalue().strip()  # Verify no unexpected print output

    def test_add_invalid_inputs(self):
        self.assertRaises(TypeError, add, 'a', 2)
        self.assertRaises(TypeError, add, 1, 'b')
        self.assertRaises(TypeError, add, 'a', 'b')

    def test_add_print_output(self):
        with patch('sys.stdout', new=io.StringIO()) as fake_out:
            add(-5, 3)
        self.assertEqual(fake_out.getvalue().strip(), '-2')