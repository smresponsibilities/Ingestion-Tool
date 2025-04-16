import React from 'react';
import { 
  Box, 
  Stepper as MuiStepper, 
  Step, 
  StepLabel, 
  Typography,
  styled
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StorageIcon from '@mui/icons-material/Storage';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SettingsIcon from '@mui/icons-material/Settings';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import FileUploadIcon from '@mui/icons-material/FileUpload';

// Define the possible step icons
const stepIcons: { [key: string]: React.ReactNode } = {
  'Connect to ClickHouse': <StorageIcon />,
  'Select Table & Columns': <FormatListBulletedIcon />,
  'Select Flat File': <FileUploadIcon />,
  'Choose Columns': <FormatListBulletedIcon />,
  'Configure Target': <SettingsIcon />,
  'Configure Export': <SettingsIcon />,
  'Complete': <DoneAllIcon />,
};

// Custom styled components
const StepperContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  position: 'relative',
  marginBottom: theme.spacing(6),
  marginTop: theme.spacing(2),
}));

const StepConnector = styled('div')(({ theme }) => ({
  width: '100%',
  height: 2,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
  marginTop: 12,
  position: 'absolute',
  left: 0,
  right: 0,
  top: 20,
  zIndex: 1,
}));

const ActiveStepConnector = styled('div')<{ width: string }>(({ theme, width }) => ({
  width,
  height: 2,
  backgroundColor: theme.palette.primary.main,
  marginTop: 12,
  position: 'absolute',
  left: 0,
  top: 20,
  zIndex: 2,
  transition: 'width 0.4s ease-in-out',
}));

const StepsWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  position: 'relative',
}));

const StepItemWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  width: '100%',
  maxWidth: '120px',
}));

const StepIconContainer = styled(Box)<{ completed: boolean; active: boolean }>(
  ({ theme, completed, active }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: completed 
      ? theme.palette.success.main 
      : active 
        ? theme.palette.primary.main 
        : theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    color: completed || active ? '#fff' : theme.palette.text.secondary,
    transition: 'all 0.3s ease',
    zIndex: 3,
    boxShadow: completed || active 
      ? '0 4px 8px rgba(0, 0, 0, 0.15)' 
      : 'none',
  })
);

interface EnhancedStepperProps {
  activeStep: number;
  steps: string[];
}

const EnhancedStepper: React.FC<EnhancedStepperProps> = ({ activeStep, steps }) => {
  return (
    <StepperContainer>
      <StepConnector />
      <ActiveStepConnector width={`${(activeStep / (steps.length - 1)) * 100}%`} />
      
      <StepsWrapper>
        {steps.map((label, index) => {
          const completed = index < activeStep;
          const active = index === activeStep;
          
          return (
            <StepItemWrapper 
              key={label}
              sx={{
                position: 'relative',
                maxWidth: {
                  xs: '70px', // More compact on mobile
                  sm: '100px', // Slightly wider on small screens
                  md: '120px', // Full width on medium+ screens
                },
                mx: 0.5, // Add minimal margin to ensure spacing between items
              }}
            >
              <StepIconContainer completed={completed} active={active}>
                {completed ? <CheckCircleIcon /> : stepIcons[label] || index + 1}
              </StepIconContainer>
              
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  fontWeight: active || completed ? 600 : 400,
                  color: active ? 'primary.main' : completed ? 'success.main' : 'text.secondary',
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  lineHeight: 1.2,
                  height: { xs: '2.4em', sm: 'auto' },
                  display: '-webkit-box',
                  WebkitLineClamp: { xs: 2, sm: 1 },
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </Typography>
            </StepItemWrapper>
          );
        })}
      </StepsWrapper>
    </StepperContainer>
  );
};

export default EnhancedStepper;