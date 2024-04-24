const sqlite3 = require('sqlite3').verbose();
const { isWeekend, formatDate, convertToICalendarFormat, convertFromICalendarFormat, isHoliday } = require('./utils');
const crypto = require('crypto');
const uuid = require('uuid');

// Pure function to determine if the date is reserved
const isDateReserved = async (db, inputDate) => {
    const formattedInputDate = convertToICalendarFormat(inputDate);
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) AS count FROM reservations WHERE DTSTART LIKE ? AND STATUS != 'CANCELLED'`, [formattedInputDate + '%'], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.count > 0);
            }
        });
    });
};

// Pure function to find the next available date
const findNextAvailableDate = async (db, startDate, n) => {
    let availableDates = [];
    let currentDate = new Date(startDate);
    currentDate.setUTCHours(9, 0, 0, 0);
    while (availableDates.length < n) {
        currentDate.setDate(currentDate.getDate() + 1);
        const isReserved = await isDateReserved(db, formatDate(currentDate));
        const isWknd = isWeekend(currentDate);
        const isHldy = isHoliday(currentDate);
        if (!isReserved && !isWknd && !isHldy) {
            availableDates.push(formatDate(currentDate));
        }
    }
    return availableDates;
};
const generateConfirmationCode = () => {
    const rawId = uuid.v4();  // Generate a unique UUID
    const confirmationCode = crypto.createHash('sha256').update(rawId).digest('hex').substring(0, 8);  // Hash it and take the first 8 characters
    return confirmationCode;
};

// Pure function to make a reservation
const makeReservation = async (db, { DTSTART, ATTENDEE }) => {
    const fDate = new Date(DTSTART);
    fDate.setUTCHours(9, 0, 0, 0);
    const dateIsReserved = await isDateReserved(db, DTSTART);
    const dateIsWeekend = isWeekend(fDate);
    const dateIsHoliday = isHoliday(fDate);

    if (dateIsReserved || dateIsWeekend || dateIsHoliday) {
        throw new Error('The date is not available for reservation. Please try a different date.');
    }

    const confirmationCode = generateConfirmationCode(); // Use the pure function to get a confirmation code
    
    const iCalendarDTSTART = convertToICalendarFormat(DTSTART, "09:00:00");
    const DTSTAMP = new Date().toISOString().replace(/[-:.]/g, '').slice(0, -1) + 'Z';

    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO reservations (DTSTART, ATTENDEE, DTSTAMP, METHOD, STATUS, confirmationCode) VALUES (?, ?, ?, ?, ?, ?)`,
            [iCalendarDTSTART, `mailto:${ATTENDEE}`, DTSTAMP, 'REQUEST', 'CONFIRMED', confirmationCode], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(confirmationCode);
                }
            });
    });
};

// Pure function to lookup reservations
const lookupReservations = async (db, email) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM reservations WHERE ATTENDEE = ?`, [`mailto:${email}`], (err, rows) => {
            if (err) {
                reject(err);
            } else if (rows.length === 0) {
                reject(new Error('No reservations found for the specified email.'));
            } else {
                resolve(rows.map(row => ({
                    ...row,
                    DTSTART: convertFromICalendarFormat(row.DTSTART),
                    DTSTAMP: convertFromICalendarFormat(row.DTSTAMP),
                    ATTENDEE: row.ATTENDEE.replace('mailto:', '')
                })));
            }
        });
    });
};

// Pure function to cancel reservation
const cancelReservation = async (db, confirmationCode, cancellationPublisher) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE reservations SET STATUS = 'CANCELLED' WHERE confirmationCode = ?`, [confirmationCode], function(err) {
            if (err) {
                reject(err);
            } else if (this.changes > 0) {
                cancellationPublisher.publish({ confirmationCode });
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

module.exports = { findNextAvailableDate, makeReservation, lookupReservations, cancelReservation };
