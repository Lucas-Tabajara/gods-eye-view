import { describe, it, expect, vi, beforeEach } from 'vitest';
// O arquivo ainda não existe, então o primeiro teste vai falhar no import. É o esperado do TDD.
import anaHidroLayer from './anaHidroLayer.js';

describe('anaHidroLayer - Contrato de Camada e Memória', () => {
  let mockViewer;

  beforeEach(() => {
    // Mock estrutural leve do CesiumJS Viewer (sem WebGL, sem uso real de RAM)
    mockViewer = {
      entities: {
        add: vi.fn(),
        remove: vi.fn(),
        removeAll: vi.fn()
      }
    };

    // Reseta o estado da camada antes de cada teste, se o método já existir
    if (anaHidroLayer && typeof anaHidroLayer.disable === 'function') {
      anaHidroLayer.disable();
    }
  });

  it('1. Deve expor o contrato exigido pelo DataLayerManager', () => {
    expect(anaHidroLayer).toHaveProperty('id', 'ana-hidro');
    expect(typeof anaHidroLayer.enable).toBe('function');
    expect(typeof anaHidroLayer.disable).toBe('function');
    expect(typeof anaHidroLayer.update).toBe('function');
    expect(typeof anaHidroLayer.getStats).toBe('function');
  });

  it('2. getStats() deve retornar estado inicial OFFLINE ou inativo', () => {
    const stats = anaHidroLayer.getStats();
    expect(stats).toHaveProperty('status');
    expect(stats.status).toBe('OFFLINE');
  });

  it('3. disable() deve invocar a limpeza de entidades do CesiumJS', () => {
    anaHidroLayer.disable();
    expect(mockViewer.entities.removeAll).toHaveBeenCalled();
    expect(anaHidroLayer.getStats().status).toBe('OFFLINE');
  });
});