import unittest
from app import app, db
from models import User

class FlaskAppTestCase(unittest.TestCase):
    def setUp(self):
        # Set up the Flask application for testing
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'  # Use in-memory database for testing
        self.app = app.test_client()
        with app.app_context():
            db.create_all()

    def tearDown(self):
        # Clean up after each test
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_index(self):
        # Test the index route
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_add_user(self):
        # Test adding a user
        response = self.app.post('/add_user', json={
            'user_id': '123456789',
            'email': 'test@student.bth.se',
            'name': 'Test User'
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn(b'User added successfully!', response.data)

    def test_search_user_logins(self):
        # Test searching for user logins
        response = self.app.get('/UserLogins?search=test')
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    unittest.main()

# python -m unittest test_app.py
# This code is a test suite for a Flask application.
# It uses the unittest framework to create a series of tests that check the functionality of the application.
# The test suite includes tests for the index route, adding a user, and searching for user logins.