'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { ArrowBack, Print } from '@mui/icons-material';

export default function ReciboPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ordenNumero = searchParams.get('orden');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ordenNumero) {
      loadData();
    } else {
      setError('No se especificó número de orden');
      setLoading(false);
    }
  }, [ordenNumero]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('reparaciones')
        .select(`
          *,
          equipos (
            tipo,
            marca,
            modelo,
            serial_imei,
            clientes (
              nombre,
              telefono,
              ciudad
            )
          )
        `)
        .eq('numero_orden', ordenNumero)
        .single();

      if (error) {
        console.error('Error al cargar datos:', error);
        setError('No se encontró la orden #' + ordenNumero);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'No se encontró la orden'}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => router.back()}>
          Volver
        </Button>
      </Box>
    );
  }

  const accesorios = data.accesorios ? data.accesorios.split(',').filter((a: string) => a.trim()) : [];

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Botones (NO se imprimen) */}
<Box className="no-print" sx={{ display: 'flex', gap: 2, mb: 3 }}>
  <Button 
    variant="outlined" 
    startIcon={<ArrowBack />} 
    onClick={() => router.back()}
  >
    Volver
  </Button>
  <Button 
    variant="contained" 
    startIcon={<Print />} 
    onClick={handlePrint}
    color="success"
  >
    Imprimir Recibo
  </Button>
</Box>

      {/* RECIBO - Solo esto se imprime */}
      <Box className="recibo-print" sx={{
        maxWidth: 800,
        mx: 'auto',
        p: 3,
        bgcolor: 'white',
        border: '2px solid #000',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        '@media print': {
          maxWidth: '80mm',
          border: 'none',
          padding: '5mm',
          boxShadow: 'none'
        }
      }}>
        {/* Encabezado */}
        <Box sx={{ textAlign: 'center', mb: 2, borderBottom: '2px solid #000', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '18px', mb: 0.5 }}>
            TALLER DE REPARACIONES
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            Sistema de Gestión de Órdenes
          </Typography>
          <Box sx={{ 
            border: '2px solid #000', 
            p: 1, 
            display: 'inline-block',
            mb: 1
          }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '16px' }}>
              ORDEN N°: {data.numero_orden}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ display: 'block' }}>
            <strong>Fecha:</strong>{' '}
            {new Date(data.fecha_ingreso).toLocaleDateString('es-ES', {
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit', 
              minute: '2-digit'
            })}
          </Typography>
        </Box>

        {/* Datos del Cliente */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ 
            bgcolor: '#000', 
            color: 'white', 
            p: 0.5, 
            mb: 0.5, 
            fontWeight: 'bold',
            fontSize: '13px'
          }}>
            DATOS DEL CLIENTE
          </Typography>
          <Box sx={{ border: '1px solid #000', p: 1 }}>
            <Typography sx={{ fontSize: '13px', mb: 0.3 }}><strong>Nombre:</strong> {data.equipos?.clientes?.nombre || 'N/A'}</Typography>
            <Typography sx={{ fontSize: '13px', mb: 0.3 }}><strong>Celular:</strong> {data.equipos?.clientes?.telefono || 'N/A'}</Typography>
            <Typography sx={{ fontSize: '13px' }}><strong>Ciudad:</strong> {data.equipos?.clientes?.ciudad || 'N/A'}</Typography>
          </Box>
        </Box>

        {/* Datos del Equipo */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ 
            bgcolor: '#000', 
            color: 'white', 
            p: 0.5, 
            mb: 0.5, 
            fontWeight: 'bold',
            fontSize: '13px'
          }}>
            DATOS DEL EQUIPO
          </Typography>
          <Box sx={{ border: '1px solid #000', p: 1 }}>
            <Typography sx={{ fontSize: '13px', mb: 0.3 }}><strong>Tipo:</strong> {data.equipos?.tipo || 'N/A'}</Typography>
            <Typography sx={{ fontSize: '13px', mb: 0.3 }}><strong>Marca:</strong> {data.equipos?.marca || 'N/A'}</Typography>
            <Typography sx={{ fontSize: '13px', mb: 0.3 }}><strong>Modelo:</strong> {data.equipos?.modelo || 'N/A'}</Typography>
            <Typography sx={{ fontSize: '13px' }}><strong>Serial/IMEI:</strong> {data.equipos?.serial_imei || 'N/A'}</Typography>
          </Box>
        </Box>

        {/* Descripción de la Falla */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ 
            bgcolor: '#000', 
            color: 'white', 
            p: 0.5, 
            mb: 0.5, 
            fontWeight: 'bold',
            fontSize: '13px'
          }}>
            FALLA REPORTADA
          </Typography>
          <Box sx={{ border: '1px solid #000', p: 1, minHeight: 40 }}>
            <Typography sx={{ fontSize: '13px' }}>{data.descripcion_falla || 'Sin descripción'}</Typography>
          </Box>
        </Box>

        {/* Accesorios */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ 
            bgcolor: '#000', 
            color: 'white', 
            p: 0.5, 
            mb: 0.5, 
            fontWeight: 'bold',
            fontSize: '13px'
          }}>
            ACCESORIOS
          </Typography>
          <Box sx={{ border: '1px solid #000', p: 1 }}>
            {accesorios.length > 0 ? (
              accesorios.map((acc: string, i: number) => (
                <Typography key={i} sx={{ fontSize: '13px' }}>✓ {acc.trim()}</Typography>
              ))
            ) : (
              <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>Sin accesorios</Typography>
            )}
          </Box>
        </Box>

        {/* Clave de acceso */}
        {data.clave_acceso && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ 
              bgcolor: '#000', 
              color: 'white', 
              p: 0.5, 
              mb: 0.5, 
              fontWeight: 'bold',
              fontSize: '13px'
            }}>
              CLAVE / PATRÓN
            </Typography>
            <Box sx={{ border: '1px solid #000', p: 1, bgcolor: '#fff3cd' }}>
              <Typography sx={{ fontWeight: 'bold', fontSize: '13px' }}>{data.clave_acceso}</Typography>
            </Box>
          </Box>
        )}

       

        {/* Firmas */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mt: 3 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 'bold' }}>Cliente</Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mt: 3 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 'bold' }}>Técnico</Typography>
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 3, pt: 1, borderTop: '1px dashed #000', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 'bold' }}>
            CONSERVE ESTE RECIBO PARA RECLAMAR SU EQUIPO
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}