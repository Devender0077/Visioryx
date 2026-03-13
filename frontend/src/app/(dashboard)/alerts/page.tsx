'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { api } from '@/lib/api';

interface Alert {
  id: number;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  timestamp: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<Alert[]>('/api/v1/alerts?limit=50')
      .then(setAlerts)
      .catch(() => setError('Load failed'));

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: number) => {
    try {
      await api(`/api/v1/alerts/${id}/read`, { method: 'PATCH' });
      load();
    } catch {
      // ignore
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary">
        Unknown face alerts, security alerts, camera status
        </Typography>
      </Box>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Card>
        <List>
          {alerts.map((a) => (
            <ListItem
              key={a.id}
              sx={{ bgcolor: a.is_read ? 'transparent' : 'action.hover' }}
              secondaryAction={
                !a.is_read && (
                  <IconButton edge="end" size="small" onClick={() => markRead(a.id)}>
                    <CheckCircle />
                  </IconButton>
                )
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={a.alert_type} size="small" color={a.severity === 'error' ? 'error' : 'default'} />
                    {a.message}
                  </Box>
                }
                secondary={new Date(a.timestamp).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
        {alerts.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No alerts yet.</Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}
