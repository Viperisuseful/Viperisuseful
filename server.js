const express = require('express');
const fetchSchedule = require('./fetchSchedule');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname)));

app.use('/resources', express.static(path.join(__dirname, 'resources')));

app.get('/fetch-schedule', async (req, res) => {
    try {
        await fetchSchedule();
        res.redirect('/schedule.html');
    } catch (error) {
        console.error('Error in /fetch-schedule route:', error);
        res.status(500).send('Error fetching schedule: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});