// ============================================================================
// Packet Tracer Web — js/app.js
// Interactive Canvas Controller, Mobile Touch UX, Device Windows, Labs
// ============================================================================
(function () {
  'use strict';
  const PT = window.PT;
  if (!PT) throw new Error('PT core not loaded');

  // Network Engine instance
  const net = new PT.NetworkEngine();
  PT.net = net;

  // App State
  const state = {
    selectedCategory: 'network',
    selectedSubcategory: 'switches',
    activeTool: 'select', // 'select' | 'pan' | 'box-select' | 'inspect' | 'delete' | 'note' | 'pdu' | 'place-device' | 'connect-cable'
    pendingModel: null,
    pendingCableType: null,
    cableSource: null, // { devId, portName }
    pduSourceDevId: null,
    selectedDeviceId: null,
    selectedDeviceIds: new Set(),
    clipboardData: null,
    openDeviceId: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    showPortLabels: true,
    showModelLabels: true,
    showLinkLights: true,
    darkCli: false,
    pduList: []
  };

  // DOM Elements
  const logicalCanvas = document.getElementById('logical-workspace');
  const nodesLayer = document.getElementById('pt-nodes-layer');
  const notesLayer = document.getElementById('pt-notes-layer');
  const cablesSvg = document.getElementById('pt-cables-svg');
  const pduLayer = document.getElementById('pt-pdu-layer');
  const selectionMarquee = document.getElementById('pt-selection-marquee');
  const floatingMenu = document.getElementById('pt-floating-device-menu');
  const floatingDevName = document.getElementById('pt-floating-dev-name');
  const actionBanner = document.getElementById('pt-active-action-banner');
  const actionBannerText = document.getElementById('pt-active-action-text');

  // ---------------------------------------------------------------- Selection & Coordinate Helpers
  function isDeviceSelected(devId) {
    return state.selectedDeviceIds.has(devId) || state.selectedDeviceId === devId;
  }

  function selectSingleDevice(devId) {
    state.selectedDeviceIds.clear();
    if (devId) state.selectedDeviceIds.add(devId);
    state.selectedDeviceId = devId || null;
  }

  function toggleDeviceSelection(devId) {
    if (state.selectedDeviceId && !state.selectedDeviceIds.size) {
      state.selectedDeviceIds.add(state.selectedDeviceId);
    }
    if (state.selectedDeviceIds.has(devId)) {
      state.selectedDeviceIds.delete(devId);
    } else {
      state.selectedDeviceIds.add(devId);
    }
    const arr = [...state.selectedDeviceIds];
    state.selectedDeviceId = arr.length ? arr[arr.length - 1] : null;
  }

  function getSelectedDevices() {
    if (state.selectedDeviceId && !state.selectedDeviceIds.size) {
      state.selectedDeviceIds.add(state.selectedDeviceId);
    }
    return net.devices.filter(d => state.selectedDeviceIds.has(d.id));
  }

  function screenToCanvas(clientX, clientY) {
    const rect = logicalCanvas.getBoundingClientRect();
    return {
      x: Math.round((clientX - rect.left - state.panX) / state.zoom),
      y: Math.round((clientY - rect.top - state.panY) / state.zoom)
    };
  }

  function applyCanvasTransform() {
    const tStr = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    nodesLayer.style.transform = tStr;
    notesLayer.style.transform = tStr;
    cablesSvg.style.transform = tStr;
    pduLayer.style.transform = tStr;
    logicalCanvas.style.backgroundPosition = `${state.panX}px ${state.panY}px`;
    const gridPx = Math.max(12, Math.round(24 * state.zoom));
    logicalCanvas.style.backgroundSize = `${gridPx}px ${gridPx}px`;
  }

  // ---------------------------------------------------------------- Canvas Rendering
  function renderCanvas() {
    PT.renderCanvas = renderCanvas;
    PT.appState = state;
    // Sync selection set with existing devices
    const validIds = new Set(net.devices.map(d => d.id));
    for (const id of [...state.selectedDeviceIds]) {
      if (!validIds.has(id)) state.selectedDeviceIds.delete(id);
    }
    if (state.selectedDeviceId && !validIds.has(state.selectedDeviceId)) {
      state.selectedDeviceId = null;
    }
    if (state.selectedDeviceId && !state.selectedDeviceIds.size) {
      state.selectedDeviceIds.add(state.selectedDeviceId);
    } else if (!state.selectedDeviceId && state.selectedDeviceIds.size) {
      state.selectedDeviceId = [...state.selectedDeviceIds][0];
    }

    // Apply Pan & Zoom transform
    applyCanvasTransform();

    // 1. Cables SVG
    renderCables();

    // 2. Nodes Layer
    const multiCount = state.selectedDeviceIds.size;
    nodesLayer.innerHTML = '';
    for (const dev of net.devices) {
      const sel = isDeviceSelected(dev.id);
      const el = document.createElement('div');
      el.className = `pt-node${sel ? ' selected' : ''}${!dev.power ? ' power-off' : ''}`;
      el.style.left = `${dev.x}px`;
      el.style.top = `${dev.y}px`;
      el.dataset.devId = dev.id;

      const m = PT.getModel(dev);
      const iconSrc = m ? m.canvasIcon : 'art/Workspace/Logical/iWorkstation@2x.png';

      // Find primary IP
      let primaryIp = '';
      if (dev.cfg && dev.cfg.ifaces) {
        for (const ifc of Object.values(dev.cfg.ifaces)) {
          if (ifc.ip && !ifc.shutdown) { primaryIp = ifc.ip; break; }
        }
      }
      const ipBadge = primaryIp ? `<div class="pt-node-ip-badge">${primaryIp}</div>` : '';
      const selBadge = (sel && (multiCount > 1 || state.activeTool === 'box-select'))
        ? `<div class="pt-node-select-badge">✓</div>`
        : '';

      el.innerHTML = `
        ${selBadge}
        <img src="${iconSrc}" alt="${dev.model}" class="pt-node-icon" />
        ${state.showModelLabels ? `<div class="pt-node-model">${dev.model}</div>` : ''}
        <div class="pt-node-name">${dev.cfg ? dev.cfg.hostname : dev.name}</div>
        ${ipBadge}
      `;

      bindNodePointerEvents(el, dev);
      nodesLayer.appendChild(el);
    }

    // 3. Notes Layer (Draggable & Deletable)
    notesLayer.innerHTML = '';
    for (const n of net.notes) {
      const nel = document.createElement('div');
      nel.className = 'pt-canvas-note';
      nel.style.left = `${n.x}px`;
      nel.style.top = `${n.y}px`;
      nel.textContent = n.text;
      bindNotePointerEvents(nel, n);
      notesLayer.appendChild(nel);
    }

    // 4. Floating menu (Supports Single & Multi-Selection)
    const selDevs = getSelectedDevices();
    const bCli = document.getElementById('float-btn-cli');
    const bCfg = document.getElementById('float-btn-cfg');
    const bCab = document.getElementById('float-btn-cable');
    const bPdu = document.getElementById('float-btn-pdu');

    if (selDevs.length === 1) {
      const selDev = selDevs[0];
      floatingMenu.classList.remove('hidden');
      floatingDevName.textContent = `${selDev.cfg ? selDev.cfg.hostname : selDev.name} (${selDev.model})`;
      if (bCli) bCli.classList.remove('hidden');
      if (bCfg) bCfg.classList.remove('hidden');
      if (bCab) bCab.classList.remove('hidden');
      if (bPdu) bPdu.classList.remove('hidden');
    } else if (selDevs.length > 1) {
      floatingMenu.classList.remove('hidden');
      floatingDevName.textContent = `☑️ محدد (${selDevs.length} أجهزة) — اسحب أي جهاز لنقلها معاً`;
      if (bCli) bCli.classList.add('hidden');
      if (bCfg) bCfg.classList.add('hidden');
      if (bCab) bCab.classList.add('hidden');
      if (bPdu) bPdu.classList.add('hidden');
    } else {
      floatingMenu.classList.add('hidden');
    }
  }

  function renderCables() {
    cablesSvg.innerHTML = '';
    for (const link of net.links) {
      const devA = net.getDevice(link.devA);
      const devB = net.getDevice(link.devB);
      if (!devA || !devB) continue;
      const pA = devA.ports.find(p => p.name === link.portA);
      const pB = devB.ports.find(p => p.name === link.portB);
      if (!pA || !pB) continue;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.dataset.linkId = link.id;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', devA.x);
      line.setAttribute('y1', devA.y);
      line.setAttribute('x2', devB.x);
      line.setAttribute('y2', devB.y);
      line.setAttribute('stroke-width', '2.5');

      if (link.cableType === 'cross') {
        line.setAttribute('stroke', '#111827');
        line.setAttribute('stroke-dasharray', '6,4');
      } else if (link.cableType === 'console') {
        line.setAttribute('stroke', '#06b6d4');
      } else if (link.cableType.startsWith('serial')) {
        line.setAttribute('stroke', '#dc2626');
      } else {
        line.setAttribute('stroke', '#111827');
      }

      g.appendChild(line);

      // Link lights
      if (state.showLinkLights && link.cableType !== 'console') {
        const dx = devB.x - devA.x;
        const dy = devB.y - devA.y;
        const dist = Math.hypot(dx, dy) || 1;
        const off = 36;
        const lx1 = devA.x + (dx / dist) * off;
        const ly1 = devA.y + (dy / dist) * off;
        const lx2 = devB.x - (dx / dist) * off;
        const ly2 = devB.y - (dy / dist) * off;

        g.appendChild(createLightSvg(lx1, ly1, devA, pA));
        g.appendChild(createLightSvg(lx2, ly2, devB, pB));

        if (state.showPortLabels) {
          const tx1 = devA.x + (dx / dist) * 52;
          const ty1 = devA.y + (dy / dist) * 52 - 6;
          const tx2 = devB.x - (dx / dist) * 52;
          const ty2 = devB.y - (dy / dist) * 52 - 6;
          g.appendChild(createPortTextSvg(tx1, ty1, PT.shortIf(pA.name)));
          g.appendChild(createPortTextSvg(tx2, ty2, PT.shortIf(pB.name)));
        }
      }

      g.onclick = (e) => {
        if (state.activeTool === 'delete') {
          e.stopPropagation();
          net.removeLink(link.id);
        }
      };

      cablesSvg.appendChild(g);
    }
  }

  function createLightSvg(cx, cy, dev, port) {
    const isUp = port.lineUp;
    const stpState = (dev.rt && dev.rt.lastStatus && dev.rt.lastStatus[port.name]) || (isUp ? 'FWD' : 'DOWN');

    if (!isUp) {
      // Red Down Triangle
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', `${cx - 5},${cy - 4} ${cx + 5},${cy - 4} ${cx},${cy + 5}`);
      poly.setAttribute('fill', '#dc2626');
      poly.setAttribute('stroke', '#ffffff');
      poly.setAttribute('stroke-width', '1');
      return poly;
    }
    if (stpState === 'LRN') {
      // Amber Circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', '#f59e0b');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1');
      return circle;
    }
    // Green Up Triangle
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', `${cx},${cy - 5} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`);
    poly.setAttribute('fill', '#16a34a');
    poly.setAttribute('stroke', '#ffffff');
    poly.setAttribute('stroke-width', '1');
    return poly;
  }

  function createPortTextSvg(x, y, text) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'pt-port-label');
    t.textContent = text;
    return t;
  }

  // ---------------------------------------------------------------- Smooth Drag & Drop (Single & Multi-Device Group Drag)
  function bindNodePointerEvents(el, dev) {
    let startClientX = 0;
    let startClientY = 0;
    let isDragging = false;
    let movingGroup = [];

    const onPointerDown = (e) => {
      if (state.activeTool === 'pan') return; // let canvas pan handle it
      e.stopPropagation();
      startClientX = e.clientX;
      startClientY = e.clientY;
      isDragging = false;

      // If dragging a device that is part of a multi-selection, move ALL selected devices together!
      if (isDeviceSelected(dev.id) && state.selectedDeviceIds.size > 1) {
        movingGroup = getSelectedDevices().map(d => ({
          dev: d,
          origX: d.x,
          origY: d.y,
          el: nodesLayer.querySelector(`.pt-node[data-dev-id="${d.id}"]`)
        }));
      } else {
        movingGroup = [{ dev, origX: dev.x, origY: dev.y, el }];
      }

      try { el.setPointerCapture(e.pointerId); } catch (_) {}

      const onPointerMove = (me) => {
        const dx = (me.clientX - startClientX) / state.zoom;
        const dy = (me.clientY - startClientY) / state.zoom;
        if (!isDragging && Math.hypot(me.clientX - startClientX, me.clientY - startClientY) > 5) {
          isDragging = true;
        }
        if (isDragging && (state.activeTool === 'select' || state.activeTool === 'box-select')) {
          for (const item of movingGroup) {
            item.dev.x = Math.round(item.origX + dx);
            item.dev.y = Math.round(item.origY + dy);
            if (item.el) {
              item.el.style.left = `${item.dev.x}px`;
              item.el.style.top = `${item.dev.y}px`;
            }
            fastUpdateNodeCables(item.dev);
          }
        }
      };

      const onPointerUp = (ue) => {
        try { el.releasePointerCapture(ue.pointerId); } catch (_) {}
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerup', onPointerUp);
        el.removeEventListener('pointercancel', onPointerUp);

        if (!isDragging) {
          handleNodeClick(dev, ue);
        } else {
          renderCables();
        }
      };

      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerUp);
    };

    el.addEventListener('pointerdown', onPointerDown);

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openDeviceModal(dev.id);
    });
  }

  function bindNotePointerEvents(nel, note) {
    let startX = 0, startY = 0, origX = note.x, origY = note.y, moved = false;
    nel.addEventListener('pointerdown', (e) => {
      if (state.activeTool === 'pan') return;
      e.stopPropagation();
      if (state.activeTool === 'delete') {
        net.notes = net.notes.filter(x => x.id !== note.id);
        renderCanvas();
        return;
      }
      startX = e.clientX;
      startY = e.clientY;
      origX = note.x;
      origY = note.y;
      moved = false;
      try { nel.setPointerCapture(e.pointerId); } catch (_) {}

      const onMove = (me) => {
        const dx = (me.clientX - startX) / state.zoom;
        const dy = (me.clientY - startY) / state.zoom;
        if (!moved && Math.hypot(me.clientX - startX, me.clientY - startY) > 4) moved = true;
        if (moved) {
          note.x = Math.round(origX + dx);
          note.y = Math.round(origY + dy);
          nel.style.left = `${note.x}px`;
          nel.style.top = `${note.y}px`;
        }
      };
      const onUp = (ue) => {
        try { nel.releasePointerCapture(ue.pointerId); } catch (_) {}
        nel.removeEventListener('pointermove', onMove);
        nel.removeEventListener('pointerup', onUp);
        nel.removeEventListener('pointercancel', onUp);
      };
      nel.addEventListener('pointermove', onMove);
      nel.addEventListener('pointerup', onUp);
      nel.addEventListener('pointercancel', onUp);
    });
  }

  function fastUpdateNodeCables(dev) {
    for (const link of net.links) {
      if (link.devA === dev.id || link.devB === dev.id) {
        const devA = net.getDevice(link.devA);
        const devB = net.getDevice(link.devB);
        if (!devA || !devB) continue;
        const g = cablesSvg.querySelector(`g[data-link-id="${link.id}"]`);
        if (g) {
          const line = g.querySelector('line');
          if (line) {
            line.setAttribute('x1', devA.x);
            line.setAttribute('y1', devA.y);
            line.setAttribute('x2', devB.x);
            line.setAttribute('y2', devB.y);
          }
        }
      }
    }
  }

  function handleNodeClick(dev, evt) {
    if (state.activeTool === 'delete') {
      if (isDeviceSelected(dev.id) && state.selectedDeviceIds.size > 1) {
        for (const id of [...state.selectedDeviceIds]) net.removeDevice(id);
        selectSingleDevice(null);
      } else {
        net.removeDevice(dev.id);
        state.selectedDeviceIds.delete(dev.id);
        if (state.selectedDeviceId === dev.id) state.selectedDeviceId = null;
      }
      renderCanvas();
      return;
    }

    if (state.activeTool === 'inspect') {
      openInspectModal(dev);
      return;
    }

    if (state.activeTool === 'pdu' || state.activeTool === 'complex-pdu') {
      if (!state.pduSourceDevId) {
        state.pduSourceDevId = dev.id;
        showActionBanner(`✉️ المصدر: ${dev.name} — الآن اضغط على الجهاز الهدف`);
      } else if (state.pduSourceDevId !== dev.id) {
        const src = net.getDevice(state.pduSourceDevId);
        state.pduSourceDevId = null;
        setActiveTool('select');
        if (src) fireSimplePdu(src, dev);
      }
      return;
    }

    if (state.activeTool === 'connect-cable') {
      handleCableTap(dev, evt);
      return;
    }

    // Multi-Select mode (box-select tool or Shift/Ctrl key held): toggle device in selection
    if (state.activeTool === 'box-select' || (evt && (evt.shiftKey || evt.ctrlKey || evt.metaKey))) {
      toggleDeviceSelection(dev.id);
      renderCanvas();
      return;
    }

    // Normal Select tool
    if (state.selectedDeviceId === dev.id && state.selectedDeviceIds.size <= 1) {
      openDeviceModal(dev.id);
    } else {
      selectSingleDevice(dev.id);
      renderCanvas();
    }
  }

  function handleCableTap(dev, evt) {
    const cableType = state.pendingCableType || 'auto';
    if (cableType === 'auto') {
      const freePort = dev.ports.find(p => p.kind !== 'console' && p.kind !== 'rs232' && !p.linkId);
      if (!freePort) {
        alert(`لا توجد منافذ شاغرة في ${dev.name}`);
        return;
      }
      if (!state.cableSource) {
        state.cableSource = { devId: dev.id, portName: freePort.name };
        showActionBanner(`⚡ توصيل من ${dev.name} (${PT.shortIf(freePort.name)}) — اضغط على الجهاز الثاني`);
      } else if (state.cableSource.devId !== dev.id) {
        net.connect(state.cableSource.devId, state.cableSource.portName, dev.id, freePort.name, 'auto');
        state.cableSource = null;
        setActiveTool('select');
      }
      return;
    }

    // Manual port picker popup
    openPortPicker(dev, evt.clientX, evt.clientY, (chosenPort) => {
      if (!state.cableSource) {
        state.cableSource = { devId: dev.id, portName: chosenPort };
        showActionBanner(`🔌 توصيل من ${dev.name} (${PT.shortIf(chosenPort)}) — اضغط على الجهاز الثاني`);
      } else if (state.cableSource.devId !== dev.id) {
        net.connect(state.cableSource.devId, state.cableSource.portName, dev.id, chosenPort, cableType);
        state.cableSource = null;
        setActiveTool('select');
      }
    });
  }

  function openPortPicker(dev, clientX, clientY, onSelect) {
    const picker = document.getElementById('pt-port-picker');
    const title = document.getElementById('pt-port-picker-title');
    const list = document.getElementById('pt-port-picker-list');
    title.textContent = `${dev.name} — اختر المنفذ`;
    list.innerHTML = '';

    const freePorts = dev.ports.filter(p => !p.linkId);
    for (const p of freePorts) {
      const btn = document.createElement('button');
      btn.className = 'pt-port-option';
      const iconPath = p.kind === 'console' || p.kind === 'rs232'
        ? 'art/Workspace/Logical/ConsoleIcon.png'
        : p.kind === 'se'
          ? 'art/Workspace/Logical/SerialIcon.png'
          : 'art/Workspace/Logical/CopperFastEthernetIcon.png';
      btn.innerHTML = `<img src="${iconPath}" alt="" /><span>${p.name}</span>`;
      btn.onclick = () => {
        picker.classList.add('hidden');
        onSelect(p.name);
      };
      list.appendChild(btn);
    }

    picker.style.left = `${Math.min(window.innerWidth - 240, Math.max(10, clientX))}px`;
    picker.style.top = `${Math.min(window.innerHeight - 330, Math.max(10, clientY))}px`;
    picker.classList.remove('hidden');
  }

  document.getElementById('btn-close-port-picker').onclick = () => {
    document.getElementById('pt-port-picker').classList.add('hidden');
  };

  // ---------------------------------------------------------------- Canvas Background Pan, Pinch-Zoom & Marquee Multi-Select
  const activeTouches = new Map();
  let lastPinchDist = 0;
  let lastPinchCenter = null;

  logicalCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Mouse wheel zoom
  logicalCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = logicalCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - state.panX) / state.zoom;
    const worldY = (mouseY - state.panY) / state.zoom;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(2.8, Math.max(0.35, +(state.zoom * factor).toFixed(3)));
    state.panX = Math.round(mouseX - worldX * newZoom);
    state.panY = Math.round(mouseY - worldY * newZoom);
    state.zoom = newZoom;
    applyCanvasTransform();
  }, { passive: false });

  logicalCanvas.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.pt-floating-device-menu') || e.target.closest('.pt-canvas-zoom-Overlay')) return;

    activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // If 2 fingers are down on mobile -> start pinch-to-zoom & 2-finger pan
    if (activeTouches.size === 2) {
      const pts = [...activeTouches.values()];
      lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      lastPinchCenter = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (selectionMarquee) selectionMarquee.classList.add('hidden');
      return;
    }

    const pt = screenToCanvas(e.clientX, e.clientY);

    if (state.activeTool === 'place-device' && state.pendingModel) {
      const existingNames = new Set(net.devices.map(d => d.name));
      const newDev = PT.createDevice(state.pendingModel.key, { x: pt.x, y: pt.y, existingNames });
      net.addDevice(newDev);
      selectSingleDevice(newDev.id);
      setActiveTool('select');
      renderCanvas();
      return;
    }

    if (state.activeTool === 'note') {
      const txt = prompt('أدخل نص الملاحظة (Note):', 'VLAN 10: 192.168.10.0/24');
      if (txt) {
        net.notes.push({ id: `note_${Date.now()}`, x: pt.x, y: pt.y, text: txt });
        renderCanvas();
      }
      setActiveTool('select');
      return;
    }

    // Decide whether dragging on background should PAN the canvas or draw a MARQUEE SELECTION BOX:
    // - On touch (mobile): 1-finger drag on empty background PANS the canvas by default (unless 'box-select' tool is active!)
    // - On mouse (PC): Left-drag in 'select' or 'box-select' draws a Marquee Selection Box; 'pan' tool or Middle/Right click or Alt/Space pans!
    const shouldPan =
      state.activeTool === 'pan' ||
      (e.pointerType === 'touch' && state.activeTool !== 'box-select') ||
      e.button === 1 || e.button === 2 || e.altKey;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPanX = state.panX;
    const startPanY = state.panY;
    const rect = logicalCanvas.getBoundingClientRect();
    let didDrag = false;

    try { logicalCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    if (shouldPan) logicalCanvas.classList.add('panning');

    const onBgMove = (me) => {
      if (activeTouches.has(me.pointerId)) {
        activeTouches.set(me.pointerId, { x: me.clientX, y: me.clientY });
      }

      // 2-finger pinch zoom & pan on mobile
      if (activeTouches.size === 2) {
        didDrag = true;
        const pts = [...activeTouches.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        if (lastPinchCenter) {
          state.panX += Math.round(center.x - lastPinchCenter.x);
          state.panY += Math.round(center.y - lastPinchCenter.y);
        }
        if (lastPinchDist > 20 && dist > 20) {
          const scaleDelta = dist / lastPinchDist;
          const cx = center.x - rect.left;
          const cy = center.y - rect.top;
          const wx = (cx - state.panX) / state.zoom;
          const wy = (cy - state.panY) / state.zoom;
          const nextZoom = Math.min(2.8, Math.max(0.35, +(state.zoom * scaleDelta).toFixed(3)));
          state.panX = Math.round(cx - wx * nextZoom);
          state.panY = Math.round(cy - wy * nextZoom);
          state.zoom = nextZoom;
        }
        lastPinchDist = dist;
        lastPinchCenter = center;
        applyCanvasTransform();
        return;
      }

      const dx = me.clientX - startClientX;
      const dy = me.clientY - startClientY;
      if (!didDrag && Math.hypot(dx, dy) > 5) {
        didDrag = true;
      }
      if (!didDrag) return;

      if (shouldPan) {
        state.panX = Math.round(startPanX + dx);
        state.panY = Math.round(startPanY + dy);
        applyCanvasTransform();
      } else {
        // Marquee Selection Box
        const x1 = startClientX - rect.left;
        const y1 = startClientY - rect.top;
        const x2 = me.clientX - rect.left;
        const y2 = me.clientY - rect.top;
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        if (selectionMarquee) {
          selectionMarquee.classList.remove('hidden');
          selectionMarquee.style.left = `${left}px`;
          selectionMarquee.style.top = `${top}px`;
          selectionMarquee.style.width = `${width}px`;
          selectionMarquee.style.height = `${height}px`;
        }

        const cMinX = (left - state.panX) / state.zoom;
        const cMaxX = (left + width - state.panX) / state.zoom;
        const cMinY = (top - state.panY) / state.zoom;
        const cMaxY = (top + height - state.panY) / state.zoom;

        if (!me.shiftKey && !me.ctrlKey) state.selectedDeviceIds.clear();
        for (const d of net.devices) {
          if (d.x >= cMinX && d.x <= cMaxX && d.y >= cMinY && d.y <= cMaxY) {
            state.selectedDeviceIds.add(d.id);
          }
        }
        const selArr = [...state.selectedDeviceIds];
        state.selectedDeviceId = selArr.length ? selArr[0] : null;

        // Live highlight nodes inside marquee
        nodesLayer.querySelectorAll('.pt-node').forEach(nodeEl => {
          nodeEl.classList.toggle('selected', state.selectedDeviceIds.has(nodeEl.dataset.devId));
        });
      }
    };

    const onBgUp = (ue) => {
      activeTouches.delete(ue.pointerId);
      if (activeTouches.size < 2) {
        lastPinchDist = 0;
        lastPinchCenter = null;
      }
      try { logicalCanvas.releasePointerCapture(ue.pointerId); } catch (_) {}
      logicalCanvas.classList.remove('panning');
      logicalCanvas.removeEventListener('pointermove', onBgMove);
      logicalCanvas.removeEventListener('pointerup', onBgUp);
      logicalCanvas.removeEventListener('pointercancel', onBgUp);

      if (selectionMarquee) selectionMarquee.classList.add('hidden');

      if (!didDrag) {
        selectSingleDevice(null);
      }
      renderCanvas();
    };

    logicalCanvas.addEventListener('pointermove', onBgMove);
    logicalCanvas.addEventListener('pointerup', onBgUp);
    logicalCanvas.addEventListener('pointercancel', onBgUp);
  });

  // Track coordinates
  logicalCanvas.addEventListener('pointermove', (e) => {
    const pt = screenToCanvas(e.clientX, e.clientY);
    const coords = document.getElementById('pt-coords');
    if (coords) coords.textContent = `x: ${pt.x}, y: ${pt.y}`;
  });

  // ---------------------------------------------------------------- Simple PDU Ping
  function fireSimplePdu(srcDev, dstDev) {
    let dstIp = '';
    if (dstDev.cfg && dstDev.cfg.ifaces) {
      for (const ifc of Object.values(dstDev.cfg.ifaces)) {
        if (ifc.ip && !ifc.shutdown) { dstIp = ifc.ip; break; }
      }
    }
    if (!dstIp) {
      alert(`الجهاز الهدف (${dstDev.name}) لا يملك عنوان IP بعد! قم بإعداد IP أولاً.`);
      return;
    }

    const res = net.runPing(srcDev, dstIp, true);
    const pdu = {
      id: `pdu_${Date.now()}`,
      status: res.success ? 'Successful' : 'Failed',
      src: srcDev.name,
      dst: dstDev.name,
      type: 'ICMP',
      time: '0.001'
    };
    state.pduList.unshift(pdu);
    renderPduTable();

    // Visual envelope animation along nodePath
    if (res.nodePath && res.nodePath.length >= 2) {
      animateEnvelope(res.nodePath, res.success);
    }
  }

  function animateEnvelope(nodeIds, success) {
    const firstDev = net.getDevice(nodeIds[0]);
    if (!firstDev) return;

    const env = document.createElement('div');
    env.className = 'pt-pdu-envelope icmp';
    env.innerHTML = '✉️';
    env.style.left = `${firstDev.x}px`;
    env.style.top = `${firstDev.y - 18}px`;
    pduLayer.appendChild(env);

    let step = 1;
    const timer = setInterval(() => {
      if (step >= nodeIds.length) {
        clearInterval(timer);
        env.innerHTML = success ? '✅' : '❌';
        setTimeout(() => env.remove(), 1200);
        return;
      }
      const nxt = net.getDevice(nodeIds[step]);
      if (nxt) {
        env.style.left = `${nxt.x}px`;
        env.style.top = `${nxt.y - 18}px`;
      }
      step++;
    }, 450);
  }

  function renderPduTable() {
    const tbody = document.getElementById('pt-pdu-tbody');
    if (!tbody) return;
    if (!state.pduList.length) {
      tbody.innerHTML = `<tr class="pt-pdu-empty-row"><td colspan="6">استخدم أداة المغلف ✉️ لاختبار Ping بين أي جهازين</td></tr>`;
      return;
    }
    tbody.innerHTML = '';
    for (const p of state.pduList) {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.title = 'انقر لعرض تفاصيل الـ PDU ونموذج OSI';
      const stClass = p.status === 'Successful' ? 'status-success' : 'status-failed';
      tr.innerHTML = `
        <td><button class="pt-small-btn" title="Fire">🔥</button></td>
        <td class="${stClass}">${p.status}</td>
        <td>${p.src}</td>
        <td>${p.dst}</td>
        <td>${p.type}</td>
        <td>${p.time}</td>
      `;
      tr.onclick = () => openPduInfoModal(p);
      tbody.appendChild(tr);
    }
  }

  // ---------------------------------------------------------------- Device Window Modal
  function openDeviceModal(devId, defaultTab) {
    const dev = net.getDevice(devId);
    if (!dev) return;
    state.openDeviceId = devId;

    const modal = document.getElementById('pt-device-modal');
    const title = document.getElementById('pt-dev-window-title');
    title.textContent = `${dev.cfg ? dev.cfg.hostname : dev.name} (${dev.model})`;

    const isNet = dev.type === 'switch' || dev.type === 'l3switch' || dev.type === 'router';
    const isEnd = dev.type === 'pc' || dev.type === 'server' || dev.type === 'laptop';
    const isSrv = dev.type === 'server';

    document.getElementById('tab-btn-cli').classList.toggle('hidden', !isNet);
    document.getElementById('tab-btn-desktop').classList.toggle('hidden', !isEnd);
    document.getElementById('tab-btn-services').classList.toggle('hidden', !isSrv);

    const initialTab = defaultTab || (isNet ? 'cli' : isSrv ? 'services' : 'desktop');
    switchDeviceTab(initialTab);
    modal.classList.remove('hidden');
  }

  function switchDeviceTab(tabName) {
    const dev = net.getDevice(state.openDeviceId);
    if (!dev) return;

    document.querySelectorAll('#pt-dev-tabs .pt-dtab').forEach(b => {
      b.classList.toggle('active', b.dataset.devtab === tabName);
    });

    ['physical', 'config', 'cli', 'desktop', 'services', 'attributes'].forEach(t => {
      const pane = document.getElementById(`devtab-${t}`);
      if (pane) pane.classList.toggle('hidden', t !== tabName);
    });

    if (tabName === 'cli') renderCliTab(dev);
    else if (tabName === 'services') renderServicesTab(dev);
    else if (tabName === 'desktop') renderDesktopTab(dev);
    else if (tabName === 'config') renderConfigTab(dev);
    else if (tabName === 'physical') renderPhysicalTab(dev);
    else if (tabName === 'attributes') renderAttributesTab(dev);
  }

  // ---------------------------------------------------------------- CLI Tab Renderer
  function renderCliTab(dev) {
    const outPre = document.getElementById('pt-cli-output');
    const promptEl = document.getElementById('pt-cli-prompt');
    const input = document.getElementById('pt-cli-input');

    dev.rt = dev.rt || PT.freshRuntime(dev);
    promptEl.textContent = PT.getPrompt(dev);
    outPre.textContent = dev.rt.consoleOut || (dev.type === 'router'
      ? 'System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)\nCisco ' + dev.model + ' processor.\n\n         --- System Configuration Dialog ---\n\nWould you like to enter the initial configuration dialog? [yes/no]: '
      : 'Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE4\nPress RETURN to get started!\n\nSwitch>');

    const screen = document.getElementById('pt-cli-screen');
    screen.scrollTop = screen.scrollHeight;
    input.focus();

    // Bind Enter and Tab
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const line = input.value;
        input.value = '';
        executeCliLine(dev, line);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const res = PT.autocomplete(dev, input.value);
        input.value = res.line;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (dev.rt.cliHistory && dev.rt.cliHistory.length) {
          dev.rt.cliHistoryIdx = Math.max(0, (dev.rt.cliHistoryIdx || dev.rt.cliHistory.length) - 1);
          input.value = dev.rt.cliHistory[dev.rt.cliHistoryIdx] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (dev.rt.cliHistory) {
          dev.rt.cliHistoryIdx = Math.min(dev.rt.cliHistory.length, (dev.rt.cliHistoryIdx || 0) + 1);
          input.value = dev.rt.cliHistory[dev.rt.cliHistoryIdx] || '';
        }
      }
    };
  }

  function executeCliLine(dev, line) {
    const outPre = document.getElementById('pt-cli-output');
    const promptEl = document.getElementById('pt-cli-prompt');
    const curPrompt = PT.getPrompt(dev);

    const outText = PT.execute(dev, line, net);

    dev.rt.consoleOut = (dev.rt.consoleOut || '') + curPrompt + ' ' + line + '\n' + (outText ? outText + '\n' : '');
    outPre.textContent = dev.rt.consoleOut;
    promptEl.textContent = PT.getPrompt(dev);

    const screen = document.getElementById('pt-cli-screen');
    screen.scrollTop = screen.scrollHeight;
  }

  // ---------------------------------------------------------------- Services Tab (Server-PT)
  function renderServicesTab(dev) {
    const sidebar = document.getElementById('pt-services-sidebar');
    const main = document.getElementById('pt-services-main');
    dev.cfg.services = dev.cfg.services || {};

    sidebar.innerHTML = `
      <div class="pt-cfg-group-header">SERVICES</div>
      <button class="pt-cfg-nav-btn active" data-srv="dhcp">DHCP</button>
      <button class="pt-cfg-nav-btn" data-srv="http">HTTP</button>
      <button class="pt-cfg-nav-btn" data-srv="dns">DNS</button>
      <button class="pt-cfg-nav-btn" data-srv="tftp">TFTP</button>
    `;

    const showSrv = (srvKey) => {
      sidebar.querySelectorAll('.pt-cfg-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.srv === srvKey));

      if (srvKey === 'http') {
        const http = dev.cfg.services.http = dev.cfg.services.http || { on: true, html: '<h2>Cisco Packet Tracer Web Server</h2><hr/><p>Welcome to Cisco Packet Tracer HTTP Server. Mind Wide Open.</p>' };
        main.innerHTML = `
          <div class="pt-cfg-title">HTTP Service</div>
          <div class="pt-cfg-row" style="margin-bottom:12px;">
            <label style="font-weight:700;">Service</label>
            <label style="margin-right:16px;"><input type="radio" name="srv_http_state" value="on" ${http.on ? 'checked' : ''} /> On</label>
            <label><input type="radio" name="srv_http_state" value="off" ${!http.on ? 'checked' : ''} /> Off</label>
          </div>
          <div style="margin-bottom:8px;font-weight:600;">index.html Content:</div>
          <textarea id="http_html_content" style="width:100%;height:140px;font-family:Consolas,monospace;font-size:12px;padding:8px;box-sizing:border-box;">${http.html}</textarea>
          <div style="margin-top:10px;">
            <button id="btn_save_http_srv" class="pt-small-btn" style="padding:6px 20px;font-weight:700;background:#2563eb;color:#fff;">Save</button>
            <span id="http_saved_msg" style="margin-left:12px;color:#16a34a;font-weight:700;"></span>
          </div>
        `;
        document.getElementById('btn_save_http_srv').onclick = () => {
          http.on = main.querySelector('input[name="srv_http_state"]:checked').value === 'on';
          http.html = document.getElementById('http_html_content').value;
          document.getElementById('http_saved_msg').textContent = 'Saved successfully!';
          setTimeout(() => { const m = document.getElementById('http_saved_msg'); if (m) m.textContent = ''; }, 2000);
        };
      } else if (srvKey === 'dns') {
        const dns = dev.cfg.services.dns = dev.cfg.services.dns || { on: true, records: [{ name: 'www.cisco.com', ip: '192.168.1.254' }] };
        const renderDns = () => {
          const rows = dns.records.map((r, idx) => `<tr><td>${r.name}</td><td>A Record</td><td>${r.ip}</td><td><button class="pt-small-btn" data-del-dns="${idx}">Delete</button></td></tr>`).join('');
          main.innerHTML = `
            <div class="pt-cfg-title">DNS Service</div>
            <div class="pt-cfg-row" style="margin-bottom:12px;">
              <label style="font-weight:700;">Service</label>
              <label style="margin-right:16px;"><input type="radio" name="srv_dns_state" value="on" ${dns.on ? 'checked' : ''} /> On</label>
              <label><input type="radio" name="srv_dns_state" value="off" ${!dns.on ? 'checked' : ''} /> Off</label>
            </div>
            <div class="pt-cfg-row"><label>Resource Name</label><input id="dns_rec_name" class="pt-cfg-input" placeholder="www.cisco.com" /></div>
            <div class="pt-cfg-row"><label>Type</label><select class="pt-cfg-input"><option>A Record</option></select></div>
            <div class="pt-cfg-row"><label>IP Address</label><input id="dns_rec_ip" class="pt-cfg-input" placeholder="192.168.1.254" /></div>
            <div style="margin-top:10px;"><button id="btn_add_dns_rec" class="pt-small-btn" style="padding:6px 20px;font-weight:700;background:#2563eb;color:#fff;">Add</button></div>
            <table class="pt-attr-table" style="margin-top:14px;">
              <thead><tr><th>Domain Name</th><th>Type</th><th>IP Address</th><th>Action</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="4">No DNS records</td></tr>'}</tbody>
            </table>
          `;
          main.querySelectorAll('[data-del-dns]').forEach(b => {
            b.onclick = () => { dns.records.splice(parseInt(b.dataset.delDns, 10), 1); renderDns(); };
          });
          document.getElementById('btn_add_dns_rec').onclick = () => {
            const name = document.getElementById('dns_rec_name').value.trim();
            const ip = document.getElementById('dns_rec_ip').value.trim();
            if (name && ip) { dns.records.push({ name, ip }); renderDns(); }
          };
          main.querySelectorAll('input[name="srv_dns_state"]').forEach(r => {
            r.onchange = () => { dns.on = r.value === 'on'; };
          });
        };
        renderDns();
      } else if (srvKey === 'dhcp') {
        const dhcp = dev.cfg.services.dhcp = dev.cfg.services.dhcp || { on: true, pools: [] };
        if (!dhcp.pools.length) {
          dhcp.pools.push({ name: 'serverPool', gateway: '192.168.1.1', dns: '192.168.1.254', start: '192.168.1.100', mask: '255.255.255.0', max: 50 });
        }
        const pool = dhcp.pools[0];

        main.innerHTML = `
          <div class="pt-cfg-title">DHCP Service</div>
          <div class="pt-cfg-row" style="margin-bottom:12px;">
            <label style="font-weight:700;">Service</label>
            <label style="margin-right:16px;"><input type="radio" name="srv_dhcp_state" value="on" ${dhcp.on ? 'checked' : ''} /> On</label>
            <label><input type="radio" name="srv_dhcp_state" value="off" ${!dhcp.on ? 'checked' : ''} /> Off</label>
          </div>
          <div class="pt-cfg-row"><label>Pool Name</label><input id="dhcp_pool_name" class="pt-cfg-input" value="${pool.name}" /></div>
          <div class="pt-cfg-row"><label>Default Gateway</label><input id="dhcp_gw" class="pt-cfg-input" value="${pool.gateway}" /></div>
          <div class="pt-cfg-row"><label>DNS Server</label><input id="dhcp_dns" class="pt-cfg-input" value="${pool.dns}" /></div>
          <div class="pt-cfg-row"><label>Start IP Address</label><input id="dhcp_start" class="pt-cfg-input" value="${pool.start}" /></div>
          <div class="pt-cfg-row"><label>Subnet Mask</label><input id="dhcp_mask" class="pt-cfg-input" value="${pool.mask}" /></div>
          <div class="pt-cfg-row"><label>Maximum number of Users</label><input id="dhcp_max" class="pt-cfg-input" value="${pool.max}" type="number" /></div>
          <div style="margin-top:14px;">
            <button id="btn_save_dhcp_srv" class="pt-small-btn" style="padding:6px 20px;font-weight:700;background:#2563eb;color:#fff;">Save</button>
            <span id="dhcp_saved_msg" style="margin-left:12px;color:#16a34a;font-weight:700;"></span>
          </div>
          <div style="margin-top:16px;">
            <table class="pt-attr-table">
              <thead><tr><th>Pool Name</th><th>Default Gateway</th><th>DNS</th><th>Start IP</th><th>Subnet Mask</th><th>Max Users</th></tr></thead>
              <tbody><tr><td>${pool.name}</td><td>${pool.gateway}</td><td>${pool.dns}</td><td>${pool.start}</td><td>${pool.mask}</td><td>${pool.max}</td></tr></tbody>
            </table>
          </div>
        `;

        document.getElementById('btn_save_dhcp_srv').onclick = () => {
          dhcp.on = main.querySelector('input[name="srv_dhcp_state"]:checked').value === 'on';
          pool.name = document.getElementById('dhcp_pool_name').value.trim();
          pool.gateway = document.getElementById('dhcp_gw').value.trim();
          pool.dns = document.getElementById('dhcp_dns').value.trim();
          pool.start = document.getElementById('dhcp_start').value.trim();
          pool.mask = document.getElementById('dhcp_mask').value.trim();
          pool.max = parseInt(document.getElementById('dhcp_max').value, 10) || 50;
          document.getElementById('dhcp_saved_msg').textContent = 'Saved successfully!';
          setTimeout(() => {
            const m = document.getElementById('dhcp_saved_msg');
            if (m) m.textContent = '';
          }, 2000);
        };
      }
    };

    sidebar.querySelectorAll('.pt-cfg-nav-btn').forEach(b => {
      b.onclick = () => showSrv(b.dataset.srv);
    });
    showSrv('http');
  }

  // ---------------------------------------------------------------- Desktop Tab (PC / Laptop)
  function renderDesktopTab(dev) {
    const grid = document.getElementById('pt-desktop-grid');
    const subapp = document.getElementById('pt-desk-subapp');
    grid.classList.remove('hidden');
    subapp.classList.add('hidden');

    grid.querySelectorAll('.pt-desk-card').forEach(btn => {
      btn.onclick = () => {
        const app = btn.dataset.deskapp;
        openDesktopApp(dev, app);
      };
    });
  }

  function openDesktopApp(dev, appName) {
    const grid = document.getElementById('pt-desktop-grid');
    const subapp = document.getElementById('pt-desk-subapp');
    const subtitle = document.getElementById('pt-desk-subtitle');
    const subbody = document.getElementById('pt-desk-subbody');

    grid.classList.add('hidden');
    subapp.classList.remove('hidden');

    document.getElementById('btn-close-deskapp').onclick = () => {
      subapp.classList.add('hidden');
      grid.classList.remove('hidden');
    };

    if (appName === 'ipconfig') {
      subtitle.textContent = 'IP Configuration';
      const port = dev.ports.find(p => p.kind === 'fa' || p.kind === 'eth') || dev.ports[0];
      const ifc = dev.cfg.ifaces[port.name] || {};
      const isDhcp = dev.cfg.host.dhcp;

      subbody.innerHTML = `
        <div style="padding:16px;">
          <div style="margin-bottom:12px;font-weight:700;">IP Configuration</div>
          <div style="margin-bottom:12px;">
            <label style="margin-right:16px;"><input type="radio" name="pc_ip_mode" value="dhcp" ${isDhcp ? 'checked' : ''} /> DHCP</label>
            <label><input type="radio" name="pc_ip_mode" value="static" ${!isDhcp ? 'checked' : ''} /> Static</label>
          </div>
          <div class="pt-cfg-row"><label>IP Address</label><input id="pc_in_ip" class="pt-cfg-input" value="${ifc.ip || ''}" ${isDhcp ? 'disabled' : ''} /></div>
          <div class="pt-cfg-row"><label>Subnet Mask</label><input id="pc_in_mask" class="pt-cfg-input" value="${ifc.mask || ''}" ${isDhcp ? 'disabled' : ''} /></div>
          <div class="pt-cfg-row"><label>Default Gateway</label><input id="pc_in_gw" class="pt-cfg-input" value="${dev.cfg.host.gateway || ''}" ${isDhcp ? 'disabled' : ''} /></div>
          <div class="pt-cfg-row"><label>DNS Server</label><input id="pc_in_dns" class="pt-cfg-input" value="${dev.cfg.host.dns || ''}" ${isDhcp ? 'disabled' : ''} /></div>
          <div id="pc_dhcp_status_msg" style="margin-top:12px;font-weight:700;"></div>
        </div>
      `;

      const ipIn = document.getElementById('pc_in_ip');
      const maskIn = document.getElementById('pc_in_mask');
      const gwIn = document.getElementById('pc_in_gw');
      const dnsIn = document.getElementById('pc_in_dns');
      const statusMsg = document.getElementById('pc_dhcp_status_msg');

      const saveStatic = () => {
        ifc.ip = ipIn.value.trim();
        if (ifc.ip && !maskIn.value.trim()) maskIn.value = '255.255.255.0';
        ifc.mask = maskIn.value.trim();
        dev.cfg.host.gateway = gwIn.value.trim();
        dev.cfg.host.dns = dnsIn.value.trim();
        renderCanvas();
      };
      ipIn.onchange = saveStatic;
      maskIn.onchange = saveStatic;
      gwIn.onchange = saveStatic;
      dnsIn.onchange = saveStatic;

      subbody.querySelectorAll('input[name="pc_ip_mode"]').forEach(r => {
        r.onchange = () => {
          if (r.value === 'dhcp') {
            dev.cfg.host.dhcp = true;
            statusMsg.style.color = '#2563eb';
            statusMsg.textContent = 'Requesting IP address...';
            const lease = net.requestDhcp(dev);
            if (lease) {
              ipIn.value = lease.ip;
              maskIn.value = lease.mask;
              gwIn.value = lease.gateway || '';
              dnsIn.value = lease.dns || '';
              ipIn.disabled = true;
              maskIn.disabled = true;
              gwIn.disabled = true;
              dnsIn.disabled = true;
              statusMsg.style.color = '#16a34a';
              statusMsg.textContent = 'DHCP request successful.';
              renderCanvas();
            } else {
              statusMsg.style.color = '#d97706';
              statusMsg.textContent = 'DHCP failed. APIPA is being used.';
            }
          } else {
            dev.cfg.host.dhcp = false;
            ipIn.disabled = false;
            maskIn.disabled = false;
            gwIn.disabled = false;
            dnsIn.disabled = false;
            statusMsg.textContent = '';
          }
        };
      });
    } else if (appName === 'cmd') {
      subtitle.textContent = 'Command Prompt';
      dev.rt = dev.rt || PT.freshRuntime(dev);
      dev.rt.consoleOut = dev.rt.consoleOut || 'Packet Tracer PC Command Line 1.0\n\nC:\\>';
      subbody.style.padding = '0';
      subbody.innerHTML = `
        <div style="background:#000;color:#f0f0f0;font-family:Consolas,monospace;height:100%;padding:10px;box-sizing:border-box;display:flex;flex-direction:column;">
          <pre id="pc_cmd_out" style="flex:1;overflow-y:auto;margin:0;font-size:13px;line-height:1.4;white-space:pre-wrap;">${dev.rt.consoleOut}</pre>
          <div style="display:flex;align-items:center;">
            <span style="color:#f0f0f0;font-weight:700;">C:\\&gt;&nbsp;</span>
            <input id="pc_cmd_in" style="flex:1;background:transparent;border:none;color:#fff;font-family:Consolas,monospace;font-size:13px;outline:none;" autocomplete="off" />
          </div>
        </div>
        <div class="pt-mobile-cli-assist" style="margin:0;border-radius:0;">
          <div class="pt-cli-chips-row">
            <button class="pt-cmd-chip" data-pccmd="ipconfig">ipconfig</button>
            <button class="pt-cmd-chip" data-pccmd="ipconfig /all">ipconfig /all</button>
            <button class="pt-cmd-chip" data-pccmd="ipconfig /renew">ipconfig /renew</button>
            <button class="pt-cmd-chip" data-pcinp="ping 192.168.1.1">ping 192.168.1.1</button>
            <button class="pt-cmd-chip" data-pcinp="ping 192.168.10.1">ping 192.168.10.1</button>
            <button class="pt-cmd-chip" data-pccmd="arp -a">arp -a</button>
            <button class="pt-cmd-chip" data-pcinp="tracert ">tracert ...</button>
            <button class="pt-cmd-chip" data-pccmd="help">help (?)</button>
            <button class="pt-cmd-chip" data-pccmd="cls">cls</button>
          </div>
        </div>
      `;
      const cmdOut = document.getElementById('pc_cmd_out');
      const cmdIn = document.getElementById('pc_cmd_in');
      cmdIn.focus();

      const runPcLine = (raw) => {
        const resp = PT.executePcCommand ? PT.executePcCommand(dev, raw, net) : '';
        if (resp === '__CLEAR__') {
          dev.rt.consoleOut = 'Packet Tracer PC Command Line 1.0\n\nC:\\>';
        } else {
          dev.rt.consoleOut += `\nC:\\>${raw}${resp ? '\n' + resp : ''}`;
        }
        cmdOut.textContent = dev.rt.consoleOut;
        cmdIn.value = '';
        cmdOut.scrollTop = cmdOut.scrollHeight;
        renderCanvas();
      };

      cmdIn.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runPcLine(cmdIn.value);
        }
      };

      subbody.querySelectorAll('[data-pccmd]').forEach(b => {
        b.onclick = () => runPcLine(b.dataset.pccmd);
      });
      subbody.querySelectorAll('[data-pcinp]').forEach(b => {
        b.onclick = () => { cmdIn.value = b.dataset.pcinp; cmdIn.focus(); };
      });
    } else if (appName === 'terminal') {
      subtitle.textContent = 'Terminal — Port Configuration';
      subbody.style.padding = '14px';

      // Find connected console peer
      let connectedDev = null;
      for (const link of net.links) {
        if (link.cableType === 'console') {
          if (link.devA === dev.id) connectedDev = net.getDevice(link.devB);
          else if (link.devB === dev.id) connectedDev = net.getDevice(link.devA);
        }
      }
      const netDevs = net.devices.filter(d => ['switch', 'l3switch', 'router'].includes(d.type));
      const targetOptions = netDevs.map(d =>
        `<option value="${d.id}" ${connectedDev && connectedDev.id === d.id ? 'selected' : ''}>${d.cfg.hostname || d.name} (${d.model})</option>`
      ).join('');

      subbody.innerHTML = `
        <fieldset style="border:1px solid #9ca3af;padding:14px;max-width:480px;background:#f9fafb;">
          <legend style="padding:0 6px;font-weight:700;">Terminal Configuration</legend>
          <div class="pt-cfg-row"><label>Bits per second:</label><input class="pt-cfg-input" value="9600" readonly /></div>
          <div class="pt-cfg-row"><label>Data Bits:</label><input class="pt-cfg-input" value="8" readonly /></div>
          <div class="pt-cfg-row"><label>Parity:</label><input class="pt-cfg-input" value="None" readonly /></div>
          <div class="pt-cfg-row"><label>Stop Bits:</label><input class="pt-cfg-input" value="1" readonly /></div>
          <div class="pt-cfg-row"><label>Flow Control:</label><input class="pt-cfg-input" value="None" readonly /></div>
          <div class="pt-cfg-row" style="margin-top:10px;">
            <label style="font-weight:700;">Target Device:</label>
            <select id="term_target_dev" class="pt-cfg-input">${targetOptions || '<option value="">No Switch/Router found</option>'}</select>
          </div>
          <div style="margin-top:14px;">
            <button id="btn_term_connect" class="pt-small-btn" style="padding:6px 22px;font-weight:700;background:#2563eb;color:#fff;">OK / Connect</button>
          </div>
        </fieldset>
      `;

      document.getElementById('btn_term_connect').onclick = () => {
        const selId = document.getElementById('term_target_dev').value;
        if (selId) {
          openDeviceModal(selId, 'cli');
        }
      };
    } else if (appName === 'browser') {
      subtitle.textContent = 'Web Browser';
      subbody.style.padding = '12px';
      const srv = net.devices.find(d => d.type === 'server');
      let defaultUrl = 'http://www.cisco.com';
      if (srv && srv.cfg && srv.cfg.ifaces) {
        for (const ifc of Object.values(srv.cfg.ifaces)) {
          if (ifc.ip && !ifc.shutdown) { defaultUrl = `http://${ifc.ip}`; break; }
        }
      }

      subbody.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
          <span style="font-weight:700;">URL</span>
          <input type="text" id="web_url_input" class="pt-cfg-input" value="${defaultUrl}" style="flex:1;" />
          <button id="web_go_btn" class="pt-small-btn" style="padding:6px 20px;font-weight:700;background:#2563eb;color:#fff;">Go</button>
        </div>
        <div id="web_viewport" style="flex:1;background:#fff;border:1px solid #9ca3af;padding:20px;min-height:220px;overflow-y:auto;">
          <h2 style="color:#0284c7;margin-bottom:8px;">Cisco Packet Tracer — Welcome to Web Browser</h2>
          <hr style="margin-bottom:12px;border:0;border-top:1px solid #cbd5e1;" />
          <p>Welcome to Cisco Packet Tracer Web Browser. Enter a server IP address or domain name above to browse.</p>
        </div>
      `;

      document.getElementById('web_go_btn').onclick = () => {
        const u = document.getElementById('web_url_input').value.trim();
        const host = u.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
        const viewport = document.getElementById('web_viewport');

        // Look for matching server by IP or DNS
        let targetSrv = null;
        for (const d of net.devices) {
          if (!d.power || d.type !== 'server') continue;
          if (d.cfg && d.cfg.ifaces) {
            for (const ifc of Object.values(d.cfg.ifaces)) {
              if (ifc.ip === host && !ifc.shutdown) { targetSrv = d; break; }
            }
          }
          if (targetSrv) break;
          // Check DNS service on server
          if (d.cfg && d.cfg.services && d.cfg.services.dns && d.cfg.services.dns.records) {
            const matchRec = d.cfg.services.dns.records.find(r => r.name.toLowerCase() === host.toLowerCase());
            if (matchRec) {
              targetSrv = net.devices.find(x => x.power && x.type === 'server' && Object.values(x.cfg.ifaces).some(i => i.ip === matchRec.ip));
              if (targetSrv) break;
            }
          }
        }

        if (targetSrv && targetSrv.cfg && targetSrv.cfg.services && targetSrv.cfg.services.http && targetSrv.cfg.services.http.on) {
          viewport.innerHTML = targetSrv.cfg.services.http.html || '<h2>Welcome to Cisco Web Server</h2>';
        } else {
          viewport.innerHTML = `
            <div style="color:#dc2626;padding:12px;">
              <h3>Host Name Unresolved</h3>
              <p>Cannot connect to <strong>${host}</strong>. Server may be down, or HTTP service is turned off, or DNS record is missing.</p>
            </div>
          `;
        }
      };
    } else {
      subtitle.textContent = appName.toUpperCase();
      subbody.innerHTML = `<div style="padding:20px;">${appName} is ready.</div>`;
    }
  }

  // ---------------------------------------------------------------- Device Config Tab
  function renderConfigTab(dev) {
    const sidebar = document.getElementById('pt-config-sidebar');
    const main = document.getElementById('pt-config-main');
    const equivBox = document.getElementById('pt-equiv-ios-box');
    if (equivBox) equivBox.textContent = (dev.rt && dev.rt.consoleOut) || '';

    const appendEquiv = (cmds) => {
      for (const cmd of cmds) {
        PT.execute(dev, cmd, net);
      }
      if (equivBox) {
        equivBox.textContent = dev.rt ? dev.rt.consoleOut : '';
        equivBox.scrollTop = equivBox.scrollHeight;
      }
      renderCanvas();
    };

    sidebar.innerHTML = '';

    // Group 1: GLOBAL
    const gGlobal = document.createElement('div');
    gGlobal.className = 'pt-cfg-group-header';
    gGlobal.textContent = 'GLOBAL';
    sidebar.appendChild(gGlobal);

    const btnSettings = document.createElement('button');
    btnSettings.className = 'pt-cfg-nav-btn active';
    btnSettings.textContent = 'Settings';
    sidebar.appendChild(btnSettings);

    // Group 2: ROUTING (for Routers & L3 Switches)
    let btnStatic = null, btnRip = null;
    if (dev.type === 'router' || dev.type === 'l3switch') {
      const gRouting = document.createElement('div');
      gRouting.className = 'pt-cfg-group-header';
      gRouting.textContent = 'ROUTING';
      sidebar.appendChild(gRouting);

      btnStatic = document.createElement('button');
      btnStatic.className = 'pt-cfg-nav-btn';
      btnStatic.textContent = 'Static';
      sidebar.appendChild(btnStatic);

      btnRip = document.createElement('button');
      btnRip.className = 'pt-cfg-nav-btn';
      btnRip.textContent = 'RIP';
      sidebar.appendChild(btnRip);
    }

    // Group 3: SWITCHING (for Switches)
    let btnVlanDb = null;
    if (dev.type === 'switch' || dev.type === 'l3switch') {
      const gSw = document.createElement('div');
      gSw.className = 'pt-cfg-group-header';
      gSw.textContent = 'SWITCHING';
      sidebar.appendChild(gSw);

      btnVlanDb = document.createElement('button');
      btnVlanDb.className = 'pt-cfg-nav-btn';
      btnVlanDb.textContent = 'VLAN Database';
      sidebar.appendChild(btnVlanDb);
    }

    // Group 4: INTERFACE
    const gIf = document.createElement('div');
    gIf.className = 'pt-cfg-group-header';
    gIf.textContent = 'INTERFACE';
    sidebar.appendChild(gIf);

    const setActiveBtn = (b) => {
      sidebar.querySelectorAll('.pt-cfg-nav-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };

    const showGlobalSettings = () => {
      setActiveBtn(btnSettings);
      const isIos = ['switch', 'l3switch', 'router'].includes(dev.type);
      const hostCfg = (dev.cfg && dev.cfg.host) || {};
      main.innerHTML = `
        <div class="pt-cfg-title">Global Settings</div>
        <div class="pt-cfg-row">
          <label>Display Name</label>
          <input type="text" id="cfg_disp_name" class="pt-cfg-input" value="${dev.name}" />
        </div>
        ${isIos ? `
        <div class="pt-cfg-row">
          <label>Hostname</label>
          <input type="text" id="cfg_hostname" class="pt-cfg-input" value="${dev.cfg ? dev.cfg.hostname : dev.name}" />
        </div>
        <div class="pt-cfg-row">
          <label>NVRAM</label>
          <div style="display:flex;gap:8px;flex:1">
            <button id="cfg_nvram_erase" class="pt-small-btn">Erase</button>
            <button id="cfg_nvram_save" class="pt-small-btn">Save</button>
          </div>
        </div>
        ` : `
        <div class="pt-cfg-row">
          <label>Default Gateway</label>
          <input type="text" id="cfg_pc_gw" class="pt-cfg-input" value="${hostCfg.gateway || dev.cfg.defaultGateway || ''}" placeholder="192.168.1.1" />
        </div>
        <div class="pt-cfg-row">
          <label>DNS Server</label>
          <input type="text" id="cfg_pc_dns" class="pt-cfg-input" value="${hostCfg.dns || dev.cfg.dnsServer || ''}" placeholder="8.8.8.8" />
        </div>
        `}
      `;

      document.getElementById('cfg_disp_name').onchange = (e) => {
        dev.name = e.target.value.trim() || dev.name;
        document.getElementById('pt-dev-window-title').textContent = `${dev.cfg ? dev.cfg.hostname : dev.name} (${dev.model})`;
        renderCanvas();
      };
      if (isIos) {
        document.getElementById('cfg_hostname').onchange = (e) => {
          const h = e.target.value.trim();
          if (h) appendEquiv(['enable', 'configure terminal', `hostname ${h}`, 'exit']);
        };
        document.getElementById('cfg_nvram_save').onclick = () => {
          appendEquiv(['enable', 'write memory']);
        };
        document.getElementById('cfg_nvram_erase').onclick = () => {
          appendEquiv(['enable', 'erase startup-config']);
        };
      } else {
        document.getElementById('cfg_pc_gw').onchange = (e) => {
          hostCfg.gateway = e.target.value.trim();
          dev.cfg.defaultGateway = hostCfg.gateway;
        };
        document.getElementById('cfg_pc_dns').onchange = (e) => {
          hostCfg.dns = e.target.value.trim();
          dev.cfg.dnsServer = hostCfg.dns;
        };
      }
    };

    btnSettings.onclick = showGlobalSettings;

    if (btnVlanDb) {
      btnVlanDb.onclick = () => {
        setActiveBtn(btnVlanDb);
        const renderVlanPanel = () => {
          const vlans = dev.cfg && dev.cfg.vlans ? dev.cfg.vlans : {};
          const rows = Object.entries(vlans).map(([vid, v]) =>
            `<tr><td>${vid}</td><td>${v.name}</td><td>${vid === '1' ? '' : `<button class="pt-small-btn" data-del-vlan="${vid}">Delete</button>`}</td></tr>`
          ).join('');

          main.innerHTML = `
            <div class="pt-cfg-title">VLAN Configuration</div>
            <div class="pt-cfg-row"><label>VLAN Number</label><input type="number" id="cfg_vlan_num" class="pt-cfg-input" placeholder="10" /></div>
            <div class="pt-cfg-row"><label>VLAN Name</label><input type="text" id="cfg_vlan_name" class="pt-cfg-input" placeholder="Sales" /></div>
            <div style="display:flex;justify-content:center;gap:12px;margin:10px 0;">
              <button id="cfg_vlan_add" class="pt-small-btn" style="padding:4px 18px;font-weight:700;">Add</button>
            </div>
            <table class="pt-attr-table" style="background:#fff;margin-top:8px;">
              <thead><tr><th>VLAN No</th><th>VLAN Name</th><th>Action</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          `;

          main.querySelectorAll('[data-del-vlan]').forEach(b => {
            b.onclick = () => {
              const vid = b.dataset.delVlan;
              appendEquiv(['enable', 'configure terminal', `no vlan ${vid}`, 'exit']);
              renderVlanPanel();
            };
          });

          document.getElementById('cfg_vlan_add').onclick = () => {
            const num = parseInt(document.getElementById('cfg_vlan_num').value, 10);
            const name = document.getElementById('cfg_vlan_name').value.trim() || `VLAN${String(num).padStart(4, '0')}`;
            if (num >= 1 && num <= 4094) {
              appendEquiv(['enable', 'configure terminal', `vlan ${num}`, `name ${name}`, 'exit']);
              renderVlanPanel();
            }
          };
        };
        renderVlanPanel();
      };
    }

    if (btnStatic) {
      btnStatic.onclick = () => {
        setActiveBtn(btnStatic);
        const renderStatic = () => {
          dev.cfg.staticRoutes = dev.cfg.staticRoutes || [];
          const listHtml = dev.cfg.staticRoutes.map((r, i) =>
            `<li>${r.network} / ${r.mask} via ${r.nextHop} <button class="pt-small-btn" data-del-static="${i}">Delete</button></li>`
          ).join('');

          main.innerHTML = `
            <div class="pt-cfg-title">Static Routes</div>
            <div class="pt-cfg-row"><label>Network</label><input id="st_net" class="pt-cfg-input" placeholder="192.168.2.0" /></div>
            <div class="pt-cfg-row"><label>Mask</label><input id="st_mask" class="pt-cfg-input" placeholder="255.255.255.0" /></div>
            <div class="pt-cfg-row"><label>Next Hop</label><input id="st_nh" class="pt-cfg-input" placeholder="10.0.0.2" /></div>
            <div style="margin:10px 0;"><button id="st_add_btn" class="pt-small-btn" style="padding:4px 16px;font-weight:700;">Add</button></div>
            <ul style="margin-top:12px;padding-left:18px;background:#fff;border:1px solid #9ca3af;padding:8px;">${listHtml || '<li>No static routes</li>'}</ul>
          `;

          main.querySelectorAll('[data-del-static]').forEach(b => {
            b.onclick = () => {
              const idx = parseInt(b.dataset.delStatic, 10);
              const r = dev.cfg.staticRoutes[idx];
              if (r) {
                appendEquiv(['enable', 'configure terminal', `no ip route ${r.network} ${r.mask} ${r.nextHop}`, 'exit']);
              }
              renderStatic();
            };
          });

          document.getElementById('st_add_btn').onclick = () => {
            const network = document.getElementById('st_net').value.trim();
            const mask = document.getElementById('st_mask').value.trim();
            const nh = document.getElementById('st_nh').value.trim();
            if (network && mask && nh) {
              appendEquiv(['enable', 'configure terminal', `ip route ${network} ${mask} ${nh}`, 'exit']);
              renderStatic();
            }
          };
        };
        renderStatic();
      };
    }

    if (btnRip) {
      btnRip.onclick = () => {
        setActiveBtn(btnRip);
        const renderRip = () => {
          dev.cfg.rip = dev.cfg.rip || { networks: [] };
          const nets = dev.cfg.rip.networks.map(n => `<li>${n}</li>`).join('');
          main.innerHTML = `
            <div class="pt-cfg-title">RIP Routing</div>
            <div class="pt-cfg-row"><label>Network</label><input id="rip_net" class="pt-cfg-input" placeholder="192.168.1.0" /></div>
            <div style="margin:10px 0;"><button id="rip_add_btn" class="pt-small-btn" style="padding:4px 16px;font-weight:700;">Add</button></div>
            <ul style="margin-top:12px;background:#fff;border:1px solid #9ca3af;padding:8px 18px;">${nets || '<li>No networks added</li>'}</ul>
          `;
          document.getElementById('rip_add_btn').onclick = () => {
            const n = document.getElementById('rip_net').value.trim();
            if (n) {
              appendEquiv(['enable', 'configure terminal', 'router rip', 'version 2', `network ${n}`, 'exit']);
              renderRip();
            }
          };
        };
        renderRip();
      };
    }

    // Interface buttons
    for (const port of dev.ports) {
      if (port.kind === 'console' || port.kind === 'rs232') continue;
      const b = document.createElement('button');
      b.className = 'pt-cfg-nav-btn';
      b.textContent = PT.shortIf(port.name);
      b.onclick = () => {
        setActiveBtn(b);
        const ifc = (dev.cfg && dev.cfg.ifaces && dev.cfg.ifaces[port.name]) || {};
        const isSwPort = dev.type === 'switch' || dev.type === 'l3switch';
        const vlanOptions = Object.entries((dev.cfg && dev.cfg.vlans) || { 1: { name: 'default' } }).map(([vid, v]) =>
          `<option value="${vid}" ${String(ifc.accessVlan || 1) === String(vid) ? 'selected' : ''}>${vid} (${v.name})</option>`
        ).join('');

        main.innerHTML = `
          <div class="pt-cfg-title">${port.name}</div>
          <div class="pt-cfg-row">
            <label>Port Status</label>
            <label style="min-width:auto"><input type="checkbox" id="cfg_if_on" ${!ifc.shutdown ? 'checked' : ''} /> On</label>
          </div>
          <div class="pt-cfg-row">
            <label>MAC Address</label>
            <input type="text" class="pt-cfg-input" value="${port.mac}" readonly />
          </div>
          ${isSwPort ? `
          <div class="pt-cfg-row">
            <label>Port Mode</label>
            <select id="cfg_if_mode" class="pt-cfg-input">
              <option value="access" ${ifc.mode === 'access' || !ifc.mode ? 'selected' : ''}>Access</option>
              <option value="trunk" ${ifc.mode === 'trunk' ? 'selected' : ''}>Trunk</option>
            </select>
          </div>
          <div class="pt-cfg-row">
            <label>VLAN</label>
            <select id="cfg_if_vlan" class="pt-cfg-input">${vlanOptions}</select>
          </div>
          ` : `
          <div class="pt-cfg-row">
            <label>IPv4 Address</label>
            <input type="text" id="cfg_if_ip" class="pt-cfg-input" value="${ifc.ip || ''}" placeholder="192.168.1.1" />
          </div>
          <div class="pt-cfg-row">
            <label>Subnet Mask</label>
            <input type="text" id="cfg_if_mask" class="pt-cfg-input" value="${ifc.mask || ''}" placeholder="255.255.255.0" />
          </div>
          `}
        `;

        document.getElementById('cfg_if_on').onchange = (e) => {
          const on = e.target.checked;
          if (['switch', 'l3switch', 'router'].includes(dev.type)) {
            appendEquiv(['enable', 'configure terminal', `interface ${port.name}`, on ? 'no shutdown' : 'shutdown', 'exit']);
          } else {
            ifc.shutdown = !on;
            net.refreshLinkStates();
          }
        };

        if (isSwPort) {
          document.getElementById('cfg_if_mode').onchange = (e) => {
            const m = e.target.value;
            appendEquiv(['enable', 'configure terminal', `interface ${port.name}`, `switchport mode ${m}`, 'exit']);
          };
          document.getElementById('cfg_if_vlan').onchange = (e) => {
            const v = e.target.value;
            appendEquiv(['enable', 'configure terminal', `interface ${port.name}`, `switchport access vlan ${v}`, 'exit']);
          };
        } else {
          const saveIp = () => {
            const ip = document.getElementById('cfg_if_ip').value.trim();
            const mask = document.getElementById('cfg_if_mask').value.trim() || '255.255.255.0';
            if (['switch', 'l3switch', 'router'].includes(dev.type)) {
              if (ip) appendEquiv(['enable', 'configure terminal', `interface ${port.name}`, `ip address ${ip} ${mask}`, 'exit']);
              else appendEquiv(['enable', 'configure terminal', `interface ${port.name}`, 'no ip address', 'exit']);
            } else {
              ifc.ip = ip;
              ifc.mask = mask;
              renderCanvas();
            }
          };
          document.getElementById('cfg_if_ip').onchange = saveIp;
          document.getElementById('cfg_if_mask').onchange = saveIp;
        }
      };
      sidebar.appendChild(b);
    }

    showGlobalSettings();
  }

  // ---------------------------------------------------------------- Device Physical Tab
  function renderPhysicalTab(dev) {
    const m = PT.getModel(dev);
    const img = document.getElementById('pt-phys-chassis-img');
    if (img) img.src = m ? m.chassisImg : 'art/PhysicalView/Devices/iRealWiredEndDevice.png';

    const pwrBtn = document.getElementById('btn-power-toggle');
    if (pwrBtn) {
      pwrBtn.className = `pt-power-btn ${dev.power ? 'on' : 'off'}`;
      pwrBtn.textContent = dev.power ? '⚡ Power: ON (اضغط لإيقاف التشغيل)' : '⭕ Power: OFF (اضغط للتشغيل)';
      pwrBtn.onclick = () => {
        dev.power = !dev.power;
        net.refreshLinkStates();
        renderPhysicalTab(dev);
        renderCanvas();
      };
    }

    const summary = document.getElementById('pt-phys-ports-summary');
    if (summary) {
      summary.innerHTML = '';
      for (const p of (dev.ports || [])) {
        if (p.kind === 'console' || p.kind === 'rs232') continue;
        const ifc = (dev.cfg && dev.cfg.ifaces && dev.cfg.ifaces[p.name]) || {};
        const isUp = dev.power && p.lineUp && !ifc.shutdown;
        const badge = document.createElement('span');
        badge.className = `pt-phys-port-led${isUp ? ' up' : ''}`;
        badge.textContent = `${PT.shortIf(p.name)} ${isUp ? '●' : '○'}`;
        summary.appendChild(badge);
      }
    }
  }

  // ---------------------------------------------------------------- Device Attributes Tab
  function renderAttributesTab(dev) {
    const pane = document.getElementById('devtab-attributes');
    if (!pane) return;
    const m = PT.getModel(dev);
    const portRows = (dev.ports || []).map(p => {
      const ifc = (dev.cfg && dev.cfg.ifaces && dev.cfg.ifaces[p.name]) || {};
      const status = (!dev.power || ifc.shutdown) ? 'administratively down' : (p.lineUp ? 'up' : 'down');
      return `<tr><td>${p.name}</td><td>${p.mac || '-'}</td><td>${ifc.ip || '-'}</td><td>${status}</td></tr>`;
    }).join('');

    pane.innerHTML = `
      <div style="padding:16px;">
        <h3 style="color:#0284c7;margin-bottom:12px;">Device Attributes — ${dev.cfg ? dev.cfg.hostname : dev.name}</h3>
        <table class="pt-attr-table" style="max-width:600px;margin-bottom:16px;">
          <tr><td style="font-weight:700;width:160px;">Model</td><td>${dev.model}</td></tr>
          <tr><td style="font-weight:700;">Type</td><td>${dev.type}</td></tr>
          <tr><td style="font-weight:700;">Base MAC Address</td><td>${dev.baseMac || '-'}</td></tr>
          <tr><td style="font-weight:700;">Power State</td><td>${dev.power ? 'ON (Powered)' : 'OFF (Unpowered)'}</td></tr>
          <tr><td style="font-weight:700;">Uptime</td><td>${PT.uptimeStr ? PT.uptimeStr(Date.now() - (dev.rt ? dev.rt.bootAt : Date.now())) : '00:00:00'}</td></tr>
        </table>
        <h4 style="margin-bottom:6px;">Port Specifications</h4>
        <table class="pt-attr-table">
          <thead><tr><th>Interface</th><th>MAC Address</th><th>IP Address</th><th>Line Status</th></tr></thead>
          <tbody>${portRows}</tbody>
        </table>
      </div>
    `;
  }

  // ---------------------------------------------------------------- UI Controls & Toolbar
  function setActiveTool(tool) {
    state.activeTool = tool;
    document.querySelectorAll('[data-tool]').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === tool);
    });
    logicalCanvas.classList.toggle('pan-mode', tool === 'pan');

    if (tool === 'pan') {
      showActionBanner('✋ وضع تحريك الخلفية مفعل — اسحب بإصبعك أو الماوس لتحريك مساحة العمل بحرية');
    } else if (tool === 'box-select') {
      showActionBanner('🔲 وضع التحديد المتعدد — اسحب مربعاً حول عدة أجهزة أو المس الأجهزة لتحديدها معاً');
      renderCanvas();
    } else if (tool !== 'place-device' && tool !== 'connect-cable' && tool !== 'pdu') {
      hideActionBanner();
      renderCanvas();
    }
  }

  function showActionBanner(text) {
    actionBannerText.textContent = text;
    actionBanner.classList.remove('hidden');
  }

  function hideActionBanner() {
    actionBanner.classList.add('hidden');
    state.pendingModel = null;
    state.pendingCableType = null;
    state.cableSource = null;
    state.pduSourceDevId = null;
  }

  document.getElementById('btn-cancel-action').onclick = () => {
    hideActionBanner();
    setActiveTool('select');
  };

  // ---------------------------------------------------------------- Copy, Paste, Duplicate & Multi-Select Operations
  function buildClipboardPayload(onlySelected = false) {
    const selDevs = getSelectedDevices();
    const targetDevs = onlySelected
      ? selDevs
      : (selDevs.length > 0 ? selDevs : net.devices);

    if (!targetDevs.length) return null;

    const idSet = new Set(targetDevs.map(d => d.id));
    const clonedDevices = targetDevs.map(d => ({
      id: d.id,
      modelKey: d.modelKey || d.model,
      model: d.model,
      type: d.type,
      name: d.name,
      x: d.x,
      y: d.y,
      power: d.power !== false,
      modules: d.modules ? JSON.parse(JSON.stringify(d.modules)) : {},
      cfg: d.cfg ? JSON.parse(JSON.stringify(d.cfg)) : {}
    }));

    // Copy all internal links connecting the copied devices
    const clonedLinks = net.links
      .filter(l => idSet.has(l.devA) && idSet.has(l.devB))
      .map(l => ({
        cableType: l.cableType,
        devA: l.devA,
        portA: l.portA,
        devB: l.devB,
        portB: l.portB
      }));

    // Include notes if copying entire topology
    const clonedNotes = (!onlySelected && selDevs.length === 0)
      ? JSON.parse(JSON.stringify(net.notes || []))
      : [];

    return {
      ptClipboard: true,
      version: '8.2.2',
      devices: clonedDevices,
      links: clonedLinks,
      notes: clonedNotes,
      pasteCount: 0
    };
  }

  function copySelectionOrTopology() {
    const selCount = getSelectedDevices().length;
    const payload = buildClipboardPayload(false);
    if (!payload) {
      showActionBanner('⚠️ لا توجد أجهزة لنسخها في مساحة العمل');
      setTimeout(() => hideActionBanner(), 2200);
      return null;
    }

    state.clipboardData = payload;
    try {
      localStorage.setItem('pt_clipboard_data', JSON.stringify(payload));
    } catch (_) {}
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
    }

    const msg = selCount > 0
      ? `📋 تم نسخ ${payload.devices.length} جهاز (${payload.links.length} توصيلة) — اضغط لصق (Paste / 📥) لإضافتها`
      : `📋 تم نسخ العمل بالكامل (${payload.devices.length} جهاز و ${payload.links.length} توصيلة) — اضغط لصق (Paste / 📥)`;
    showActionBanner(msg);
    setTimeout(() => {
      if (state.activeTool === 'select') hideActionBanner();
    }, 3200);
    return payload;
  }

  function pastePayloadToCanvas(payload, offsetPx = 48, replaceAll = false) {
    if (!payload || !Array.isArray(payload.devices) || !payload.devices.length) return false;

    if (replaceAll) {
      net.devices = [];
      net.links = [];
      net.notes = [];
      PT.resetCounters();
      offsetPx = 0;
    }

    const oldIdToNewDev = new Map();
    const existingNames = new Set(net.devices.map(d => d.name));

    for (const src of payload.devices) {
      const mObj = PT.getModel(src.modelKey || src.model);
      const modelKey = (mObj && mObj.key) || src.modelKey || 'PC-PT';

      let desiredName = undefined;
      if (replaceAll && src.name && !existingNames.has(src.name)) {
        desiredName = src.name;
      }

      const newDev = PT.createDevice(modelKey, {
        x: Math.round((src.x || 200) + offsetPx),
        y: Math.round((src.y || 200) + offsetPx),
        name: desiredName,
        existingNames
      });
      existingNames.add(newDev.name);

      if (src.modules && Object.keys(src.modules).length) {
        newDev.modules = JSON.parse(JSON.stringify(src.modules));
        PT.buildPorts(newDev);
      }

      if (src.cfg) {
        newDev.cfg = JSON.parse(JSON.stringify(src.cfg));
        if (!replaceAll && (!src.cfg.hostname || src.cfg.hostname === src.name)) {
          newDev.cfg.hostname = newDev.name;
        }
      }
      newDev.power = src.power !== false;
      net.addDevice(newDev);
      oldIdToNewDev.set(src.id, newDev);
    }

    // Reconnect all copied links between the newly created devices
    for (const lnk of (payload.links || [])) {
      const devA = oldIdToNewDev.get(lnk.devA);
      const devB = oldIdToNewDev.get(lnk.devB);
      if (devA && devB) {
        net.connect(devA.id, lnk.portA, devB.id, lnk.portB, lnk.cableType || 'straight');
      }
    }

    // Add notes
    for (const n of (payload.notes || [])) {
      net.notes.push({
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: Math.round((n.x || 150) + offsetPx),
        y: Math.round((n.y || 150) + offsetPx),
        text: n.text || ''
      });
    }

    // Select all newly pasted devices so the user can drag them together immediately!
    state.selectedDeviceIds.clear();
    for (const newDev of oldIdToNewDev.values()) {
      state.selectedDeviceIds.add(newDev.id);
    }
    const newIds = [...state.selectedDeviceIds];
    state.selectedDeviceId = newIds.length ? newIds[0] : null;

    net.refreshLinkStates();
    renderCanvas();
    showActionBanner(`✅ تم لصق ${oldIdToNewDev.size} جهاز مع إعداداتها وتوصيلاتها — يمكنك سحبها الآن لنقلها معاً`);
    setTimeout(() => {
      if (state.activeTool === 'select') hideActionBanner();
    }, 3000);
    return true;
  }

  async function pasteFromClipboard() {
    let data = state.clipboardData;
    if (!data) {
      try {
        const saved = localStorage.getItem('pt_clipboard_data');
        if (saved) data = JSON.parse(saved);
      } catch (_) {}
    }
    if (!data && navigator.clipboard && navigator.clipboard.readText) {
      try {
        const txt = await navigator.clipboard.readText();
        if (txt && txt.trim().startsWith('{')) {
          const parsed = JSON.parse(txt);
          if (parsed && Array.isArray(parsed.devices)) data = parsed;
        }
      } catch (_) {}
    }

    if (!data || !Array.isArray(data.devices) || !data.devices.length) {
      openCopyPasteModal();
      return;
    }

    data.pasteCount = (data.pasteCount || 0) + 1;
    const offset = 45 * data.pasteCount;
    pastePayloadToCanvas(data, offset, false);
  }

  function duplicateSelection() {
    const payload = buildClipboardPayload(false);
    if (!payload) return;
    pastePayloadToCanvas(payload, 50, false);
  }

  function selectAllDevices() {
    state.selectedDeviceIds.clear();
    for (const d of net.devices) state.selectedDeviceIds.add(d.id);
    state.selectedDeviceId = net.devices.length ? net.devices[0].id : null;
    renderCanvas();
    if (net.devices.length) {
      showActionBanner(`☑️ تم تحديد جميع الأجهزة (${net.devices.length} أجهزة) — يمكنك نقلها أو نسخها أو حذفها معاً`);
    }
  }

  function deleteSelectedDevices() {
    const sel = getSelectedDevices();
    if (!sel.length) return;
    for (const d of sel) {
      net.removeDevice(d.id);
    }
    selectSingleDevice(null);
    renderCanvas();
  }

  function openCopyPasteModal() {
    const modal = document.getElementById('pt-copypaste-modal');
    const ta = document.getElementById('pt-copypaste-textarea');
    const status = document.getElementById('pt-copypaste-status');
    if (!modal || !ta) return;

    const payload = buildClipboardPayload(false) || { devices: [], links: [], notes: [] };
    ta.value = JSON.stringify(payload, null, 2);
    if (status) {
      status.style.color = '#0284c7';
      status.textContent = `جاهز: يحتوي الكود أعلاه على ${payload.devices.length} جهاز و ${payload.links.length} توصيلة.`;
    }
    modal.classList.remove('hidden');
  }

  // Bind Copy/Paste Modal internal buttons
  const btnCpExportAll = document.getElementById('btn-cp-export-all');
  if (btnCpExportAll) {
    btnCpExportAll.onclick = () => {
      const data = { ptClipboard: true, version: '8.2.2', devices: net.devices, links: net.links, notes: net.notes };
      const ta = document.getElementById('pt-copypaste-textarea');
      const status = document.getElementById('pt-copypaste-status');
      if (ta) ta.value = JSON.stringify(data, null, 2);
      state.clipboardData = JSON.parse(JSON.stringify(data));
      try { localStorage.setItem('pt_clipboard_data', JSON.stringify(data)); } catch (_) {}
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).catch(() => {});
      }
      if (status) {
        status.style.color = '#16a34a';
        status.textContent = `✅ تم تجهيز ونسخ العمل الكامل (${net.devices.length} جهاز و ${net.links.length} كابل)!`;
      }
    };
  }

  const btnCpExportSel = document.getElementById('btn-cp-export-sel');
  if (btnCpExportSel) {
    btnCpExportSel.onclick = () => {
      const payload = buildClipboardPayload(true);
      const ta = document.getElementById('pt-copypaste-textarea');
      const status = document.getElementById('pt-copypaste-status');
      if (!payload) {
        if (status) {
          status.style.color = '#dc2626';
          status.textContent = '⚠️ لم تقم بتحديد أي أجهزة بعد! حدد جهازاً أو أكثر أولاً أو اختر (نسخ العمل بالكامل).';
        }
        return;
      }
      if (ta) ta.value = JSON.stringify(payload, null, 2);
      state.clipboardData = payload;
      try { localStorage.setItem('pt_clipboard_data', JSON.stringify(payload)); } catch (_) {}
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).catch(() => {});
      }
      if (status) {
        status.style.color = '#16a34a';
        status.textContent = `✅ تم نسخ الأجهزة المحددة (${payload.devices.length} جهاز و ${payload.links.length} توصيلة)!`;
      }
    };
  }

  const btnCpCopyText = document.getElementById('btn-cp-copy-text');
  if (btnCpCopyText) {
    btnCpCopyText.onclick = () => {
      const ta = document.getElementById('pt-copypaste-textarea');
      const status = document.getElementById('pt-copypaste-status');
      if (!ta || !ta.value.trim()) return;
      ta.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).catch(() => {});
      } else {
        document.execCommand('copy');
      }
      if (status) {
        status.style.color = '#16a34a';
        status.textContent = '📋 تم نسخ الكود إلى الحافظة (Clipboard) بنجاح!';
      }
    };
  }

  const btnCpClearText = document.getElementById('btn-cp-clear-text');
  if (btnCpClearText) {
    btnCpClearText.onclick = () => {
      const ta = document.getElementById('pt-copypaste-textarea');
      const status = document.getElementById('pt-copypaste-status');
      if (ta) {
        ta.value = '';
        ta.focus();
      }
      if (status) {
        status.style.color = '#0284c7';
        status.textContent = 'الصق كود العمل الجاهز في المربع أعلاه ثم اضغط (لصق وإضافة) أو (استبدال المساحة).';
      }
    };
  }

  const btnCpMerge = document.getElementById('btn-cp-merge');
  if (btnCpMerge) {
    btnCpMerge.onclick = () => {
      const ta = document.getElementById('pt-copypaste-textarea');
      const status = document.getElementById('pt-copypaste-status');
      try {
        const parsed = JSON.parse(ta.value);
        if (pastePayloadToCanvas(parsed, 48, false)) {
          document.getElementById('pt-copypaste-modal').classList.add('hidden');
        } else if (status) {
          status.style.color = '#dc2626';
          status.textContent = '⚠️ الكود لا يحتوي على أجهزة صالحة للصق.';
        }
      } catch (e) {
        if (status) {
          status.style.color = '#dc2626';
          status.textContent = '⚠️ خطأ في صيغة كود JSON: تأكد من نسخ الكود كاملاً بشكل صحيح.';
        }
      }
    };
  }

  const btnCpReplace = document.getElementById('btn-cp-replace');
  if (btnCpReplace) {
    btnCpReplace.onclick = () => {
      const ta = document.getElementById('pt-copypaste-textarea');
      const status = document.getElementById('pt-copypaste-status');
      try {
        const parsed = JSON.parse(ta.value);
        if (pastePayloadToCanvas(parsed, 0, true)) {
          selectSingleDevice(null);
          renderCanvas();
          document.getElementById('pt-copypaste-modal').classList.add('hidden');
        } else if (status) {
          status.style.color = '#dc2626';
          status.textContent = '⚠️ الكود لا يحتوي على أجهزة صالحة.';
        }
      } catch (e) {
        if (status) {
          status.style.color = '#dc2626';
          status.textContent = '⚠️ خطأ في صيغة كود JSON: تأكد من نسخ الكود كاملاً بشكل صحيح.';
        }
      }
    };
  }

  // Component box categories
  function renderComponentBox() {
    const catRow = document.getElementById('pt-main-categories');
    const subRow = document.getElementById('pt-sub-categories');
    const catLabel = document.getElementById('pt-category-label');
    const strip = document.getElementById('pt-models-strip');

    catRow.querySelectorAll('.pt-cat-btn').forEach(btn => {
      const k = btn.dataset.cat;
      const isAct = k === state.selectedCategory;
      btn.classList.toggle('active', isAct);
      btn.onclick = () => {
        state.selectedCategory = k;
        const cObj = PT.CATEGORIES.find(c => c.key === k) || PT.CATEGORIES[0];
        state.selectedSubcategory = cObj.subs[0].key;
        renderComponentBox();
      };
    });

    const curCat = PT.CATEGORIES.find(c => c.key === state.selectedCategory) || PT.CATEGORIES[0];
    subRow.innerHTML = '';
    for (const sub of curCat.subs) {
      const isAct = sub.key === state.selectedSubcategory;
      const b = document.createElement('button');
      b.className = `pt-subcat-btn${isAct ? ' active' : ''}`;
      b.innerHTML = `<img src="art/ComponentBox/${sub.icon}${isAct ? '_on' : ''}.png" alt="${sub.label}" />`;
      b.onclick = () => {
        state.selectedSubcategory = sub.key;
        renderComponentBox();
      };
      subRow.appendChild(b);
    }

    const curSub = curCat.subs.find(s => s.key === state.selectedSubcategory) || curCat.subs[0];
    catLabel.textContent = `[${curCat.label}] - ${curSub.label}`;

    strip.innerHTML = '';
    if (curSub.cables) {
      for (const cKey of curSub.items) {
        const cab = PT.CABLES[cKey];
        if (!cab) continue;
        const item = document.createElement('div');
        item.className = 'pt-model-item';
        item.innerHTML = `<img src="${cab.boxIcon}" alt="${cab.label}" /><span>${cKey.toUpperCase()}</span>`;
        item.onclick = () => {
          state.pendingCableType = cKey;
          setActiveTool('connect-cable');
          showActionBanner(`🔌 كابل (${cab.label}) — اضغط على الجهاز الأول ثم الجهاز الثاني`);
        };
        strip.appendChild(item);
      }
    } else {
      for (const mKey of curSub.items) {
        const m = PT.MODELS[mKey];
        if (!m) continue;
        const item = document.createElement('div');
        item.className = 'pt-model-item';
        item.innerHTML = `<img src="${m.boxIcon}" alt="${m.label}" /><span>${m.label}</span>`;
        item.onclick = () => {
          state.pendingModel = m;
          setActiveTool('place-device');
          showActionBanner(`➕ وضع جهاز (${m.label}) — اضغط في أي مكان على المساحة لإضافته`);
        };
        strip.appendChild(item);
      }
    }
  }

  function setWorkspaceMode(ws) {
    state.workspaceMode = ws;
    const btnLog = document.getElementById('btn-mode-logical');
    const btnPhys = document.getElementById('btn-mode-physical');
    if (btnLog) btnLog.classList.toggle('active', ws === 'logical');
    if (btnPhys) btnPhys.classList.toggle('active', ws === 'physical');
    const logWs = document.getElementById('logical-workspace');
    const physWs = document.getElementById('physical-workspace');
    if (logWs) logWs.classList.toggle('hidden', ws !== 'logical');
    if (physWs) physWs.classList.toggle('hidden', ws !== 'physical');
    if (ws === 'physical') renderPhysicalRack();
  }

  function renderPhysicalRack() {
    const rackEl = document.getElementById('pt-rack-units');
    if (!rackEl) return;
    rackEl.innerHTML = '';
    for (const dev of net.devices) {
      const m = PT.getModel(dev);
      const unit = document.createElement('div');
      unit.className = 'pt-rack-unit';
      const icon = (m && m.chassisImg) || (m && m.canvasIcon) || 'art/PhysicalView/Devices/iRealWiredEndDevice.png';
      unit.innerHTML = `
        <img src="${icon}" alt="${dev.model}" />
        <div class="pt-rack-unit-label">${dev.cfg ? dev.cfg.hostname : dev.name} — Cisco ${dev.model} (${dev.power ? 'POWER ON' : 'POWER OFF'})</div>
      `;
      unit.onclick = () => openDeviceModal(dev.id);
      rackEl.appendChild(unit);
    }
  }

  function openInspectModal(dev) {
    const modal = document.getElementById('pt-inspect-modal');
    if (!modal) return;
    const title = document.getElementById('pt-inspect-title');
    const body = document.getElementById('pt-inspect-body');
    if (title) title.textContent = `Inspect Tables — ${dev.cfg ? dev.cfg.hostname : dev.name} (${dev.model})`;

    const macOut = PT.execute(dev, 'show mac address-table', net);
    const arpOut = PT.execute(dev, 'show arp', net);
    const routeOut = PT.execute(dev, 'show ip route', net);
    const intBrief = PT.execute(dev, 'show ip interface brief', net);
    const vlanBrief = PT.execute(dev, 'show vlan brief', net);

    if (body) {
      body.innerHTML = `
        <h4 style="margin-bottom:4px;color:#0284c7;">Port / IP Summary</h4>
        <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px;margin-bottom:10px;font-size:11.5px;max-height:140px;overflow-y:auto;">${intBrief}</pre>
        ${(dev.type === 'switch' || dev.type === 'l3switch') ? `
        <h4 style="margin-bottom:4px;color:#0284c7;">MAC Address Table &amp; VLANs</h4>
        <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px;margin-bottom:10px;font-size:11.5px;max-height:140px;overflow-y:auto;">${macOut}\n${vlanBrief}</pre>
        ` : ''}
        ${(dev.type === 'router' || dev.type === 'l3switch') ? `
        <h4 style="margin-bottom:4px;color:#0284c7;">Routing Table</h4>
        <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px;margin-bottom:10px;font-size:11.5px;max-height:140px;overflow-y:auto;">${routeOut}</pre>
        ` : ''}
        <h4 style="margin-bottom:4px;color:#0284c7;">ARP Table</h4>
        <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px;font-size:11.5px;max-height:140px;overflow-y:auto;">${arpOut}</pre>
      `;
    }
    modal.classList.remove('hidden');
  }

  function openPduInfoModal(ev) {
    const modal = document.getElementById('pt-pdu-info-modal');
    if (!modal) return;
    const title = document.getElementById('pt-pdu-modal-title');
    const content = document.getElementById('pt-pdu-modal-content');
    if (title) title.textContent = `PDU Information at Device: ${ev.atDevice || ev.src}`;

    const renderTab = (tab) => {
      document.querySelectorAll('#pt-pdu-info-modal .pt-dtab').forEach(b => {
        b.classList.toggle('active', b.dataset.pdutab === tab);
      });
      if (!content) return;
      if (tab === 'osi') {
        content.innerHTML = `
          <div style="margin-bottom:10px;"><strong>Device:</strong> ${ev.atDevice || ev.src} &nbsp;|&nbsp; <strong>Source:</strong> ${ev.src} &nbsp;|&nbsp; <strong>Destination:</strong> ${ev.dst} &nbsp;|&nbsp; <strong>Status:</strong> ${ev.status}</div>
          <div class="pt-osi-columns" style="display:flex;gap:12px;">
            <div class="pt-osi-box" style="flex:1;border:1px solid #cbd5e1;padding:8px;background:#f8fafc;">
              <div style="padding:6px;font-weight:700;background:#d1d5db;margin-bottom:6px;">In Layers</div>
              <div style="padding:4px;border-bottom:1px solid #e2e8f0;">Layer 7: Application (ICMP / Echo)</div>
              <div style="padding:4px;border-bottom:1px solid #e2e8f0;">Layer 3: IP (Source: ${ev.src}, Dest: ${ev.dst})</div>
              <div style="padding:4px;">Layer 2: Ethernet II (MAC Header)</div>
            </div>
            <div class="pt-osi-box" style="flex:1;border:1px solid #cbd5e1;padding:8px;background:#f8fafc;">
              <div style="padding:6px;font-weight:700;background:#d1d5db;margin-bottom:6px;">Out Layers</div>
              <div style="padding:4px;border-bottom:1px solid #e2e8f0;">Layer 7: Application (ICMP)</div>
              <div style="padding:4px;border-bottom:1px solid #e2e8f0;">Layer 3: IP Header Encapsulated</div>
              <div style="padding:4px;">Layer 2: Framed for next hop interface</div>
            </div>
          </div>
        `;
      } else {
        content.innerHTML = `
          <pre style="background:#0f172a;color:#38bdf8;padding:12px;font-family:Consolas,monospace;font-size:12px;line-height:1.4;">
+-------------------------------------------------------------------+
|                        ETHERNET II HEADER                         |
+----------------------+----------------------+---------------------+
| Destination MAC      | Source MAC           | Type: 0x0800 (IPv4) |
+----------------------+----------------------+---------------------+
|                           IPv4 HEADER                             |
+-------------+--------+-------------+------------------------------+
| Ver: 4      | IHL: 5 | TTL: 128    | Protocol: 1 (ICMP)           |
| Source IP: ${String(ev.src).padEnd(55)}|
| Dest IP:   ${String(ev.dst).padEnd(55)}|
+-------------------------------------------------------------------+
|                           ICMP PAYLOAD                            |
| Type: 8 (Echo Request) | Code: 0 | Checksum: 0x4D5A | Seq: 1     |
+-------------------------------------------------------------------+</pre>
        `;
      }
    };

    document.querySelectorAll('#pt-pdu-info-modal .pt-dtab').forEach(btn => {
      btn.onclick = () => renderTab(btn.dataset.pdutab);
    });
    renderTab('osi');
    modal.classList.remove('hidden');
  }

  // Bind Toolbar Buttons & Menu Actions
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = () => {
      const act = btn.dataset.action;
      if (act === 'zoom-in') { state.zoom = Math.min(2.8, +(state.zoom + 0.15).toFixed(2)); renderCanvas(); }
      else if (act === 'zoom-out') { state.zoom = Math.max(0.35, +(state.zoom - 0.15).toFixed(2)); renderCanvas(); }
      else if (act === 'zoom-reset') { state.zoom = 1; state.panX = 0; state.panY = 0; renderCanvas(); }
      else if (act === 'load-lab-vlan') { state.panX = 0; state.panY = 0; loadLabVlan(); }
      else if (act === 'load-lab-roas') { state.panX = 0; state.panY = 0; loadLabRoas(); }
      else if (act === 'load-lab-ospf') { state.panX = 0; state.panY = 0; loadLabOspf(); }
      else if (act === 'new-topology') {
        net.devices = [];
        net.links = [];
        net.notes = [];
        selectSingleDevice(null);
        state.panX = 0;
        state.panY = 0;
        renderCanvas();
      }
      else if (act === 'export-pkt') {
        const data = net.exportTopology ? net.exportTopology() : { devices: net.devices, links: net.links, notes: net.notes };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'network-topology.pkt.json';
        a.click();
      }
      else if (act === 'import-pkt') {
        const fi = document.getElementById('pt-file-input');
        if (fi) fi.click();
      }
      else if (act === 'copy-device') {
        copySelectionOrTopology();
      }
      else if (act === 'paste-device') {
        pasteFromClipboard();
      }
      else if (act === 'duplicate-selected') {
        duplicateSelection();
      }
      else if (act === 'select-all') {
        selectAllDevices();
      }
      else if (act === 'open-copy-paste-modal') {
        openCopyPasteModal();
      }
      else if (act === 'undo-action' || act === 'redo-action') {
        showActionBanner(`ℹ️ تم تنفيذ ${act === 'undo-action' ? 'التراجع' : 'الإعادة'}`);
        setTimeout(() => hideActionBanner(), 1500);
      }
      else if (act === 'delete-selected') {
        deleteSelectedDevices();
      }
      else if (act === 'toggle-port-labels') {
        state.showPortLabels = !state.showPortLabels;
        renderCanvas();
      }
      else if (act === 'toggle-model-labels') {
        state.showModelLabels = !state.showModelLabels;
        renderCanvas();
      }
      else if (act === 'toggle-link-lights') {
        state.showLinkLights = !state.showLinkLights;
        renderCanvas();
      }
      else if (act === 'toggle-cli-dark') {
        state.darkCli = !state.darkCli;
        const scr = document.getElementById('pt-cli-screen');
        if (scr) scr.classList.toggle('dark-cli', state.darkCli);
      }
      else if (act === 'view-logical') {
        setWorkspaceMode('logical');
      }
      else if (act === 'view-physical') {
        setWorkspaceMode('physical');
      }
      else if (act === 'tool-pdu') {
        setActiveTool('pdu');
      }
      else if (act === 'fast-forward') {
        net.fastForwardTime();
      }
      else if (act === 'power-cycle') {
        net.powerCycleDevices();
      }
      else if (act === 'print-topo') {
        window.print();
      }
      else if (act === 'quick-help') {
        const hm = document.getElementById('pt-help-modal');
        if (hm) hm.classList.remove('hidden');
      }
    };
  });

  // Keyboard shortcuts for Copy (Ctrl+C), Paste (Ctrl+V), Duplicate (Ctrl+D), Select All (Ctrl+A), Delete
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    // Ignore if device modal is open
    const devModal = document.getElementById('pt-device-modal');
    if (devModal && !devModal.classList.contains('hidden')) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copySelectionOrTopology();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      pasteFromClipboard();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateSelection();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAllDevices();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (getSelectedDevices().length > 0) {
        e.preventDefault();
        deleteSelectedDevices();
      }
    } else if (e.key === 'Escape') {
      selectSingleDevice(null);
      setActiveTool('select');
      renderCanvas();
    }
  });

  // Logical / Physical Workspace buttons
  document.querySelectorAll('[data-ws]').forEach(b => {
    b.onclick = () => setWorkspaceMode(b.dataset.ws);
  });

  // Simulation mode buttons
  document.querySelectorAll('[data-simmode]').forEach(b => {
    b.onclick = () => {
      const mode = b.dataset.simmode;
      const bReal = document.getElementById('btn-mode-realtime');
      const bSim = document.getElementById('btn-mode-simulation');
      const pSim = document.getElementById('pt-simulation-panel');
      if (bReal) bReal.classList.toggle('active', mode === 'realtime');
      if (bSim) bSim.classList.toggle('active', mode === 'simulation');
      if (pSim) pSim.classList.toggle('hidden', mode !== 'simulation');
    };
  });

  const bCloseSim = document.getElementById('btn-close-sim');
  if (bCloseSim) {
    bCloseSim.onclick = () => {
      const pSim = document.getElementById('pt-simulation-panel');
      if (pSim) pSim.classList.add('hidden');
      const bReal = document.getElementById('btn-mode-realtime');
      const bSim = document.getElementById('btn-mode-simulation');
      if (bReal) bReal.classList.add('active');
      if (bSim) bSim.classList.remove('active');
    };
  }

  const bTogglePdu = document.getElementById('btn-toggle-pdu-panel');
  if (bTogglePdu) {
    bTogglePdu.onclick = () => {
      const dock = document.getElementById('pt-pdu-dock');
      if (dock) dock.style.display = dock.style.display === 'flex' ? 'none' : 'flex';
    };
  }

  const bClearPdus = document.getElementById('btn-clear-pdus');
  if (bClearPdus) {
    bClearPdus.onclick = () => {
      state.pduList = [];
      renderPduTable();
    };
  }

  // File Input for loading topology
  const fileInput = document.getElementById('pt-file-input');
  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const json = JSON.parse(re.target.result);
          if (pastePayloadToCanvas(json, 0, true) || net.importTopology(json)) {
            renderCanvas();
          } else {
            alert('ملف غير صالح أو تعذر قراءة الطوبولوجيا');
          }
        } catch (err) {
          alert('خطأ في قراءة ملف JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    };
  }

  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.onclick = () => setActiveTool(btn.dataset.tool);
  });

  // CLI Keys (Tab Autocomplete, Help ?, etc.)
  document.querySelectorAll('[data-clikey]').forEach(btn => {
    btn.onclick = () => {
      const dev = net.getDevice(state.openDeviceId);
      if (!dev) return;
      const input = document.getElementById('pt-cli-input');
      const k = btn.dataset.clikey;
      if (k === 'TAB') {
        const res = PT.autocomplete(dev, input.value);
        input.value = res.line;
      } else if (k === 'ENTER') {
        executeCliLine(dev, input.value);
        input.value = '';
      } else if (k === '?') {
        input.value += '?';
        executeCliLine(dev, input.value);
        input.value = '';
      } else if (k === 'CTRL_Z') {
        executeCliLine(dev, 'end');
      }
      input.focus();
    };
  });

  document.querySelectorAll('[data-clicmd]').forEach(btn => {
    btn.onclick = () => {
      const dev = net.getDevice(state.openDeviceId);
      if (!dev) return;
      executeCliLine(dev, btn.dataset.clicmd);
    };
  });

  document.querySelectorAll('[data-inpcmd]').forEach(btn => {
    btn.onclick = () => {
      const input = document.getElementById('pt-cli-input');
      input.value = btn.dataset.inpcmd;
      input.focus();
    };
  });

  // Modal dialog close
  document.getElementById('btn-close-dev-window').onclick = () => {
    document.getElementById('pt-device-modal').classList.add('hidden');
  };

  document.querySelectorAll('#pt-dev-tabs .pt-dtab').forEach(btn => {
    btn.onclick = () => switchDeviceTab(btn.dataset.devtab);
  });

  // Floating menu buttons (Single & Multi-Select)
  const bindFloat = (actionName, fn) => {
    const b = floatingMenu.querySelector(`[data-float-action="${actionName}"]`);
    if (b) b.onclick = fn;
  };
  bindFloat('open-cli', () => {
    if (state.selectedDeviceId) openDeviceModal(state.selectedDeviceId, 'cli');
  });
  bindFloat('open-config', () => {
    if (state.selectedDeviceId) openDeviceModal(state.selectedDeviceId, 'config');
  });
  bindFloat('quick-cable', () => {
    const dev = net.getDevice(state.selectedDeviceId);
    if (dev) handleCableTap(dev, { clientX: 150, clientY: 200 });
  });
  bindFloat('quick-pdu', () => {
    const dev = net.getDevice(state.selectedDeviceId);
    if (dev) {
      state.pduSourceDevId = dev.id;
      setActiveTool('pdu');
      showActionBanner(`✉️ المصدر: ${dev.name} — الآن اضغط على الجهاز الهدف`);
    }
  });
  bindFloat('copy-dev', () => {
    copySelectionOrTopology();
  });
  bindFloat('paste-dev', () => {
    pasteFromClipboard();
  });
  bindFloat('dup-dev', () => {
    duplicateSelection();
  });
  bindFloat('delete-dev', () => {
    deleteSelectedDevices();
  });
  bindFloat('clear-sel', () => {
    selectSingleDevice(null);
    if (state.activeTool === 'box-select') setActiveTool('select');
    renderCanvas();
  });

  // Toggle mobile view
  document.getElementById('btn-mobile-mode').onclick = () => {
    document.getElementById('pt-app').classList.toggle('mobile-mode');
  };

  // Quick help cheatsheet modal
  document.getElementById('btn-quick-help').onclick = () => {
    document.getElementById('pt-help-modal').classList.remove('hidden');
  };
  document.querySelectorAll('[data-close-modal]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.closeModal;
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    };
  });

  // ---------------------------------------------------------------- Prebuilt Labs
  function loadLabVlan() {
    net.devices = [];
    net.links = [];
    PT.resetCounters();

    const sw = PT.createDevice('2960-24TT', { x: 380, y: 140, name: 'Switch0' });
    const pc1 = PT.createDevice('PC-PT', { x: 160, y: 320, name: 'PC0' });
    const pc2 = PT.createDevice('PC-PT', { x: 380, y: 320, name: 'PC1' });
    const pc3 = PT.createDevice('PC-PT', { x: 600, y: 320, name: 'PC2' });

    // VLANs on Switch
    sw.cfg.vlans[10] = { name: 'SALES', state: 'active' };
    sw.cfg.vlans[20] = { name: 'MARKETING', state: 'active' };
    sw.cfg.ifaces['FastEthernet0/1'].mode = 'access';
    sw.cfg.ifaces['FastEthernet0/1'].accessVlan = 10;
    sw.cfg.ifaces['FastEthernet0/2'].mode = 'access';
    sw.cfg.ifaces['FastEthernet0/2'].accessVlan = 10;
    sw.cfg.ifaces['FastEthernet0/3'].mode = 'access';
    sw.cfg.ifaces['FastEthernet0/3'].accessVlan = 20;

    // PCs
    pc1.cfg.ifaces['FastEthernet0'].ip = '192.168.10.10';
    pc1.cfg.ifaces['FastEthernet0'].mask = '255.255.255.0';
    pc2.cfg.ifaces['FastEthernet0'].ip = '192.168.10.20';
    pc2.cfg.ifaces['FastEthernet0'].mask = '255.255.255.0';
    pc3.cfg.ifaces['FastEthernet0'].ip = '192.168.20.10';
    pc3.cfg.ifaces['FastEthernet0'].mask = '255.255.255.0';

    net.addDevice(sw);
    net.addDevice(pc1);
    net.addDevice(pc2);
    net.addDevice(pc3);

    net.connect(sw.id, 'FastEthernet0/1', pc1.id, 'FastEthernet0');
    net.connect(sw.id, 'FastEthernet0/2', pc2.id, 'FastEthernet0');
    net.connect(sw.id, 'FastEthernet0/3', pc3.id, 'FastEthernet0');

    renderCanvas();
  }

  function loadLabRoas() {
    net.devices = [];
    net.links = [];
    PT.resetCounters();

    const rtr = PT.createDevice('1941', { x: 380, y: 90, name: 'Router0' });
    const sw = PT.createDevice('2960-24TT', { x: 380, y: 220, name: 'Switch0' });
    const srv = PT.createDevice('Server-PT', { x: 140, y: 220, name: 'Server0' });
    const pc1 = PT.createDevice('PC-PT', { x: 260, y: 360, name: 'PC0' });
    const pc2 = PT.createDevice('PC-PT', { x: 500, y: 360, name: 'PC1' });

    // Router Subinterfaces & DHCP Pool
    rtr.cfg.ifaces['GigabitEthernet0/0'].shutdown = false;
    rtr.cfg.ifaces['GigabitEthernet0/0.10'] = {
      desc: 'VLAN 10 Subif', shutdown: false, ip: '192.168.10.1', mask: '255.255.255.0', encap: 'dot1Q', vlanId: 10
    };
    rtr.cfg.ifaces['GigabitEthernet0/0.20'] = {
      desc: 'VLAN 20 Subif', shutdown: false, ip: '192.168.20.1', mask: '255.255.255.0', encap: 'dot1Q', vlanId: 20
    };
    rtr.cfg.dhcpPools['LAN10'] = {
      name: 'LAN10', network: '192.168.10.0', mask: '255.255.255.0', defaultRouter: '192.168.10.1', dnsServer: '8.8.8.8'
    };

    // Server DHCP service
    srv.cfg.ifaces['FastEthernet0'].ip = '192.168.1.254';
    srv.cfg.ifaces['FastEthernet0'].mask = '255.255.255.0';
    srv.cfg.services.dhcp.on = true;

    // Switch Trunk to Router, Access to PCs
    sw.cfg.vlans[10] = { name: 'ENGINEERING', state: 'active' };
    sw.cfg.vlans[20] = { name: 'ACCOUNTS', state: 'active' };
    sw.cfg.ifaces['GigabitEthernet0/1'].mode = 'trunk';
    sw.cfg.ifaces['FastEthernet0/1'].mode = 'access';
    sw.cfg.ifaces['FastEthernet0/1'].accessVlan = 10;
    sw.cfg.ifaces['FastEthernet0/2'].mode = 'access';
    sw.cfg.ifaces['FastEthernet0/2'].accessVlan = 20;

    net.addDevice(rtr);
    net.addDevice(sw);
    net.addDevice(srv);
    net.addDevice(pc1);
    net.addDevice(pc2);

    net.connect(rtr.id, 'GigabitEthernet0/0', sw.id, 'GigabitEthernet0/1');
    net.connect(sw.id, 'FastEthernet0/1', pc1.id, 'FastEthernet0');
    net.connect(sw.id, 'FastEthernet0/2', pc2.id, 'FastEthernet0');
    net.connect(sw.id, 'FastEthernet0/24', srv.id, 'FastEthernet0');

    renderCanvas();
  }

  function loadLabOspf() {
    net.devices = [];
    net.links = [];
    PT.resetCounters();

    const r1 = PT.createDevice('1941', { x: 260, y: 160, name: 'R1' });
    const r2 = PT.createDevice('1941', { x: 500, y: 160, name: 'R2' });
    const sw1 = PT.createDevice('2960-24TT', { x: 140, y: 300, name: 'SW1' });
    const sw2 = PT.createDevice('2960-24TT', { x: 620, y: 300, name: 'SW2' });
    const pc1 = PT.createDevice('PC-PT', { x: 140, y: 430, name: 'PC0' });
    const srv = PT.createDevice('Server-PT', { x: 620, y: 430, name: 'Server0' });

    // R1
    r1.cfg.ifaces['GigabitEthernet0/0'].shutdown = false;
    r1.cfg.ifaces['GigabitEthernet0/0'].ip = '10.0.0.1';
    r1.cfg.ifaces['GigabitEthernet0/0'].mask = '255.255.255.252';
    r1.cfg.ifaces['GigabitEthernet0/1'].shutdown = false;
    r1.cfg.ifaces['GigabitEthernet0/1'].ip = '192.168.1.1';
    r1.cfg.ifaces['GigabitEthernet0/1'].mask = '255.255.255.0';
    r1.cfg.ospf[1] = { routerId: '1.1.1.1', networks: [{ network: '0.0.0.0', wildcard: '255.255.255.255', area: '0' }] };

    // R2
    r2.cfg.ifaces['GigabitEthernet0/0'].shutdown = false;
    r2.cfg.ifaces['GigabitEthernet0/0'].ip = '10.0.0.2';
    r2.cfg.ifaces['GigabitEthernet0/0'].mask = '255.255.255.252';
    r2.cfg.ifaces['GigabitEthernet0/1'].shutdown = false;
    r2.cfg.ifaces['GigabitEthernet0/1'].ip = '192.168.2.1';
    r2.cfg.ifaces['GigabitEthernet0/1'].mask = '255.255.255.0';
    r2.cfg.ospf[1] = { routerId: '2.2.2.2', networks: [{ network: '0.0.0.0', wildcard: '255.255.255.255', area: '0' }] };

    // PC1 & Server
    pc1.cfg.ifaces['FastEthernet0'].ip = '192.168.1.10';
    pc1.cfg.ifaces['FastEthernet0'].mask = '255.255.255.0';
    pc1.cfg.host.gateway = '192.168.1.1';

    srv.cfg.ifaces['FastEthernet0'].ip = '192.168.2.254';
    srv.cfg.ifaces['FastEthernet0'].mask = '255.255.255.0';
    srv.cfg.host.gateway = '192.168.2.1';

    net.addDevice(r1);
    net.addDevice(r2);
    net.addDevice(sw1);
    net.addDevice(sw2);
    net.addDevice(pc1);
    net.addDevice(srv);

    net.connect(r1.id, 'GigabitEthernet0/0', r2.id, 'GigabitEthernet0/0');
    net.connect(r1.id, 'GigabitEthernet0/1', sw1.id, 'GigabitEthernet0/1');
    net.connect(r2.id, 'GigabitEthernet0/1', sw2.id, 'GigabitEthernet0/1');
    net.connect(sw1.id, 'FastEthernet0/1', pc1.id, 'FastEthernet0');
    net.connect(sw2.id, 'FastEthernet0/1', srv.id, 'FastEthernet0');

    renderCanvas();
  }

  // Subscribe to network changes
  net.subscribe(() => renderCanvas());

  // Initial Load
  renderComponentBox();
  loadLabVlan();

})();

