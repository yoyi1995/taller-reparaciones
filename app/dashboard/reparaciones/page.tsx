'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Typography, Button, TextField, Table, TableBody, TableCell,
  OutlinedInput,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Box,
  InputAdornment, Alert, Chip, CircularProgress, MenuItem,
  FormControl, InputLabel, Select, Divider, Stack
} from '@mui/material';
import {
  Add, Edit, Delete, Search, RemoveCircle
} from '@mui/icons-material';

interface Reparacion {
  id: string;
  equipo_id: string;
  descripcion_falla: string;
  estado: string;
  costo_total: number;
  fecha_ingreso: string;
  fecha_entrega: string | null;
  equipos: {
    id: string;
    tipo: string;
    marca: string;
    modelo: string;
    serial_imei: string;
    clientes: {
      id: string;
      nombre: string;
      telefono: string;
    };
  };
}

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

interface Equipo {
  id: string;
  cliente_id: string;
  tipo: string;
  marca: string;
  modelo: string;
  serial_imei: string;
}

interface Inventario {
  id: string;
  nombre_pieza: string;
  stock_actual: number;
  precio_venta: number;
}

interface RepuestoUsado {
  inventario_id: string;
  nombre_pieza: string;
  cantidad: number;
  precio_unitario: number;
}

const estados = [
  { value: 'Recibido', color: 'default', label: 'Recibido' },
  { value: 'En diagnóstico', color: 'info', label: 'En diagnóstico' },
  { value: 'En reparación', color: 'warning', label: 'En reparación' },
  { value: 'Listo', color: 'success', label: 'Listo' },
  { value: 'Entregado', color: 'primary', label: 'Entregado' },
];

export default function ReparacionesPage() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    equipo_id: '',
    nuevo_equipo: false,
    tipo_equipo: '',
    marca_equipo: '',
    modelo_equipo: '',
    serial_equipo: '',
    descripcion_falla: '',
    estado: 'Recibido',
    costo_mano_obra: 0
  });

  const [repuestosUsados, setRepuestosUsados] = useState<RepuestoUsado[]>([]);
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState('');
  const [cantidadRepuesto, setCantidadRepuesto] = useState(1);

  useEffect(() => {
    loadReparaciones();
    loadClientes();
    loadInventario();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      loadEquiposCliente(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  const loadReparaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reparaciones')
      .select(`
        *,
        equipos (
          id, tipo, marca, modelo, serial_imei,
          clientes (id, nombre, telefono)
        )
      `)
      .order('fecha_ingreso', { ascending: false });

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setReparaciones(data || []);
    }
    setLoading(false);
  };

  const loadClientes = async () => {
    const { data } = await supabase.from('clientes').select('*').order('nombre');
    setClientes(data || []);
  };

  const loadEquiposCliente = async (clienteId: string) => {
    const { data } = await supabase.from('equipos').select('*').eq('cliente_id', clienteId);
    setEquipos(data || []);
  };

  const loadInventario = async () => {
    const { data } = await supabase.from('inventario').select('*').gt('stock_actual', 0);
    setInventario(data || []);
  };

  const loadRepuestosUsados = async (reparacionId: string) => {
    const { data } = await supabase
      .from('detalle_reparacion')
      .select(`
        inventario_id, cantidad_usada,
        inventario (nombre_pieza, precio_venta)
      `)
      .eq('reparacion_id', reparacionId);

    const repuestos: RepuestoUsado[] = (data || []).map((d: any) => ({
      inventario_id: d.inventario_id,
      nombre_pieza: d.inventario.nombre_pieza,
      cantidad: d.cantidad_usada,
      precio_unitario: d.inventario.precio_venta || 0
    }));

    setRepuestosUsados(repuestos);
  };

  const handleOpenDialog = async (reparacion?: Reparacion) => {
    if (reparacion) {
      setEditMode(true);
      setCurrentId(reparacion.id);
      setFormData({
        cliente_id: reparacion.equipos.clientes.id,
        equipo_id: reparacion.equipo_id,
        nuevo_equipo: false,
        tipo_equipo: reparacion.equipos.tipo,
        marca_equipo: reparacion.equipos.marca,
        modelo_equipo: reparacion.equipos.modelo,
        serial_equipo: reparacion.equipos.serial_imei,
        descripcion_falla: reparacion.descripcion_falla,
        estado: reparacion.estado,
        costo_mano_obra: reparacion.costo_total
      });
      await loadRepuestosUsados(reparacion.id);
    } else {
      setEditMode(false);
      setCurrentId(null);
      setFormData({
        cliente_id: '', equipo_id: '', nuevo_equipo: false,
        tipo_equipo: '', marca_equipo: '', modelo_equipo: '', serial_equipo: '',
        descripcion_falla: '', estado: 'Recibido', costo_mano_obra: 0
      });
      setRepuestosUsados([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setRepuestoSeleccionado('');
    setCantidadRepuesto(1);
  };

  const agregarRepuesto = () => {
    if (!repuestoSeleccionado) return;
    
    const inv = inventario.find(i => i.id === repuestoSeleccionado);
    if (!inv) return;

    if (cantidadRepuesto > inv.stock_actual) {
      setAlert({ type: 'error', message: `Stock insuficiente. Solo hay ${inv.stock_actual} unidades.` });
      return;
    }

    const existe = repuestosUsados.find(r => r.inventario_id === repuestoSeleccionado);
    if (existe) {
      setRepuestosUsados(repuestosUsados.map(r => 
        r.inventario_id === repuestoSeleccionado 
          ? { ...r, cantidad: r.cantidad + cantidadRepuesto }
          : r
      ));
    } else {
      setRepuestosUsados([...repuestosUsados, {
        inventario_id: inv.id,
        nombre_pieza: inv.nombre_pieza,
        cantidad: cantidadRepuesto,
        precio_unitario: inv.precio_venta || 0
      }]);
    }

    setRepuestoSeleccionado('');
    setCantidadRepuesto(1);
  };

  const quitarRepuesto = (inventarioId: string) => {
    setRepuestosUsados(repuestosUsados.filter(r => r.inventario_id !== inventarioId));
  };

  const calcularTotalRepuestos = () => {
    return repuestosUsados.reduce((total, r) => total + (r.cantidad * r.precio_unitario), 0);
  };

  const calcularCostoTotal = () => {
    return calcularTotalRepuestos() + formData.costo_mano_obra;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let equipoId = formData.equipo_id;

    if (formData.nuevo_equipo) {
      const { data: nuevoEquipo, error: errorEquipo } = await supabase
        .from('equipos')
        .insert([{
          cliente_id: formData.cliente_id,
          tipo: formData.tipo_equipo,
          marca: formData.marca_equipo,
          modelo: formData.modelo_equipo,
          serial_imei: formData.serial_equipo
        }])
        .select()
        .single();

      if (errorEquipo) {
        setAlert({ type: 'error', message: errorEquipo.message });
        return;
      }
      equipoId = nuevoEquipo.id;
    }

    const costoTotal = calcularCostoTotal();

    if (editMode && currentId) {
      // Actualizar reparación
      const { error } = await supabase
        .from('reparaciones')
        .update({
          equipo_id: equipoId,
          descripcion_falla: formData.descripcion_falla,
          estado: formData.estado,
          costo_total: costoTotal,
          fecha_entrega: formData.estado === 'Entregado' ? new Date().toISOString() : null
        })
        .eq('id', currentId);

      if (error) {
        setAlert({ type: 'error', message: error.message });
        return;
      }

      // Eliminar detalles anteriores
      await supabase.from('detalle_reparacion').delete().eq('reparacion_id', currentId);

      // Insertar nuevos detalles y descontar inventario
      for (const rep of repuestosUsados) {
        await supabase.from('detalle_reparacion').insert({
          reparacion_id: currentId,
          inventario_id: rep.inventario_id,
          cantidad_usada: rep.cantidad
        });

        // Descontar del inventario
        // Obtener stock actual
const { data: stockData } = await supabase
  .from('inventario')
  .select('stock_actual')
  .eq('id', rep.inventario_id)
  .single();

// Descontar
if (stockData) {
  const nuevoStock = stockData.stock_actual - rep.cantidad;
  await supabase
    .from('inventario')
    .update({ stock_actual: nuevoStock })
    .eq('id', rep.inventario_id);
}
      }

      setAlert({ type: 'success', message: 'Reparación actualizada' });
    } else {
      // Crear reparación
      const { data: nuevaRep, error } = await supabase
        .from('reparaciones')
        .insert([{
          equipo_id: equipoId,
          descripcion_falla: formData.descripcion_falla,
          estado: formData.estado,
          costo_total: costoTotal
        }])
        .select()
        .single();

      if (error) {
        setAlert({ type: 'error', message: error.message });
        return;
      }

      // Insertar detalles y descontar inventario
      for (const rep of repuestosUsados) {
        await supabase.from('detalle_reparacion').insert({
          reparacion_id: nuevaRep.id,
          inventario_id: rep.inventario_id,
          cantidad_usada: rep.cantidad
        });

        // Obtener stock actual
const { data: stockData } = await supabase
  .from('inventario')
  .select('stock_actual')
  .eq('id', rep.inventario_id)
  .single();

// Descontar
if (stockData) {
  const nuevoStock = stockData.stock_actual - rep.cantidad;
  await supabase
    .from('inventario')
    .update({ stock_actual: nuevoStock })
    .eq('id', rep.inventario_id);
}
      }

      setAlert({ type: 'success', message: 'Reparación creada' });
    }

    loadReparaciones();
    loadInventario();
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta reparación?')) return;

    const { error } = await supabase.from('reparaciones').delete().eq('id', id);

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setAlert({ type: 'success', message: 'Reparación eliminada' });
      loadReparaciones();
    }
  };

  const getEstadoConfig = (estado: string) => {
    return estados.find(e => e.value === estado) || estados[0];
  };

  const filteredReparaciones = reparaciones.filter(r =>
    r.equipos?.clientes?.nombre.toLowerCase().includes(search.toLowerCase()) ||
    r.equipos?.marca.toLowerCase().includes(search.toLowerCase()) ||
    r.equipos?.modelo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Reparaciones</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Nueva Reparación
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <OutlinedInput
          placeholder="Buscar por cliente, equipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startAdornment={
            <InputAdornment position="start"><Search /></InputAdornment>
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
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell><strong>Equipo</strong></TableCell>
                <TableCell><strong>Falla</strong></TableCell>
                <TableCell align="center"><strong>Estado</strong></TableCell>
                <TableCell align="center"><strong>Costo</strong></TableCell>
                <TableCell align="center"><strong>Fecha</strong></TableCell>
                <TableCell align="right"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReparaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    No hay reparaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                filteredReparaciones.map((rep) => {
                  const estadoConfig = getEstadoConfig(rep.estado);
                  return (
                    <TableRow key={rep.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {rep.equipos?.clientes?.nombre || 'Sin cliente'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rep.equipos?.clientes?.telefono || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {rep.equipos?.tipo} {rep.equipos?.marca}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rep.equipos?.modelo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          maxWidth: 200, overflow: 'hidden', 
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {rep.descripcion_falla}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={estadoConfig.label} color={estadoConfig.color as any} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontWeight: 'bold' }}>
                          ${rep.costo_total?.toFixed(2) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption">
                          {new Date(rep.fecha_ingreso).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="primary" onClick={() => handleOpenDialog(rep)}>
                          <Edit />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDelete(rep.id)}>
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
          {editMode ? 'Editar Reparación' : 'Nueva Reparación'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {/* Cliente */}
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Cliente *</InputLabel>
              <Select
                value={formData.cliente_id}
                label="Cliente *"
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value, equipo_id: '' })}
              >
                {clientes.map((cliente) => (
                  <MenuItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre} - {cliente.telefono || 'Sin teléfono'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Equipo */}
            {formData.cliente_id && (
              <>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant={formData.nuevo_equipo ? 'outlined' : 'contained'}
                    onClick={() => setFormData({ ...formData, nuevo_equipo: false })}
                    sx={{ mr: 1 }}
                  >
                    Equipo Existente
                  </Button>
                  <Button
                    variant={formData.nuevo_equipo ? 'contained' : 'outlined'}
                    onClick={() => setFormData({ ...formData, nuevo_equipo: true })}
                  >
                    Nuevo Equipo
                  </Button>
                </Box>

                {!formData.nuevo_equipo ? (
                  <FormControl fullWidth margin="dense" required>
                    <InputLabel>Equipo *</InputLabel>
                    <Select
                      value={formData.equipo_id}
                      label="Equipo *"
                      onChange={(e) => setFormData({ ...formData, equipo_id: e.target.value })}
                    >
                      {equipos.map((equipo) => (
                        <MenuItem key={equipo.id} value={equipo.id}>
                          {equipo.tipo} {equipo.marca} {equipo.modelo}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      margin="dense" label="Tipo de Equipo *" fullWidth required
                      value={formData.tipo_equipo}
                      onChange={(e) => setFormData({ ...formData, tipo_equipo: e.target.value })}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        margin="dense" label="Marca *" fullWidth required
                        value={formData.marca_equipo}
                        onChange={(e) => setFormData({ ...formData, marca_equipo: e.target.value })}
                      />
                      <TextField
                        margin="dense" label="Modelo" fullWidth
                        value={formData.modelo_equipo}
                        onChange={(e) => setFormData({ ...formData, modelo_equipo: e.target.value })}
                      />
                    </Box>
                    <TextField
                      margin="dense" label="Serial / IMEI" fullWidth
                      value={formData.serial_equipo}
                      onChange={(e) => setFormData({ ...formData, serial_equipo: e.target.value })}
                    />
                  </Box>
                )}
              </>
            )}

            {/* Descripción */}
            <TextField
              margin="dense" label="Descripción de la Falla *" fullWidth required
              multiline rows={3}
              value={formData.descripcion_falla}
              onChange={(e) => setFormData({ ...formData, descripcion_falla: e.target.value })}
            />

            {/* Estado y Mano de Obra */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.estado}
                  label="Estado"
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                >
                  {estados.map((estado) => (
                    <MenuItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                margin="dense" label="Mano de Obra" type="number" fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={formData.costo_mano_obra}
                onChange={(e) => setFormData({ ...formData, costo_mano_obra: parseFloat(e.target.value) || 0 })}
              />
            </Box>

            {/* SECCIÓN DE REPUESTOS */}
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>
              Repuestos Usados
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Seleccionar Repuesto</InputLabel>
                <Select
                  value={repuestoSeleccionado}
                  label="Seleccionar Repuesto"
                  onChange={(e) => setRepuestoSeleccionado(e.target.value)}
                >
                  {inventario.map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>
                      {inv.nombre_pieza} (Stock: {inv.stock_actual}) - ${inv.precio_venta}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Cantidad" type="number" sx={{ width: 120 }}
                slotProps={{ htmlInput: { min: 1 } }}
                value={cantidadRepuesto}
                onChange={(e) => setCantidadRepuesto(parseInt(e.target.value) || 1)}
              />
              <Button
                variant="outlined"
                onClick={agregarRepuesto}
                disabled={!repuestoSeleccionado}
                sx={{ minWidth: 100 }}
              >
                Agregar
              </Button>
            </Box>

            {/* Tabla de repuestos usados */}
            {repuestosUsados.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Repuesto</strong></TableCell>
                      <TableCell align="center"><strong>Cantidad</strong></TableCell>
                      <TableCell align="right"><strong>P. Unitario</strong></TableCell>
                      <TableCell align="right"><strong>Subtotal</strong></TableCell>
                      <TableCell align="right"><strong>Acción</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {repuestosUsados.map((rep) => (
                      <TableRow key={rep.inventario_id}>
                        <TableCell>{rep.nombre_pieza}</TableCell>
                        <TableCell align="center">{rep.cantidad}</TableCell>
                        <TableCell align="right">${rep.precio_unitario.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          ${(rep.cantidad * rep.precio_unitario).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => quitarRepuesto(rep.inventario_id)}>
                            <RemoveCircle fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell colSpan={3} align="right"><strong>Total Repuestos:</strong></TableCell>
                      <TableCell align="right"><strong>${calcularTotalRepuestos().toFixed(2)}</strong></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Total Final */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Mano de Obra:</Typography>
                <Typography variant="subtitle1">${formData.costo_mano_obra.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Repuestos:</Typography>
                <Typography variant="subtitle1">${calcularTotalRepuestos().toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>TOTAL:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }} color="primary">
                  ${calcularCostoTotal().toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {editMode ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}