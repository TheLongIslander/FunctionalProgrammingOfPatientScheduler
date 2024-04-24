// notifications.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { convertToICalendarFormatFull, sendEmailToRole } = require('./utils'); 


const AUDIT_DB_PATH = path.join(__dirname, 'audit_log.db');

function openAuditLogDb() {
  let db = new sqlite3.Database(AUDIT_DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('Error opening audit log database', err.message);
    } else {
      console.log('Connected to the audit log database.');
      db.run(`CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        confirmationCode TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        event TEXT NOT NULL
      )`, [], (err) => {
        if (err) {
          console.error('Error creating audit_log table', err.message);
        }
      });
    }
  });
  return db;
}


function doctorNotification(data) {
    // logic to send notification to the doctor
    console.log(`Doctor notified about cancellation: ${data.confirmationCode}`);
    sendEmailToRole('doctor', 'Cancellation Alert', `A cancellation has occurred: ${data.confirmationCode}`);
  }
  
  function secretaryNotification(data) {
    // logic to send notification to the secretary
    console.log(`Secretary notified about cancellation: ${data.confirmationCode}`);
    sendEmailToRole('secretary', 'Cancellation Alert', `A cancellation has occurred: ${data.confirmationCode}`);
  }
  
  function auditLogger(data) {
    const db = openAuditLogDb();
  
    db.serialize(() => {
      // Get the current time in iCalendar format adjusted for Eastern Time
      const formattedTimestamp = convertToICalendarFormatFull(new Date().toISOString());
  
      const insertLogEntry = db.prepare(`INSERT INTO audit_log (confirmationCode, timestamp, event) VALUES (?, ?, ?)`);
      insertLogEntry.run(data.confirmationCode, formattedTimestamp, 'Cancellation', (err) => {
        if (err) {
          console.error('Error writing to audit log database', err.message);
        }
        else{
             // Log a success message to the console
        console.log(`Successfully logged cancellation to audit log database for confirmation code: ${data.confirmationCode}`);
        }
        insertLogEntry.finalize();
      });
    });
  
    db.close((err) => {
      if (err) {
        console.error('Error closing audit log database', err.message);
      }
    });
  }
  
  module.exports = {
    doctorNotification,
    secretaryNotification,
    auditLogger
  };
  