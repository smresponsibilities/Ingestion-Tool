import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardMedia, 
  CardActionArea 
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StorageIcon from '@mui/icons-material/Storage';
import DescriptionIcon from '@mui/icons-material/Description';

interface SourceSelectionProps {
  source: string;
  setSource: (source: string) => void;
}

const SourceSelection: FC<SourceSelectionProps> = ({ source, setSource }) => {
  const navigate = useNavigate();

  const handleContinue = () => {
    if (source === 'clickhouse') {
      navigate('/clickhouse-to-file');
    } else if (source === 'file') {
      navigate('/file-to-clickhouse');
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom textAlign="center" sx={{ mb: 4 }}>
        Select Your Data Source
      </Typography>
      
      <Grid container spacing={4} justifyContent="center" sx={{ mt: 1 }}>
        <Grid item xs={12} md={5}>
          <Card 
            raised={source === 'clickhouse'}
            sx={{
              height: '100%',
              transition: 'all 0.3s ease',
              transform: source === 'clickhouse' ? 'translateY(-8px)' : 'none',
              border: source === 'clickhouse' ? '2px solid #3F51B5' : 'none',
            }}
          >
            <CardActionArea 
              onClick={() => setSource('clickhouse')}
              sx={{ height: '100%', p: 2 }}
            >
              <Box 
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100px',
                  mb: 2,
                  bgcolor: source === 'clickhouse' ? 'rgba(63, 81, 181, 0.05)' : 'transparent',
                  borderRadius: 2
                }}
              >
                <StorageIcon 
                  sx={{ 
                    fontSize: 80, 
                    color: source === 'clickhouse' ? 'primary.main' : 'action.disabled',
                  }} 
                />
              </Box>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom fontWeight="bold" color={source === 'clickhouse' ? 'primary.main' : 'inherit'}>
                  ClickHouse
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Select ClickHouse as your source to export data to a flat file
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.9rem' }}>
                  Ideal for exporting database tables to CSV format with column selection and join capabilities
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Card 
            raised={source === 'file'}
            sx={{
              height: '100%',
              transition: 'all 0.3s ease',
              transform: source === 'file' ? 'translateY(-8px)' : 'none',
              border: source === 'file' ? '2px solid #3F51B5' : 'none',
            }}
          >
            <CardActionArea 
              onClick={() => setSource('file')}
              sx={{ height: '100%', p: 2 }}
            >
              <Box 
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100px',
                  mb: 2,
                  bgcolor: source === 'file' ? 'rgba(63, 81, 181, 0.05)' : 'transparent',
                  borderRadius: 2
                }}
              >
                <DescriptionIcon 
                  sx={{ 
                    fontSize: 80, 
                    color: source === 'file' ? 'primary.main' : 'action.disabled',
                  }} 
                />
              </Box>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom fontWeight="bold" color={source === 'file' ? 'primary.main' : 'inherit'}>
                  Flat File
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Select a flat file (CSV) as your source to import data into ClickHouse
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.9rem' }}>
                  Perfect for importing CSV data with customizable column mapping and data type selection
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          disabled={!source}
          onClick={handleContinue}
          sx={{ 
            px: 4, 
            py: 1.5, 
            borderRadius: 2,
            boxShadow: '0 4px 10px rgba(63, 81, 181, 0.2)'
          }}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
};

export default SourceSelection;