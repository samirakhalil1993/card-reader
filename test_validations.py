import unittest
from app import validate_bth_email, validate_user_id

class TestValidations(unittest.TestCase):
    

    def test_validate_bth_email(self):
        # Valid emails
        self.assertTrue(validate_bth_email("test@student.bth.se"))
        self.assertTrue(validate_bth_email("example@student.bth.se"))

        # Invalid emails
        self.assertFalse(validate_bth_email("test@gmail.com"))
        self.assertFalse(validate_bth_email("test@student.bth.com"))
        self.assertFalse(validate_bth_email("test@student.bth"))
        self.assertFalse(validate_bth_email("test@bth.se"))
        self.assertFalse(validate_bth_email("test@student.bth.se.extra"))

    def test_validate_user_id(self):
        # Valid user IDs
        self.assertTrue(validate_user_id("123456789"))  # 9 digits
        self.assertTrue(validate_user_id("1234567890"))  # 10 digits

        # Invalid user IDs
        self.assertFalse(validate_user_id("12345678"))  # Less than 9 digits
        self.assertFalse(validate_user_id("12345678901"))  # More than 10 digits
        self.assertFalse(validate_user_id("12345abcde"))  # Contains letters
        self.assertFalse(validate_user_id(""))  # Empty string
        self.assertFalse(validate_user_id(" "))  # Whitespace

if __name__ == '__main__':
    unittest.main()

# python -m unittest test_validations.py
# This code is a test suite for the validation functions in the app module.
# It uses the unittest framework to create a series of tests that check the functionality of the email and user ID validation functions.
# The test suite includes tests for both valid and invalid inputs, ensuring that the validation functions behave as expected.