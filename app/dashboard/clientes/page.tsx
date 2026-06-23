'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Box,
  InputAdornment, Alert, CircularProgress, OutlinedInput, FormControl,
  Grid, Card, CardContent, Divider, Chip
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Print, Person, PhoneIphone, Build
} from '@mui/icons-material';

const TIPOS_EQUIPO = ['Celular', 'Tablet', 'Laptop', 'Computadora', 'Impresora', 'Otro'];

interface ClienteConReparacion {
  id: string;
  nombre: string;
  telefono: string;
  ciudad: string;
  created_at: string;
  equipos?: {
    id: string;
    tipo: string;
    reparaciones?: {
      id: string;
      numero_orden: string;
      descripcion_falla: string;
    }[];
  }[];
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteConReparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [ordenCreada, setOrdenCreada] = useState<string | null>(null);

  const [clienteData, setClienteData] = useState({
    nombre: '',
    telefono: '',
    ciudad: ''
  });

  const [equipoData, setEquipoData] = useState({
    tipo: 'Celular',
    marca: '',
    modelo: '',
    serial_imei: ''
  });

  const [detalleData, setDetalleData] = useState({
    descripcion_falla: '',
    accesorios: '',
    clave_acceso: ''
  });

  async function loadClientes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        equipos (
          id,
          tipo,
          reparaciones (
            numero_orden,
            descripcion_falla,
            id
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadClientes();
  }, []);

  const handleOpenDialog = (cliente?: ClienteConReparacion) => {
    if (cliente) {
      setEditMode(true);
      setCurrentId(cliente.id);
      setClienteData({
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        ciudad: cliente.ciudad || ''
      });
      setEquipoData({ tipo: 'Celular', marca: '', modelo: '', serial_imei: '' });
      setDetalleData({ descripcion_falla: '', accesorios: '', clave_acceso: '' });
    } else {
      setEditMode(false);
      setCurrentId(null);
      setClienteData({ nombre: '', telefono: '', ciudad: '' });
      setEquipoData({ tipo: 'Celular', marca: '', modelo: '', serial_imei: '' });
      setDetalleData({ descripcion_falla: '', accesorios: '', clave_acceso: '' });
    }
    setOrdenCreada(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setOrdenCreada(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editMode && currentId) {
      const { error } = await supabase
        .from('clientes')
        .update(clienteData)
        .eq('id', currentId);

      if (error) {
        setAlert({ type: 'error', message: error.message });
      } else {
        setAlert({ type: 'success', message: 'Cliente actualizado correctamente' });
        loadClientes();
        handleCloseDialog();
      }
    } else {
      try {
        const { data: nuevoCliente, error: errorCliente } = await supabase
          .from('clientes')
          .insert([{
            nombre: clienteData.nombre,
            telefono: clienteData.telefono,
            ciudad: clienteData.ciudad
          }])
          .select()
          .single();

        if (errorCliente) throw errorCliente;

        const { data: nuevoEquipo, error: errorEquipo } = await supabase
          .from('equipos')
          .insert([{
            cliente_id: nuevoCliente.id,
            tipo: equipoData.tipo,
            marca: equipoData.marca,
            modelo: equipoData.modelo,
            serial_imei: equipoData.serial_imei
          }])
          .select()
          .single();

        if (errorEquipo) throw errorEquipo;

        const { data: nuevaRep, error: errorRep } = await supabase
          .from('reparaciones')
          .insert([{
            equipo_id: nuevoEquipo.id,
            descripcion_falla: detalleData.descripcion_falla,
            accesorios: detalleData.accesorios,
            clave_acceso: detalleData.clave_acceso,
            estado: 'Recibido',
            costo_total: 0
          }])
          .select()
          .single();

        if (errorRep) throw errorRep;

        setOrdenCreada(nuevaRep.numero_orden);
        setAlert({
          type: 'success',
          message: `✅ Orden #${nuevaRep.numero_orden} creada exitosamente`
        });
        loadClientes();

      } catch (error: any) {
        setAlert({ type: 'error', message: error.message || 'Error al crear la orden' });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setAlert({ type: 'success', message: 'Cliente eliminado' });
      loadClientes();
    }
  };

  const handleImprimirRecibo = (ordenNumero: string) => {
    router.push(`/dashboard/reparaciones/recibo?orden=${ordenNumero}`)
  };

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.includes(search) ||
    c.ciudad?.toLowerCase().includes(search.toLowerCase())
  );

  // Obtener la última reparación de un cliente
  const getUltimaReparacion = (cliente: ClienteConReparacion) => {
    if (!cliente.equipos || cliente.equipos.length === 0) return null;
    const equipo = cliente.equipos[0];
    if (!equipo.reparaciones || equipo.reparaciones.length === 0) return null;
    return {
      ...equipo.reparaciones[0],
      tipo_equipo: equipo.tipo
    };
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Clientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Cliente + Equipo
        </Button>
      </Box>

      {alert && (
        <Alert
          severity={alert.type}
          sx={{ mb: 2 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <OutlinedInput
          placeholder="Buscar por nombre, teléfono o ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          }
        />
      </FormControl>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Nombre</strong></TableCell>
                <TableCell><strong>Teléfono</strong></TableCell>
                <TableCell><strong>N° Orden</strong></TableCell>
                <TableCell><strong>Tipo Equipo</strong></TableCell>
                <TableCell><strong>Problema</strong></TableCell>
                <TableCell align="right"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No hay clientes registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredClientes.map((cliente) => {
                  const reparacion = getUltimaReparacion(cliente);
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell>{cliente.nombre}</TableCell>
                      <TableCell>{cliente.telefono || '-'}</TableCell>
                      <TableCell>
                        {reparacion?.numero_orden ? (
                          <Chip label={`#${reparacion.numero_orden}`} color="primary" size="small" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{reparacion?.tipo_equipo || '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reparacion?.descripcion_falla || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {reparacion?.numero_orden && (
                          <IconButton
                            color="success"
                            onClick={() => handleImprimirRecibo(reparacion.numero_orden!)}
                            title="Imprimir Recibo"
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <Print />
                          </IconButton>
                        )}
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenDialog(cliente)}
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(cliente.id)}
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

      {/* Dialog para crear/editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Editar Cliente' : 'Nuevo Cliente + Equipo + Orden de Reparación'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {/* SECCIÓN 1: DATOS DEL CLIENTE */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Person sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Datos del Cliente
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Nombre del Cliente *"
                      required
                      value={clienteData.nombre}
                      onChange={(e) => setClienteData({ ...clienteData, nombre: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Celular *"
                      required
                      value={clienteData.telefono}
                      onChange={(e) => setClienteData({ ...clienteData, telefono: e.target.value })}
                      placeholder="Ej: 3001234567"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Ciudad"
                      value={clienteData.ciudad}
                      onChange={(e) => setClienteData({ ...clienteData, ciudad: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Fecha de Ingreso"
                      value={new Date().toLocaleDateString('es-ES', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                      disabled
                      helperText="Se registra automáticamente"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* SECCIÓN 2: DATOS DEL EQUIPO (solo si es nuevo) */}
            {!editMode && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhoneIphone sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Datos del Equipo
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        select
                        label="Tipo de Equipo *"
                        required
                        value={equipoData.tipo}
                        onChange={(e) => setEquipoData({ ...equipoData, tipo: e.target.value })}
                        slotProps={{ select: { native: true } }}
                      >
                        {TIPOS_EQUIPO.map(t => <option key={t} value={t}>{t}</option>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Marca *"
                        required
                        value={equipoData.marca}
                        onChange={(e) => setEquipoData({ ...equipoData, marca: e.target.value })}
                        placeholder="Ej: Samsung, HP"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Modelo"
                        value={equipoData.modelo}
                        onChange={(e) => setEquipoData({ ...equipoData, modelo: e.target.value })}
                        placeholder="Ej: A51, Galaxy S21"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Serial / IMEI"
                        value={equipoData.serial_imei}
                        onChange={(e) => setEquipoData({ ...equipoData, serial_imei: e.target.value })}
                        placeholder="Número de serie o IMEI del equipo"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* SECCIÓN 3: DETALLES DE REPARACIÓN (solo si es nuevo) */}
            {!editMode && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Build sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Detalles de la Reparación
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Descripción de la Falla *"
                        required
                        multiline
                        rows={3}
                        value={detalleData.descripcion_falla}
                        onChange={(e) => setDetalleData({ ...detalleData, descripcion_falla: e.target.value })}
                        placeholder="Describa el problema reportado por el cliente..."
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Accesorios que deja el cliente"
                        multiline
                        rows={2}
                        value={detalleData.accesorios}
                        onChange={(e) => setDetalleData({ ...detalleData, accesorios: e.target.value })}
                        placeholder="Ej: Cargador, cable USB, funda roja, audífonos..."
                        helperText="Escribe los accesorios separados por coma"
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Clave / Patrón de desbloqueo"
                        value={detalleData.clave_acceso}
                        onChange={(e) => setDetalleData({ ...detalleData, clave_acceso: e.target.value })}
                        helperText="Opcional - Si el equipo tiene bloqueo"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Mensaje de éxito con botón de imprimir */}
            {ordenCreada && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography>
                    ✅ Orden #{ordenCreada} creada exitosamente
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<Print />}
                    onClick={() => handleImprimirRecibo(ordenCreada)}
                  >
                    Imprimir Recibo
                  </Button>
                </Box>
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              {ordenCreada ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!ordenCreada && (
              <Button type="submit" variant="contained">
                {editMode ? 'Actualizar Cliente' : 'Guardar e Imprimir Recibo'}
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}