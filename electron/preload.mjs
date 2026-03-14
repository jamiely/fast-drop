import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('fastDropDesktop', {
  platform: process.platform,
  isDesktop: true
});
