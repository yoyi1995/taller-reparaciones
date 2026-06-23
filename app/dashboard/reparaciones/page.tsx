'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Box, InputAdornment, Alert, Chip, CircularProgress, Tabs, Tab, MenuItem
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Visibility, Print, FilterList
} from '@mui/icons-material';

interface Reparacion {
  id: string;
  numero_orden: string;
  descripcion_falla: string;
  estado: string;
  costo_total: number;
  fecha_ingreso: string;
  equipos: {
    tipo: string;
    marca: string;
    modelo: string;
    clientes: {
      nombre: string;
      telefono: string;
    };
  };
}

const estados = [
  { value: 'Recibido', color: 'default', label: 'Recibido' },
  { value: 'En diagnóstico', color: 'info', label: 'En diagnóstico' },
  { value: 'En reparación', color: 'warning', label: 'En reparación' },
  { value: 'Listo', color: 'success', label: 'Listo' },
  { value: 'Entregado', color: 'primary', label: 'Entregado' },
];

export default function ReparacionesPage() {
  const router = useRouter();
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [alert, setAlert] = useState<any>(null);

  useEffect(() => {
    loadReparaciones();
  }, []);

  const loadReparaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reparaciones')
      .select(`
        *,
        equipos (
          tipo, marca, modelo,
          clientes (nombre, telefono)
        )
      `)
      .order('numero_orden', { ascending: false });

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setReparaciones(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta reparación?')) return;
    const { error } = await supabase.from('reparaciones').delete().eq('id', id);
    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setAlert({ type: 'success', message: 'Reparación eliminada' });
      loadReparaciones();
    }
  };

  // Filtrar reparaciones
  const filteredReparaciones = reparaciones.filter(rep => {
    const matchSearch = 
      rep.numero_orden?.includes(search) ||
      rep.equipos?.clientes?.nombre.toLowerCase().includes(search.toLowerCase()) ||
      rep.equipos?.clientes?.telefono?.includes(search);
    
    const matchEstado = filterEstado === 'todos' || rep.estado === filterEstado;
    
    return matchSearch && matchEstado;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Reparaciones
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => router.push('/dashboard/clientes')}
        >
          Nueva Reparación
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Barra de búsqueda y filtros */}
<Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
  <TextField
    placeholder="Buscar por N° orden, nombre o teléfono..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    sx={{ flexGrow: 1, minWidth: 250 }}
    slotProps={{
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
      }
    }}
  />

  {/* Filtro por estado (ComboBox) */}
  <TextField
    select
    label="Filtrar por Estado"
    value={filterEstado}
    onChange={(e) => setFilterEstado(e.target.value)}
    sx={{ minWidth: 200 }}
  >
    <MenuItem value="todos">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterList />
        Todos
      </Box>
    </MenuItem>
    {estados.map(estado => (
      <MenuItem key={estado.value} value={estado.value}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={estado.label} color={estado.color as any} size="small" />
          {estado.label}
        </Box>
      </MenuItem>
    ))}
  </TextField>
</Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>N° Orden</strong></TableCell>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell><strong>Equipo</strong></TableCell>
                <TableCell><strong>Fecha</strong></TableCell>
                <TableCell align="center"><strong>Estado</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReparaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    No hay reparaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                filteredReparaciones.map((rep) => {
                  const estadoConfig = estados.find(e => e.value === rep.estado) || estados[0];
                  return (
                    <TableRow key={rep.id} hover>
                      <TableCell>
                        <Chip label={`#${rep.numero_orden}`} color="primary" size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 'bold' }}>{rep.equipos?.clientes?.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rep.equipos?.clientes?.telefono}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{rep.equipos?.tipo} {rep.equipos?.marca}</Typography>
                        <Typography variant="caption">{rep.equipos?.modelo}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(rep.fecha_ingreso).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={estadoConfig.label} color={estadoConfig.color as any} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="info" 
                          onClick={() => router.push(`/dashboard/reparaciones/${rep.id}`)}
                          title="Ver Detalle"
                          size="small"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton 
                          color="success" 
                          onClick={() => router.push(`/dashboard/reparaciones/recibo?orden=${rep.numero_orden}`)}
                          title="Imprimir Recibo"
                          size="small"
                          sx={{ mx: 0.5 }}
                        >
                          <Print />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDelete(rep.id)}
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}