/* eslint-disable */
// @ts-nocheck
"use client";
import type { ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../lib/theme';
import './globals.css';
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
