const {
  createClickHouseClient,
  clearClient,
  getClient,
  ensureConnection,
} = require("../config/database");
const {
  getTables,
  getColumns,
  previewData,
  clickhouseToFlatFile,
  flatFileToClickhouse,
} = require("../services/clickhouseService");
const { getSafeFileName } = require("../utils/helpers");
const path = require("path");
const { getExportsDirectory } = require("../config/server");
const fs = require("fs");

// Connect to ClickHouse
exports.connect = async (req, res) => {
  const { host, port, database, username, password } = req.body;

  try {
    const client = createClickHouseClient({
      host,
      port,
      database,
      username,
      password,
    });

    // Test connection
    const result = await client.query({
      query: "SELECT 1",
      format: "JSONEachRow",
    });

    const data = await result.json();
    console.log("Connection successful:", data);
    res.json({ success: true, message: "Connected to ClickHouse" });
  } catch (err) {
    console.error("Connection error:", err.message);
    clearClient(); // Clear the client on connection failure
    res.status(500).json({
      success: false,
      message: "Failed to connect",
      error: err.message,
    });
  }
};

// Get tables from ClickHouse
exports.fetchTables = async (req, res) => {
  if (!(await ensureConnection())) {
    return res.status(400).json({ error: "Not connected to ClickHouse" });
  }

  try {
    const tableNames = await getTables(getClient());
    res.json(tableNames);
  } catch (err) {
    console.error("Error fetching tables:", err.message);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
};

// Get columns for a table
exports.fetchColumns = async (req, res) => {
  const { table } = req.params;

  if (!(await ensureConnection())) {
    return res.status(400).json({ error: "Not connected to ClickHouse" });
  }

  try {
    const columnNames = await getColumns(getClient(), table);
    res.json(columnNames);
  } catch (err) {
    console.error(`Error fetching columns for ${table}:`, err.message);
    res.status(500).json({ error: `Failed to fetch columns for ${table}` });
  }
};

// Preview data from a table or file
exports.preview = async (req, res) => {
  const { table, columns } = req.body;

  if (!(await ensureConnection())) {
    return res.status(400).json({ error: "Not connected to ClickHouse" });
  }

  try {
    // Normalize path if it's a file path
    const source = table.includes('\\') ? table.replace(/\\/g, '/') : table;
    const rows = await previewData(getClient(), source, columns);
    res.json(rows);
  } catch (err) {
    console.error("Preview error:", err.message);
    res.status(500).json({ error: "Failed to fetch preview" });
  }
};

// Handle file uploads
exports.uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileInfo = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
  };

  res.json({ success: true, file: fileInfo });
};

// Perform data ingestion
exports.ingest = async (req, res) => {
  const {
    source,
    target,
    tables,
    columns,
    filePath,
    targetFile,
    targetTable,
    delimiter,
  } = req.body;

  try {
    // Check if client is available for ClickHouse operations
    if (
      (source === "clickhouse" || target === "clickhouse") &&
      !(await ensureConnection())
    ) {
      return res.status(400).json({
        error: "Not connected to ClickHouse",
        message:
          "Please connect to ClickHouse before performing data operations",
      });
    }

    let result;

    if (source === "clickhouse" && target === "flatfile") {
      // ClickHouse to flat file
      result = await clickhouseToFlatFile(
        getClient(),
        tables,
        columns,
        targetFile,
        delimiter
      );
    } else if (source === "flatfile" && target === "clickhouse") {
      // Flat file to ClickHouse
      if (!filePath) {
        return res.status(400).json({ error: "No file path provided" });
      }
      if (!targetTable) {
        return res.status(400).json({ error: "No target table specified" });
      }

      result = await flatFileToClickhouse(
        getClient(),
        filePath,
        targetTable,
        delimiter
      );
    } else {
      return res
        .status(400)
        .json({ error: "Invalid source or target combination" });
    }

    res.json({
      success: true,
      records: result.recordCount,
      message: result.message,
      filePath: result.filePath || null,
    });
  } catch (err) {
    console.error("Ingestion error:", err.message);
    res.status(500).json({
      error: "Failed to perform data ingestion",
      message: err.message,
    });
  }
};

// Download exported file
exports.downloadFile = (req, res) => {
  const { filename } = req.params;
  // Make sure we only use the basename (no path manipulation)
  const safeFilename = getSafeFileName(filename);
  const filePath = path.join(getExportsDirectory(), safeFilename);

  console.log(
    `Download requested for: ${safeFilename}, looking at: ${filePath}`
  );

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath);
};