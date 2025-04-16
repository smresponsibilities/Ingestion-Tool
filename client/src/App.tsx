import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { 
  Box, 
  CssBaseline, 
  Container, 
  Typography, 
  Paper,
  ThemeProvider,
  createTheme
} from '@mui/material'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import SourceSelection from './components/SourceSelection'
import ClickHouseToFile from './components/ClickHouseToFile'
import FileToClickHouse from './components/FileToClickHouse'
import './App.css'

// Create a theme instance with better colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#3F51B5',
      light: '#757de8',
      dark: '#002984',
    },
    secondary: {
      main: '#F50057',
      light: '#ff4081',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

function App() {
  const [source, setSource] = useState<string>('')

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <CssBaseline />
        <ToastContainer 
          position="top-right" 
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Box sx={{ 
          minHeight: '100vh', 
          py: 5, 
          background: 'linear-gradient(120deg, #f5f7fa 0%, #e8ebf2 100%)' 
        }}>
          <Container maxWidth="lg">
            <Paper 
              elevation={3} 
              sx={{ 
                p: { xs: 2, sm: 4 }, 
                display: 'flex', 
                flexDirection: 'column',
                minHeight: '80vh',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom 
                align="center"
                sx={{ 
                  mb: 3, 
                  color: 'primary.main',
                  borderBottom: '1px solid #eaeaea',
                  pb: 2
                }}
              >
                ClickHouse & Flat File Data Ingestion Tool
              </Typography>
              
              <Box sx={{ mt: 1, mb: 3, flexGrow: 1 }}>
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <SourceSelection 
                        source={source} 
                        setSource={setSource} 
                      />
                    } 
                  />
                  <Route 
                    path="/clickhouse-to-file" 
                    element={<ClickHouseToFile />} 
                  />
                  <Route 
                    path="/file-to-clickhouse" 
                    element={<FileToClickHouse />} 
                  />
                </Routes>
              </Box>

              <Box sx={{ 
                mt: 'auto', 
                pt: 2, 
                borderTop: '1px solid #eaeaea', 
                textAlign: 'center',
                fontSize: '0.875rem',
                color: 'text.secondary'
              }}>
                <Typography variant="caption">
                  ClickHouse Data Ingestion Tool &copy; {new Date().getFullYear()}
                </Typography>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App
