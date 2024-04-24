**IMPORTANT**: Including the 'cred.env' file is critical for email notifications to actually work. If this is not included, then this portion of the program will not function as it contains the token for Google authentication for the burner email address.

**IMPORTANT**: Remember, if you want to test email notifications, please first use the 'update-emails' API endpoint to update the email to an email you have access to. Otherwise, the emails will be sent to newdoctor@example.com and newsecretary@example.com respectively!

# Reservation System API

## Overview
This Reservation System API is designed to handle reservation requests, including finding available dates, making, looking up, and cancelling reservations. The API leverages Express.js for server handling, SQLite3 for database interactions, and includes custom utility functions for date handling and validation. It now also supports email notifications and audit logging of cancellations.

## Files and Their Roles
1. **server.js**: itializes the Express application, sets up middleware, connects to the SQLite database, listens for requests on a specified port, and handles OAuth2 authentication for email notifications.
2. **reservationsRoutes.js**: Defines API endpoints for various reservation actions and routes them appropriately. Includes new endpoint for updating notification email addresses.
3. **reservationsHandler.js**: Contains functions that interact directly with the SQLite database to perform actions like checking date availability, creating, and cancelling reservations.
4. **utils.js**: Provides utility functions for date manipulation, holiday checking, format conversion, and email notifications support.
5.  **schedulerSpec.js**: Provides Jasmine Supertest cases to run test cases on the server. This file is located in the "spec" directory within the main project directory.
6. **publisher.js**: Implements a publisher-subscriber pattern to manage notifications for different events.
7. **notification.js**: Manages the sending of email notifications and audit log entries for reservation cancellations.

## Setup Instructions
1. Ensure Node.js and npm are installed on your system.
2. Start the application by running 
	
	node server.js 

The server will start and listen for requests on port 3000.

**IMPORTANT**: To use email notification features, make sure to update your email using the POST /api/update-emails endpoint!

## Dependencies
- express: Web server framework

	npm install express

- body-parser: Middleware for parsing incoming request bodies

	npm install body-parser
- sqlite3: SQLite database to store reservation data

	npm install sqlite3

- date-holidays: Utility for checking public holidays

	npm install date-holidays

- crypto, uuid: Generate unique identifiers for reservations

	npm install uuid

- supertest: Running test cases with jasmine

	npm install supertest

- moment-timzone: Allows for easy timezone Management

	npm install moment-timezone

- nodemailer: This allows more emailing within JavaScript

	npm install nodemailer

-axios: For google OAuth2 related functions

	npm install axios

-dotenv: Loads environment variables from a .env file into process.env

	npm install dotenv






## Usage
Using Postman, you can interact with the server in the following ways:

## API Endpoints
- `GET /api/available-dates`: Find the next available dates for reservation.
- `POST /api/reserve`: Make a new reservation.
- `GET /api/reservations/:email`: Look up reservations by email.
- `POST /api/cancel-reservation`: Cancel an existing reservation.
- `POST /api/update-emails`: Update the email addresses used for notifications.



## Features

- **Flexible Date Handling**: Automatically handles date validations, including checking for weekends and holidays to only allow reservations on valid dates.

- **Reservation Management**: Supports operations to make, look up, and cancel reservations efficiently with simple API calls.

- **Error Handling**: Implements error handling to respond with appropriate error messages for various invalid requests.

- **Email Notifications**: Sends automated notifications for cancellations to designated emails (doctor, secretary).

-**Audit Logging**: Maintains an audit log of reservation cancellations in a separate database.

-**Dynamic Email Configuration**: Allows updating notification email addresses via an API endpoint.

### Finding Available Dates
- Endpoint: `GET /api/available-dates?startDate=YYYY-MM-DD&N=number`

- Parameters: `startDate` (optional, defaults to today's date if not provided or invalid), `N` (required, the number of future available dates to find).



	Example of URL in Postman:
					http://localhost:3000/api/available-dates?startDate=2024-05-13&N=4


- Description: Returns the next N available dates starting from either the provided start date or today.


### Making a Reservation

- Endpoint: `POST /api/reserve`

- Body (uses Content-Type "application/json"): `{"DTSTART": "YYYY-MM-DD", "ATTENDEE": "email@example.com"}`

	Example of Body:
	
			{
  				"DTSTART": "2025-03-07",
  				"ATTENDEE": "thisIsAnExampleEmail@gmail.com"
			}

- Description: Attempts to make a reservation for the given date and email. Returns a confirmation code if successful.

### Looking Up Reservations

- Endpoint: `GET /api/reservations/:email`

- Parameters: `email` (required, email address to look up reservations for).


	Example of URL in Postman:

				http://localhost:3000/api/reservations/tomdurie24@gmail.com



- Description: Returns all reservations associated with the provided email.

### Cancelling a Reservation

- Endpoint: `POST /api/cancel-reservation`

- Body (uses Content-Type "application/json"): `{"confirmationCode": "code"}`

	Example of Body:
			{
    			"confirmationCode": "da23106b"
			}

- Description: Cancels the reservation associated with the given confirmation code.


##Updating Notification Emails

Endpoint: `POST /api/update-emails`

- Body (uses Content-Type "application/json")

	Example of Body:
	{
 		 "doctorEmail": "example@example.com",
  		"secretaryEmail": "example@example.com"
	}

- Description: Updates what doctors and secretary's emails are for notifications.


	
##Optional

This package includes an optional and simple JSON to SQLite3 converter in case one would want to import data from a JSON file into an SQLite3 database. This is optional because by default, a test SQLite3 database is included with this package.