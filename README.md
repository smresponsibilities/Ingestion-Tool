# ClickHouse & Flat File Data Ingestion Tool

A web-based application that facilitates bidirectional data ingestion between ClickHouse databases and flat files (CSV).

![Project Banner](https://via.placeholder.com/800x200?text=ClickHouse+%26+Flat+File+Ingestion+Tool)

## 🚀 Features

- **Bidirectional Data Flow**

   - ClickHouse → Flat File (CSV) export
   - Flat File (CSV) → ClickHouse import

- **User-Friendly Interface**

   - Clean, intuitive UI for all operations
   - Step-by-step workflow for complex operations

- **ClickHouse Integration**

   - Secure JWT token-based authentication
   - Connection management (save/load connections)
   - Table and column discovery

- **Data Management**

   - Column selection for granular data ingestion
   - Data preview before full ingestion
   - Detailed completion reports

- **Bonus Features**

   - Multi-table join capabilities (for ClickHouse source)

## 🛠️ Technology Stack

- **Frontend**

   - React with TypeScript
   - Material-UI component library
   - React Router for navigation
   - Axios for API requests

- **Backend**

   - Node.js with Express
   - ClickHouse Node.js client
   - Multer for file uploads
   - CSV parsing utilities

## 📋 Prerequisites

- Node.js (v14+ recommended)
- Access to a ClickHouse instance (local or remote)
- Modern web browser (Chrome, Firefox, Edge, etc.)

## 🔧 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/clickhouse-flat-file-tool.git
cd clickhouse-flat-file-tool
```

### 2. Setup Server

```bash
cd server
npm install

# Create directories for uploads and exports (if not present)
mkdir -p uploads exports

# Start the server
npm start
```

The server will run on port 3001 by default.

### 3. Setup Client

```bash
cd client
npm install

# Create .env file for frontend
echo "VITE_API_URL=http://localhost:3001/api" > .env

# Start the development server
npm run dev
```

The client will run on port 5173 by default.

## 🔍 Usage Guide

### ClickHouse → Flat File

1. From the home screen, select "ClickHouse" as your data source
2. Enter your ClickHouse connection details (host, port, database, username, JWT token/password)
3. Connect to your ClickHouse instance
4. Select the table and columns you want to export
5. Configure export settings (filename, delimiter)
6. Start the export process
7. Download the exported CSV file

### Flat File → ClickHouse

1. From the home screen, select "Flat File" as your data source
2. Enter your ClickHouse connection details (host, port, database, username, JWT token/password)
3. Upload your CSV file
4. Select columns to import
5. Configure target table settings
6. Start the import process
7. View completion report with record count

## 🧪 Testing

The application has been tested with the following ClickHouse example datasets:

- `uk_price_paid`
- `ontime`

To test the application:

1. Load example datasets into your ClickHouse instance
2. Follow the usage guides above
3. Verify record counts match between source and target

## 📝 Configuration Options

### Environment Variables

The server supports the following environment variables:

```sh
PORT=3001
UPLOADS_DIR=uploads
EXPORTS_DIR=exports
```

## 🤖 AI Tools Usage

This project was developed with assistance from AI coding tools. The prompts used are documented in the `prompts.txt` file.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- ClickHouse team for their excellent database and client libraries
- Material-UI team for the component library