import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  FormControlLabel,
  Checkbox,
  FormGroup,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Card,
  CardContent,
  Fade,
  LinearProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import api from '../services/api';
import ClickHouseConnectionComponent, { ClickHouseConnection, ConnectionStatus } from './ClickHouseConnection';
import EnhancedStepper from './EnhancedStepper';

interface Column {
  name: string;
  selected: boolean;
  type?: string;
}

interface TableOption {
  name: string;
  columns: string[];
}

enum ImportMode {
  CREATE_NEW = 'create_new',
  APPEND = 'append'
}

const initialConnection: ClickHouseConnection = {
  host: 'https://rwbuwo35w9.germanywestcentral.azure.clickhouse.cloud',
  port: '8443',
  database: 'default',
  username: 'default',
  password: '',
};

// Available ClickHouse data types
const CLICKHOUSE_TYPES = [
  'String', 'UInt8', 'UInt16', 'UInt32', 'UInt64', 'Int8', 'Int16', 'Int32', 'Int64',
  'Float32', 'Float64', 'DateTime', 'Date', 'Bool'
];

// Guess the most appropriate ClickHouse type from a value
const guessClickHouseType = (value: any): string => {
  if (value === null || value === undefined) return 'String';
  
  if (typeof value === 'boolean') return 'Bool';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      if (value >= 0) {
        if (value < 256) return 'UInt8';
        if (value < 65536) return 'UInt16';
        if (value < 4294967296) return 'UInt32';
        return 'UInt64';
      } else {
        if (value >= -128 && value <= 127) return 'Int8';
        if (value >= -32768 && value <= 32767) return 'Int16';
        if (value >= -2147483648 && value <= 2147483647) return 'Int32';
        return 'Int64';
      }
    }
    return 'Float64';
  }
  
  // Check for date format (simple check)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;
  
  if (typeof value === 'string') {
    if (dateTimeRegex.test(value)) return 'DateTime';
    if (dateRegex.test(value)) return 'Date';
  }
  
  return 'String';
};

const FileToClickHouse = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any>(null);
  const [delimiter, setDelimiter] = useState(',');
  const [columns, setColumns] = useState<Column[]>([]);
  const [connection, setConnection] = useState<ClickHouseConnection>(initialConnection);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ tested: false, success: false, message: '' });
  const [tableName, setTableName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [ingestionComplete, setIngestionComplete] = useState(false);
  const [ingestionResult, setIngestionResult] = useState({ success: false, recordCount: 0, tableName: '' });
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>(ImportMode.CREATE_NEW);
  const [showColumnTypeDialog, setShowColumnTypeDialog] = useState(false);

  // Fetch available tables when connection is established
  useEffect(() => {
    if (connectionStatus.success) {
      fetchAvailableTables();
    }
  }, [connectionStatus.success]);

  const fetchAvailableTables = async () => {
    try {
      const tables = await api.getTables();
      setAvailableTables(tables);
    } catch (err: any) {
      console.error('Failed to fetch tables:', err);
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      // Reset file upload info when a new file is selected
      setUploadedFileInfo(null);
      setColumns([]);
      setPreviewData([]);
    }
  };

  // Upload and process the selected file
  const handleFileUpload = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await api.uploadFile(file, delimiter);
      
      if (result.success) {
        setUploadedFileInfo(result);
        setTableName(file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_").toLowerCase());
        
        // Extract columns from file and set suggested data types
        if (result.file && result.file.originalName) {
          try {
            const previewResult = await api.previewData(result.file.path, []);
            
            if (Array.isArray(previewResult) && previewResult.length > 0) {
              // First, get all column names
              const firstRow = previewResult[0];
              
              // Then, determine the most likely data type for each column
              const columnsWithTypes: Column[] = Object.keys(firstRow).map(header => {
                // Sample values from available rows to determine the type
                const sampleValues = previewResult
                  .slice(0, Math.min(10, previewResult.length))
                  .map(row => row[header])
                  .filter(val => val !== null && val !== undefined && val !== '');
                
                // Use the first non-empty value to guess the type
                const sampleValue = sampleValues.length > 0 ? sampleValues[0] : null;
                const suggestedType = guessClickHouseType(sampleValue);
                
                return {
                  name: header,
                  selected: true,
                  type: suggestedType
                };
              });
              
              setColumns(columnsWithTypes);
              setPreviewData(previewResult);
            }
          } catch (previewErr: any) {
            console.error('Preview error:', previewErr);
          }
        }
      } else {
        setError(result.error || 'Failed to upload file');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection to ClickHouse
  const testConnection = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.connectToClickHouse({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: connection.password
      });
      
      setConnectionStatus({
        tested: true,
        success: response.success,
        message: response.message || 'Connection successful',
      });
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: err.response?.data?.message || err.message || 'Connection failed',
      });
      setError(err.response?.data?.error || err.message || 'Failed to connect to ClickHouse');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle column selection toggle
  const handleColumnToggle = (index: number) => {
    const updatedColumns = [...columns];
    updatedColumns[index].selected = !updatedColumns[index].selected;
    setColumns(updatedColumns);
  };

  // Handle data type change for a column
  const handleColumnTypeChange = (index: number, newType: string) => {
    const updatedColumns = [...columns];
    updatedColumns[index].type = newType;
    setColumns(updatedColumns);
  };

  // Handle select all columns
  const handleSelectAllColumns = () => {
    const allSelected = columns.every(col => col.selected);
    const updatedColumns = columns.map(col => ({
      ...col,
      selected: !allSelected,
    }));
    setColumns(updatedColumns);
  };

  // Open dialog to configure column data types
  const openColumnTypeDialog = () => {
    setShowColumnTypeDialog(true);
  };

  // Start ingestion process
  const startIngestion = async () => {
    if (!uploadedFileInfo || !uploadedFileInfo.file || !tableName) {
      setError('Missing file or table name');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const selectedColumns = columns
        .filter(col => col.selected)
        .map(col => ({ 
          name: col.name, 
          type: col.type || 'String' 
        }));
      
      const response = await api.ingestData({
        source: 'flatfile',
        target: 'clickhouse',
        filePath: uploadedFileInfo.file.path,
        targetTable: tableName,
        delimiter: delimiter,
        columns: selectedColumns,
        mode: importMode
      });
      
      if (response.success) {
        setIngestionComplete(true);
        setIngestionResult({
          success: true,
          recordCount: response.records,
          tableName: tableName,
        });
        setActiveStep(3); // Move to completion step
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to transfer data');
    } finally {
      setIsLoading(false);
    }
  };

  // Steps for the stepper
  const getSteps = () => {
    return ['Select Flat File', 'Choose Columns', 'Configure Target', 'Complete'];
  };

  const steps = getSteps();

  const handleNext = () => {
    if (activeStep === 2) {
      startIngestion();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFile(null);
    setUploadedFileInfo(null);
    setColumns([]);
    setTableName('');
    setIngestionComplete(false);
    setIngestionResult({ success: false, recordCount: 0, tableName: '' });
  };

  const isNextDisabled = () => {
    switch (activeStep) {
      case 0:
        return !uploadedFileInfo;
      case 1:
        return columns.filter(c => c.selected).length === 0;
      case 2:
        return !connectionStatus.success || !tableName;
      default:
        return false;
    }
  };

  // Step content based on active step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <ClickHouseConnectionComponent
              connection={connection}
              connectionStatus={connectionStatus}
              onConnectionChange={setConnection}
              onConnectionStatusChange={setConnectionStatus}
              onConnectionTest={testConnection}
            />
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: 'primary.main'
                }}>
                  <CloudUploadIcon sx={{ mr: 1 }} />
                  Select Flat File Source
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box 
                  sx={{ 
                    border: '2px dashed #ccc', 
                    borderRadius: 2,
                    p: 5, 
                    textAlign: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.01)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(63, 81, 181, 0.05)',
                    },
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    id="file-input"
                    style={{ display: 'none' }}
                  />
                  
                  <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.7 }} />
                  
                  <Typography variant="h6" gutterBottom>
                    Drag & Drop File Here
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Or click to browse your files
                  </Typography>
                  
                  <Button
                    component="span"
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                  >
                    Browse Files
                  </Button>
                </Box>
                
                {file && (
                  <Box sx={{ 
                    mt: 3, 
                    p: 2, 
                    borderRadius: 1, 
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'success.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Box>
                      <Typography variant="body1" fontWeight="500">
                        {file.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(file.size / 1024).toFixed(2)} KB • {file.type || "Unknown type"}
                      </Typography>
                    </Box>
                    <Button 
                      size="small" 
                      color="error" 
                      onClick={() => {
                        setFile(null);
                        setUploadedFileInfo(null);
                        setColumns([]);
                        setPreviewData([]);
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                )}
                
                <Box sx={{ mt: 3 }}>
                  <TextField
                    fullWidth
                    label="Delimiter"
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    margin="normal"
                    helperText="Specify the delimiter used in your file (default is comma)"
                    size="small"
                  />
                </Box>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleFileUpload}
                    disabled={!file || isLoading || !connectionStatus.success}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                    sx={{ px: 4 }}
                  >
                    {isLoading ? 'Processing...' : 'Upload & Process File'}
                  </Button>
                </Box>
                
                {uploadedFileInfo && (
                  <Alert 
                    severity="success" 
                    variant="outlined"
                    sx={{ mt: 3 }}
                  >
                    File processed successfully. Ready for column selection.
                  </Alert>
                )}
                
                {error && (
                  <Alert 
                    severity="error" 
                    variant="outlined"
                    sx={{ mt: 3 }}
                  >
                    {error}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: 'primary.main' 
                }}>
                  Select Columns to Import
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                {columns.length > 0 ? (
                  <Box>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 2,
                      flexWrap: 'wrap',
                      gap: 1
                    }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="500">
                          Available Columns:
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            ({columns.filter(col => col.selected).length} of {columns.length} selected)
                          </Typography>
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button 
                          onClick={openColumnTypeDialog} 
                          variant="outlined" 
                          color="primary"
                          size="small"
                        >
                          Configure Column Types
                        </Button>
                        <Button 
                          onClick={handleSelectAllColumns}
                          size="small"
                        >
                          {columns.every(col => col.selected) ? 'Deselect All' : 'Select All'}
                        </Button>
                      </Box>
                    </Box>
                    
                    <Paper 
                      variant="outlined"
                      sx={{ 
                        maxHeight: 360, 
                        overflow: 'auto',
                        borderRadius: 1,
                        mt: 1,
                      }}
                    >
                      <TableContainer>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell padding="checkbox">Select</TableCell>
                              <TableCell>Column Name</TableCell>
                              <TableCell>Data Type</TableCell>
                              <TableCell>Sample Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {columns.map((column, index) => (
                              <TableRow 
                                key={column.name} 
                                hover 
                                onClick={() => handleColumnToggle(index)}
                                sx={{ cursor: 'pointer' }}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={column.selected}
                                    onChange={() => handleColumnToggle(index)}
                                    name={column.name}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontWeight: column.selected ? 500 : 400 }}>
                                  {column.name}
                                </TableCell>
                                <TableCell>
                                  {column.type || 'String'}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {previewData.length > 0 
                                    ? typeof previewData[0][column.name] === 'object' 
                                      ? JSON.stringify(previewData[0][column.name]).substring(0, 20) + '...' 
                                      : String(previewData[0][column.name]).substring(0, 20) + (String(previewData[0][column.name]).length > 20 ? '...' : '')
                                    : 'No sample data'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                    
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                      <Button
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => setShowPreview(true)}
                        disabled={previewData.length === 0}
                      >
                        Preview Data
                      </Button>
                    </Box>
                    
                    {/* Preview Dialog */}
                    <Dialog
                      open={showPreview}
                      onClose={() => setShowPreview(false)}
                      maxWidth="lg"
                      fullWidth
                      PaperProps={{ sx: { borderRadius: 2 } }}
                    >
                      <DialogTitle>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Data Preview
                        </Box>
                      </DialogTitle>
                      <DialogContent dividers>
                        {previewData.length > 0 ? (
                          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                            <Table stickyHeader>
                              <TableHead>
                                <TableRow>
                                  {Object.keys(previewData[0]).map((key) => (
                                    <TableCell key={key} sx={{ fontWeight: 'bold' }}>{key}</TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {previewData.slice(0, 10).map((row, rowIndex) => (
                                  <TableRow key={rowIndex} hover>
                                    {Object.values(row).map((value: any, valueIndex) => (
                                      <TableCell key={valueIndex}>
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Typography>No preview data available</Typography>
                        )}
                      </DialogContent>
                      <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setShowPreview(false)}>Close</Button>
                      </DialogActions>
                    </Dialog>

                    {/* Column Type Configuration Dialog */}
                    <Dialog
                      open={showColumnTypeDialog}
                      onClose={() => setShowColumnTypeDialog(false)}
                      maxWidth="md"
                      fullWidth
                      PaperProps={{ sx: { borderRadius: 2 } }}
                    >
                      <DialogTitle>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Configure Column Data Types
                        </Box>
                      </DialogTitle>
                      <DialogContent dividers>
                        <Typography variant="body2" color="textSecondary" paragraph sx={{ mt: 1 }}>
                          Select the appropriate ClickHouse data type for each column.
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Column Name</TableCell>
                                <TableCell>Sample Value</TableCell>
                                <TableCell>Data Type</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {columns.map((column, index) => (
                                <TableRow key={column.name} hover>
                                  <TableCell>{column.name}</TableCell>
                                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {previewData.length > 0 
                                      ? typeof previewData[0][column.name] === 'object' 
                                        ? JSON.stringify(previewData[0][column.name]) 
                                        : String(previewData[0][column.name]) 
                                      : 'No sample data'}
                                  </TableCell>
                                  <TableCell>
                                    <FormControl fullWidth size="small">
                                      <Select
                                        value={column.type || 'String'}
                                        onChange={(e) => handleColumnTypeChange(index, e.target.value as string)}
                                        sx={{ minWidth: 150 }}
                                      >
                                        {CLICKHOUSE_TYPES.map(type => (
                                          <MenuItem key={type} value={type}>{type}</MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </DialogContent>
                      <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setShowColumnTypeDialog(false)}>Done</Button>
                      </DialogActions>
                    </Dialog>
                  </Box>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      No columns available. Please upload a file first.
                    </Typography>
                    
                    <Button 
                      variant="outlined" 
                      onClick={() => setActiveStep(0)}
                    >
                      Go back to file selection
                    </Button>
                  </Box>
                )}
                
                {error && <Alert severity="error" variant="outlined" sx={{ mt: 3 }}>{error}</Alert>}
              </CardContent>
            </Card>
          </Box>
        );
        
      case 2:
        return (
          <Box>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: 'primary.main' 
                }}>
                  Configure ClickHouse Target
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ mt: 2, mb: 4 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                    Import Mode:
                  </Typography>
                  
                  <RadioGroup
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as ImportMode)}
                    sx={{ ml: 2 }}
                  >
                    <FormControlLabel 
                      value={ImportMode.CREATE_NEW} 
                      control={<Radio color="primary" />} 
                      label={
                        <Box>
                          <Typography variant="body1">Create new table or replace existing</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Creates a new table with the schema defined by your imported columns
                          </Typography>
                        </Box>
                      } 
                    />
                    <FormControlLabel 
                      value={ImportMode.APPEND} 
                      control={<Radio color="primary" />} 
                      label={
                        <Box>
                          <Typography variant="body1">Append to existing table</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Adds data to an existing table (requires compatible schema)
                          </Typography>
                        </Box>
                      } 
                      disabled={availableTables.length === 0}
                    />
                  </RadioGroup>
                </Box>
                
                <Box sx={{ mt: 4 }}>
                  {importMode === ImportMode.CREATE_NEW ? (
                    <TextField
                      fullWidth
                      label="Target Table Name"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      margin="normal"
                      required
                      helperText="Name of the table to create or replace in ClickHouse"
                    />
                  ) : (
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="existing-table-label">Select Existing Table</InputLabel>
                      <Select
                        labelId="existing-table-label"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        label="Select Existing Table"
                        required
                      >
                        {availableTables.map(table => (
                          <MenuItem key={table} value={table}>{table}</MenuItem>
                        ))}
                      </Select>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                        Select an existing table to append your data to
                      </Typography>
                    </FormControl>
                  )}
                </Box>
                
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Import Summary:
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 3, 
                      borderRadius: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.01)'
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                          Source:
                        </Typography>
                        <Typography><strong>File:</strong> {file?.name || 'No file selected'}</Typography>
                        <Typography><strong>Delimiter:</strong> "{delimiter}"</Typography>
                        <Typography><strong>Selected Columns:</strong> {columns.filter(c => c.selected).length} of {columns.length}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                          Target:
                        </Typography>
                        <Typography><strong>Database:</strong> {connection.database}</Typography>
                        <Typography><strong>Table:</strong> {tableName || 'Not specified'}</Typography>
                        <Typography><strong>Import Mode:</strong> {importMode === ImportMode.CREATE_NEW ? 'Create new table' : 'Append to existing table'}</Typography>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3 }}>
                      {importMode === ImportMode.CREATE_NEW && (
                        <Alert 
                          severity="info" 
                          variant="outlined"
                        >
                          If the table already exists, it will be dropped and recreated with the new schema.
                        </Alert>
                      )}
                      {importMode === ImportMode.APPEND && (
                        <Alert 
                          severity="warning"
                          variant="outlined" 
                        >
                          Make sure the selected columns match the schema of the existing table.
                        </Alert>
                      )}
                    </Box>
                  </Paper>
                </Box>
                
                {error && <Alert severity="error" variant="outlined" sx={{ mt: 3 }}>{error}</Alert>}
              </CardContent>
            </Card>
          </Box>
        );
        
      case 3:
        return (
          <Box>
            <Card 
              variant="outlined" 
              sx={{ 
                mb: 3,
                border: ingestionComplete ? '1px solid #4caf50' : '1px solid #e0e0e0'
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                {ingestionComplete ? (
                  <Box>
                    <Box 
                      sx={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        bgcolor: 'success.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        boxShadow: '0 4px 14px rgba(76, 175, 80, 0.4)'
                      }}
                    >
                      <DoneAllIcon sx={{ fontSize: 40 }} />
                    </Box>
                    
                    <Typography variant="h5" gutterBottom color="success.main" fontWeight="500">
                      Data Import Complete
                    </Typography>
                    
                    <Typography variant="body1" sx={{ mb: 4 }}>
                      Your data has been successfully imported to ClickHouse.
                    </Typography>
                    
                    <Box sx={{ 
                      my: 4, 
                      p: 3, 
                      maxWidth: 500, 
                      mx: 'auto',
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
                    }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Records Imported:</Typography>
                          <Typography variant="h6" color="primary.main">{ingestionResult.recordCount}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Target Table:</Typography>
                          <Typography variant="h6">{ingestionResult.tableName}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Database:</Typography>
                          <Typography variant="h6">{connection.database}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Import Mode:</Typography>
                          <Typography variant="h6">{importMode === ImportMode.CREATE_NEW ? 'Created new table' : 'Appended to table'}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Button 
                      variant="outlined" 
                      color="primary"
                      size="large"
                      onClick={handleReset}
                      sx={{ mt: 2 }}
                    >
                      Start New Import
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <CircularProgress size={60} thickness={4} />
                    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                      Processing Import
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Please wait while your data is being imported...
                    </Typography>
                    <LinearProgress sx={{ width: '80%', maxWidth: 400, mb: 1 }} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        );
        
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box>
      <Box sx={{ 
        mb: 4, 
        pb: 2, 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: '1px solid #eaeaea'
      }}>
        <IconButton 
          onClick={() => navigate('/')} 
          sx={{ 
            mr: 2, 
            bgcolor: 'rgba(63, 81, 181, 0.05)'
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" color="primary.main" fontWeight="500">
          Flat File to ClickHouse
        </Typography>
      </Box>

      <EnhancedStepper activeStep={activeStep} steps={steps} />

      <Fade in={true} timeout={500}>
        <Box sx={{ minHeight: '400px' }}>
          {getStepContent(activeStep)}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #eaeaea' }}>
            <Button
              variant="outlined"
              onClick={activeStep === 0 ? () => navigate('/') : handleBack}
              disabled={activeStep === 3 && ingestionComplete}
              startIcon={activeStep === 0 ? <ArrowBackIcon /> : undefined}
            >
              {activeStep === 0 ? 'Back to Source Selection' : 'Back'}
            </Button>
            
            <Box>
              {activeStep === steps.length - 1 && ingestionComplete && (
                <Button 
                  variant="outlined" 
                  onClick={handleReset} 
                  sx={{ mr: 2 }}
                >
                  New Import
                </Button>
              )}
              
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={isNextDisabled() || (activeStep === 3 && !isLoading && ingestionComplete)}
              >
                {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
};

export default FileToClickHouse;