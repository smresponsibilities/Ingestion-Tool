const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const { formatSqlQuery, parseDelimiter, generateFilename, sanitizeTableName } = require('../utils/helpers');
const { getExportsDirectory } = require('../config/server');

/**
 * Get all tables from the connected ClickHouse database
 * @param {Object} client - ClickHouse client
 * @returns {Array<string>} - List of table names
 */
exports.getTables = async (client) => {
  try {
    const query = `SHOW TABLES`;
    const result = await client.query({
      query,
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row) => row.name);
  } catch (error) {
    console.error('Error fetching tables:', error.message);
    throw error;
  }
};

/**
 * Get all columns for a specific table
 * @param {Object} client - ClickHouse client
 * @param {string} table - Table name
 * @returns {Array<Object>} - List of columns with name and type
 */
exports.getColumns = async (client, table) => {
  try {
    const query = `DESCRIBE TABLE ${table}`;
    const result = await client.query({
      query,
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row) => ({
      name: row.name,
      type: row.type,
    }));
  } catch (error) {
    console.error(`Error fetching columns for ${table}:`, error.message);
    throw error;
  }
};

/**
 * Preview data from a table or file
 * @param {Object} client - ClickHouse client
 * @param {string} source - Source identifier (table name or file path)
 * @param {Array<string>} columns - Optional list of column names to include
 * @returns {Array<Object>} - Preview data rows
 */
exports.previewData = async (client, source, columns = []) => {
  try {
    // Check if source is a file path
    if (source.includes('/') || source.includes('\\')) {
      // For file preview, use Node.js fs and csv-parser
      return new Promise((resolve, reject) => {
        const rows = [];
        const delimiter = ','; // Default to comma, you could pass this as a parameter
        
        fs.createReadStream(source)
          .pipe(csv({ separator: delimiter }))
          .on('data', (data) => {
            rows.push(data);
            // Limit to 100 rows for preview
            if (rows.length >= 100) {
              this.destroy();
            }
          })
          .on('end', () => {
            // Filter columns if needed
            if (columns && columns.length > 0) {
              const filteredRows = rows.map(row => {
                const filteredRow = {};
                columns.forEach(col => {
                  if (row[col] !== undefined) {
                    filteredRow[col] = row[col];
                  }
                });
                return filteredRow;
              });
              resolve(filteredRows);
            } else {
              resolve(rows);
            }
          })
          .on('error', (error) => {
            console.error(`Error reading file ${source}:`, error.message);
            reject(error);
          });
      });
    } else {
      // For table preview
      const columnsStr = columns && columns.length > 0 
        ? columns.join(', ') 
        : '*';
      
      const query = `SELECT ${columnsStr} FROM ${source} LIMIT 100`;
      const result = await client.query({
        query,
        format: 'JSONEachRow'
      });

      return await result.json();
    }
  } catch (error) {
    console.error(`Error previewing data:`, error.message);
    throw error;
  }
};

/**
 * Export data from ClickHouse to a flat file
 * @param {Object} client - ClickHouse client
 * @param {string} table - Table name
 * @param {Array<string>} columns - Columns to export
 * @param {string} targetFileName - Target file name (optional)
 * @param {string} delimiterStr - Delimiter to use in CSV
 * @returns {Object} - Result with file path and record count
 */
exports.clickhouseToFlatFile = async (
  client,
  table,
  columns = [],
  targetFileName,
  delimiterStr = 'comma'
) => {
  try {
    const delimiter = parseDelimiter(delimiterStr);
    const columnsStr = columns && columns.length > 0
      ? columns.join(', ')
      : '*';
    
    const query = `SELECT ${columnsStr} FROM ${table}`;
    console.log("Executing query:", query);
    
    const result = await client.query({
      query,
      format: 'JSONEachRow',
    });
    
    const data = await result.json();
    
    // Create file path
    const fileName = targetFileName || generateFilename(table, 'csv');
    const filePath = path.join(getExportsDirectory(), fileName);
    
    // If we have data, write to CSV
    if (data.length > 0) {
      // Get headers from first row
      const headers = Object.keys(data[0]).map(key => ({ id: key, title: key }));
      
      // Create CSV writer
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: headers,
        fieldDelimiter: delimiter,
      });
      
      // Write to file
      await csvWriter.writeRecords(data);
      
      return {
        success: true,
        recordCount: data.length,
        message: `Successfully exported ${data.length} records to ${fileName}`,
        filePath: fileName,
      };
    } else {
      return {
        success: true,
        recordCount: 0,
        message: 'No data found to export',
        filePath: null,
      };
    }
  } catch (error) {
    console.error(`Error exporting from ClickHouse:`, error.message);
    throw error;
  }
};

/**
 * Import data from a flat file to ClickHouse
 * @param {Object} client - ClickHouse client
 * @param {string} filePath - Path to input file
 * @param {string} targetTable - Target table name
 * @param {string} delimiterStr - Delimiter used in CSV
 * @returns {Object} - Result with record count
 */
exports.flatFileToClickhouse = async (
  client,
  filePath,
  targetTable,
  delimiterStr = 'comma'
) => {
  return new Promise((resolve, reject) => {
    try {
      // Sanitize the table name to ensure it's valid for ClickHouse
      const safeTableName = sanitizeTableName(targetTable);
      if (safeTableName !== targetTable) {
        console.log(`Table name sanitized from "${targetTable}" to "${safeTableName}"`);
      }
      
      const delimiter = parseDelimiter(delimiterStr);
      const rows = [];
      let headers = [];
      let recordCount = 0;
      
      fs.createReadStream(filePath)
        .pipe(csv({ separator: delimiter }))
        .on('headers', (headerList) => {
          headers = headerList;
        })
        .on('data', (row) => {
          rows.push(row);
          recordCount++;
          
          // Process in batches of 1000 rows to avoid memory issues
          if (rows.length >= 1000) {
            processBatch(rows.splice(0));
          }
        })
        .on('end', async () => {
          try {
            // First create the table if it doesn't exist
            if (headers.length > 0 && rows.length > 0) {
              const columnDefs = headers.map(header => `${header} String`).join(", ");
              
              // Create table query with CREATE TABLE IF NOT EXISTS
              const createTableQuery = `
                CREATE TABLE IF NOT EXISTS ${safeTableName} (
                  ${columnDefs}
                ) ENGINE = MergeTree()
                ORDER BY tuple()
              `;
              
              console.log("Creating table with query:", createTableQuery);
              
              await client.query({
                query: createTableQuery,
                format: 'JSONEachRow',
              });
            }
            
            // Process any remaining rows
            if (rows.length > 0) {
              await processBatch(rows);
            }
            
            resolve({
              success: true,
              recordCount,
              message: `Successfully imported ${recordCount} records to ${safeTableName}`,
            });
          } catch (err) {
            console.error("Error during table creation or final batch:", err);
            reject(err);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
      
      async function processBatch(batchRows) {
        if (batchRows.length === 0) return;
        
        try {
          // Process each row individually using exec instead of bulk insert with query
          for (const row of batchRows) {
            const columnNames = headers.join(', ');
            const values = headers.map(header => {
              const value = row[header];
              // Handle different data types (string values need quotes)
              return isNaN(value) || value === '' ? `'${String(value).replace(/'/g, "''")}'` : value;
            }).join(', ');
            
            const query = `INSERT INTO ${safeTableName} (${columnNames}) VALUES (${values})`;
            
            // Execute the query using exec method instead of command or query
            await client.exec({
              query: query
            });
          }
        } catch (error) {
          console.error('Error processing batch:', error.message);
          throw error;
        }
      }
    } catch (error) {
      console.error(`Error importing to ClickHouse:`, error.message);
      reject(error);
    }
  });
};