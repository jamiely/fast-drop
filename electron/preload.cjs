/* global process */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('fastDropDesktop', {
  platform: process.platform,
  isDesktop: true
});
