import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ClickHouseConnection {
  host: string;
  port: string;
  database: string;
  username: string;
  password?: string;
}

export interface ColumnDefinition {
  name: string;
  type: string;
}

export interface IngestionResult {
  success: boolean;
  records: number;
  message: string;
  filePath?: string;
}

const api = {
  // Connect to ClickHouse
  connectToClickHouse: async (config: ClickHouseConnection) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/connect`, config);
      return response.data;
    } catch (error: any) {
      toast.error("Connection Error: " + (error.response?.data?.message || error.message));
      throw error;
    }
  },

  // Get all tables
  getTables: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tables`);
      return response.data;
    } catch (error: any) {
      toast.error("Error fetching tables: " + (error.response?.data?.error || error.message));
      throw error;
    }
  },

  // Get columns for a specific table
  getColumns: async (table: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/columns/${table}`);
      return response.data;
    } catch (error: any) {
      toast.error(`Error fetching columns for ${table}: ` + (error.response?.data?.error || error.message));
      throw error;
    }
  },

  // Upload a file to the server
  uploadFile: async (file: File, delimiter: string = ',') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('delimiter', delimiter);

      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      toast.error("Upload error: " + (error.response?.data?.error || error.message));
      throw error;
    }
  },

  // Preview data from a table
  previewData: async (table: string, columns: string[]) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/preview`, {
        table,
        columns,
      });

      return response.data;
    } catch (error: any) {
      toast.error("Preview error: " + (error.response?.data?.error || error.message));
      throw error;
    }
  },

  // Start data ingestion process
  ingestData: async (data: {
    source: string;
    target: string;
    tables?: string[];
    columns?: Array<ColumnDefinition> | Record<string, string[]>;
    filePath?: string;
    targetFile?: string;
    targetTable?: string;
    delimiter?: string;
    mode?: string;
  }): Promise<IngestionResult> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/ingest`, data);
      return response.data;
    } catch (error: any) {
      toast.error("Ingestion error: " + (error.response?.data?.error || error.message));
      throw error;
    }
  },

  // Download an exported file
  downloadFile: (filename: string) => {
    // Ensure we're only using the basename of the filename
    const safeFilename = filename.split('/').pop()?.split('\\').pop() || filename;
    const url = `${API_BASE_URL}/download/${safeFilename}`;

    // Create a link element and trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Downloading ${safeFilename}...`);
  },
};

export default api;