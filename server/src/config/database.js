const { createClient } = require('@clickhouse/client');

// Store connection config for potential reconnection
let client;
let connectionConfig;

// Function to create a new ClickHouse client
const createClickHouseClient = (config) => {
  const { host, port, database, username, password } = config;
  console.log("Connection request received:", {
    host,
    port,
    database,
    username,
  });

  let cleanHost = host.trim();
  if (cleanHost.startsWith("https://") || cleanHost.startsWith("http://")) {
    cleanHost = cleanHost.replace("https://", "").replace("http://", "");
  }

  // Store connection config for potential reconnection
  connectionConfig = {
    url: `https://${cleanHost}:${port}`,
    username,
    password,
    database,
  };

  client = createClient(connectionConfig);
  return client;
};

// Function to get the current client
const getClient = () => client;

// Function to get the current connection config
const getConnectionConfig = () => connectionConfig;

// Function to clear the client
const clearClient = () => {
  client = null;
};

// Ensure connection is valid or attempt to reconnect
const ensureConnection = async () => {
  if (!client && connectionConfig) {
    try {
      console.log("Attempting to reconnect to ClickHouse...");
      client = createClient(connectionConfig);
      await client
        .query({
          query: "SELECT 1",
          format: "JSONEachRow",
        })
        .json();
      console.log("Reconnection successful");
      return true;
    } catch (err) {
      console.error("Reconnection failed:", err.message);
      client = null;
      return false;
    }
  }
  return !!client; // Return true if client exists, false otherwise
};

module.exports = {
  createClickHouseClient,
  getClient,
  getConnectionConfig,
  clearClient,
  ensureConnection
};