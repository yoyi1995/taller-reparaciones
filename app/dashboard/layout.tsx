/* eslint-disable */
// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton,
  BottomNavigation, BottomNavigationAction, Paper,
  Menu, MenuItem, Divider, CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, Build, Inventory,
  People, Logout, AccountCircle
} from '@mui/icons-material';

const drawerWidth = 240;

const base = '/dashboard';
const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, href: `${base}` },
  { text: 'Reparaciones', icon: <Build />, href: `${base}/reparaciones` },
  { text: 'Inventario', icon: <Inventory />, href: `${base}/inventario` },
  { text: 'Clientes', icon: <People />, href: `${base}/clientes` },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function checkUser() {
    await Promise.resolve();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setUser(session.user);
    setLoading(false);
  }

  useEffect(() => {
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const drawer = (
    <Box>
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton component={Link} href={item.href}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* AppBar superior - AGREGADO className="no-print" */}
      <AppBar 
        className="no-print"
        position="fixed" 
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Sistema Taller
          </Typography>
          
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar en PC - AGREGADO className="no-print" */}
      <Drawer
        className="no-print"
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>

      {/* Drawer móvil - AGREGADO className="no-print" */}
      <Drawer
        className="no-print"
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>

      {/* Contenido principal */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, mb: { xs: 7, md: 0 } }}>
        {children}
      </Box>

      {/* Bottom Navigation en móvil - AGREGADO className="no-print" */}
      <Paper
        className="no-print"
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
        elevation={3}
      >
        <BottomNavigation showLabels>
          {menuItems.map((item) => (
            <BottomNavigationAction
              key={item.text}
              label={item.text}
              icon={item.icon}
              component={Link}
              href={item.href}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}