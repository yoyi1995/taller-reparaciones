'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Typography, Box, Card, CardContent, Grid, Button,
  TextField, IconButton, Alert, CircularProgress,
  Divider, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem
} from '@mui/material';
import {
  ArrowBack, Save, Print, Add, Delete,
  Build, Person, PhoneIphone, Description
} from '@mui/icons-material';

interface Inventario {
  id: string;
  nombre_pieza: string;
  stock_actual: number;
  precio_venta: number;
}

interface RepuestoUsado {
  inventario_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export default function ReparacionDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reparacion, setReparacion] = useState<any>(null);
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [repuestosUsados, setRepuestosUsados] = useState<RepuestoUsado[]>([]);
  const [alert, setAlert] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    diagnostico: '',
    mano_obra: 0,
    estado: 'Recibido'
  });

  const [openRepuestoDialog, setOpenRepuestoDialog] = useState(false);
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState('');
  const [cantidadRepuesto, setCantidadRepuesto] = useState(1);

  useEffect(() => {
    if (params.id) {
      loadReparacion();
      loadInventario();
    }
  }, [params.id]);

  const loadReparacion = async () => {
    const { data, error } = await supabase
      .from('reparaciones')
      .select(`
        *,
        equipos (
          tipo, marca, modelo, serial_imei,
          clientes (nombre, telefono, ciudad)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setReparacion(data);
      setFormData({
        diagnostico: data.diagnostico || '',
        mano_obra: data.costo_mano_obra || 0,
        estado: data.estado
      });
      loadRepuestosUsados(data.id);
    }
    setLoading(false);
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
      nombre: d.inventario.nombre_pieza,
      cantidad: d.cantidad_usada,
      precio_unitario: d.inventario.precio_venta || 0
    }));

    setRepuestosUsados(repuestos);
  };

  const loadInventario = async () => {
    const { data } = await supabase
      .from('inventario')
      .select('*')
      .gt('stock_actual', 0)
      .order('nombre_pieza');
    setInventario(data || []);
  };

  const handleAgregarRepuesto = async () => {
    if (!repuestoSeleccionado || cantidadRepuesto < 1) return;

    const inv = inventario.find(i => i.id === repuestoSeleccionado);
    if (!inv) return;

    if (cantidadRepuesto > inv.stock_actual) {
      setAlert({ type: 'error', message: `Stock insuficiente. Solo hay ${inv.stock_actual} unidades.` });
      return;
    }

    // Verificar si ya existe
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
        nombre: inv.nombre_pieza,
        cantidad: cantidadRepuesto,
        precio_unitario: inv.precio_venta || 0
      }]);
    }

    setRepuestoSeleccionado('');
    setCantidadRepuesto(1);
    setOpenRepuestoDialog(false);
  };

  const handleQuitarRepuesto = (inventarioId: string) => {
    setRepuestosUsados(repuestosUsados.filter(r => r.inventario_id !== inventarioId));
  };

  const handleGuardar = async () => {
    setSaving(true);

    try {
      // Calcular total repuestos
      const totalRepuestos = repuestosUsados.reduce((sum, r) => 
        sum + (r.cantidad * r.precio_unitario), 0
      );

      const costoTotal = totalRepuestos + formData.mano_obra;

      // Actualizar reparación
      const { error } = await supabase
        .from('reparaciones')
        .update({
          diagnostico: formData.diagnostico,
          costo_mano_obra: formData.mano_obra,
          estado: formData.estado,
          costo_total: costoTotal,
          fecha_entrega: formData.estado === 'Entregado' ? new Date().toISOString() : null
        })
        .eq('id', params.id);

      if (error) throw error;

      // Eliminar detalles anteriores
      await supabase.from('detalle_reparacion').delete().eq('reparacion_id', params.id);

      // Insertar nuevos detalles y descontar inventario
      for (const rep of repuestosUsados) {
        await supabase.from('detalle_reparacion').insert({
          reparacion_id: params.id,
          inventario_id: rep.inventario_id,
          cantidad_usada: rep.cantidad
        });

        // Descontar del inventario
        const { data: stockData } = await supabase
          .from('inventario')
          .select('stock_actual')
          .eq('id', rep.inventario_id)
          .single();

        if (stockData) {
          const nuevoStock = Math.max(0, stockData.stock_actual - rep.cantidad);
          await supabase
            .from('inventario')
            .update({ stock_actual: nuevoStock })
            .eq('id', rep.inventario_id);
        }
      }

      setAlert({ type: 'success', message: 'Reparación guardada correctamente' });
      loadReparacion();

    } catch (error: any) {
      setAlert({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const calcularTotalRepuestos = () => {
    return repuestosUsados.reduce((sum, r) => sum + (r.cantidad * r.precio_unitario), 0);
  };

  const calcularTotalGeneral = () => {
    return calcularTotalRepuestos() + formData.mano_obra;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!reparacion) {
    return <Alert severity="error">Reparación no encontrada</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Reparación #{reparacion.numero_orden}
          </Typography>
          <Chip label={reparacion.estado} color="primary" sx={{ mt: 1 }} />
        </Box>
        <Button
          variant="contained"
          startIcon={<Print />}
          onClick={() => router.push(`/dashboard/reparaciones/recibo?orden=${reparacion.numero_orden}`)}
        >
          Imprimir
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<Save />}
          onClick={handleGuardar}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* SECCIÓN 1: DATOS DEL CLIENTE */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Person sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Datos del Cliente
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography><strong>Nombre:</strong> {reparacion.equipos.clientes.nombre}</Typography>
              <Typography><strong>Teléfono:</strong> {reparacion.equipos.clientes.telefono}</Typography>
              <Typography><strong>Ciudad:</strong> {reparacion.equipos.clientes.ciudad || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* SECCIÓN 2: DATOS DEL EQUIPO */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PhoneIphone sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Datos del Equipo
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography><strong>Tipo:</strong> {reparacion.equipos.tipo}</Typography>
              <Typography><strong>Marca:</strong> {reparacion.equipos.marca}</Typography>
              <Typography><strong>Modelo:</strong> {reparacion.equipos.modelo || 'N/A'}</Typography>
              <Typography><strong>Serial/IMEI:</strong> {reparacion.equipos.serial_imei || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* SECCIÓN 3: FALLA REPORTADA */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Description sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Falla Reportada
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography>{reparacion.descripcion_falla}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* SECCIÓN 4: DIAGNÓSTICO TÉCNICO */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Build sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Diagnóstico Técnico
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Diagnóstico del técnico"
                value={formData.diagnostico}
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                placeholder="Describe el diagnóstico y trabajo a realizar..."
              />
            </CardContent>
          </Card>
        </Grid>

        {/* SECCIÓN 5: REPUESTOS USADOS */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Build sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Repuestos Utilizados
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setOpenRepuestoDialog(true)}
                >
                  Agregar Repuesto
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {repuestosUsados.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  No se han agregado repuestos
                </Typography>
              ) : (
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
                          <TableCell>{rep.nombre}</TableCell>
                          <TableCell align="center">{rep.cantidad}</TableCell>
                          <TableCell align="right">${rep.precio_unitario.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            ${(rep.cantidad * rep.precio_unitario).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleQuitarRepuesto(rep.inventario_id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell colSpan={3} align="right"><strong>Total Repuestos:</strong></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          ${calcularTotalRepuestos().toFixed(2)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* SECCIÓN 6: COSTOS */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Costos
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField
                    fullWidth
                    label="Mano de Obra"
                    type="number"
                    value={formData.mano_obra}
                    onChange={(e) => setFormData({ ...formData, mano_obra: parseFloat(e.target.value) || 0 })}
                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="h6"><strong>TOTAL:</strong></Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      ${calcularTotalGeneral().toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* SECCIÓN 7: ESTADO */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Estado de la Reparación
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TextField
                fullWidth
                select
                label="Estado"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <MenuItem value="Recibido">Recibido</MenuItem>
                <MenuItem value="En diagnóstico">En diagnóstico</MenuItem>
                <MenuItem value="En reparación">En reparación</MenuItem>
                <MenuItem value="Listo">Listo</MenuItem>
                <MenuItem value="Entregado">Entregado</MenuItem>
              </TextField>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para agregar repuesto */}
      <Dialog open={openRepuestoDialog} onClose={() => setOpenRepuestoDialog(false)}>
        <DialogTitle>Agregar Repuesto</DialogTitle>
        <DialogContent sx={{ minWidth: 400, pt: 2 }}>
          <TextField
            fullWidth
            select
            label="Seleccionar Repuesto"
            value={repuestoSeleccionado}
            onChange={(e) => setRepuestoSeleccionado(e.target.value)}
            sx={{ mb: 2 }}
          >
            {inventario.map((inv) => (
              <MenuItem key={inv.id} value={inv.id}>
                {inv.nombre_pieza} (Stock: {inv.stock_actual}) - ${inv.precio_venta}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Cantidad"
            type="number"
            value={cantidadRepuesto}
            onChange={(e) => setCantidadRepuesto(parseInt(e.target.value) || 1)}
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRepuestoDialog(false)}>Cancelar</Button>
          <Button onClick={handleAgregarRepuesto} variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}