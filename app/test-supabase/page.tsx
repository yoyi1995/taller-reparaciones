'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Container, Typography, Alert, CircularProgress, Box } from '@mui/material';

export default function TestSupabase() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Intentar obtener datos de la tabla clientes
      const { data, error } = await supabase.from('clientes').select('*');
      
      if (error) throw error;
      
      setStatus('success');
      setMessage(`✅ Conexión exitosa. Hay ${data.length} clientes en la base de datos.`);
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" gutterBottom>
        Prueba de Conexión a Supabase
      </Typography>

      <Box sx={{ mt: 3 }}>
        {status === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography>Probando conexión...</Typography>
          </Box>
        )}

        {status === 'success' && (
          <Alert severity="success">{message}</Alert>
        )}

        {status === 'error' && (
          <Alert severity="error">{message}</Alert>
        )}
      </Box>
    </Container>
  );
}