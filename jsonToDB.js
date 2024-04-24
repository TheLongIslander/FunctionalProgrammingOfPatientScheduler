const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Path to your JSON file
const jsonFilePath = '/Users/adityaraj/Downloads/Homework4/reservations.json';

// Read JSON data from file
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

// Open a database connection
const db = new sqlite3.Database('./reservations.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the reservations database.');
});

// Create table
db.run(`CREATE TABLE IF NOT EXISTS reservations (
  DTSTART TEXT,
  ATTENDEE TEXT,
  DTSTAMP TEXT,
  METHOD TEXT,
  STATUS TEXT,
  confirmationCode TEXT
)`, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }

  // Insert JSON data into table
  const insertStmt = `INSERT INTO reservations (DTSTART, ATTENDEE, DTSTAMP, METHOD, STATUS, confirmationCode) VALUES (?, ?, ?, ?, ?, ?)`;
  jsonData.forEach(item => {
    db.run(insertStmt, [item.DTSTART, item.ATTENDEE, item.DTSTAMP, item.METHOD, item.STATUS, item.confirmationCode], (err) => {
      if (err) {
        console.error(err.message);
      }
    });
  });

  // Close the database connection inside the last callback
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection.');
  });
});
