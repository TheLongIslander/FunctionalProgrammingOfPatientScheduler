require('dotenv').config({ path: './cred.env' });;
const Holidays = require('date-holidays');
const hd = new Holidays('US');
const moment = require('moment-timezone');
const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');
// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER, // Your Gmail address
    clientId: process.env.OAUTH_CLIENTID, // Your OAuth2 Client ID
    clientSecret: process.env.OAUTH_CLIENT_SECRET, // Your OAuth2 Client Secret
    refreshToken: process.env.OAUTH_REFRESH_TOKEN, // The Refresh Token
  }
});

const EMAILS_FILE = path.join(__dirname, 'emails.json');
const isWeekend = (date) => 
{
    const day = date.getDay();
    return day === 0 || day === 6; // 0 for Sunday, 6 for Saturday
};
  
  const formatDate = (date) => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  const convertToICalendarFormat = (dateStr, timeStr = "09:00:00") => {
    const datePart = dateStr.replace(/-/g, '');
    const timePart = timeStr.replace(/:/g, '');
    return `${datePart}T${timePart}Z`;
};
const convertToICalendarFormatFull = (isoDateTime) => {
  // Convert the ISO date-time string to a moment object in Eastern Time
  const easternTime = moment(isoDateTime).tz('America/New_York');

  // Format it to iCalendar date-time format
  return easternTime.format('YYYYMMDDTHHmmss');
};
const convertFromICalendarFormat = (iCalendarDateTime) => {
    const datePart = iCalendarDateTime.slice(0, 8); // Extract YYYYMMDD part
    return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  };
  const convertTimestampForDisplay = (iCalendarDTSTAMP) => {
    // Convert to JavaScript's understood format if necessary
    // Example: 20240219T232123048Z -> 2024-02-19T23:21:23Z
    return iCalendarDTSTAMP.replace(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\d{3}Z$/,
        "$1-$2-$3T$4:$5:$6Z"
    );
};

const isHoliday = (date) => {
    const holidays = hd.getHolidays(date.getFullYear());
    return holidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toISOString().split('T')[0] === date.toISOString().split('T')[0];
    });
  };

  

// Send email using nodemailer
const sendEmailNotification = (email, subject, message) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject,
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
};

// Function to send email to a specific role by reading the role's email from emails.json
const sendEmailToRole = (role, subject, message) => {
  fs.readFile(EMAILS_FILE, (err, data) => {
    if (err) {
      console.error('Error reading from emails file', err.message);
      return;
    }

    const emails = JSON.parse(data);
    const email = role === 'doctor' ? emails.doctorEmail : emails.secretaryEmail;

    sendEmailNotification(email, subject, message);
  });
};

  
  module.exports = { isWeekend, formatDate, convertToICalendarFormat, convertFromICalendarFormat,convertTimestampForDisplay, isHoliday, convertToICalendarFormatFull, sendEmailToRole};
  