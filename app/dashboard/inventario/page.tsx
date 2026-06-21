'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Box,
  InputAdornment, Alert, Chip, CircularProgress, OutlinedInput, FormControl
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Warning
} from '@mui/icons-material';

interface Inventario {
  id: string;
  nombre_pieza: string;
  stock_actual: number;
  stock_minimo: number;
  precio_compra: number;
  precio_venta: number;
  created_at: string;
}

export default function InventarioPage() {
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre_pieza: '',
    stock_actual: 0,
    stock_minimo: 2,
    precio_compra: 0,
    precio_venta: 0
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    loadInventario();
  }, []);

  const loadInventario = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .order('nombre_pieza', { ascending: true });

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setInventario(data || []);
      
      // Verificar alertas de stock bajo
      const stockBajo = data?.filter(item => item.stock_actual <= item.stock_minimo) || [];
      if (stockBajo.length > 0) {
        setAlert({
          type: 'warning',
          message: `⚠️ Tienes ${stockBajo.length} producto(s) con stock bajo`
        });
      }
    }
    setLoading(false);
  };

  const handleOpenDialog = (item?: Inventario) => {
    if (item) {
      setEditMode(true);
      setCurrentId(item.id);
      setFormData({
        nombre_pieza: item.nombre_pieza,
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        precio_compra: item.precio_compra || 0,
        precio_venta: item.precio_venta || 0
      });
    } else {
      setEditMode(false);
      setCurrentId(null);
      setFormData({
        nombre_pieza: '',
        stock_actual: 0,
        stock_minimo: 2,
        precio_compra: 0,
        precio_venta: 0
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      nombre_pieza: '',
      stock_actual: 0,
      stock_minimo: 2,
      precio_compra: 0,
      precio_venta: 0
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editMode && currentId) {
      const { error } = await supabase
        .from('inventario')
        .update(formData)
        .eq('id', currentId);

      if (error) {
        setAlert({ type: 'error', message: error.message });
      } else {
        setAlert({ type: 'success', message: 'Repuesto actualizado correctamente' });
        loadInventario();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase
        .from('inventario')
        .insert([formData]);

      if (error) {
        setAlert({ type: 'error', message: error.message });
      } else {
        setAlert({ type: 'success', message: 'Repuesto agregado correctamente' });
        loadInventario();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este repuesto?')) return;

    const { error } = await supabase
      .from('inventario')
      .delete()
      .eq('id', id);

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setAlert({ type: 'success', message: 'Repuesto eliminado' });
      loadInventario();
    }
  };

  const getStockStatus = (item: Inventario) => {
    if (item.stock_actual === 0) {
      return { color: 'error' as const, label: 'Agotado' };
    } else if (item.stock_actual <= item.stock_minimo) {
      return { color: 'warning' as const, label: 'Stock Bajo' };
    } else {
      return { color: 'success' as const, label: 'Disponible' };
    }
  };

  const filteredInventario = inventario.filter(item =>
    item.nombre_pieza.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Inventario de Repuestos
          </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Repuesto
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
          placeholder="Buscar repuesto..."
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
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Repuesto</strong></TableCell>
                <TableCell align="center"><strong>Stock Actual</strong></TableCell>
                <TableCell align="center"><strong>Stock Mínimo</strong></TableCell>
                <TableCell align="center"><strong>P. Compra</strong></TableCell>
                <TableCell align="center"><strong>P. Venta</strong></TableCell>
                <TableCell align="center"><strong>Estado</strong></TableCell>
                <TableCell align="right"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInventario.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    No hay repuestos registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventario.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <TableRow 
                      key={item.id}
                      sx={{
                        bgcolor: status.color === 'error' ? 'error.lighter' : 
                                 status.color === 'warning' ? 'warning.lighter' : 'inherit',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {status.color === 'error' && <Warning color="error" />}
                          {item.nombre_pieza}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="h6" 
                          sx={{ fontWeight: 'bold' }}
                          color={status.color === 'error' ? 'error.main' : 
                                 status.color === 'warning' ? 'warning.main' : 'success.main'}
                        >
                          {item.stock_actual}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{item.stock_minimo}</TableCell>
                      <TableCell align="center">${item.precio_compra?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell align="center">${item.precio_venta?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={status.label} 
                          color={status.color} 
                          size="small"
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDelete(item.id)}
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Editar Repuesto' : 'Nuevo Repuesto'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre del Repuesto *"
              fullWidth
              required
              value={formData.nombre_pieza}
              onChange={(e) => setFormData({ ...formData, nombre_pieza: e.target.value })}
              placeholder="Ej: Pin de carga Type-C, Pantalla iPhone 11, etc."
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                margin="dense"
                variant="outlined"
                label="Stock Actual *"
                type="number"
                fullWidth
                required
                slotProps={{ htmlInput: { min: 0 } }}
                value={formData.stock_actual}
                onChange={(e) => setFormData({ ...formData, stock_actual: parseInt(e.target.value) || 0 })}
              />
              <TextField
                margin="dense"
                variant="outlined"
                label="Stock Mínimo *"
                type="number"
                fullWidth
                required
                slotProps={{ htmlInput: { min: 0 } }}
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                helperText="Alerta cuando llegue a este número"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                margin="dense"
                variant="outlined"
                label="Precio de Compra"
                type="number"
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={formData.precio_compra}
                onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) || 0 })}
              />
              <TextField
                margin="dense"
                variant="outlined"
                label="Precio de Venta"
                type="number"
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={formData.precio_venta}
                onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
              />
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