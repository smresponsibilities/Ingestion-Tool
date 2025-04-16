const express = require('express');
const {
  connect,
  fetchTables,
  fetchColumns,
  preview,
  uploadFile,
  ingest,
  downloadFile,
} = require('../controllers/clickhouseController');
const { upload } = require('../config/server');

const router = express.Router();
// Connect to ClickHouse
router.post("/connect", connect);

// Get all tables
router.get("/tables", fetchTables);

// Get columns for a specific table
router.get("/columns/:table", fetchColumns);

// Preview data
router.post("/preview", preview);

// Upload file
router.post("/upload", upload.single("file"), uploadFile);

// Perform data ingestion
router.post("/ingest", ingest);

// Download exported file
router.get("/download/:filename", downloadFile);

module.exports = router;