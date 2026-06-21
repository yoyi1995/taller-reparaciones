'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Container, Typography, Button, Box } from '@mui/material';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/dashboard'); // Redirige al dashboard (que ahora está en la raíz del dashboard)
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
        🔧 Sistema de Gestión de Taller
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
        Gestiona reparaciones, inventario y clientes
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => router.push('/login')}
        sx={{ px: 5, py: 1.5 }}
      >
        Iniciar Sesión
      </Button>
    </Container>
  );
}