import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  Tooltip,
  Divider,
  Chip,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import StorageIcon from '@mui/icons-material/Storage';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Define the ClickHouse connection interface
export interface ClickHouseConnection {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

export interface SavedConnection extends ClickHouseConnection {
  name: string;
}

export interface ConnectionStatus {
  tested: boolean;
  success: boolean;
  message: string;
}

interface ClickHouseConnectionProps {
  connection: ClickHouseConnection;
  connectionStatus: ConnectionStatus;
  onConnectionChange: (connection: ClickHouseConnection) => void;
  onConnectionStatusChange: (status: ConnectionStatus) => void;
  onConnectionTest: () => Promise<void>;
  requirePassword?: boolean;
}

// Local storage key for saved connections
const SAVED_CONNECTIONS_KEY = 'clickhouse_saved_connections';

// Function to load saved connections from local storage
const loadSavedConnections = (): SavedConnection[] => {
  const savedConnectionsJSON = localStorage.getItem(SAVED_CONNECTIONS_KEY);
  if (savedConnectionsJSON) {
    try {
      return JSON.parse(savedConnectionsJSON);
    } catch (e) {
      console.error('Failed to parse saved connections', e);
    }
  }
  return [];
};

// Function to save connections to local storage
const saveConnectionsToStorage = (connections: SavedConnection[]) => {
  localStorage.setItem(SAVED_CONNECTIONS_KEY, JSON.stringify(connections));
};

const ClickHouseConnectionComponent: React.FC<ClickHouseConnectionProps> = ({
  connection,
  connectionStatus,
  onConnectionChange,
  onConnectionStatusChange,
  onConnectionTest,
  requirePassword = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [showSavedConnections, setShowSavedConnections] = useState(false);
  const [showSaveConnectionDialog, setShowSaveConnectionDialog] = useState(false);
  const [connectionName, setConnectionName] = useState('');

  // Load saved connections from local storage on component mount
  useEffect(() => {
    const connections = loadSavedConnections();
    setSavedConnections(connections);
  }, []);

  // Handle connection input changes
  const handleConnectionChange = (field: keyof ClickHouseConnection) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const updatedConnection = { ...connection, [field]: e.target.value };
    onConnectionChange(updatedConnection);
    
    // Reset connection status when any field changes
    onConnectionStatusChange({ tested: false, success: false, message: '' });
  };

  // Test connection to ClickHouse
  const testConnection = async () => {
    setIsLoading(true);
    setError('');
    try {
      await onConnectionTest();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to connect to ClickHouse');
    } finally {
      setIsLoading(false);
    }
  };

  // Save current connection
  const handleSaveConnection = () => {
    if (!connectionName.trim()) return;
    
    const newConnection: SavedConnection = {
      ...connection,
      name: connectionName
    };
    
    const updatedConnections = [...savedConnections, newConnection];
    setSavedConnections(updatedConnections);
    saveConnectionsToStorage(updatedConnections);
    
    setConnectionName('');
    setShowSaveConnectionDialog(false);
  };

  // Load a saved connection
  const handleLoadConnection = (conn: SavedConnection) => {
    onConnectionChange({
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password: conn.password
    });
    setShowSavedConnections(false);
    // Reset connection status when loading a saved connection
    onConnectionStatusChange({ tested: false, success: false, message: '' });
  };

  // Delete a saved connection
  const handleDeleteConnection = (index: number) => {
    const updatedConnections = [...savedConnections];
    updatedConnections.splice(index, 1);
    setSavedConnections(updatedConnections);
    saveConnectionsToStorage(updatedConnections);
  };

  return (
    <Card elevation={0} sx={{ mb: 4, border: '1px solid #e0e0e0' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h3">
            ClickHouse Connection
          </Typography>
          {connectionStatus.tested && connectionStatus.success && (
            <Chip 
              size="small" 
              color="success" 
              icon={<CheckIcon />} 
              label="Connected" 
              sx={{ ml: 'auto' }} 
            />
          )}
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="Host"
              value={connection.host}
              onChange={handleConnectionChange('host')}
              InputProps={{
                sx: { borderRadius: 1 }
              }}
              helperText="e.g., https://your-server.clickhouse.cloud"
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="Port"
              value={connection.port}
              onChange={handleConnectionChange('port')}
              InputProps={{
                sx: { borderRadius: 1 }
              }}
              helperText="e.g., 8123 for HTTP, 9440 for HTTPS"
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="Database"
              value={connection.database}
              onChange={handleConnectionChange('database')}
              InputProps={{
                sx: { borderRadius: 1 }
              }}
              required
              helperText="Database name"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="Username"
              value={connection.username}
              onChange={handleConnectionChange('username')}
              InputProps={{
                sx: { borderRadius: 1 }
              }}
              required
              helperText="Authentication username"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="Password or JWT Token"
              value={connection.password}
              onChange={handleConnectionChange('password')}
              type="password"
              multiline
              rows={3}
              required={requirePassword}
              InputProps={{
                sx: { borderRadius: 1 }
              }}
              helperText={
                requirePassword 
                  ? "Required for authentication" 
                  : "Enter password or JWT token for authentication"
              }
            />
          </Grid>
        </Grid>
        
        <Box sx={{ 
          mt: 3, 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          gap: 2 
        }}>
          <Button
            variant="contained"
            onClick={testConnection}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <CloudDoneIcon />}
            sx={{ minWidth: '150px' }}
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setShowSavedConnections(true)}
            startIcon={<BookmarkIcon />}
            sx={{ minWidth: '150px' }}
          >
            Saved Connections
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setShowSaveConnectionDialog(true)}
            disabled={!connection.host || !connection.port || !connection.database || !connection.username}
            startIcon={<BookmarkIcon />}
            sx={{ minWidth: '150px' }}
          >
            Save Connection
          </Button>
        </Box>
        
        {connectionStatus.tested && (
          <Alert
            icon={connectionStatus.success ? <CheckIcon /> : <ErrorOutlineIcon />}
            severity={connectionStatus.success ? 'success' : 'error'}
            variant="outlined"
            sx={{ mt: 3 }}
          >
            {connectionStatus.message}
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

      {/* Saved Connections Dialog */}
      <Dialog
        open={showSavedConnections}
        onClose={() => setShowSavedConnections(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BookmarkIcon sx={{ mr: 1, color: 'primary.main' }} />
            Saved Connections
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {savedConnections.length > 0 ? (
            <List>
              {savedConnections.map((conn, index) => (
                <Paper 
                  key={index} 
                  elevation={0} 
                  sx={{ 
                    mb: 1.5, 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1,
                    '&:hover': { 
                      bgcolor: 'rgba(63, 81, 181, 0.05)',
                      borderColor: 'primary.main' 
                    },
                  }}
                >
                  <ListItem 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleLoadConnection(conn)}
                  >
                    <ListItemText 
                      primary={
                        <Typography fontWeight="medium">{conn.name}</Typography>
                      } 
                      secondary={
                        <Box component="span" sx={{ fontSize: '0.8rem' }}>
                          {conn.host}:{conn.port} - {conn.database} (user: {conn.username})
                        </Box>
                      } 
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConnection(index);
                        }}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <Typography>No saved connections available.</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Save frequently used connections for quick access.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowSavedConnections(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Save Connection Dialog */}
      <Dialog
        open={showSaveConnectionDialog}
        onClose={() => setShowSaveConnectionDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BookmarkIcon sx={{ mr: 1, color: 'secondary.main' }} />
            Save Current Connection
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            size="small"
            label="Connection Name"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder="Enter a name for this connection"
            helperText="Use a descriptive name like 'Production' or 'Test Server'"
            InputProps={{
              sx: { borderRadius: 1 }
            }}
          />
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1, fontSize: '0.9rem' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Connection Details:</Typography>
            <Grid container spacing={1}>
              <Grid item xs={4}>Host:</Grid>
              <Grid item xs={8}><b>{connection.host}</b></Grid>
              <Grid item xs={4}>Port:</Grid>
              <Grid item xs={8}><b>{connection.port}</b></Grid>
              <Grid item xs={4}>Database:</Grid>
              <Grid item xs={8}><b>{connection.database}</b></Grid>
              <Grid item xs={4}>Username:</Grid>
              <Grid item xs={8}><b>{connection.username}</b></Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowSaveConnectionDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveConnection} 
            variant="contained" 
            color="primary"
            disabled={!connectionName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ClickHouseConnectionComponent;