/* eslint-disable */
// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Typography, Card, CardContent, Box, Alert, CircularProgress,
  List, ListItem, ListItemText, ListItemIcon, Chip
} from '@mui/material';
import { Build, Inventory, People, AttachMoney, Warning } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReparaciones: 0,
    totalIngresos: 0,
    totalClientes: 0,
    alertasStock: [] as any[]
  });
  const [graficoReparaciones, setGraficoReparaciones] = useState<any[]>([]);
  const [graficoIngresos, setGraficoIngresos] = useState<any[]>([]);

  /**
   * Carga los datos del dashboard: totales, gráficos y alertas de stock.
   * Declarada antes del useEffect para evitar advertencias de hoisting.
   */
  async function loadDashboardData() {
    await Promise.resolve();
    setLoading(true);

    // 1. Obtener totales y datos para gráficos
    const [
      { count: countRep },
      { data: dataRep },
      { count: countCli },
      { data: dataInv }
    ] = await Promise.all([
      supabase.from('reparaciones').select('*', { count: 'exact', head: true }),
      supabase.from('reparaciones').select('fecha_ingreso, costo_total').order('fecha_ingreso', { ascending: true }),
      supabase.from('clientes').select('*', { count: 'exact', head: true }),
      supabase.from('inventario').select('nombre_pieza, stock_actual, stock_minimo')
    ]);

    // 2. Calcular alertas de stock
    const alertas = dataInv?.filter((item: any) => item.stock_actual <= item.stock_minimo) || [];

    // 3. Procesar datos para los gráficos (Agrupar por mes)
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const repPorMes: any = {};
    const ingPorMes: any = {};

    dataRep?.forEach((item: any) => {
      const fecha = new Date(item.fecha_ingreso);
      const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
      
      repPorMes[mesKey] = (repPorMes[mesKey] || 0) + 1;
      ingPorMes[mesKey] = (ingPorMes[mesKey] || 0) + (item.costo_total || 0);
    });

    const formatearGrafico = (data: any) => 
      Object.keys(data).map(key => ({ name: key, value: data[key] }));

    setStats({
      totalReparaciones: countRep || 0,
      totalIngresos: dataRep?.reduce((acc: number, curr: any) => acc + (curr.costo_total || 0), 0) || 0,
      totalClientes: countCli || 0,
      alertasStock: alertas
    });

    setGraficoReparaciones(formatearGrafico(repPorMes));
    setGraficoIngresos(formatearGrafico(ingPorMes));
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadDashboardData();
  }, []);

  const tarjetas = [
    { title: 'Reparaciones Totales', value: stats.totalReparaciones, icon: <Build fontSize="large" />, color: '#1976d2', bg: '#e3f2fd' },
    { title: 'Ingresos Totales', value: `$${stats.totalIngresos.toFixed(2)}`, icon: <AttachMoney fontSize="large" />, color: '#2e7d32', bg: '#e8f5e9' },
    { title: 'Clientes Registrados', value: stats.totalClientes, icon: <People fontSize="large" />, color: '#ed6c02', bg: '#fff3e0' },
    { title: 'Alertas de Stock', value: stats.alertasStock.length, icon: <Inventory fontSize="large" />, color: '#dc004e', bg: '#fce4ec' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Dashboard General
      </Typography>

      {/* Tarjetas de Resumen */}
      <Box sx={{ display: 'grid', gap: 3, mb: 4, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
        {tarjetas.map((card, index) => (
          <Box key={index}>
            <Card sx={{ height: '100%', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 4 } }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }} color={card.color}>
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: card.bg, p: 1.5, borderRadius: 2, color: card.color }}>
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Gráficos */}
      <Box sx={{ display: 'grid', gap: 3, mb: 4, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Reparaciones por Mes
              </Typography>
              {graficoReparaciones.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  Sin datos aún
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={graficoReparaciones}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Ingresos por Mes ($)
              </Typography>
              {graficoIngresos.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  Sin datos aún
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={graficoIngresos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#2e7d32" fill="#e8f5e9" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Alertas de Inventario */}
      {stats.alertasStock.length > 0 && (
        <Card sx={{ bgcolor: '#fff3e0', border: '1px solid #ffe0b2' }}>
          <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Warning color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }} color="warning.dark">
                Alertas de Stock Bajo
              </Typography>
            </Box>
            <List dense>
              {stats.alertasStock.map((item, index) => (
                <ListItem key={index} divider={index < stats.alertasStock.length - 1}>
                  <ListItemIcon>
                    <Inventory color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.nombre_pieza} 
                    secondary={`Stock actual: ${item.stock_actual} | Mínimo: ${item.stock_minimo}`} 
                  />
                  <Chip label="Comprar" color="error" size="small" />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}