const express = require('express');
const reservationsHandler = require('./reservationsHandler');
const fs = require('fs');
const path = require('path');

const EMAILS_FILE = path.join(__dirname, 'emails.json');

module.exports = (db, cancellationPublisher) => {
    const router = express.Router();

    // Parse JSON bodies (as sent by API clients)
    router.use(express.json());

    // Find the next available date
    router.get('/available-dates', async (req, res) => {
        let { startDate, N } = req.query;
        const n = parseInt(N, 10);
        if (isNaN(n) || n < 1 || n > 4) {
            return res.status(400).json({ error: 'N must be between 1 and 4.' });
        }

        let inputDate = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!startDate || isNaN(inputDate.getTime()) || inputDate < today) {
            inputDate = today;
        }

        startDate = inputDate.toISOString().split('T')[0];
        try {
            const availableDates = await reservationsHandler.findNextAvailableDate(db, startDate, n);
            res.json({ availableDates });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Make a reservation
    router.post('/reserve', async (req, res) => {
        const { DTSTART, ATTENDEE } = req.body;
    
        if (!/^\d{4}-\d{2}-\d{2}$/.test(DTSTART) || new Date(DTSTART).toString() === 'Invalid Date') {
            return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
        }
        if (new Date(DTSTART) < new Date()) {
            return res.status(400).json({ error: 'Date is in the past. Please choose a future date.' });
        }
        if (!/\S+@\S+\.\S+/.test(ATTENDEE)) {
            return res.status(400).json({ error: 'Invalid email address. Please enter a valid email.' });
        }
    
        try {
            const confirmationCode = await reservationsHandler.makeReservation(db, { DTSTART, ATTENDEE });
            res.json({ confirmationCode });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Lookup reservations by email
    router.get('/reservations/:email', async (req, res) => {
        const { email } = req.params;
        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address. Please enter a valid email.' });
        }
    
        try {
            const reservations = await reservationsHandler.lookupReservations(db, email);
            res.json({ reservations });
        } catch (error) {
            // Since lookupReservations is designed to reject the promise with an error
            // specifically stating "No reservations found" when the result is empty,
            // we can safely assume that this catch block handles such a scenario.
            res.status(404).json({ error: error.message });
        }
    });

    // Cancel a reservation
    router.post('/cancel-reservation', async (req, res) => {
        const { confirmationCode } = req.body;
        try {
            const success = await reservationsHandler.cancelReservation(db, confirmationCode, cancellationPublisher);
            if (!success) {
                return res.status(404).json({ message: 'Confirmation code not found.' });
            }
            res.json({ message: 'Reservation cancelled successfully.' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Update emails
    router.post('/update-emails', async (req, res) => {
        const { doctorEmail, secretaryEmail } = req.body;
        if (!doctorEmail || !secretaryEmail) {
            return res.status(400).json({ error: 'Please provide both doctor and secretary email addresses.' });
        }
        if (!/\S+@\S+\.\S+/.test(doctorEmail) || !/\S+@\S+\.\S+/.test(secretaryEmail)) {
            return res.status(400).json({ error: 'Invalid email address format.' });
        }
        try {
            await fs.promises.writeFile(EMAILS_FILE, JSON.stringify({ doctorEmail, secretaryEmail }, null, 2));
            res.json({ message: 'Email addresses updated successfully.' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update email addresses.' });
        }
    });

    // Catch-all for undefined routes
    router.use('*', (req, res) => {
        res.status(404).json({ error: 'This is an invalid route. Please check the URL and try again.' });
    });

    return router;
};
