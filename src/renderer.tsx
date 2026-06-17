import React from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { App } from './renderer/App';

// Material 3-flavoured theme: calm surfaces, rounded corners, soft elevation.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f5b92' },
    background: { default: '#f7f7fb', paper: '#ffffff' },
  },
  shape: { borderRadius: 16 },
  typography: { fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif' },
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
