const request = require('supertest');
const app = require('../server');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

describe('Reservations API', () => {
    let confirmationCode; // Variable to hold the confirmation code for cleanup
    describe('GET /api/available-dates', () => {
        it('should return a list of N available dates from a start date', async () => {
            const res = await request(app)
                .get('/api/available-dates?startDate=2024-01-01&N=2')
                .expect(200);

            expect(Array.isArray(res.body.availableDates)).toBe(true);
            expect(res.body.availableDates.length).toBe(2);
        });
        it('should reject request with N out of allowed range', async () => {
            const res = await request(app)
                .get('/api/available-dates?startDate=2024-01-01&N=5') // N is out of the allowed range
                .expect(400);

            expect(res.body.error).toBe('N must be between 1 and 4.');
        });
        it('should adjust startDate to today if it is in the past', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1); // Set to yesterday
            const pastDateString = pastDate.toISOString().split('T')[0];

            const res = await request(app)
                .get(`/api/available-dates?startDate=${pastDateString}&N=1`)
                .expect(200);

            // Verify the first available date is not in the past (e.g., not yesterday)
            const todayString = new Date().toISOString().split('T')[0];
            expect(res.body.availableDates[0]).not.toBe(pastDateString);
            expect(new Date(res.body.availableDates[0]) >= new Date(todayString)).toBe(true);
        });
    });

    describe('POST /api/reserve', () => {
        it('should create a reservation and return a confirmation code', async () => {
            const reservationData = {
                DTSTART: '2024-10-08',
                ATTENDEE: 'lolyowhatsgood@example.com'
            };

            const res = await request(app)
                .post('/api/reserve')
                .send(reservationData)
                .expect(200);

            expect(res.body.confirmationCode).toBeDefined();
            confirmationCode = res.body.confirmationCode; // Store the confirmation code for later cleanup
        });
        // Test blocking on weekends
        it('should block reservation on weekends', async () => {
            const reservationData = {
                DTSTART: '2024-10-19', // A Saturday in 2024
                ATTENDEE: 'weekendblock@example.com'
            };

            await request(app)
                .post('/api/reserve')
                .send(reservationData)
                .expect(400); // Expecting a failure response
        });
        // Test blocking on holidays (July 4th)
        it('should block reservation on holidays', async () => {
            const reservationData = {
                DTSTART: '2024-07-04', // Independence Day in the US
                ATTENDEE: 'holidayblock@example.com'
            };

            await request(app)
                .post('/api/reserve')
                .send(reservationData)
                .expect(400); // Expecting a failure response
        });
        // Test blocking on already reserved days
        it('should block reservation on already reserved days', async () => {
            // Assuming '2024-10-08' is already reserved from the first test
            const reservationData = {
                DTSTART: '2024-10-07', // Same date as the first test
                ATTENDEE: 'doublebooking@example.com'
            };

            await request(app)
                .post('/api/reserve')
                .send(reservationData)
                .expect(400); // Expecting a failure response
        });
        it('should reject reservation with date in the past', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1); // Set to yesterday
            const pastDateString = pastDate.toISOString().split('T')[0];

            const reservationData = {
                DTSTART: pastDateString,
                ATTENDEE: 'past@example.com'
            };

            const res = await request(app)
                .post('/api/reserve')
                .send(reservationData)
                .expect(400);

            expect(res.body.error).toBe('Date is in the past. Please choose a future date.');
        });
        it('should reject reservation with invalid date format', async () => {
            const reservationData = {
                DTSTART: 'invalid-date',
                ATTENDEE: 'invalid@example.com'
            };

            const res = await request(app)
                .post('/api/reserve')
                .send(reservationData)
                .expect(400);

            expect(res.body.error).toBe('Invalid date format. Please use YYYY-MM-DD.');
        });
        it('should reject request with invalid email format', async () => {
            const invalidEmail = 'invalidemail';
            const res = await request(app)
                .get(`/api/reservations/${invalidEmail}`)
                .expect(400);

            expect(res.body.error).toBe('Invalid email address. Please enter a valid email.');
        });

        afterEach(async () => {
            // Cleanup step: cancel the reservation if a confirmationCode was obtained
            if (confirmationCode) {
                await request(app)
                    .post('/api/cancel-reservation')
                    .send({ confirmationCode })
                    .expect(200);

                confirmationCode = null; // Reset confirmationCode after cancellation to avoid re-cancellation attempts
            }
        });
    });

    describe('GET /api/reservations/:email', () => {
        it('should return reservations for the specified email', async () => {
            const email = 'test@example.com';
            const res = await request(app)
                .get(`/api/reservations/${email}`)
                .expect(200);

            expect(Array.isArray(res.body.reservations)).toBe(true);
        });
        it('should return an error message when no reservations are found for the email', async () => {
            const nonExistentEmail = 'doesnotexist@example.com';
            const res = await request(app)
                .get(`/api/reservations/${nonExistentEmail}`)
                .expect(404); // Expecting the server to return a 404 status code

            expect(res.body.error).toBe('No reservations found for the specified email.');
        });

        it('should reject request with invalid email format', async () => {
            const invalidEmail = 'invalidemail';
            const res = await request(app)
                .get(`/api/reservations/${invalidEmail}`)
                .expect(400);

            expect(res.body.error).toBe('Invalid email address. Please enter a valid email.');
        });


    });
    describe('POST /api/cancel-reservation', () => {
        it('should cancel a reservation given a confirmation code', async () => {
            const body = {
                confirmationCode: 'd5f7f53d'
            };

            const res = await request(app)
                .post('/api/cancel-reservation')
                .send(body)
                .expect(200);

            expect(res.body.message).toBe('Reservation cancelled successfully.');
        });
        it('should reject cancellation with an invalid confirmation code', async () => {
            const invalidConfirmationCode = 'nonexistentcode';

            const res = await request(app)
                .post('/api/cancel-reservation')
                .send({ confirmationCode: invalidConfirmationCode })
                .expect(404);
            expect(res.body.message).toBe('Confirmation code not found.');
        });
    });
    describe('Invalid Route Handling', () => {
        it('should notify the user when an invalid route is accessed', async () => {
            await request(app)
                .get('/api/this-route-does-not-exist') // Useing a random or clearly invalid route
                .expect(404) // Expecting a 404 Not Found response
                .then((response) => {
                    expect(response.body.error).toBe('This is an invalid route. Please check the URL and try again.');
                });
        });
    });
    describe('Cancellation notifications and logging', () => {
         it('should log cancellation in the audit database', async () => 
         {
            confirmationCode = 'd5f7f53d';
             const db = new sqlite3.Database(path.join(__dirname, '../audit_log.db'), sqlite3.OPEN_READONLY);
             await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for the logging to complete
 
             db.get('SELECT * FROM audit_log WHERE confirmationCode = ?', [confirmationCode], (err, row) => {
                 expect(err).toBeNull();
                 expect(row).toBeDefined();
                 expect(row.confirmationCode).toBe(confirmationCode);
                 db.close();
             });
         });

        it('should cancel a reservation and log the notifications', async () => {
            const consoleSpy = spyOn(console, 'log');

            confirmationCode = 'd5f7f53d';
            const body = {
                confirmationCode
            };

            const res = await request(app)
                .post('/api/cancel-reservation')
                .send(body)
                .expect(200);

            expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(`Doctor notified about cancellation: ${confirmationCode}`));
            expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(`Secretary notified about cancellation: ${confirmationCode}`));
        });
    });
    describe('POST /api/update-emails', () => {
        it('should update the doctor and secretary email addresses', async () => {
            const newEmails = {
                doctorEmail: 'newdoctor@example.com',
                secretaryEmail: 'newsecretary@example.com'
            };
    
            const res = await request(app)
                .post('/api/update-emails')
                .send(newEmails)
                .expect(200);
    
            expect(res.body.message).toBe('Email addresses updated successfully.');
        });
        it('should reject invalid secretary email format', async () => {
            const invalidEmails = {
                doctorEmail: 'newdoctor@example.com',
                secretaryEmail: 'invalid-email'
            };
    
            const res = await request(app)
                .post('/api/update-emails')
                .send(invalidEmails)
                .expect(400);
    
            expect(res.body.error).toBe('Invalid email address format.');
        });
        it('should reject when both emails are invalid', async () => {
            const invalidEmails = {
                doctorEmail: 'invalid-doctor',
                secretaryEmail: 'invalid-secretary'
            };
    
            const res = await request(app)
                .post('/api/update-emails')
                .send(invalidEmails)
                .expect(400);
    
            expect(res.body.error).toBe('Invalid email address format.');
        });
    });
});
