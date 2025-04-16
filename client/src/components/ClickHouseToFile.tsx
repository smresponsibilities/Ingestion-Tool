import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  FormGroup,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
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
  Chip,
  Tooltip,
  Fade,
  LinearProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import StorageIcon from '@mui/icons-material/Storage';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SettingsIcon from '@mui/icons-material/Settings';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import api from '../services/api';
import ClickHouseConnectionComponent, { ClickHouseConnection, ConnectionStatus } from './ClickHouseConnection';
import EnhancedStepper from './EnhancedStepper';

interface JoinTableConfig {
  table: string;
  mainKey: string;
  joinKey: string;
}

interface JoinConfig {
  tables: JoinTableConfig[];
  enabled: boolean;
}

interface Column {
  name: string;
  type: string;
  selected: boolean;
}

const initialConnection: ClickHouseConnection = {
  host: 'https://rwbuwo35w9.germanywestcentral.azure.clickhouse.cloud',
  port: '8443',
  database: 'default',
  username: 'default',
  password: '',
};

const initialJoinConfig: JoinConfig = {
  tables: [],
  enabled: false,
};

const ClickHouseToFile = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [connection, setConnection] = useState<ClickHouseConnection>(initialConnection);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ tested: false, success: false, message: '' });
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [fileName, setFileName] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinConfig, setJoinConfig] = useState<JoinConfig>(initialJoinConfig);
  const [availableJoinTables, setAvailableJoinTables] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [ingestionComplete, setIngestionComplete] = useState(false);
  const [ingestionResult, setIngestionResult] = useState({ success: false, recordCount: 0, fileName: '' });

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
      
      if (response.success) {
        fetchTables();
      }
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

  const fetchTables = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getTables();
      setTables(data);
      setAvailableJoinTables(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch tables');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchColumns = async (tableName: string) => {
    if (!tableName) return;
    
    setIsLoading(true);
    setError('');
    try {
      const columnsData = await api.getColumns(tableName);
      
      const formattedColumns: Column[] = columnsData.map((col: any) => ({
        name: col.name,
        type: col.type,
        selected: true,
      }));
      
      setColumns(formattedColumns);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch columns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    fetchColumns(tableName);
  };

  const handleColumnToggle = (index: number) => {
    const updatedColumns = [...columns];
    updatedColumns[index].selected = !updatedColumns[index].selected;
    setColumns(updatedColumns);
  };

  const handleSelectAllColumns = () => {
    const allSelected = columns.every(col => col.selected);
    const updatedColumns = columns.map(col => ({
      ...col,
      selected: !allSelected,
    }));
    setColumns(updatedColumns);
  };

  const handleAddJoinTable = () => {
    setJoinConfig({
      ...joinConfig,
      tables: [
        ...joinConfig.tables,
        { table: '', mainKey: '', joinKey: '' },
      ],
    });
  };

  const handleJoinTableChange = (index: number, field: keyof JoinTableConfig, value: string) => {
    const updatedTables = [...joinConfig.tables];
    updatedTables[index] = { ...updatedTables[index], [field]: value };
    setJoinConfig({ ...joinConfig, tables: updatedTables });
  };

  const handleRemoveJoinTable = (index: number) => {
    const updatedTables = joinConfig.tables.filter((_, i) => i !== index);
    setJoinConfig({ ...joinConfig, tables: updatedTables });
  };

  const handlePreviewData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const selectedColumns = columns.filter(col => col.selected).map(col => col.name);
      const data = await api.previewData(selectedTable, selectedColumns);
      
      setPreviewData(data);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to preview data');
    } finally {
      setIsLoading(false);
    }
  };

  const startIngestion = async () => {
    setIsLoading(true);
    setError('');
    try {
      const selectedColumns = columns.filter(col => col.selected).map(col => col.name);
      
      const response = await api.ingestData({
        source: 'clickhouse',
        target: 'flatfile',
        tables: [selectedTable],
        columns: { [selectedTable]: selectedColumns },
        targetFile: fileName || `${selectedTable}_export.csv`,
        delimiter
      });
      
      if (response.success) {
        setIngestionComplete(true);
        setIngestionResult({
          success: true,
          recordCount: response.records,
          fileName: response.filePath || `${selectedTable}_export.csv`,
        });
        setActiveStep(3);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to transfer data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (ingestionResult.fileName) {
      api.downloadFile(ingestionResult.fileName);
    }
  };

  const getSteps = () => {
    return ['Connect to ClickHouse', 'Select Table & Columns', 'Configure Export', 'Complete'];
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
    setSelectedTable('');
    setColumns([]);
    setFileName('');
    setDelimiter(',');
    setJoinConfig(initialJoinConfig);
    setIngestionComplete(false);
    setIngestionResult({ success: false, recordCount: 0, fileName: '' });
  };

  const isNextDisabled = () => {
    switch (activeStep) {
      case 0:
        return !connectionStatus.success;
      case 1:
        return !selectedTable || columns.filter(c => c.selected).length === 0;
      case 2:
        return false;
      default:
        return false;
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
          ClickHouse to Flat File
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
                  New Export
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

  function getStepContent(step: number) {
    switch (step) {
      case 0:
        return (
          <ClickHouseConnectionComponent
            connection={connection}
            connectionStatus={connectionStatus}
            onConnectionChange={setConnection}
            onConnectionStatusChange={setConnectionStatus}
            onConnectionTest={testConnection}
          />
        );
        
      case 1:
        return (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center',
                color: 'primary.main'
              }}>
                <StorageIcon sx={{ mr: 1 }} />
                Select Table and Columns
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {tables.length > 0 ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight="500">
                    Available Tables:
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1, 
                    mb: 4,
                    maxHeight: '150px',
                    overflow: 'auto',
                    p: 1,
                    border: '1px solid #eaeaea',
                    borderRadius: 1
                  }}>
                    {tables.map((table) => (
                      <Chip
                        key={table}
                        label={table}
                        onClick={() => handleTableSelect(table)}
                        color={selectedTable === table ? 'primary' : 'default'}
                        variant={selectedTable === table ? 'filled' : 'outlined'}
                        sx={{ 
                          px: 1,
                          '&:hover': {
                            bgcolor: selectedTable === table ? 'primary.main' : 'rgba(63, 81, 181, 0.1)',
                          }
                        }}
                      />
                    ))}
                  </Box>
                  
                  {selectedTable && (
                    <Box sx={{ mt: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="500">
                          Columns in <Chip label={selectedTable} size="small" color="primary" sx={{ ml: 1 }} />
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button 
                            onClick={handlePreviewData}
                            disabled={isLoading || columns.filter(col => col.selected).length === 0}
                            startIcon={<VisibilityIcon />}
                            variant="outlined"
                            size="small"
                          >
                            Preview Data
                          </Button>
                          <Button 
                            onClick={handleSelectAllColumns}
                            size="small"
                            variant="text"
                          >
                            {columns.every(col => col.selected) ? 'Deselect All' : 'Select All'}
                          </Button>
                        </Box>
                      </Box>
                      
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          maxHeight: '300px', 
                          overflow: 'auto',
                          borderRadius: 1
                        }}
                      >
                        <TableContainer>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell padding="checkbox" width="60px">Select</TableCell>
                                <TableCell>Column Name</TableCell>
                                <TableCell>Data Type</TableCell>
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
                                    <Chip 
                                      label={column.type} 
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.75rem' }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </Box>
                  )}
                  
                  <Dialog
                    open={showPreview}
                    onClose={() => setShowPreview(false)}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                  >
                    <DialogTitle>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <VisibilityIcon sx={{ mr: 1, color: 'primary.main' }} />
                        Data Preview: {selectedTable}
                      </Box>
                    </DialogTitle>
                    <DialogContent dividers>
                      {previewData.length > 0 ? (
                        <Box>
                          <Typography variant="caption" color="textSecondary" paragraph>
                            Showing the first {previewData.length} records from the selected table with your column selection.
                          </Typography>
                          <TableContainer sx={{ maxHeight: 400 }}>
                            <Table stickyHeader>
                              <TableHead>
                                <TableRow>
                                  {Object.keys(previewData[0]).map((key) => (
                                    <TableCell key={key} sx={{ fontWeight: 'bold' }}>{key}</TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {previewData.map((row, rowIndex) => (
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
                        </Box>
                      ) : (
                        <Typography>No preview data available</Typography>
                      )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                      <Button onClick={() => setShowPreview(false)}>Close</Button>
                    </DialogActions>
                  </Dialog>
                  
                  <Card variant="outlined" sx={{ mt: 4, backgroundColor: 'rgba(63, 81, 181, 0.02)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Chip 
                          label="BONUS" 
                          size="small" 
                          color="secondary" 
                          sx={{ mr: 1, fontWeight: 'bold', backgroundColor: '#ff0066' }} 
                        />
                        <Typography variant="h6" color="#ff0066">
                          Multi-Table Join (Optional)
                        </Typography>
                      </Box>
                      
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={joinConfig.enabled}
                            onChange={(e) => setJoinConfig({ ...joinConfig, enabled: e.target.checked })}
                          />
                        }
                        label="Enable table joins"
                      />
                      
                      {joinConfig.enabled && (
                        <Box sx={{ mt: 2 }}>
                          {joinConfig.tables.map((joinTable, index) => (
                            <Box 
                              key={index}
                              sx={{
                                mb: 2,
                                border: '1px solid pink',
                                borderRadius: '4px',
                                padding: 2,
                                position: 'relative'
                              }}
                            >
                              <Typography variant="subtitle2" align="center" sx={{ mb: 2, fontWeight: 500 }}>
                                Join Configuration {index + 1}
                              </Typography>
                              
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={3}>
                                  <TextField
                                    select
                                    fullWidth
                                    label="Select table"
                                    value={joinTable.table}
                                    onChange={(e) => handleJoinTableChange(index, 'table', e.target.value)}
                                    SelectProps={{
                                      native: true,
                                    }}
                                    size="small"
                                  >
                                    <option value="">Select table</option>
                                    {availableJoinTables
                                      .filter(t => t !== selectedTable)
                                      .map(table => (
                                        <option key={table} value={table}>
                                          {table}
                                        </option>
                                      ))}
                                  </TextField>
                                </Grid>
                                <Grid item xs={12} sm={3.5}>
                                  <TextField
                                    fullWidth
                                    label="Main Table Key"
                                    value={joinTable.mainKey}
                                    onChange={(e) => handleJoinTableChange(index, 'mainKey', e.target.value)}
                                    size="small"
                                  />
                                </Grid>
                                <Grid item xs={12} sm={3.5}>
                                  <TextField
                                    fullWidth
                                    label="Join Table Key"
                                    value={joinTable.joinKey}
                                    onChange={(e) => handleJoinTableChange(index, 'joinKey', e.target.value)}
                                    size="small"
                                  />
                                </Grid>
                                <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => handleRemoveJoinTable(index)}
                                    size="small"
                                  >
                                    Remove
                                  </Button>
                                </Grid>
                              </Grid>
                            </Box>
                          ))}
                          
                          <Button
                            variant="outlined"
                            onClick={handleAddJoinTable}
                            startIcon={<span>+</span>}
                            sx={{ mt: 1 }}
                            color="secondary"
                          >
                            Add Join Table
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="textSecondary">
                    No tables available. Please check your connection settings.
                  </Typography>
                </Box>
              )}
              
              {error && <Alert severity="error" variant="outlined" sx={{ mt: 3 }}>{error}</Alert>}
            </CardContent>
          </Card>
        );
        
      case 2:
        return (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center',
                color: 'primary.main'
              }}>
                <SettingsIcon sx={{ mr: 1 }} />
                Configure Export
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Output File Name"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    margin="normal"
                    helperText={`Default: ${selectedTable}_export.csv`}
                    InputProps={{
                      endAdornment: <Box component="span" sx={{ color: 'text.secondary' }}>.csv</Box>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="CSV Delimiter"
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    margin="normal"
                    helperText="Character used to separate values (default is comma)"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                  Export Summary:
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 3, 
                    borderRadius: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.01)'
                  }}
                >
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom color="text.secondary">
                        Source:
                      </Typography>
                      <Typography><strong>Database:</strong> {connection.database}</Typography>
                      <Typography><strong>Table:</strong> {selectedTable}</Typography>
                      <Typography><strong>Selected Columns:</strong> {columns.filter(c => c.selected).length} of {columns.length}</Typography>
                      <Typography><strong>Multi-Table Join:</strong> {joinConfig.enabled ? `Yes (${joinConfig.tables.length} tables)` : 'No'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom color="text.secondary">
                        Target:
                      </Typography>
                      <Typography><strong>Output Format:</strong> CSV</Typography>
                      <Typography><strong>Output File:</strong> {fileName || `${selectedTable}_export`}.csv</Typography>
                      <Typography><strong>Delimiter:</strong> "{delimiter}"</Typography>
                    </Grid>
                  </Grid>
                  
                  <Alert 
                    severity="info" 
                    variant="outlined"
                    icon={<InfoIcon />}
                    sx={{ mt: 3 }}
                  >
                    The exported file will be available for download once the export process completes.
                  </Alert>
                </Paper>
              </Box>
              
              {error && <Alert severity="error" variant="outlined" sx={{ mt: 3 }}>{error}</Alert>}
            </CardContent>
          </Card>
        );
        
      case 3:
        return (
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
                    Export Complete
                  </Typography>
                  
                  <Typography variant="body1" sx={{ mb: 4 }}>
                    Your data has been successfully exported from ClickHouse.
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
                        <Typography variant="body2" color="text.secondary">Records Exported:</Typography>
                        <Typography variant="h6" color="primary.main">{ingestionResult.recordCount}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">File Name:</Typography>
                        <Typography variant="h6">{ingestionResult.fileName}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Source:</Typography>
                        <Typography variant="body1">{connection.database}.{selectedTable}</Typography>
                      </Grid>
                      <Grid item xs={12} sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<DownloadIcon />}
                          onClick={handleDownload}
                          size="large"
                          fullWidth
                          sx={{ py: 1.5 }}
                        >
                          Download File
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={handleReset}
                    sx={{ mt: 2 }}
                  >
                    Start New Export
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <CircularProgress size={60} thickness={4} />
                  <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                    Processing Export
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Please wait while your data is being exported...
                  </Typography>
                  <LinearProgress sx={{ width: '80%', maxWidth: 400, mb: 1 }} />
                </Box>
              )}
            </CardContent>
          </Card>
        );
        
      default:
        return 'Unknown step';
    }
  }
};

export default ClickHouseToFile;