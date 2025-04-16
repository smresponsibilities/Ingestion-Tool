const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const clickhouseRoutes = require('./routes/clickhouseRoutes');
const { PORT } = require('./config/server');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes - restore the /api prefix to match client expectations
app.use('/api', clickhouseRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

module.exports = app;