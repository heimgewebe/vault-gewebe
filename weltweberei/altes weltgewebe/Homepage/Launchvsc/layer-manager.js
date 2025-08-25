// layer-manager.js — Version: Σ.v3.singleton-final

class LayerManager {
  constructor(map = null) {
    if (LayerManager._instance) return LayerManager._instance;
    this.map = map;
    this.data = {};
    this.layerStates = new Map();
    this.renderCallbacks = new Map();
    LayerManager._instance = this;
  }

  static getInstance() {
    if (!LayerManager._instance) {
      LayerManager._instance = new LayerManager();
    }
    return LayerManager._instance;
  }

  updateData(daten) {
    this.data = daten;
  }

  getData() {
    return this.data;
  }

  registerLayer(name, renderFn) {
    this.layerStates.set(name, true);
    this.renderCallbacks.set(name, renderFn);
  }

  renderActiveLayers(selection, projection) {
    for (const [name, isActive] of this.layerStates.entries()) {
      if (isActive) {
        const renderFn = this.renderCallbacks.get(name);
        if (renderFn) {
          const layerData = this.data[name] || [];
          renderFn(selection, projection, layerData);
        }
      }
    }
  }
}

export const layerManager = LayerManager.getInstance();