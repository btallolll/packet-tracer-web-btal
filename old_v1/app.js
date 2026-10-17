// ============================================================================
// Cisco Packet Tracer 8.2.2 — Web & Mobile Replica Application Controller
// ============================================================================

(function () {
  'use strict';

  // ==================== 1. DEVICE & CONNECTION CATALOG ====================
  const CATALOG = {
    network: {
      label: 'Network Devices',
      icon: 'art/ComponentBox/group0.png',
      iconOn: 'art/ComponentBox/group0_on.png',
      subcategories: [
        {
          id: 'switches',
          label: 'Switches',
          icon: 'art/ComponentBox/subgroup1.png',
          iconOn: 'art/ComponentBox/subgroup1_on.png',
          models: [
            { model: '2960-24TT', type: 'switch', prefix: 'Switch', boxIcon: 'art/ComponentBox/Specific2960_40x40.png', canvasIcon: 'art/Workspace/Logical/iSwitch@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealSwitch2960_24TTFront.png' },
            { model: '3560-24PS', type: 'l3switch', prefix: 'Multilayer Switch', boxIcon: 'art/ComponentBox/Specific3560_24PS_40x40.png', canvasIcon: 'art/Workspace/Logical/iSwitch3560@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealSwitch3560Front.png' },
            { model: '3650-24PS', type: 'l3switch', prefix: 'Multilayer Switch', boxIcon: 'art/ComponentBox/Specific3650.png', canvasIcon: 'art/Workspace/Logical/iSwitch3560@2x.png', chassisImg: 'art/PhysicalView/Devices/3650Physical_Front.png' },
            { model: '2950-24', type: 'switch', prefix: 'Switch', boxIcon: 'art/ComponentBox/Specific2950-24_40x40.png', canvasIcon: 'art/Workspace/Logical/iSwitch@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealSwitch2950Front.png' },
            { model: '2950T-24', type: 'switch', prefix: 'Switch', boxIcon: 'art/ComponentBox/Specific2950T_40x40.png', canvasIcon: 'art/Workspace/Logical/iSwitch@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealSwitch2950TFront.png' },
            { model: 'Switch-PT', type: 'switch', prefix: 'Switch', boxIcon: 'art/ComponentBox/SpecificArtificialSwitch_40x40.png', canvasIcon: 'art/Workspace/Logical/iSwitch@2x.png', chassisImg: 'art/PhysicalView/Devices/iPTRealSwitch.png' }
          ]
        },
        {
          id: 'routers',
          label: 'Routers',
          icon: 'art/ComponentBox/subgroup0.png',
          iconOn: 'art/ComponentBox/subgroup0_on.png',
          models: [
            { model: '1941', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/Specific1941_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealRouter1941Back.png' },
            { model: '2911', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/Specific2911_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealRouter2911.png' },
            { model: '2901', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/Specific2901_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealRouter2901.png' },
            { model: '4331', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/Specific4331_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealRouter4331.png' },
            { model: '4321', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/Specific4321_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealRouter4321.png' },
            { model: '2811', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/Specific2811_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealFrontRouter2811.png' },
            { model: '1841', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/Specific1841_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealRouter1841.png' },
            { model: 'Router-PT', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/SpecificArtificialRouter_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iPTRealRouter.png' }
          ]
        },
        {
          id: 'hubs',
          label: 'Hubs',
          icon: 'art/ComponentBox/subgroup2.png',
          iconOn: 'art/ComponentBox/subgroup2_on.png',
          models: [
            { model: 'Hub-PT', type: 'switch', prefix: 'Hub', boxIcon: 'art/ComponentBox/SpecificArtificialHub_40x40.png', canvasIcon: 'art/Workspace/Logical/iHub@2x.png', chassisImg: 'art/PhysicalView/Devices/iPTRealHub.png' },
            { model: 'Repeater-PT', type: 'switch', prefix: 'Repeater', boxIcon: 'art/ComponentBox/SpecificArtificialRepeater_40x40.png', canvasIcon: 'art/Workspace/Logical/iRepeater@2x.png', chassisImg: 'art/PhysicalView/Devices/iPTRealRepeater.png' }
          ]
        },
        {
          id: 'wireless',
          label: 'Wireless Devices',
          icon: 'art/ComponentBox/subgroup3.png',
          iconOn: 'art/ComponentBox/subgroup3_on.png',
          models: [
            { model: 'WRT300N', type: 'router', prefix: 'Wireless Router', boxIcon: 'art/ComponentBox/SpecificLinksys_40x40.png', canvasIcon: 'art/Workspace/Logical/iLinksys@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealLinkSysRouter.png' },
            { model: 'AccessPoint-PT', type: 'switch', prefix: 'Access Point', boxIcon: 'art/ComponentBox/AP-PT.png', canvasIcon: 'art/Workspace/Logical/iAccessPoint@2x.png', chassisImg: 'art/PhysicalView/Devices/iPTRealAccessPoint.png' },
            { model: 'HomeGateway', type: 'router', prefix: 'Home Gateway', boxIcon: 'art/ComponentBox/SpecificHomeGateway_40x40.png', canvasIcon: 'art/Workspace/Logical/iHomeGateway@2x.png', chassisImg: 'art/PhysicalView/Devices/iHomeGateway.png' }
          ]
        },
        {
          id: 'security',
          label: 'Security',
          icon: 'art/ComponentBox/subgroup4.png',
          iconOn: 'art/ComponentBox/subgroup4_on.png',
          models: [
            { model: '5506-X', type: 'router', prefix: 'ASA', boxIcon: 'art/ComponentBox/SpecificASA5506.png', canvasIcon: 'art/Workspace/Logical/iASA@2x.png', chassisImg: 'art/PhysicalView/Devices/ASA5506Front.png' },
            { model: '5505', type: 'router', prefix: 'ASA', boxIcon: 'art/ComponentBox/SpecificASA5505.png', canvasIcon: 'art/Workspace/Logical/iASA@2x.png', chassisImg: 'art/PhysicalView/Devices/ASAFront.png' }
          ]
        },
        {
          id: 'wan',
          label: 'WAN Emulation',
          icon: 'art/ComponentBox/subgroup5.png',
          iconOn: 'art/ComponentBox/subgroup5_on.png',
          models: [
            { model: 'Cloud-PT', type: 'switch', prefix: 'Cloud', boxIcon: 'art/ComponentBox/SpecificArtificialCloud_40x40.png', canvasIcon: 'art/Workspace/Logical/iCloud@2x.png', chassisImg: 'art/PhysicalView/Devices/iPTRealCloud.png' },
            { model: 'DSL-Modem-PT', type: 'switch', prefix: 'DSL Modem', boxIcon: 'art/ComponentBox/SpecificDSL-Modem_40x40.png', canvasIcon: 'art/Workspace/Logical/iModem@2x.png', chassisImg: 'art/PhysicalView/Devices/iPTRealDSLModem.png' }
          ]
        }
      ]
    },
    end: {
      label: 'End Devices',
      icon: 'art/ComponentBox/group1.png',
      iconOn: 'art/ComponentBox/group1_on.png',
      subcategories: [
        {
          id: 'end-devices',
          label: 'End Devices',
          icon: 'art/ComponentBox/subgroup6.png',
          iconOn: 'art/ComponentBox/subgroup6_on.png',
          models: [
            { model: 'PC-PT', type: 'pc', prefix: 'PC', boxIcon: 'art/ComponentBox/SpecificArtificialWorkstation_40x40.png', canvasIcon: 'art/Workspace/Logical/iWorkstation@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealWiredEndDevice.png' },
            { model: 'Laptop-PT', type: 'laptop', prefix: 'Laptop', boxIcon: 'art/ComponentBox/SpecificArtificialLaptop_40x40.png', canvasIcon: 'art/Workspace/Logical/iLaptop@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealLaptop.png' },
            { model: 'Server-PT', type: 'server', prefix: 'Server', boxIcon: 'art/ComponentBox/SpecificArtificialServer_40x40.png', canvasIcon: 'art/Workspace/Logical/iServer@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealServer.png' },
            { model: 'Printer-PT', type: 'pc', prefix: 'Printer', boxIcon: 'art/ComponentBox/SpecificArtificialPrinter_40x40.png', canvasIcon: 'art/Workspace/Logical/iPrinter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealPrinter.png' },
            { model: '7960', type: 'pc', prefix: 'IP Phone', boxIcon: 'art/ComponentBox/SpecificIPPhone_40x40.png', canvasIcon: 'art/Workspace/Logical/iIPPhone@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealIPPhone7960.png' },
            { model: 'TabletPC-PT', type: 'pc', prefix: 'TabletPC', boxIcon: 'art/ComponentBox/SpecificArtificialTabletPC_40x40.png', canvasIcon: 'art/Workspace/Logical/iTabletPC@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealTabletPC.png' },
            { model: 'Smartphone-PT', type: 'pc', prefix: 'Smartphone', boxIcon: 'art/ComponentBox/SpecificArtificialPda_40x40.png', canvasIcon: 'art/Workspace/Logical/iPda@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealPda.png' }
          ]
        }
      ]
    },
    components: {
      label: 'Components',
      icon: 'art/ComponentBox/group2.png',
      iconOn: 'art/ComponentBox/group2_on.png',
      subcategories: [
        {
          id: 'boards',
          label: 'Boards',
          icon: 'art/ComponentBox/subgroup11.png',
          iconOn: 'art/ComponentBox/subgroup11_on.png',
          models: [
            { model: 'MCU-PT', type: 'pc', prefix: 'MCU', boxIcon: 'art/ComponentBox/SpecificMCU_40x40.png', canvasIcon: 'art/Workspace/Logical/iIoE@2x.png', chassisImg: 'art/PhysicalView/Devices/GenericIoE.png' },
            { model: 'SBC-PT', type: 'pc', prefix: 'SBC', boxIcon: 'art/ComponentBox/SpecificSBC_40x40.png', canvasIcon: 'art/Workspace/Logical/iIoE@2x.png', chassisImg: 'art/PhysicalView/Devices/GenericIoE.png' }
          ]
        }
      ]
    },
    connections: {
      label: 'Connections',
      icon: 'art/ComponentBox/group3.png',
      iconOn: 'art/ComponentBox/group3_on.png',
      subcategories: [
        {
          id: 'cables',
          label: 'Connections',
          icon: 'art/ComponentBox/subgroup14.png',
          iconOn: 'art/ComponentBox/subgroup14_on.png',
          models: [
            { model: 'Automatically Choose Connection Type', cableType: 'auto', isCable: true, boxIcon: 'art/ComponentBox/SpecificAutoConnect_40x40.png' },
            { model: 'Console', cableType: 'console', isCable: true, boxIcon: 'art/ComponentBox/SpecificConsole_40x40.png' },
            { model: 'Copper Straight-Through', cableType: 'straight', isCable: true, boxIcon: 'art/ComponentBox/SpecificCopperStraight_40x40.png' },
            { model: 'Copper Cross-Over', cableType: 'cross', isCable: true, boxIcon: 'art/ComponentBox/SpecificCrossConnect_40x40.png' },
            { model: 'Fiber', cableType: 'fiber', isCable: true, boxIcon: 'art/ComponentBox/SpecificFiber_40x40.png' },
            { model: 'Serial DCE', cableType: 'serial-dce', isCable: true, boxIcon: 'art/ComponentBox/SpecificSerialDCE_40x40.png' },
            { model: 'Serial DTE', cableType: 'serial-dte', isCable: true, boxIcon: 'art/ComponentBox/SpecificSerialDTE_40x40.png' },
            { model: 'Coaxial', cableType: 'coax', isCable: true, boxIcon: 'art/ComponentBox/SpecificCoaxial_40x40.png' }
          ]
        }
      ]
    },
    misc: {
      label: 'Miscellaneous (Quick Favorites)',
      icon: 'art/ComponentBox/group4.png',
      iconOn: 'art/ComponentBox/group4_on.png',
      subcategories: [
        {
          id: 'fav',
          label: 'Custom',
          icon: 'art/ComponentBox/subgroup16.png',
          iconOn: 'art/ComponentBox/subgroup16_on.png',
          models: [
            { model: '2960-24TT', type: 'switch', prefix: 'Switch', boxIcon: 'art/ComponentBox/Specific2960_40x40.png', canvasIcon: 'art/Workspace/Logical/iSwitch@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealSwitch2960_24TTFront.png' },
            { model: '3560-24PS', type: 'l3switch', prefix: 'Multilayer Switch', boxIcon: 'art/ComponentBox/Specific3560_24PS_40x40.png', canvasIcon: 'art/Workspace/Logical/iSwitch3560@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealSwitch3560Front.png' },
            { model: '1941', type: 'router', prefix: 'Router', boxIcon: 'art/ComponentBox/Specific1941_40x40.png', canvasIcon: 'art/Workspace/Logical/iRouter@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealRouter1941Back.png' },
            { model: 'PC-PT', type: 'pc', prefix: 'PC', boxIcon: 'art/ComponentBox/SpecificArtificialWorkstation_40x40.png', canvasIcon: 'art/Workspace/Logical/iWorkstation@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealWiredEndDevice.png' },
            { model: 'Server-PT', type: 'server', prefix: 'Server', boxIcon: 'art/ComponentBox/SpecificArtificialServer_40x40.png', canvasIcon: 'art/Workspace/Logical/iServer@2x.png', chassisImg: 'art/PhysicalView/Devices/iRealServer.png' },
            { model: 'Automatically Choose Connection Type', cableType: 'auto', isCable: true, boxIcon: 'art/ComponentBox/SpecificAutoConnect_40x40.png' }
          ]
        }
      ]
    }
  };

  // ==================== 2. APPLICATION STATE ====================
  const state = {
    devices: [],
    links: [], // { id, cableType, devA, portA, devB, portB }
    notes: [], // { id, x, y, text }
    pduList: [], // { id, status, srcName, dstName, type, time, hops, pduDetails }
    simEvents: [], // Simulation mode step list
    simCursor: 0,
    simPlaying: false,
    simTimer: null,
    selectedCategory: 'network',
    selectedSubcategory: 'switches',
    activeTool: 'select', // 'select' | 'inspect' | 'delete' | 'note' | 'pdu' | 'place-device' | 'connect-cable'
    pendingModel: null,
    pendingCableType: null,
    cableSource: null, // { devId, portName }
    pduSourceDevId: null,
    selectedDeviceId: null,
    openDeviceId: null, // Currently open in modal
    consoleRedirectDevId: null, // If viewing via PC RS-232 Terminal
    workspaceMode: 'logical', // 'logical' | 'physical'
    simMode: 'realtime', // 'realtime' | 'simulation'
    zoom: 1,
    showPortLabels: true,
    showModelLabels: true,
    showLinkLights: true,
    darkCli: false,
    uptimeSeconds: 12,
    counters: { Switch: 0, Router: 0, PC: 0, Laptop: 0, Server: 0, 'Multilayer Switch': 0, Hub: 0, Cloud: 0 }
  };

  // ==================== 3. NETWORK TOPOLOGY & PROTOCOL ENGINE ====================
  const networkContext = {
    refreshLinkStates() {
      for (const link of state.links) {
        const devA = getDevice(link.devA);
        const devB = getDevice(link.devB);
        if (!devA || !devB) continue;
        const pA = devA.interfaces.find(i => i.name === link.portA);
        const pB = devB.interfaces.find(i => i.name === link.portB);
        if (!pA || !pB) continue;

        const bothUp = devA.poweredOn && devB.poweredOn && pA.adminUp && pB.adminUp;
        pA.lineUp = bothUp;
        pB.lineUp = bothUp;

        if (!bothUp) {
          pA.stpState = 'DOWN';
          pB.stpState = 'DOWN';
        } else {
          if (pA.stpState === 'DOWN') {
            pA.stpState = (pA.portfast || devA.stp.portfastDefault) ? 'FWD' : 'FWD';
          }
          if (pB.stpState === 'DOWN') {
            pB.stpState = (pB.portfast || devB.stp.portfastDefault) ? 'FWD' : 'FWD';
          }
        }
      }
      // Also update Switch SVIs (Vlan1, Vlan10, etc.) & Router subinterfaces
      for (const dev of state.devices) {
        for (const iface of dev.interfaces) {
          if (iface.type === 'svi') {
            const vid = parseInt(iface.name.replace(/^Vlan/i, ''), 10) || 1;
            const hasActivePort = dev.interfaces.some(p =>
              p.type === 'ethernet' && p.lineUp && p.adminUp &&
              ((p.mode === 'access' && p.accessVlan === vid) || p.mode === 'trunk')
            );
            iface.lineUp = iface.adminUp && hasActivePort;
          } else if (iface.type === 'subif') {
            const parentName = iface.name.split('.')[0];
            const parent = dev.interfaces.find(p => p.name.toLowerCase() === parentName.toLowerCase());
            iface.lineUp = iface.adminUp && Boolean(parent && parent.adminUp && parent.lineUp);
          }
        }
      }
      renderCanvas();
    },

    getCdpNeighbors(dev) {
      const neighbors = [];
      for (const link of state.links) {
        if (link.cableType === 'console') continue;
        let localPort = null, remoteDev = null, remotePort = null;
        if (link.devA === dev.id) {
          localPort = link.portA;
          remoteDev = getDevice(link.devB);
          remotePort = link.portB;
        } else if (link.devB === dev.id) {
          localPort = link.portB;
          remoteDev = getDevice(link.devA);
          remotePort = link.portA;
        }
        if (!remoteDev) continue;
        if (!['switch', 'l3switch', 'router'].includes(remoteDev.type)) continue;
        const pLocal = dev.interfaces.find(i => i.name === localPort);
        const pRem = remoteDev.interfaces.find(i => i.name === remotePort);
        if (!pLocal || !pRem || !pLocal.lineUp || !pRem.lineUp) continue;
        const cap = remoteDev.type === 'router' ? 'R ' : remoteDev.type === 'l3switch' ? 'R S I' : 'S I';
        neighbors.push({
          hostname: remoteDev.hostname,
          localPort,
          remotePort,
          cap,
          model: remoteDev.model
        });
      }
      return neighbors;
    },

    getOspfNeighbors(dev) {
      const out = [];
      if (!Object.keys(dev.ospf.processes || {}).length) return out;
      for (const link of state.links) {
        const otherId = link.devA === dev.id ? link.devB : link.devB === dev.id ? link.devA : null;
        if (!otherId) continue;
        const other = getDevice(otherId);
        if (!other || !Object.keys(other.ospf.processes || {}).length) continue;
        const localPort = link.devA === dev.id ? link.portA : link.portB;
        const remotePort = link.devA === dev.id ? link.portB : link.portA;
        const pRem = other.interfaces.find(i => i.name === remotePort);
        if (pRem && pRem.ip && pRem.lineUp) {
          const firstProc = Object.values(other.ospf.processes)[0];
          out.push({
            neighborId: (firstProc && firstProc.routerId) || pRem.ip,
            address: pRem.ip,
            interface: localPort
          });
        }
      }
      return out;
    },

    getDynamicRoutes(dev) {
      const routes = [];
      const hasOspf = Object.keys(dev.ospf.processes || {}).length > 0;
      const hasRip = dev.rip && dev.rip.enabled;
      if (!hasOspf && !hasRip) return routes;

      const localSubnets = new Set();
      for (const iface of dev.interfaces) {
        if (iface.ip && iface.mask && iface.lineUp) {
          const netInt = (PTEngine.ipToInt(iface.ip) & PTEngine.ipToInt(iface.mask)) >>> 0;
          localSubnets.add(PTEngine.intToIp(netInt));
        }
      }

      for (const other of state.devices) {
        if (other.id === dev.id) continue;
        if (other.type !== 'router' && other.type !== 'l3switch') continue;
        const otherOspf = Object.keys(other.ospf.processes || {}).length > 0;
        const otherRip = other.rip && other.rip.enabled;
        if (!((hasOspf && otherOspf) || (hasRip && otherRip))) continue;

        // Find neighbor hop interface
        let nhIp = '10.0.0.2', outIf = dev.interfaces[0].name;
        for (const link of state.links) {
          if ((link.devA === dev.id && link.devB === other.id) || (link.devB === dev.id && link.devA === other.id)) {
            outIf = link.devA === dev.id ? link.portA : link.portB;
            const remPort = link.devA === dev.id ? link.portB : link.portA;
            const remIf = other.interfaces.find(i => i.name === remPort);
            if (remIf && remIf.ip) nhIp = remIf.ip;
          }
        }

        for (const iface of other.interfaces) {
          if (iface.ip && iface.mask && iface.lineUp) {
            const netInt = (PTEngine.ipToInt(iface.ip) & PTEngine.ipToInt(iface.mask)) >>> 0;
            const netStr = PTEngine.intToIp(netInt);
            if (!localSubnets.has(netStr)) {
              localSubnets.add(netStr);
              routes.push({
                code: hasOspf ? 'O' : 'R',
                network: netStr,
                cidr: PTEngine.maskToCidr(iface.mask),
                ad: hasOspf ? 110 : 120,
                metric: hasOspf ? 2 : 1,
                nextHop: nhIp,
                outInterface: outIf
              });
            }
          }
        }
      }
      return routes;
    },

    requestDhcp(clientDev) {
      const clientIf = clientDev.interfaces.find(i => i.type === 'ethernet');
      if (!clientIf || !clientIf.lineUp) return null;

      // Determine client's VLAN if connected to a switch
      let clientVlan = 1;
      for (const link of state.links) {
        if (link.devA === clientDev.id || link.devB === clientDev.id) {
          const peerId = link.devA === clientDev.id ? link.devB : link.devA;
          const peerPort = link.devA === clientDev.id ? link.portB : link.portA;
          const peer = getDevice(peerId);
          if (peer && (peer.type === 'switch' || peer.type === 'l3switch')) {
            const swIf = peer.interfaces.find(i => i.name === peerPort);
            if (swIf && swIf.mode === 'access') clientVlan = swIf.accessVlan || 1;
          }
        }
      }

      // Search all Routers, L3 Switches, and Servers for a matching DHCP pool
      for (const srv of state.devices) {
        if (!srv.poweredOn) continue;

        // 1. IOS DHCP Pools (`ip dhcp pool ...`)
        for (const pool of Object.values(srv.dhcpPools || {})) {
          if (!pool.network || !pool.mask) continue;
          const netInt = (PTEngine.ipToInt(pool.network) & PTEngine.ipToInt(pool.mask)) >>> 0;

          // Check if srv has an interface on this subnet (and matching VLAN if subif/SVI)
          const matchingIf = srv.interfaces.find(iface => {
            if (!iface.ip || !iface.adminUp) return false;
            const ifNet = (PTEngine.ipToInt(iface.ip) & PTEngine.ipToInt(pool.mask)) >>> 0;
            if (ifNet !== netInt) return false;
            if (iface.vlanId && iface.vlanId !== clientVlan) return false;
            return true;
          });

          if (matchingIf || Object.keys(srv.dhcpPools).length === 1) {
            const usedIps = new Set(
              state.devices.flatMap(d => d.interfaces.map(i => i.ip).filter(Boolean))
            );
            for (const ex of (srv.dhcpExcluded || [])) {
              const lowInt = PTEngine.ipToInt(ex.low);
              const highInt = PTEngine.ipToInt(ex.high || ex.low);
              for (let cur = lowInt; cur <= highInt; cur++) usedIps.add(PTEngine.intToIp(cur));
            }
            for (let hostOffset = 10; hostOffset < 250; hostOffset++) {
              const candidate = PTEngine.intToIp((netInt + hostOffset) >>> 0);
              if (!usedIps.has(candidate)) {
                clientIf.ip = candidate;
                clientIf.mask = pool.mask;
                clientDev.defaultGateway = pool.defaultRouter || (matchingIf ? matchingIf.ip : '');
                clientDev.dnsServer = pool.dnsServer || '8.8.8.8';
                clientDev.dhcpServer = (matchingIf && matchingIf.ip) || pool.defaultRouter || '192.168.1.1';
                srv.dhcpBindings.push({ ip: candidate, mac: clientIf.mac });
                return { ip: candidate, mask: pool.mask };
              }
            }
          }
        }

        // 2. Server-PT DHCP Service
        if (srv.type === 'server' && srv.services && srv.services.dhcp) {
          const sp = srv.services.dhcpPool;
          const startInt = PTEngine.ipToInt(sp.startIp);
          const usedIps = new Set(state.devices.flatMap(d => d.interfaces.map(i => i.ip).filter(Boolean)));
          for (let k = 0; k < (sp.maxUsers || 50); k++) {
            const candidate = PTEngine.intToIp((startInt + k) >>> 0);
            if (!usedIps.has(candidate)) {
              clientIf.ip = candidate;
              clientIf.mask = sp.mask;
              clientDev.defaultGateway = sp.gateway;
              clientDev.dnsServer = sp.dns;
              clientDev.dhcpServer = srv.interfaces[0].ip || sp.gateway;
              return { ip: candidate, mask: sp.mask };
            }
          }
        }
      }
      return null;
    },

    // Trace path & verify VLAN/Trunk/L3 Routing between source device and target IP
    runPing(srcDev, targetIpStr, animateOnCanvas = true) {
      // Find destination device that owns targetIpStr
      let dstDev = null;
      let dstIf = null;
      for (const d of state.devices) {
        if (!d.poweredOn) continue;
        for (const iface of d.interfaces) {
          if (iface.ip === targetIpStr && iface.adminUp && (iface.lineUp || iface.type === 'svi' || iface.type === 'subif')) {
            dstDev = d;
            dstIf = iface;
            break;
          }
        }
        if (dstDev) break;
      }

      const srcIf = srcDev.interfaces.find(i => i.ip && i.adminUp && (i.lineUp || i.type === 'svi')) || srcDev.interfaces[0];
      if (!srcDev.poweredOn || !srcIf || !srcIf.ip || !dstDev) {
        return makePingFailure(targetIpStr);
      }

      // BFS across physical topology enforcing L2 VLAN/Trunk rules and L3 Router/SVI hops
      const pathResult = findNetworkPath(srcDev, srcIf, dstDev, dstIf);
      if (!pathResult.reachable) {
        if (animateOnCanvas && pathResult.partialNodes && pathResult.partialNodes.length >= 2) {
          triggerPacketAnimation(pathResult.partialNodes, false, srcIf.ip, targetIpStr);
        }
        return makePingFailure(targetIpStr);
      }

      // Record dynamic MAC learning on switches along the path & ARP entries on endpoints
      learnMacAndArpAlongPath(pathResult.nodePath, srcDev, srcIf, dstDev, dstIf);

      if (animateOnCanvas) {
        triggerPacketAnimation(pathResult.nodePath, true, srcIf.ip, targetIpStr);
      }

      const hops = pathResult.l3Hops.length ? [...pathResult.l3Hops, targetIpStr] : [targetIpStr];
      return {
        success: true,
        hops,
        nodePath: pathResult.nodePath,
        cliText: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIpStr}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
        pcText: `\nPinging ${targetIpStr} with 32 bytes of data:\n\nReply from ${targetIpStr}: bytes=32 time=1ms TTL=${128 - pathResult.l3Hops.length}\nReply from ${targetIpStr}: bytes=32 time<1ms TTL=${128 - pathResult.l3Hops.length}\nReply from ${targetIpStr}: bytes=32 time<1ms TTL=${128 - pathResult.l3Hops.length}\nReply from ${targetIpStr}: bytes=32 time<1ms TTL=${128 - pathResult.l3Hops.length}\n\nPing statistics for ${targetIpStr}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),\nApproximate round trip times in milli-seconds:\n    Minimum = 0ms, Maximum = 1ms, Average = 0ms`
      };
    }
  };

  function makePingFailure(targetIpStr) {
    return {
      success: false,
      hops: [],
      nodePath: [],
      cliText: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIpStr}, timeout is 2 seconds:\n.....\nSuccess rate is 0 percent (0/5)`,
      pcText: `\nPinging ${targetIpStr} with 32 bytes of data:\n\nRequest timed out.\nRequest timed out.\nRequest timed out.\nRequest timed out.\n\nPing statistics for ${targetIpStr}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),`
    };
  }

  function isVlanAllowedOnTrunk(allowedSpec, vlanId) {
    if (!allowedSpec || allowedSpec === '1-1005' || allowedSpec === 'all') return true;
    if (allowedSpec === 'none') return false;
    const parts = allowedSpec.split(',');
    for (const p of parts) {
      if (p.includes('-')) {
        const [a, b] = p.split('-').map(Number);
        if (vlanId >= a && vlanId <= b) return true;
      } else if (parseInt(p, 10) === vlanId) {
        return true;
      }
    }
    return false;
  }

  // BFS that respects L2 VLAN tags, Switch Access/Trunk ports, Router-on-a-Stick subinterfaces, and L3 routing
  function findNetworkPath(srcDev, srcIf, dstDev, dstIf) {
    if (srcDev.id === dstDev.id) {
      return { reachable: true, nodePath: [srcDev.id], l3Hops: [] };
    }

    // State in BFS: (devId, currentVlan, nodePath, l3Hops)
    const queue = [{ devId: srcDev.id, vlan: srcIf.vlanId || 1, nodePath: [srcDev.id], l3Hops: [] }];
    const visited = new Set([`${srcDev.id}:${srcIf.vlanId || 1}`]);
    let bestPartial = [srcDev.id];

    while (queue.length > 0) {
      const curr = queue.shift();
      const currDev = getDevice(curr.devId);
      if (!currDev || !currDev.poweredOn) continue;

      if (curr.nodePath.length > bestPartial.length) {
        bestPartial = curr.nodePath;
      }

      if (curr.devId === dstDev.id) {
        return { reachable: true, nodePath: curr.nodePath, l3Hops: curr.l3Hops };
      }

      // If currDev is a Router or L3 Switch (with ipRouting), it can route between VLANs/Subnets!
      const canRoute = currDev.type === 'router' || (currDev.type === 'l3switch' && currDev.ipRouting);

      for (const link of state.links) {
        if (link.cableType === 'console') continue;
        const isA = link.devA === curr.devId;
        const isB = link.devB === curr.devId;
        if (!isA && !isB) continue;

        const nextDevId = isA ? link.devB : link.devA;
        const outPortName = isA ? link.portA : link.portB;
        const inPortName = isA ? link.portB : link.portA;
        const nextDev = getDevice(nextDevId);
        if (!nextDev || !nextDev.poweredOn) continue;

        const outPort = currDev.interfaces.find(i => i.name === outPortName);
        const inPort = nextDev.interfaces.find(i => i.name === inPortName);
        if (!outPort || !inPort || !outPort.adminUp || !inPort.adminUp || !outPort.lineUp || !inPort.lineUp) {
          continue;
        }

        // Determine VLAN tag leaving currDev on outPort
        const candidateVlans = new Set();
        if (currDev.type === 'switch' || (currDev.type === 'l3switch' && !currDev.ipRouting)) {
          if (outPort.mode === 'trunk') {
            if (isVlanAllowedOnTrunk(outPort.allowedVlans, curr.vlan) && currDev.vlans[curr.vlan]) {
              candidateVlans.add(curr.vlan);
            }
          } else {
            if ((outPort.accessVlan || 1) === curr.vlan && currDev.vlans[curr.vlan]) {
              candidateVlans.add(curr.vlan);
            }
          }
        } else if (canRoute) {
          // Router or L3 switch can exit on any active interface/subinterface/SVI
          candidateVlans.add(outPort.accessVlan || 1);
          for (const sub of currDev.interfaces) {
            if (sub.name.startsWith(outPort.name + '.') && sub.adminUp && sub.ip && sub.vlanId) {
              candidateVlans.add(sub.vlanId);
            }
            if (sub.type === 'svi' && sub.adminUp && sub.ip) {
              const sviVlan = parseInt(sub.name.replace(/^Vlan/i, ''), 10);
              if (sviVlan) candidateVlans.add(sviVlan);
            }
          }
        } else {
          // End device (PC / Server)
          candidateVlans.add(1);
        }

        for (const txVlan of candidateVlans) {
          // Determine VLAN tag entering nextDev on inPort
          let rxVlan = txVlan;
          if (nextDev.type === 'switch' || nextDev.type === 'l3switch') {
            if (inPort.mode === 'trunk') {
              if (!isVlanAllowedOnTrunk(inPort.allowedVlans, txVlan)) continue;
              rxVlan = txVlan;
            } else {
              // If coming from a PC/Router untagged port into a Switch Access port, it enters inPort.accessVlan!
              if (currDev.type === 'pc' || currDev.type === 'laptop' || currDev.type === 'server' || (currDev.type === 'router' && !currDev.interfaces.some(s => s.name.startsWith(outPort.name + '.')))) {
                rxVlan = inPort.accessVlan || 1;
              } else if ((inPort.accessVlan || 1) !== txVlan) {
                continue;
              }
            }
          } else if (nextDev.type === 'router') {
            // Check if router has either the physical port IP or a dot1Q subinterface for txVlan
            const hasSubIf = nextDev.interfaces.find(s => s.name.startsWith(inPort.name + '.') && s.vlanId === txVlan && s.adminUp && s.ip);
            if (!inPort.ip && !hasSubIf) continue;
          }

          const stateKey = `${nextDevId}:${rxVlan}`;
          if (!visited.has(stateKey)) {
            visited.add(stateKey);
            const nextHops = [...curr.l3Hops];
            if (canRoute && curr.devId !== srcDev.id) {
              const rtrIp = outPort.ip || (currDev.interfaces.find(i => i.ip) || {}).ip;
              if (rtrIp) nextHops.push(rtrIp);
            }
            queue.push({
              devId: nextDevId,
              vlan: rxVlan,
              nodePath: [...curr.nodePath, nextDevId],
              l3Hops: nextHops
            });
          }
        }
      }
    }

    // Final subnet / gateway sanity check if path found
    return { reachable: false, partialNodes: bestPartial, l3Hops: [] };
  }

  function learnMacAndArpAlongPath(nodePath, srcDev, srcIf, dstDev, dstIf) {
    // Add ARP entries on src and dst
    if (srcIf.ip && dstIf.ip) {
      if (!srcDev.arpTable.some(e => e.ip === dstIf.ip)) {
        srcDev.arpTable.push({ ip: dstIf.ip, mac: dstIf.mac, interface: srcIf.name });
      }
      if (!dstDev.arpTable.some(e => e.ip === srcIf.ip)) {
        dstDev.arpTable.push({ ip: srcIf.ip, mac: srcIf.mac, interface: dstIf.name });
      }
    }

    // Record dynamic MAC addresses on switches along nodePath
    for (let i = 0; i < nodePath.length; i++) {
      const dev = getDevice(nodePath[i]);
      if (!dev || (dev.type !== 'switch' && dev.type !== 'l3switch')) continue;
      if (i > 0) {
        const prevId = nodePath[i - 1];
        const link = state.links.find(l => (l.devA === dev.id && l.devB === prevId) || (l.devB === dev.id && l.devA === prevId));
        if (link) {
          const inPort = link.devA === dev.id ? link.portA : link.portB;
          const swIf = dev.interfaces.find(p => p.name === inPort);
          const vlan = (swIf && swIf.accessVlan) || 1;
          if (!dev.macTable.some(m => m.mac === srcIf.mac && m.port === inPort)) {
            dev.macTable.push({ vlan, mac: srcIf.mac, type: 'DYNAMIC', port: inPort });
          }
        }
      }
      if (i < nodePath.length - 1) {
        const nextId = nodePath[i + 1];
        const link = state.links.find(l => (l.devA === dev.id && l.devB === nextId) || (l.devB === dev.id && l.devA === nextId));
        if (link) {
          const outPort = link.devA === dev.id ? link.portA : link.portB;
          const swIf = dev.interfaces.find(p => p.name === outPort);
          const vlan = (swIf && swIf.accessVlan) || 1;
          if (!dev.macTable.some(m => m.mac === dstIf.mac && m.port === outPort)) {
            dev.macTable.push({ vlan, mac: dstIf.mac, type: 'DYNAMIC', port: outPort });
          }
        }
      }
    }
  }

  // ==================== 4. HELPERS & RENDERERS ====================
  function getDevice(id) {
    return state.devices.find(d => d.id === id) || null;
  }

  function findCatalogModel(modelName) {
    for (const cat of Object.values(CATALOG)) {
      for (const sub of cat.subcategories) {
        const m = sub.models.find(x => x.model === modelName);
        if (m) return m;
      }
    }
    return CATALOG.network.subcategories[0].models[0];
  }

  function addDevice(modelInfo, x, y, customName) {
    const prefix = modelInfo.prefix || 'Device';
    state.counters[prefix] = (state.counters[prefix] || 0);
    const displayName = customName || `${prefix}${state.counters[prefix]++}`;
    const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const dev = PTEngine.createDeviceState(id, modelInfo.model, modelInfo.type, displayName, x, y);
    dev.canvasIcon = modelInfo.canvasIcon;
    dev.chassisImg = modelInfo.chassisImg;
    state.devices.push(dev);
    renderCanvas();
    return dev;
  }

  function connectDevices(devA, portAName, devB, portBName, cableType) {
    const pA = devA.interfaces.find(i => i.name === portAName);
    const pB = devB.interfaces.find(i => i.name === portBName);
    if (!pA || !pB) return null;
    if (pA.connectedLinkId || pB.connectedLinkId) return null;

    let resolvedCable = cableType;
    if (cableType === 'auto') {
      const sameCategory =
        (devA.type === devB.type) ||
        (['pc', 'laptop', 'server', 'router'].includes(devA.type) && ['pc', 'laptop', 'server', 'router'].includes(devB.type));
      resolvedCable = sameCategory ? 'cross' : 'straight';
    }

    const linkId = `link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    pA.connectedLinkId = linkId;
    pB.connectedLinkId = linkId;

    // Simulate 3-second STP amber learning on switch ports before turning green!
    const isSwitchA = devA.type === 'switch' || devA.type === 'l3switch';
    const isSwitchB = devB.type === 'switch' || devB.type === 'l3switch';

    const link = { id: linkId, cableType: resolvedCable, devA: devA.id, portA: portAName, devB: devB.id, portB: portBName };
    state.links.push(link);
    networkContext.refreshLinkStates();

    if (pA.lineUp && isSwitchA && !pA.portfast && !devA.stp.portfastDefault) {
      pA.stpState = 'LRN';
      setTimeout(() => {
        if (pA.lineUp) { pA.stpState = 'FWD'; renderCanvas(); }
      }, 2800);
    }
    if (pB.lineUp && isSwitchB && !pB.portfast && !devB.stp.portfastDefault) {
      pB.stpState = 'LRN';
      setTimeout(() => {
        if (pB.lineUp) { pB.stpState = 'FWD'; renderCanvas(); }
      }, 2800);
    }

    renderCanvas();
    return link;
  }

  function autoPickPort(dev, cableType) {
    if (cableType === 'console') {
      return dev.interfaces.find(i => (i.type === 'console' || i.type === 'rs232') && !i.connectedLinkId) || null;
    }
    if (cableType === 'serial-dce' || cableType === 'serial-dte') {
      return dev.interfaces.find(i => i.type === 'serial' && !i.connectedLinkId) || null;
    }
    return dev.interfaces.find(i => i.type === 'ethernet' && !i.connectedLinkId) || null;
  }

  // ==================== 5. CANVAS & RACK RENDERING ====================
  const nodesLayer = document.getElementById('pt-nodes-layer');
  const notesLayer = document.getElementById('pt-notes-layer');
  const cablesSvg = document.getElementById('pt-cables-svg');
  const pduLayer = document.getElementById('pt-pdu-layer');
  const floatingMenu = document.getElementById('pt-floating-device-menu');
  const floatingDevName = document.getElementById('pt-floating-dev-name');

  function renderCanvas() {
    // Apply zoom transform
    const scaleStr = `scale(${state.zoom})`;
    nodesLayer.style.transform = scaleStr;
    nodesLayer.style.transformOrigin = '0 0';
    notesLayer.style.transform = scaleStr;
    notesLayer.style.transformOrigin = '0 0';
    cablesSvg.style.transform = scaleStr;
    cablesSvg.style.transformOrigin = '0 0';
    pduLayer.style.transform = scaleStr;
    pduLayer.style.transformOrigin = '0 0';

    // 1. Render Cables & Link Lights in SVG
    cablesSvg.innerHTML = '';
    for (const link of state.links) {
      const devA = getDevice(link.devA);
      const devB = getDevice(link.devB);
      if (!devA || !devB) continue;
      const pA = devA.interfaces.find(i => i.name === link.portA);
      const pB = devB.interfaces.find(i => i.name === link.portB);
      if (!pA || !pB) continue;

      const x1 = devA.x, y1 = devA.y;
      const x2 = devB.x, y2 = devB.y;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = state.activeTool === 'delete' ? 'pointer' : 'default';
      g.addEventListener('click', (e) => {
        if (state.activeTool === 'delete') {
          e.stopPropagation();
          deleteLink(link.id);
        }
      });

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke-width', '2.5');

      if (link.cableType === 'cross') {
        line.setAttribute('stroke', '#111827');
        line.setAttribute('stroke-dasharray', '6,4');
      } else if (link.cableType === 'console') {
        line.setAttribute('stroke', '#06b6d4');
      } else if (link.cableType === 'fiber') {
        line.setAttribute('stroke', '#f97316');
      } else if (link.cableType.startsWith('serial')) {
        line.setAttribute('stroke', '#dc2626');
      } else {
        line.setAttribute('stroke', '#111827');
      }
      g.appendChild(line);

      // Link Lights & Port Labels
      if (state.showLinkLights && link.cableType !== 'console') {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy) || 1;
        const offset = 36;
        const lx1 = x1 + (dx / dist) * offset;
        const ly1 = y1 + (dy / dist) * offset;
        const lx2 = x2 - (dx / dist) * offset;
        const ly2 = y2 - (dy / dist) * offset;

        g.appendChild(createLinkLightSvg(lx1, ly1, pA, pB));
        g.appendChild(createLinkLightSvg(lx2, ly2, pB, pA));

        if (state.showPortLabels) {
          const tx1 = x1 + (dx / dist) * 54;
          const ty1 = y1 + (dy / dist) * 54 - 7;
          const tx2 = x2 - (dx / dist) * 54;
          const ty2 = y2 - (dy / dist) * 54 - 7;
          g.appendChild(createPortLabelSvg(tx1, ty1, PTEngine.shortIfName(pA.name)));
          g.appendChild(createPortLabelSvg(tx2, ty2, PTEngine.shortIfName(pB.name)));
        }
      }
      cablesSvg.appendChild(g);
    }

    // 2. Render Device Nodes
    nodesLayer.innerHTML = '';
    for (const dev of state.devices) {
      const el = document.createElement('div');
      el.className = `pt-node${state.selectedDeviceId === dev.id ? ' selected' : ''}${!dev.poweredOn ? ' power-off' : ''}`;
      el.style.left = `${dev.x}px`;
      el.style.top = `${dev.y}px`;
      el.dataset.devId = dev.id;

      // Primary IP badge for quick visibility
      const primaryIf = dev.interfaces.find(i => i.ip);
      const ipBadgeHtml = primaryIf ? `<div class="pt-node-ip-badge">${primaryIf.ip}</div>` : '';

      el.innerHTML = `
        <img src="${dev.canvasIcon}" alt="${dev.model}" class="pt-node-icon" />
        ${state.showModelLabels ? `<div class="pt-node-model">${dev.model}</div>` : ''}
        <div class="pt-node-name">${dev.displayName}</div>
        ${ipBadgeHtml}
      `;

      bindNodePointerEvents(el, dev);
      nodesLayer.appendChild(el);
    }

    // 3. Render Sticky Notes
    notesLayer.innerHTML = '';
    for (const note of state.notes) {
      const nel = document.createElement('div');
      nel.className = 'pt-canvas-note';
      nel.style.left = `${note.x}px`;
      nel.style.top = `${note.y}px`;
      nel.textContent = note.text;
      nel.addEventListener('click', (e) => {
        if (state.activeTool === 'delete') {
          e.stopPropagation();
          state.notes = state.notes.filter(n => n.id !== note.id);
          renderCanvas();
        }
      });
      notesLayer.appendChild(nel);
    }

    // 4. Update Floating Device Action Bar
    const selDev = getDevice(state.selectedDeviceId);
    if (selDev) {
      floatingMenu.classList.remove('hidden');
      floatingDevName.textContent = `${selDev.displayName} (${selDev.model})`;
    } else {
      floatingMenu.classList.add('hidden');
    }

    // 5. Render Physical Rack if open
    if (state.workspaceMode === 'physical') {
      renderPhysicalRack();
    }
  }

  function createLinkLightSvg(cx, cy, port, peerPort) {
    const bothUp = port.adminUp && peerPort.adminUp && port.lineUp;
    if (!bothUp) {
      // Red down triangle
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', `${cx - 5},${cy - 4} ${cx + 5},${cy - 4} ${cx},${cy + 5}`);
      poly.setAttribute('fill', '#dc2626');
      poly.setAttribute('stroke', '#ffffff');
      poly.setAttribute('stroke-width', '1');
      return poly;
    }
    if (port.stpState === 'LRN') {
      // Amber STP circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', '#f59e0b');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1');
      return circle;
    }
    // Green up triangle
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', `${cx},${cy - 5} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`);
    poly.setAttribute('fill', '#16a34a');
    poly.setAttribute('stroke', '#ffffff');
    poly.setAttribute('stroke-width', '1');
    return poly;
  }

  function createPortLabelSvg(x, y, text) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'pt-port-label');
    t.textContent = text;
    return t;
  }

  function renderPhysicalRack() {
    const rackEl = document.getElementById('pt-rack-units');
    if (!rackEl) return;
    rackEl.innerHTML = '';
    for (const dev of state.devices) {
      const unit = document.createElement('div');
      unit.className = 'pt-rack-unit';
      unit.innerHTML = `
        <img src="${dev.chassisImg || dev.canvasIcon}" alt="${dev.model}" />
        <div class="pt-rack-unit-label">${dev.displayName} — Cisco ${dev.model} (${dev.poweredOn ? 'POWER ON' : 'POWER OFF'})</div>
      `;
      unit.addEventListener('click', () => openDeviceModal(dev.id));
      rackEl.appendChild(unit);
    }
  }

  // ==================== 6. POINTER / TOUCH / DRAG INTERACTION ====================
  function bindNodePointerEvents(el, dev) {
    let startX = 0, startY = 0, moved = false;

    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      el.setPointerCapture(e.pointerId);

      const onMove = (me) => {
        const dx = (me.clientX - startX) / state.zoom;
        const dy = (me.clientY - startY) / state.zoom;
        if (Math.hypot(me.clientX - startX, me.clientY - startY) > 6) {
          moved = true;
        }
        if (moved && state.activeTool === 'select') {
          dev.x = Math.max(40, dev.x + dx);
          dev.y = Math.max(40, dev.y + dy);
          startX = me.clientX;
          startY = me.clientY;
          renderCanvas();
        }
      };

      const onUp = (ue) => {
        el.releasePointerCapture(ue.pointerId);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);

        if (!moved) {
          handleNodeTap(dev, ue);
        }
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
    });

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openDeviceModal(dev.id);
    });
  }

  function handleNodeTap(dev, evt) {
    // 1. Delete tool
    if (state.activeTool === 'delete') {
      deleteDevice(dev.id);
      return;
    }

    // 2. Inspect tool
    if (state.activeTool === 'inspect') {
      openInspectModal(dev);
      return;
    }

    // 3. Add Simple PDU (Ping envelope) tool
    if (state.activeTool === 'pdu' || state.activeTool === 'complex-pdu') {
      if (!state.pduSourceDevId) {
        state.pduSourceDevId = dev.id;
        showActionBanner(`✉️ المصدر: ${dev.displayName} — الآن اضغط على الجهاز الهدف (Destination)`);
      } else if (state.pduSourceDevId !== dev.id) {
        const src = getDevice(state.pduSourceDevId);
        state.pduSourceDevId = null;
        setActiveTool('select');
        if (src) fireSimplePdu(src, dev);
      }
      return;
    }

    // 4. Connect Cable tool
    if (state.activeTool === 'connect-cable') {
      handleCableTapOnDevice(dev, evt);
      return;
    }

    // 5. Select tool: if already selected, tapping again opens the Device Window (super convenient on Mobile!)
    if (state.selectedDeviceId === dev.id) {
      openDeviceModal(dev.id);
    } else {
      state.selectedDeviceId = dev.id;
      renderCanvas();
    }
  }

  function handleCableTapOnDevice(dev, evt) {
    const cableType = state.pendingCableType || 'auto';
    if (cableType === 'auto') {
      const port = autoPickPort(dev, 'auto');
      if (!port) {
        alert(`لا توجد منافذ شاغرة في ${dev.displayName}`);
        return;
      }
      if (!state.cableSource) {
        state.cableSource = { devId: dev.id, portName: port.name };
        showActionBanner(`⚡ توصيل من ${dev.displayName} (${PTEngine.shortIfName(port.name)}) — اضغط على الجهاز الثاني`);
      } else if (state.cableSource.devId !== dev.id) {
        const srcDev = getDevice(state.cableSource.devId);
        connectDevices(srcDev, state.cableSource.portName, dev, port.name, 'auto');
        state.cableSource = null;
        setActiveTool('select');
      }
      return;
    }

    // Manual port picker popup
    openPortPicker(dev, evt.clientX, evt.clientY, (chosenPortName) => {
      if (!state.cableSource) {
        state.cableSource = { devId: dev.id, portName: chosenPortName };
        showActionBanner(`🔌 توصيل من ${dev.displayName} (${PTEngine.shortIfName(chosenPortName)}) — اختر الجهاز الثاني`);
      } else if (state.cableSource.devId !== dev.id) {
        const srcDev = getDevice(state.cableSource.devId);
        connectDevices(srcDev, state.cableSource.portName, dev, chosenPortName, cableType);
        state.cableSource = null;
        setActiveTool('select');
      }
    });
  }

  function openPortPicker(dev, clientX, clientY, onSelect) {
    const picker = document.getElementById('pt-port-picker');
    const title = document.getElementById('pt-port-picker-title');
    const list = document.getElementById('pt-port-picker-list');
    title.textContent = `${dev.displayName} — اختر المنفذ`;
    list.innerHTML = '';

    const freePorts = dev.interfaces.filter(i => !i.connectedLinkId && i.type !== 'svi' && i.type !== 'subif');
    for (const p of freePorts) {
      const btn = document.createElement('button');
      btn.className = 'pt-port-option';
      const iconPath = p.type === 'console' || p.type === 'rs232'
        ? 'art/Workspace/Logical/ConsoleIcon.png'
        : p.type === 'serial'
          ? 'art/Workspace/Logical/SerialIcon.png'
          : 'art/Workspace/Logical/CopperFastEthernetIcon.png';
      btn.innerHTML = `<img src="${iconPath}" alt="" /><span>${p.name}</span>`;
      btn.addEventListener('click', () => {
        picker.classList.add('hidden');
        onSelect(p.name);
      });
      list.appendChild(btn);
    }

    picker.style.left = `${Math.min(window.innerWidth - 240, Math.max(10, clientX))}px`;
    picker.style.top = `${Math.min(window.innerHeight - 330, Math.max(10, clientY))}px`;
    picker.classList.remove('hidden');
  }

  document.getElementById('btn-close-port-picker').addEventListener('click', () => {
    document.getElementById('pt-port-picker').classList.add('hidden');
  });

  // Canvas background click (Place device, Place note, or Deselect)
  const logicalCanvas = document.getElementById('logical-workspace');
  logicalCanvas.addEventListener('pointermove', (e) => {
    const rect = logicalCanvas.getBoundingClientRect();
    const cx = Math.round((e.clientX - rect.left) / state.zoom);
    const cy = Math.round((e.clientY - rect.top) / state.zoom);
    const coordsEl = document.getElementById('pt-coords');
    if (coordsEl) coordsEl.textContent = `x: ${cx}, y: ${cy}`;
  });

  logicalCanvas.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.pt-floating-device-menu') || e.target.closest('.pt-canvas-zoom-Overlay')) {
      return;
    }
    const rect = logicalCanvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / state.zoom);
    const y = Math.round((e.clientY - rect.top) / state.zoom);

    if (state.activeTool === 'place-device' && state.pendingModel) {
      const newDev = addDevice(state.pendingModel, x, y);
      state.selectedDeviceId = newDev.id;
      setActiveTool('select');
      return;
    }

    if (state.activeTool === 'note') {
      const txt = prompt('أدخل نص الملاحظة (Note):', 'VLAN 10: 192.168.10.0/24');
      if (txt) {
        state.notes.push({ id: `note_${Date.now()}`, x, y, text: txt });
        renderCanvas();
      }
      setActiveTool('select');
      return;
    }

    state.selectedDeviceId = null;
    renderCanvas();
  });

  // ==================== 7. PDU ANIMATION & SIMULATION MODE ====================
  function fireSimplePdu(srcDev, dstDev) {
    const dstIf = dstDev.interfaces.find(i => i.ip) || dstDev.interfaces[0];
    const srcIf = srcDev.interfaces.find(i => i.ip) || srcDev.interfaces[0];
    if (!dstIf || !dstIf.ip) {
      alert(`الجهاز الهدف (${dstDev.displayName}) لا يملك عنوان IP بعد! قم بإعداد IP أولاً.`);
      return;
    }
    if (!srcIf || !srcIf.ip) {
      alert(`الجهاز المصدر (${srcDev.displayName}) لا يملك عنوان IP بعد!`);
      return;
    }

    const res = networkContext.runPing(srcDev, dstIf.ip, true);
    const pduRecord = {
      id: `pdu_${Date.now()}`,
      status: res.success ? 'Successful' : 'Failed',
      srcId: srcDev.id,
      dstId: dstDev.id,
      srcName: srcDev.displayName,
      dstName: dstDev.displayName,
      srcIp: srcIf.ip,
      dstIp: dstIf.ip,
      srcMac: srcIf.mac,
      dstMac: dstIf.mac,
      type: 'ICMP',
      time: '0.002',
      nodePath: res.nodePath && res.nodePath.length ? res.nodePath : [srcDev.id, dstDev.id]
    };
    state.pduList.unshift(pduRecord);
    renderPduTable();
  }

  function triggerPacketAnimation(nodeIds, success, srcIp, dstIp) {
    if (!nodeIds || nodeIds.length < 2) return;

    // Populate Simulation Events list as well
    state.simEvents = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const atDev = getDevice(nodeIds[i]);
      const lastDev = i > 0 ? getDevice(nodeIds[i - 1]) : null;
      if (!atDev) continue;
      state.simEvents.push({
        time: (i * 0.001).toFixed(3),
        lastDevice: lastDev ? lastDev.displayName : '--',
        atDevice: atDev.displayName,
        atDevId: atDev.id,
        type: 'ICMP',
        srcIp,
        dstIp,
        success
      });
    }
    renderSimEvents();

    // Animate visual envelope along nodeIds
    const env = document.createElement('div');
    env.className = 'pt-pdu-envelope icmp';
    env.innerHTML = '✉️';
    env.title = `ICMP Echo: ${srcIp} -> ${dstIp} (اضغط لعرض طبقات OSI السبعة)`;

    const firstDev = getDevice(nodeIds[0]);
    if (!firstDev) return;
    env.style.left = `${firstDev.x}px`;
    env.style.top = `${firstDev.y - 18}px`;
    pduLayer.appendChild(env);

    env.addEventListener('click', (e) => {
      e.stopPropagation();
      openPduInfoModal(state.simEvents[state.simEvents.length - 1] || {
        atDevice: firstDev.displayName,
        lastDevice: '--',
        type: 'ICMP',
        srcIp,
        dstIp,
        success
      });
    });

    let step = 1;
    const timer = setInterval(() => {
      if (step >= nodeIds.length) {
        clearInterval(timer);
        env.innerHTML = success ? '✅' : '❌';
        setTimeout(() => env.remove(), 1400);
        return;
      }
      const nextDev = getDevice(nodeIds[step]);
      if (nextDev) {
        env.style.left = `${nextDev.x}px`;
        env.style.top = `${nextDev.y - 18}px`;
      }
      step++;
    }, 520);
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
      const stClass = p.status === 'Successful' ? 'status-success' : 'status-failed';
      tr.innerHTML = `
        <td><button class="pt-small-btn" title="إعادة إرسال">🔥</button></td>
        <td class="${stClass}">${p.status}</td>
        <td>${p.srcName}</td>
        <td>${p.dstName}</td>
        <td>${p.type}</td>
        <td>${p.time}</td>
      `;
      tr.querySelector('button').addEventListener('click', () => {
        const s = getDevice(p.srcId);
        const d = getDevice(p.dstId);
        if (s && d) fireSimplePdu(s, d);
      });
      tr.addEventListener('dblclick', () => {
        openPduInfoModal({
          atDevice: p.dstName,
          lastDevice: p.srcName,
          type: p.type,
          srcIp: p.srcIp,
          dstIp: p.dstIp,
          success: p.status === 'Successful'
        });
      });
      tbody.appendChild(tr);
    }
  }

  function renderSimEvents() {
    const tbody = document.getElementById('pt-sim-events-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    state.simEvents.forEach((ev, idx) => {
      const tr = document.createElement('tr');
      if (idx === state.simCursor) tr.classList.add('active');
      tr.innerHTML = `
        <td>👁️</td>
        <td>${ev.time}</td>
        <td>${ev.lastDevice}</td>
        <td>${ev.atDevice}</td>
        <td><span style="color:#1d4ed8;font-weight:700">${ev.type}</span></td>
      `;
      tr.addEventListener('click', () => openPduInfoModal(ev));
      tbody.appendChild(tr);
    });
  }

  function openPduInfoModal(ev) {
    const modal = document.getElementById('pt-pdu-info-modal');
    const title = document.getElementById('pt-pdu-modal-title');
    const content = document.getElementById('pt-pdu-modal-content');
    title.textContent = `PDU Information at Device: ${ev.atDevice}`;

    const renderTab = (tab) => {
      document.querySelectorAll('#pt-pdu-info-modal .pt-dtab').forEach(b => {
        b.classList.toggle('active', b.dataset.pdutab === tab);
      });
      if (tab === 'osi') {
        content.innerHTML = `
          <div><strong>At Device:</strong> ${ev.atDevice} &nbsp;|&nbsp; <strong>Source:</strong> ${ev.srcIp || '192.168.1.10'} &nbsp;|&nbsp; <strong>Destination:</strong> ${ev.dstIp || '192.168.1.20'}</div>
          <div class="pt-osi-columns">
            <div class="pt-osi-box">
              <div style="padding:6px;font-weight:700;background:#d1d5db">In Layers</div>
              <div class="pt-osi-layer">Layer 7: Application</div>
              <div class="pt-osi-layer">Layer 6: Presentation</div>
              <div class="pt-osi-layer">Layer 5: Session</div>
              <div class="pt-osi-layer">Layer 4: Transport</div>
              <div class="pt-osi-layer active">Layer 3: IP Header Src. IP: ${ev.srcIp}, Dest. IP: ${ev.dstIp} | ICMP Echo (Type 8)</div>
              <div class="pt-osi-layer active">Layer 2: Ethernet II Header (802.3 / 802.1Q)</div>
              <div class="pt-osi-layer active">Layer 1: FastEthernet0/1</div>
            </div>
            <div class="pt-osi-box">
              <div style="padding:6px;font-weight:700;background:#d1d5db">Out Layers</div>
              <div class="pt-osi-layer">Layer 7: Application</div>
              <div class="pt-osi-layer">Layer 6: Presentation</div>
              <div class="pt-osi-layer">Layer 5: Session</div>
              <div class="pt-osi-layer">Layer 4: Transport</div>
              <div class="pt-osi-layer active">Layer 3: IP Header Src. IP: ${ev.srcIp}, Dest. IP: ${ev.dstIp} | ICMP Echo Reply (Type 0)</div>
              <div class="pt-osi-layer active">Layer 2: Ethernet II Frame Forwarded</div>
              <div class="pt-osi-layer active">Layer 1: Port(s) FastEthernet</div>
            </div>
          </div>
          <div style="margin-top:12px;padding:10px;background:#f8fafc;border:1px solid #cbd5e1;font-size:12px;">
            1. The device receives the frame on ingress interface and verifies the FCS.<br/>
            2. Layer 2 MAC/VLAN table lookup matches destination.<br/>
            3. Layer 3 IPv4 header and ICMP Echo payload (${ev.srcIp} → ${ev.dstIp}) processed (${ev.success ? 'SUCCESS' : 'DROPPED'}).
          </div>
        `;
      } else {
        content.innerHTML = `
          <pre style="background:#f8fafc;border:1px solid #9ca3af;padding:10px;font-family:Consolas,monospace;font-size:12px;">
+-------------------------------------------------------------------+
|                        ETHERNET II HEADER                         |
+----------------------+----------------------+---------------------+
| Destination MAC      | Source MAC           | Type: 0x0800 (IPv4) |
+----------------------+----------------------+---------------------+
|                           IPv4 HEADER                             |
+-------------+--------+-------------+------------------------------+
| Ver: 4      | IHL: 5 | TTL: 128    | Protocol: 1 (ICMP)           |
| Source IP: ${String(ev.srcIp || '192.168.1.10').padEnd(55)}|
| Dest IP:   ${String(ev.dstIp || '192.168.1.20').padEnd(55)}|
+-------------------------------------------------------------------+
|                           ICMP PAYLOAD                            |
| Type: ${tab === 'inbound' ? '8 (Echo Request)' : '0 (Echo Reply)  '} | Code: 0 | Checksum: 0x4d5a | Seq: 1     |
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

  // ==================== 8. COMPONENT BOX (CATEGORIES & MODELS) ====================
  function renderComponentBox() {
    const mainRow = document.getElementById('pt-main-categories');
    const subRow = document.getElementById('pt-sub-categories');
    const catLabel = document.getElementById('pt-category-label');
    const modelsStrip = document.getElementById('pt-models-strip');

    // Update main category buttons
    mainRow.querySelectorAll('.pt-cat-btn').forEach(btn => {
      const catKey = btn.dataset.cat;
      const isAct = catKey === state.selectedCategory;
      btn.classList.toggle('active', isAct);
      const img = btn.querySelector('img');
      if (img && CATALOG[catKey]) {
        img.src = isAct ? CATALOG[catKey].iconOn : CATALOG[catKey].icon;
      }
      btn.onclick = () => {
        state.selectedCategory = catKey;
        state.selectedSubcategory = CATALOG[catKey].subcategories[0].id;
        renderComponentBox();
      };
    });

    const catObj = CATALOG[state.selectedCategory];
    subRow.innerHTML = '';
    for (const sub of catObj.subcategories) {
      const isSubAct = sub.id === state.selectedSubcategory;
      const b = document.createElement('button');
      b.className = `pt-subcat-btn${isSubAct ? ' active' : ''}`;
      b.title = sub.label;
      b.innerHTML = `<img src="${isSubAct ? sub.iconOn : sub.icon}" alt="${sub.label}" />`;
      b.onclick = () => {
        state.selectedSubcategory = sub.id;
        renderComponentBox();
      };
      subRow.appendChild(b);
    }

    const activeSub = catObj.subcategories.find(s => s.id === state.selectedSubcategory) || catObj.subcategories[0];
    catLabel.textContent = `[${catObj.label}] - ${activeSub.label}`;

    modelsStrip.innerHTML = '';
    for (const m of activeSub.models) {
      const item = document.createElement('div');
      const isSelectedModel =
        (state.activeTool === 'place-device' && state.pendingModel && state.pendingModel.model === m.model) ||
        (state.activeTool === 'connect-cable' && m.isCable && state.pendingCableType === m.cableType);
      item.className = `pt-model-item${isSelectedModel ? ' active' : ''}`;
      item.innerHTML = `
        <img src="${m.boxIcon}" alt="${m.model}" />
        <span>${m.isCable ? m.cableType.toUpperCase() : m.model}</span>
      `;
      item.title = m.model;
      item.addEventListener('click', () => {
        document.getElementById('pt-selected-model-label').textContent = m.model;
        if (m.isCable) {
          state.pendingCableType = m.cableType;
          state.cableSource = null;
          setActiveTool('connect-cable');
          showActionBanner(`🔌 كابل (${m.model}) — اضغط على الجهاز الأول ثم الجهاز الثاني`);
        } else {
          state.pendingModel = m;
          setActiveTool('place-device');
          showActionBanner(`➕ وضع جهاز (${m.model}) — اضغط في أي مكان على المساحة البيضاء لإضافته`);
        }
        renderComponentBox();
      });
      modelsStrip.appendChild(item);
    }
  }

  // ==================== 9. DEVICE CONFIGURATION WINDOW ====================
  function openDeviceModal(devId, forcedTab) {
    const dev = getDevice(devId);
    if (!dev) return;
    state.openDeviceId = devId;
    state.consoleRedirectDevId = null;

    const modal = document.getElementById('pt-device-modal');
    const titleEl = document.getElementById('pt-dev-window-title');
    titleEl.textContent = `${dev.displayName} (${dev.model})`;

    const isNetDevice = ['switch', 'l3switch', 'router'].includes(dev.type);
    const isEndDevice = ['pc', 'laptop', 'server'].includes(dev.type);
    const isServer = dev.type === 'server';

    document.getElementById('tab-btn-cli').classList.toggle('hidden', !isNetDevice);
    document.getElementById('tab-btn-desktop').classList.toggle('hidden', !isEndDevice);
    document.getElementById('tab-btn-services').classList.toggle('hidden', !isServer);

    const defaultTab = forcedTab || (isNetDevice ? 'cli' : 'desktop');
    switchDeviceTab(defaultTab);
    modal.classList.remove('hidden');
  }

  function switchDeviceTab(tabName) {
    const dev = getDevice(state.openDeviceId);
    if (!dev) return;

    document.querySelectorAll('#pt-dev-tabs .pt-dtab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.devtab === tabName);
    });

    ['physical', 'config', 'cli', 'desktop', 'services', 'attributes'].forEach(t => {
      const pane = document.getElementById(`devtab-${t}`);
      if (pane) pane.classList.toggle('hidden', t !== tabName);
    });

    if (tabName === 'physical') renderDevicePhysicalTab(dev);
    else if (tabName === 'config') renderDeviceConfigTab(dev);
    else if (tabName === 'cli') renderDeviceCliTab(getCliTargetDevice());
    else if (tabName === 'desktop') {
      document.getElementById('pt-desk-subapp').classList.add('hidden');
    } else if (tabName === 'services') renderDeviceServicesTab(dev);
    else if (tabName === 'attributes') renderDeviceAttributesTab(dev);
  }

  function getCliTargetDevice() {
    if (state.consoleRedirectDevId) {
      return getDevice(state.consoleRedirectDevId) || getDevice(state.openDeviceId);
    }
    return getDevice(state.openDeviceId);
  }

  // Physical Tab Renderer
  function renderDevicePhysicalTab(dev) {
    const img = document.getElementById('pt-phys-chassis-img');
    img.src = dev.chassisImg || dev.canvasIcon;

    const pwrBtn = document.getElementById('btn-power-toggle');
    pwrBtn.className = `pt-power-btn ${dev.poweredOn ? 'on' : 'off'}`;
    pwrBtn.textContent = dev.poweredOn ? '⚡ Power: ON (اضغط لإيقاف التشغيل)' : '⭕ Power: OFF (اضغط للتشغيل)';
    pwrBtn.onclick = () => {
      dev.poweredOn = !dev.poweredOn;
      networkContext.refreshLinkStates();
      renderDevicePhysicalTab(dev);
    };

    const summary = document.getElementById('pt-phys-ports-summary');
    summary.innerHTML = '';
    for (const iface of dev.interfaces) {
      if (iface.type === 'svi' || iface.type === 'subif') continue;
      const badge = document.createElement('span');
      badge.className = `pt-phys-port-led${iface.lineUp && iface.adminUp ? ' up' : ''}`;
      badge.textContent = `${PTEngine.shortIfName(iface.name)} ${iface.lineUp && iface.adminUp ? '●' : '○'}`;
      summary.appendChild(badge);
    }
  }

  // Config Tab Renderer (With Live Equivalent IOS Commands!)
  function renderDeviceConfigTab(dev) {
    const sidebar = document.getElementById('pt-config-sidebar');
    const main = document.getElementById('pt-config-main');
    const equivBox = document.getElementById('pt-equiv-ios-box');
    equivBox.textContent = dev.cli.equivBuffer || '';

    const appendEquiv = (cmds) => {
      for (const cmd of cmds) {
        const prompt = PTEngine.getPrompt(dev);
        const out = PTEngine.executeIosCommand(dev, cmd, networkContext);
        dev.cli.equivBuffer += `\n${prompt}${cmd}${out ? '\n' + out : ''}`;
        dev.cli.outputBuffer += `\n${prompt}${cmd}${out ? '\n' + out : ''}`;
      }
      equivBox.textContent = dev.cli.equivBuffer;
      equivBox.scrollTop = equivBox.scrollHeight;
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
      main.innerHTML = `
        <div class="pt-cfg-title">Global Settings</div>
        <div class="pt-cfg-row">
          <label>Display Name</label>
          <input type="text" id="cfg-disp-name" class="pt-cfg-input" value="${dev.displayName}" />
        </div>
        ${isIos ? `
        <div class="pt-cfg-row">
          <label>Hostname</label>
          <input type="text" id="cfg-hostname" class="pt-cfg-input" value="${dev.hostname}" />
        </div>
        <div class="pt-cfg-row">
          <label>NVRAM</label>
          <div style="display:flex;gap:8px;flex:1">
            <button id="cfg-nvram-erase" class="pt-small-btn">Erase</button>
            <button id="cfg-nvram-save" class="pt-small-btn">Save</button>
          </div>
        </div>
        ` : `
        <div class="pt-cfg-row">
          <label>Default Gateway</label>
          <input type="text" id="cfg-pc-gw" class="pt-cfg-input" value="${dev.defaultGateway || ''}" placeholder="192.168.1.1" />
        </div>
        <div class="pt-cfg-row">
          <label>DNS Server</label>
          <input type="text" id="cfg-pc-dns" class="pt-cfg-input" value="${dev.dnsServer || ''}" placeholder="8.8.8.8" />
        </div>
        `}
      `;

      document.getElementById('cfg-disp-name').onchange = (e) => {
        dev.displayName = e.target.value.trim() || dev.displayName;
        document.getElementById('pt-dev-window-title').textContent = `${dev.displayName} (${dev.model})`;
        renderCanvas();
      };
      if (isIos) {
        document.getElementById('cfg-hostname').onchange = (e) => {
          const h = e.target.value.trim();
          if (h) {
            dev.cli.mode = 'priv';
            appendEquiv(['configure terminal', `hostname ${h}`]);
          }
        };
        document.getElementById('cfg-nvram-save').onclick = () => {
          dev.cli.mode = 'priv';
          appendEquiv(['write memory']);
        };
        document.getElementById('cfg-nvram-erase').onclick = () => {
          dev.cli.mode = 'priv';
          appendEquiv(['erase startup-config']);
        };
      } else {
        document.getElementById('cfg-pc-gw').onchange = (e) => { dev.defaultGateway = e.target.value.trim(); };
        document.getElementById('cfg-pc-dns').onchange = (e) => { dev.dnsServer = e.target.value.trim(); };
      }
    };

    btnSettings.onclick = showGlobalSettings;

    if (btnVlanDb) {
      btnVlanDb.onclick = () => {
        setActiveBtn(btnVlanDb);
        const renderVlanPanel = () => {
          const rows = Object.values(dev.vlans).sort((a, b) => a.id - b.id)
            .map(v => `<tr data-vid="${v.id}"><td>${v.id}</td><td>${v.name}</td></tr>`).join('');
          main.innerHTML = `
            <div class="pt-cfg-title">VLAN Configuration</div>
            <div class="pt-cfg-row"><label>VLAN Number</label><input type="number" id="cfg-vlan-num" class="pt-cfg-input" placeholder="10" /></div>
            <div class="pt-cfg-row"><label>VLAN Name</label><input type="text" id="cfg-vlan-name" class="pt-cfg-input" placeholder="Sales" /></div>
            <div style="display:flex;justify-content:center;gap:12px;margin:10px 0;">
              <button id="cfg-vlan-add" class="pt-small-btn" style="padding:4px 18px;font-weight:700;">Add</button>
            </div>
            <table class="pt-attr-table" style="background:#fff;margin-top:8px;">
              <thead><tr><th>VLAN No</th><th>VLAN Name</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          `;
          document.getElementById('cfg-vlan-add').onclick = () => {
            const num = parseInt(document.getElementById('cfg-vlan-num').value, 10);
            const name = document.getElementById('cfg-vlan-name').value.trim() || `VLAN${String(num).padStart(4, '0')}`;
            if (num >= 1 && num <= 4094) {
              dev.cli.mode = 'priv';
              appendEquiv(['configure terminal', `vlan ${num}`, `name ${name}`, 'exit']);
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
          const listHtml = (dev.staticRoutes || []).map(r =>
            `<li>${r.network} / ${r.mask} via ${r.nextHop}</li>`
          ).join('');
          main.innerHTML = `
            <div class="pt-cfg-title">Static Routes</div>
            <div class="pt-cfg-row"><label>Network</label><input id="st-net" class="pt-cfg-input" placeholder="192.168.2.0" /></div>
            <div class="pt-cfg-row"><label>Mask</label><input id="st-mask" class="pt-cfg-input" placeholder="255.255.255.0" /></div>
            <div class="pt-cfg-row"><label>Next Hop</label><input id="st-nh" class="pt-cfg-input" placeholder="10.0.0.2" /></div>
            <button id="st-add-btn" class="pt-small-btn" style="padding:4px 16px;font-weight:700;">Add</button>
            <ul style="margin-top:12px;padding-left:18px;background:#fff;border:1px solid #9ca3af;padding:8px;">${listHtml || '<li>No static routes</li>'}</ul>
          `;
          document.getElementById('st-add-btn').onclick = () => {
            const net = document.getElementById('st-net').value.trim();
            const mask = document.getElementById('st-mask').value.trim();
            const nh = document.getElementById('st-nh').value.trim();
            if (net && mask && nh) {
              dev.cli.mode = 'priv';
              appendEquiv(['configure terminal', `ip route ${net} ${mask} ${nh}`]);
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
          const nets = (dev.rip.networks || []).map(n => `<li>${n}</li>`).join('');
          main.innerHTML = `
            <div class="pt-cfg-title">RIP Routing</div>
            <div class="pt-cfg-row"><label>Network</label><input id="rip-net" class="pt-cfg-input" placeholder="192.168.1.0" /></div>
            <button id="rip-add-btn" class="pt-small-btn" style="padding:4px 16px;font-weight:700;">Add</button>
            <ul style="margin-top:12px;background:#fff;border:1px solid #9ca3af;padding:8px 18px;">${nets || '<li>No networks added</li>'}</ul>
          `;
          document.getElementById('rip-add-btn').onclick = () => {
            const net = document.getElementById('rip-net').value.trim();
            if (net) {
              dev.cli.mode = 'priv';
              appendEquiv(['configure terminal', 'router rip', 'version 2', `network ${net}`]);
              renderRip();
            }
          };
        };
        renderRip();
      };
    }

    for (const iface of dev.interfaces) {
      if (iface.type === 'console' || iface.type === 'rs232') continue;
      const b = document.createElement('button');
      b.className = 'pt-cfg-nav-btn';
      b.textContent = iface.name;
      b.onclick = () => {
        setActiveBtn(b);
        const isSwPort = iface.switchport;
        const vlanOptions = Object.values(dev.vlans).map(v =>
          `<option value="${v.id}" ${iface.accessVlan === v.id ? 'selected' : ''}>${v.id} (${v.name})</option>`
        ).join('');

        main.innerHTML = `
          <div class="pt-cfg-title">${iface.name}</div>
          <div class="pt-cfg-row">
            <label>Port Status</label>
            <label style="min-width:auto"><input type="checkbox" id="cfg-if-on" ${iface.adminUp ? 'checked' : ''} /> On</label>
          </div>
          ${isSwPort ? `
          <div class="pt-cfg-row">
            <label>Port Mode</label>
            <select id="cfg-if-mode" class="pt-cfg-input">
              <option value="access" ${iface.mode === 'access' ? 'selected' : ''}>Access</option>
              <option value="trunk" ${iface.mode === 'trunk' ? 'selected' : ''}>Trunk</option>
            </select>
          </div>
          <div class="pt-cfg-row">
            <label>VLAN</label>
            <select id="cfg-if-vlan" class="pt-cfg-input">${vlanOptions}</select>
          </div>
          ` : `
          <div class="pt-cfg-row">
            <label>IPv4 Address</label>
            <input type="text" id="cfg-if-ip" class="pt-cfg-input" value="${iface.ip || ''}" placeholder="192.168.1.1" />
          </div>
          <div class="pt-cfg-row">
            <label>Subnet Mask</label>
            <input type="text" id="cfg-if-mask" class="pt-cfg-input" value="${iface.mask || ''}" placeholder="255.255.255.0" />
          </div>
          `}
        `;

        document.getElementById('cfg-if-on').onchange = (e) => {
          if (['switch', 'l3switch', 'router'].includes(dev.type)) {
            dev.cli.mode = 'priv';
            appendEquiv(['configure terminal', `interface ${iface.name}`, e.target.checked ? 'no shutdown' : 'shutdown']);
          } else {
            iface.adminUp = e.target.checked;
            networkContext.refreshLinkStates();
          }
        };

        if (isSwPort) {
          document.getElementById('cfg-if-mode').onchange = (e) => {
            dev.cli.mode = 'priv';
            appendEquiv(['configure terminal', `interface ${iface.name}`, `switchport mode ${e.target.value}`]);
          };
          document.getElementById('cfg-if-vlan').onchange = (e) => {
            dev.cli.mode = 'priv';
            appendEquiv(['configure terminal', `interface ${iface.name}`, `switchport access vlan ${e.target.value}`]);
          };
        } else {
          const applyIp = () => {
            const ip = document.getElementById('cfg-if-ip').value.trim();
            let mask = document.getElementById('cfg-if-mask').value.trim();
            if (ip && !mask) {
              mask = ip.startsWith('10.') ? '255.0.0.0' : '255.255.255.0';
              document.getElementById('cfg-if-mask').value = mask;
            }
            if (ip && mask) {
              if (['switch', 'l3switch', 'router'].includes(dev.type)) {
                dev.cli.mode = 'priv';
                appendEquiv(['configure terminal', `interface ${iface.name}`, `ip address ${ip} ${mask}`]);
              } else {
                iface.ip = ip;
                iface.mask = mask;
                renderCanvas();
              }
            }
          };
          document.getElementById('cfg-if-ip').onchange = applyIp;
          document.getElementById('cfg-if-mask').onchange = applyIp;
        }
      };
      sidebar.appendChild(b);
    }

    showGlobalSettings();
  }

  // ==================== 10. CLI TAB CONTROLLER ====================
  const cliScreen = document.getElementById('pt-cli-screen');
  const cliOutput = document.getElementById('pt-cli-output');
  const cliPrompt = document.getElementById('pt-cli-prompt');
  const cliInput = document.getElementById('pt-cli-input');

  function renderDeviceCliTab(dev) {
    if (!dev) return;
    cliScreen.classList.toggle('dark-cli', state.darkCli);
    cliOutput.textContent = dev.cli.outputBuffer;
    cliPrompt.textContent = PTEngine.getPrompt(dev);
    cliScreen.scrollTop = cliScreen.scrollHeight;
    setTimeout(() => cliInput.focus(), 50);
  }

  function submitCliLine(rawLine) {
    const dev = getCliTargetDevice();
    if (!dev) return;
    const promptBefore = PTEngine.getPrompt(dev);
    const out = PTEngine.executeIosCommand(dev, rawLine, networkContext);
    dev.cli.outputBuffer += `\n${promptBefore}${rawLine}${out ? '\n' + out : ''}`;
    cliOutput.textContent = dev.cli.outputBuffer;
    cliPrompt.textContent = PTEngine.getPrompt(dev);
    cliInput.value = '';
    cliScreen.scrollTop = cliScreen.scrollHeight;
    document.getElementById('pt-dev-window-title').textContent = `${dev.displayName} (${dev.model})`;
    renderCanvas();
  }

  cliScreen.addEventListener('click', () => cliInput.focus());

  cliInput.addEventListener('keydown', (e) => {
    const dev = getCliTargetDevice();
    if (!dev) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      submitCliLine(cliInput.value);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      cliInput.value = PTEngine.autocompleteIosCommand(dev, cliInput.value);
      return;
    }

    if (e.key === '?') {
      e.preventDefault();
      submitCliLine(cliInput.value + '?');
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (dev.cli.history.length > 0) {
        dev.cli.historyIdx = Math.max(0, dev.cli.historyIdx - 1);
        cliInput.value = dev.cli.history[dev.cli.historyIdx] || '';
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (dev.cli.history.length > 0) {
        dev.cli.historyIdx = Math.min(dev.cli.history.length, dev.cli.historyIdx + 1);
        cliInput.value = dev.cli.history[dev.cli.historyIdx] || '';
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      submitCliLine('end');
    }
  });

  // Mobile Special Keys & Quick Command Chips
  document.querySelectorAll('[data-clikey]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dev = getCliTargetDevice();
      if (!dev) return;
      const k = btn.dataset.clikey;
      if (k === 'TAB') {
        cliInput.value = PTEngine.autocompleteIosCommand(dev, cliInput.value);
      } else if (k === '?') {
        submitCliLine(cliInput.value + '?');
      } else if (k === 'ENTER') {
        submitCliLine(cliInput.value);
      } else if (k === 'CTRL_Z') {
        submitCliLine('end');
      } else if (k === 'UP') {
        if (dev.cli.history.length > 0) {
          dev.cli.historyIdx = Math.max(0, dev.cli.historyIdx - 1);
          cliInput.value = dev.cli.history[dev.cli.historyIdx] || '';
        }
      } else if (k === 'DOWN') {
        if (dev.cli.history.length > 0) {
          dev.cli.historyIdx = Math.min(dev.cli.history.length, dev.cli.historyIdx + 1);
          cliInput.value = dev.cli.history[dev.cli.historyIdx] || '';
        }
      }
      cliInput.focus();
    });
  });

  document.querySelectorAll('.pt-cmd-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.dataset.clicmd) {
        submitCliLine(chip.dataset.clicmd);
      } else if (chip.dataset.inpcmd) {
        cliInput.value = chip.dataset.inpcmd;
        cliInput.focus();
      }
    });
  });

  document.getElementById('btn-cli-theme').addEventListener('click', () => {
    state.darkCli = !state.darkCli;
    cliScreen.classList.toggle('dark-cli', state.darkCli);
  });

  document.getElementById('btn-cli-copy').addEventListener('click', () => {
    const dev = getCliTargetDevice();
    if (dev && navigator.clipboard) {
      navigator.clipboard.writeText(dev.cli.outputBuffer);
    }
  });

  document.getElementById('btn-cli-paste').addEventListener('click', async () => {
    if (navigator.clipboard) {
      const text = await navigator.clipboard.readText();
      if (text) {
        for (const line of text.split(/\r?\n/)) {
          if (line.trim()) submitCliLine(line);
        }
      }
    }
  });

  // ==================== 11. DESKTOP TAB APPLICATIONS (PC / Laptop / Server) ====================
  document.querySelectorAll('.pt-desk-card').forEach(card => {
    card.addEventListener('click', () => {
      const dev = getDevice(state.openDeviceId);
      if (!dev) return;
      openDesktopUtility(dev, card.dataset.deskapp);
    });
  });

  document.getElementById('btn-close-deskapp').addEventListener('click', () => {
    document.getElementById('pt-desk-subapp').classList.add('hidden');
  });

  function openDesktopUtility(dev, appKey) {
    const subapp = document.getElementById('pt-desk-subapp');
    const title = document.getElementById('pt-desk-subtitle');
    const body = document.getElementById('pt-desk-subbody');
    const eth = dev.interfaces.find(i => i.type === 'ethernet') || dev.interfaces[0];

    subapp.classList.remove('hidden');

    // 1. IP Configuration (Exact match to config_PCs_3.jpg)
    if (appKey === 'ipconfig') {
      title.textContent = 'IP Configuration';
      body.innerHTML = `
        <div class="pt-cfg-row">
          <label>Interface</label>
          <select class="pt-cfg-input"><option>${eth.name}</option></select>
        </div>
        <fieldset style="border:1px solid #9ca3af;padding:12px;margin-bottom:12px;">
          <legend style="padding:0 6px;font-weight:600;">IP Configuration</legend>
          <div style="display:flex;gap:30px;margin-bottom:12px;">
            <label><input type="radio" name="ipmode" value="dhcp" ${dev.ipMode === 'dhcp' ? 'checked' : ''} /> DHCP</label>
            <label><input type="radio" name="ipmode" value="static" ${dev.ipMode !== 'dhcp' ? 'checked' : ''} /> Static</label>
          </div>
          <div class="pt-cfg-row">
            <label>IPv4 Address</label>
            <input type="text" id="desk-ip" class="pt-cfg-input" value="${eth.ip || ''}" placeholder="192.168.1.10" />
          </div>
          <div class="pt-cfg-row">
            <label>Subnet Mask</label>
            <input type="text" id="desk-mask" class="pt-cfg-input" value="${eth.mask || ''}" placeholder="255.255.255.0" />
          </div>
          <div class="pt-cfg-row">
            <label>Default Gateway</label>
            <input type="text" id="desk-gw" class="pt-cfg-input" value="${dev.defaultGateway || ''}" placeholder="192.168.1.1" />
          </div>
          <div class="pt-cfg-row">
            <label>DNS Server</label>
            <input type="text" id="desk-dns" class="pt-cfg-input" value="${dev.dnsServer || '0.0.0.0'}" />
          </div>
          <div id="desk-dhcp-msg" style="font-size:12px;color:#15803d;font-weight:600;margin-top:6px;"></div>
        </fieldset>
        <fieldset style="border:1px solid #9ca3af;padding:12px;">
          <legend style="padding:0 6px;font-weight:600;">IPv6 Configuration</legend>
          <div class="pt-cfg-row">
            <label>Link Local Address</label>
            <input type="text" class="pt-cfg-input" value="${dev.ipv6LinkLocal}" readonly />
          </div>
        </fieldset>
      `;

      const ipIn = document.getElementById('desk-ip');
      const maskIn = document.getElementById('desk-mask');
      const gwIn = document.getElementById('desk-gw');
      const dnsIn = document.getElementById('desk-dns');
      const msgEl = document.getElementById('desk-dhcp-msg');

      const saveStatic = () => {
        eth.ip = ipIn.value.trim();
        if (eth.ip && !maskIn.value.trim()) {
          maskIn.value = eth.ip.startsWith('10.') ? '255.0.0.0' : '255.255.255.0';
        }
        eth.mask = maskIn.value.trim();
        dev.defaultGateway = gwIn.value.trim();
        dev.dnsServer = dnsIn.value.trim();
        renderCanvas();
      };

      ipIn.onchange = saveStatic;
      maskIn.onchange = saveStatic;
      gwIn.onchange = saveStatic;
      dnsIn.onchange = saveStatic;

      body.querySelectorAll('input[name="ipmode"]').forEach(r => {
        r.onchange = () => {
          dev.ipMode = r.value;
          if (r.value === 'dhcp') {
            msgEl.textContent = 'Requesting IP address...';
            const lease = networkContext.requestDhcp(dev);
            if (lease) {
              ipIn.value = eth.ip;
              maskIn.value = eth.mask;
              gwIn.value = dev.defaultGateway;
              dnsIn.value = dev.dnsServer;
              msgEl.style.color = '#15803d';
              msgEl.textContent = 'DHCP request successful.';
            } else {
              eth.ip = `169.254.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
              eth.mask = '255.255.0.0';
              ipIn.value = eth.ip;
              maskIn.value = eth.mask;
              msgEl.style.color = '#d97706';
              msgEl.textContent = 'DHCP failed. APIPA is being used.';
            }
            renderCanvas();
          }
        };
      });
      return;
    }

    // 2. Command Prompt (Exact match to config_PCs_6.jpg)
    if (appKey === 'cmd') {
      title.textContent = 'Command Prompt';
      body.style.padding = '0';
      body.innerHTML = `
        <div id="pc-cmd-screen" class="pt-pc-cmd-screen">
          <pre id="pc-cmd-output" style="white-space:pre-wrap;font-family:inherit;">${dev.cmd.outputBuffer}</pre>
          <div style="display:flex;align-items:center;margin-top:2px;">
            <span style="font-weight:700;">C:\\&gt;</span>
            <input type="text" id="pc-cmd-input" style="flex:1;background:transparent;border:none;outline:none;color:#fff;font-family:inherit;font-size:inherit;margin-left:4px;" autocomplete="off" placeholder="اكتب ipconfig أو ping ..." />
          </div>
        </div>
        <div class="pt-mobile-cli-assist" style="margin:0;border-radius:0;">
          <div class="pt-cli-chips-row">
            <button class="pt-cmd-chip" data-pccmd="ipconfig">ipconfig</button>
            <button class="pt-cmd-chip" data-pccmd="ipconfig /all">ipconfig /all</button>
            <button class="pt-cmd-chip" data-pccmd="ipconfig /renew">ipconfig /renew</button>
            <button class="pt-cmd-chip" data-pcinpcmd="ping 192.168.1.1">ping 192.168.1.1</button>
            <button class="pt-cmd-chip" data-pcinpcmd="ping 192.168.10.1">ping 192.168.10.1</button>
            <button class="pt-cmd-chip" data-pccmd="arp -a">arp -a</button>
            <button class="pt-cmd-chip" data-pcinpcmd="tracert ">tracert ...</button>
            <button class="pt-cmd-chip" data-pccmd="help">help (?)</button>
            <button class="pt-cmd-chip" data-pccmd="cls">cls</button>
          </div>
        </div>
      `;

      const outPre = document.getElementById('pc-cmd-output');
      const cmdInp = document.getElementById('pc-cmd-input');
      const cmdScreen = document.getElementById('pc-cmd-screen');

      const runPcLine = (line) => {
        const res = PTEngine.executePcCommand(dev, line, networkContext);
        if (res === '__CLEAR__') {
          dev.cmd.outputBuffer = 'Cisco Packet Tracer PC Command Line 1.0';
        } else {
          dev.cmd.outputBuffer += `\nC:\\>${line}${res ? '\n' + res : ''}`;
        }
        outPre.textContent = dev.cmd.outputBuffer;
        cmdInp.value = '';
        cmdScreen.scrollTop = cmdScreen.scrollHeight;
        renderCanvas();
      };

      cmdInp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runPcLine(cmdInp.value);
        }
      });

      body.querySelectorAll('[data-pccmd]').forEach(b => {
        b.onclick = () => runPcLine(b.dataset.pccmd);
      });
      body.querySelectorAll('[data-pcinpcmd]').forEach(b => {
        b.onclick = () => { cmdInp.value = b.dataset.pcinpcmd; cmdInp.focus(); };
      });

      setTimeout(() => cmdInp.focus(), 50);
      return;
    }

    // 3. Terminal (RS-232 Console Connection to Switch/Router)
    if (appKey === 'terminal') {
      title.textContent = 'Terminal — Port Configuration';
      body.style.padding = '14px';

      // Find connected console device or all switches/routers
      let connectedConsoleDev = null;
      for (const link of state.links) {
        if (link.cableType === 'console') {
          if (link.devA === dev.id) connectedConsoleDev = getDevice(link.devB);
          else if (link.devB === dev.id) connectedConsoleDev = getDevice(link.devA);
        }
      }
      const iosDevices = state.devices.filter(d => ['switch', 'l3switch', 'router'].includes(d.type));
      const targetOptions = iosDevices.map(d =>
        `<option value="${d.id}" ${connectedConsoleDev && connectedConsoleDev.id === d.id ? 'selected' : ''}>${d.displayName} (${d.model})</option>`
      ).join('');

      body.innerHTML = `
        <fieldset style="border:1px solid #9ca3af;padding:12px;">
          <legend style="padding:0 6px;font-weight:700;">Serial Port Configuration (RS-232 Console)</legend>
          <div class="pt-cfg-row"><label>Target Console Device</label><select id="term-target-dev" class="pt-cfg-input">${targetOptions}</select></div>
          <div class="pt-cfg-row"><label>Bits per second</label><select class="pt-cfg-input"><option>9600</option></select></div>
          <div class="pt-cfg-row"><label>Data bits</label><select class="pt-cfg-input"><option>8</option></select></div>
          <div class="pt-cfg-row"><label>Parity</label><select class="pt-cfg-input"><option>None</option></select></div>
          <div class="pt-cfg-row"><label>Stop bits</label><select class="pt-cfg-input"><option>1</option></select></div>
          <div class="pt-cfg-row"><label>Flow control</label><select class="pt-cfg-input"><option>None</option></select></div>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
            <button id="btn-term-connect" class="pt-small-btn" style="padding:5px 22px;font-weight:700;background:#dbeafe;border-color:#2563eb;">OK (فتح شاشة أوامر الجهاز)</button>
          </div>
        </fieldset>
      `;

      document.getElementById('btn-term-connect').onclick = () => {
        const selId = document.getElementById('term-target-dev').value;
        if (selId) {
          openDeviceModal(selId, 'cli');
        }
      };
      return;
    }

    // 4. Web Browser
    if (appKey === 'browser') {
      title.textContent = 'Web Browser';
      body.style.padding = '12px';
      const srv = state.devices.find(d => d.type === 'server');
      const defaultUrl = srv && srv.interfaces[0].ip ? `http://${srv.interfaces[0].ip}` : 'http://www.cisco.com';
      body.innerHTML = `
        <div style="display:flex;gap:6px;margin-bottom:10px;">
          <span style="align-self:center;font-weight:600;">URL</span>
          <input type="text" id="web-url-input" class="pt-cfg-input" value="${defaultUrl}" />
          <button id="web-go-btn" class="pt-small-btn" style="padding:4px 16px;font-weight:700;">Go</button>
        </div>
        <div id="web-viewport" style="flex:1;background:#ffffff;border:1px solid #9ca3af;padding:18px;">
          <h2 style="color:#0284c7;margin-bottom:8px;">Cisco Packet Tracer — Welcome to HTTP Server</h2>
          <hr style="margin-bottom:12px;"/>
          <p>Welcome to Cisco Packet Tracer. Opening doors to new opportunities. Mind Wide Open.</p>
          <p style="margin-top:10px;">Quick Links: <a href="#" style="color:#0284c7;">Hello World</a> | <a href="#" style="color:#0284c7;">Copyrights</a> | <a href="#" style="color:#0284c7;">Image page</a></p>
        </div>
      `;
      document.getElementById('web-go-btn').onclick = () => {
        const u = document.getElementById('web-url-input').value.trim();
        document.getElementById('web-viewport').innerHTML = `
          <h2 style="color:#0284c7;margin-bottom:8px;">Cisco Packet Tracer HTTP Server (${u})</h2>
          <hr style="margin-bottom:12px;"/>
          <p><strong>Status:</strong> 200 OK — Connected over simulated TCP/IP Port 80.</p>
          <p style="margin-top:8px;">Welcome to Cisco Packet Tracer 8.2.2 Web Server.</p>
        `;
      };
      return;
    }

    title.textContent = appKey.toUpperCase();
    body.style.padding = '16px';
    body.innerHTML = `<p>الأداة <strong>${appKey.toUpperCase()}</strong> جاهزة وتعمل ضمن بيئة المحاكاة.</p>`;
  }

  // Services Tab (For Server-PT)
  function renderDeviceServicesTab(dev) {
    const sidebar = document.getElementById('pt-services-sidebar');
    const main = document.getElementById('pt-services-main');
    sidebar.innerHTML = `
      <div class="pt-cfg-group-header">SERVICES</div>
      <button class="pt-cfg-nav-btn active" data-srv="http">HTTP</button>
      <button class="pt-cfg-nav-btn" data-srv="dhcp">DHCP</button>
      <button class="pt-cfg-nav-btn" data-srv="dns">DNS</button>
    `;

    const showSrv = (key) => {
      sidebar.querySelectorAll('.pt-cfg-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.srv === key));
      if (key === 'dhcp') {
        const sp = dev.services.dhcpPool;
        main.innerHTML = `
          <div class="pt-cfg-title">DHCP Service</div>
          <div class="pt-cfg-row"><label>Service</label><label><input type="checkbox" id="srv-dhcp-on" ${dev.services.dhcp ? 'checked' : ''} /> On</label></div>
          <div class="pt-cfg-row"><label>Default Gateway</label><input id="srv-dhcp-gw" class="pt-cfg-input" value="${sp.gateway}" /></div>
          <div class="pt-cfg-row"><label>DNS Server</label><input id="srv-dhcp-dns" class="pt-cfg-input" value="${sp.dns}" /></div>
          <div class="pt-cfg-row"><label>Start IP Address</label><input id="srv-dhcp-start" class="pt-cfg-input" value="${sp.startIp}" /></div>
          <div class="pt-cfg-row"><label>Subnet Mask</label><input id="srv-dhcp-mask" class="pt-cfg-input" value="${sp.mask}" /></div>
          <button id="srv-dhcp-save" class="pt-small-btn" style="padding:4px 16px;font-weight:700;">Save</button>
        `;
        document.getElementById('srv-dhcp-save').onclick = () => {
          dev.services.dhcp = document.getElementById('srv-dhcp-on').checked;
          sp.gateway = document.getElementById('srv-dhcp-gw').value.trim();
          sp.dns = document.getElementById('srv-dhcp-dns').value.trim();
          sp.startIp = document.getElementById('srv-dhcp-start').value.trim();
          sp.mask = document.getElementById('srv-dhcp-mask').value.trim();
        };
      } else {
        main.innerHTML = `
          <div class="pt-cfg-title">${key.toUpperCase()} Service</div>
          <div class="pt-cfg-row"><label>HTTP Service</label><label><input type="checkbox" checked /> On</label></div>
          <div class="pt-cfg-row"><label>HTTPS Service</label><label><input type="checkbox" checked /> On</label></div>
        `;
      }
    };

    sidebar.querySelectorAll('.pt-cfg-nav-btn').forEach(b => {
      b.onclick = () => showSrv(b.dataset.srv);
    });
    showSrv('dhcp');
  }

  function renderDeviceAttributesTab(dev) {
    const tbody = document.getElementById('pt-attr-tbody');
    tbody.innerHTML = `
      <tr><td>Device Model</td><td>Cisco ${dev.model}</td></tr>
      <tr><td>Display Name</td><td>${dev.displayName}</td></tr>
      <tr><td>Hostname</td><td>${dev.hostname}</td></tr>
      <tr><td>Base MAC Address</td><td>${dev.baseMac}</td></tr>
      <tr><td>Power Consumption</td><td>40 Watts</td></tr>
      <tr><td>MTBF</td><td>329830 Hours</td></tr>
    `;
  }

  // Inspect Modal (MAC Table / ARP Table / Routing Table)
  function openInspectModal(dev) {
    const modal = document.getElementById('pt-inspect-modal');
    const title = document.getElementById('pt-inspect-title');
    const body = document.getElementById('pt-inspect-body');
    title.textContent = `Inspect Tables — ${dev.displayName} (${dev.model})`;

    const macOut = PTEngine.executeIosCommand(dev, 'show mac address-table', networkContext);
    const arpOut = PTEngine.executeIosCommand(dev, 'show ip arp', networkContext);
    const routeOut = PTEngine.executeIosCommand(dev, 'show ip route', networkContext);

    body.innerHTML = `
      <h4 style="margin-bottom:4px;color:#0284c7;">Port / IP Summary</h4>
      <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px;margin-bottom:10px;font-size:11.5px;">${PTEngine.executeIosCommand(dev, 'show ip interface brief', networkContext)}</pre>
      ${(dev.type === 'switch' || dev.type === 'l3switch') ? `
      <h4 style="margin-bottom:4px;color:#0284c7;">MAC Address Table &amp; VLANs</h4>
      <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px;margin-bottom:10px;font-size:11.5px;">${macOut}\n${PTEngine.executeIosCommand(dev, 'show vlan brief', networkContext)}</pre>
      ` : ''}
      ${(dev.type === 'router' || dev.type === 'l3switch') ? `
      <h4 style="margin-bottom:4px;color:#0284c7;">Routing Table</h4>
      <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px;margin-bottom:10px;font-size:11.5px;">${routeOut}</pre>
      ` : ''}
      <h4 style="margin-bottom:4px;color:#0284c7;">ARP Table</h4>
      <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px;font-size:11.5px;">${arpOut}</pre>
    `;
    modal.classList.remove('hidden');
  }

  // ==================== 12. TOOLBAR, TOOLS & ACTION HANDLERS ====================
  function setActiveTool(toolName) {
    state.activeTool = toolName;
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });
    if (toolName === 'select') {
      state.pendingModel = null;
      state.pendingCableType = null;
      state.cableSource = null;
      state.pduSourceDevId = null;
      hideActionBanner();
      renderComponentBox();
    } else if (toolName === 'pdu') {
      state.pduSourceDevId = null;
      showActionBanner('✉️ إرسال رسالة (Simple PDU): اضغط على الجهاز المصدر (Source) ثم الجهاز الهدف (Destination)');
    } else if (toolName === 'delete') {
      showActionBanner('🗑️ وضع الحذف: اضغط على أي جهاز أو كابل لحذفه');
    } else if (toolName === 'inspect') {
      showActionBanner('🔍 وضع الفحص: اضغط على أي جهاز لعرض جداول MAC / VLAN / ARP / Routing');
    } else if (toolName === 'note') {
      showActionBanner('📝 اضغط في أي مكان على المساحة لكتابة ملاحظة');
    }
  }

  function showActionBanner(text) {
    const banner = document.getElementById('pt-active-action-banner');
    const txt = document.getElementById('pt-active-action-text');
    txt.textContent = text;
    banner.classList.remove('hidden');
  }

  function hideActionBanner() {
    document.getElementById('pt-active-action-banner').classList.add('hidden');
  }

  document.getElementById('btn-cancel-action').addEventListener('click', () => setActiveTool('select'));

  function deleteDevice(devId) {
    // Free connected ports on peer devices
    for (const link of state.links) {
      if (link.devA === devId || link.devB === devId) {
        const peerId = link.devA === devId ? link.devB : link.devA;
        const peerPort = link.devA === devId ? link.portB : link.portA;
        const peer = getDevice(peerId);
        if (peer) {
          const p = peer.interfaces.find(i => i.name === peerPort);
          if (p) { p.connectedLinkId = null; p.lineUp = false; }
        }
      }
    }
    state.links = state.links.filter(l => l.devA !== devId && l.devB !== devId);
    state.devices = state.devices.filter(d => d.id !== devId);
    if (state.selectedDeviceId === devId) state.selectedDeviceId = null;
    networkContext.refreshLinkStates();
  }

  function deleteLink(linkId) {
    const link = state.links.find(l => l.id === linkId);
    if (link) {
      const devA = getDevice(link.devA);
      const devB = getDevice(link.devB);
      if (devA) {
        const pA = devA.interfaces.find(i => i.name === link.portA);
        if (pA) { pA.connectedLinkId = null; pA.lineUp = false; }
      }
      if (devB) {
        const pB = devB.interfaces.find(i => i.name === link.portB);
        if (pB) { pB.connectedLinkId = null; pB.lineUp = false; }
      }
      state.links = state.links.filter(l => l.id !== linkId);
      networkContext.refreshLinkStates();
    }
  }

  function fastForwardTime() {
    state.uptimeSeconds += 30;
    updateClockDisplay();
    for (const dev of state.devices) {
      for (const iface of dev.interfaces) {
        if (iface.lineUp && iface.adminUp) {
          iface.stpState = 'FWD';
        }
      }
    }
    renderCanvas();
  }

  function powerCycleDevices() {
    for (const dev of state.devices) {
      dev.macTable = [];
      dev.arpTable = [];
      for (const iface of dev.interfaces) {
        if (iface.lineUp && (dev.type === 'switch' || dev.type === 'l3switch')) {
          iface.stpState = 'LRN';
          setTimeout(() => { iface.stpState = 'FWD'; renderCanvas(); }, 2200);
        }
      }
    }
    renderCanvas();
  }

  // ==================== 13. READY-MADE LAB TOPOLOGIES ====================
  function clearWorkspace() {
    state.devices = [];
    state.links = [];
    state.notes = [];
    state.pduList = [];
    state.simEvents = [];
    state.selectedDeviceId = null;
    state.counters = { Switch: 0, Router: 0, PC: 0, Laptop: 0, Server: 0, 'Multilayer Switch': 0, Hub: 0, Cloud: 0 };
    renderPduTable();
    renderCanvas();
  }

  // Lab 1: Switch 2960 + VLANs + 4 PCs (Default Startup Lab!)
  function loadLabVlan() {
    clearWorkspace();
    const sw1 = addDevice(findCatalogModel('2960-24TT'), 380, 210, 'Switch0');
    const pc0 = addDevice(findCatalogModel('PC-PT'), 170, 110, 'PC0');
    const pc1 = addDevice(findCatalogModel('PC-PT'), 170, 310, 'PC1');
    const pc2 = addDevice(findCatalogModel('PC-PT'), 590, 110, 'PC2');
    const pc3 = addDevice(findCatalogModel('Laptop-PT'), 590, 310, 'Laptop0');

    pc0.interfaces[0].ip = '192.168.1.10'; pc0.interfaces[0].mask = '255.255.255.0'; pc0.defaultGateway = '192.168.1.1';
    pc1.interfaces[0].ip = '192.168.1.11'; pc1.interfaces[0].mask = '255.255.255.0'; pc1.defaultGateway = '192.168.1.1';
    pc2.interfaces[0].ip = '192.168.1.20'; pc2.interfaces[0].mask = '255.255.255.0'; pc2.defaultGateway = '192.168.1.1';
    pc3.interfaces[0].ip = '192.168.1.21'; pc3.interfaces[0].mask = '255.255.255.0'; pc3.defaultGateway = '192.168.1.1';

    connectDevices(pc0, 'FastEthernet0', sw1, 'FastEthernet0/1', 'straight');
    connectDevices(pc1, 'FastEthernet0', sw1, 'FastEthernet0/2', 'straight');
    connectDevices(pc2, 'FastEthernet0', sw1, 'FastEthernet0/3', 'straight');
    connectDevices(pc3, 'FastEthernet0', sw1, 'FastEthernet0/4', 'straight');

    state.notes.push({
      id: 'n1',
      x: 250,
      y: 22,
      text: '💡 اضغط على Switch0 لفتح نافذة CLI وتجربة أوامر السويتش (enable, conf t, vlan 10, show vlan brief)!'
    });

    state.selectedDeviceId = sw1.id;
    fastForwardTime();
  }

  // Lab 2: Router 1941 + Switch 2960 + DHCP Server Pool + PCs
  function loadLabRouterDhcp() {
    clearWorkspace();
    const rtr = addDevice(findCatalogModel('1941'), 380, 95, 'Router0');
    const sw = addDevice(findCatalogModel('2960-24TT'), 380, 235, 'Switch0');
    const pc0 = addDevice(findCatalogModel('PC-PT'), 190, 345, 'PC0');
    const pc1 = addDevice(findCatalogModel('PC-PT'), 380, 365, 'PC1');
    const srv = addDevice(findCatalogModel('Server-PT'), 570, 345, 'Server0');

    // Configure Router0 via real IOS commands!
    const rtrCmds = [
      'n',
      'enable',
      'configure terminal',
      'hostname R1',
      'interface GigabitEthernet0/0',
      'ip address 192.168.1.1 255.255.255.0',
      'no shutdown',
      'exit',
      'ip dhcp excluded-address 192.168.1.1 192.168.1.9',
      'ip dhcp pool LAN_POOL',
      'network 192.168.1.0 255.255.255.0',
      'default-router 192.168.1.1',
      'dns-server 192.168.1.2',
      'end',
      'write memory'
    ];
    for (const c of rtrCmds) PTEngine.executeIosCommand(rtr, c, networkContext);

    srv.interfaces[0].ip = '192.168.1.2';
    srv.interfaces[0].mask = '255.255.255.0';
    srv.defaultGateway = '192.168.1.1';

    connectDevices(rtr, 'GigabitEthernet0/0', sw, 'GigabitEthernet0/1', 'straight');
    connectDevices(pc0, 'FastEthernet0', sw, 'FastEthernet0/1', 'straight');
    connectDevices(pc1, 'FastEthernet0', sw, 'FastEthernet0/2', 'straight');
    connectDevices(srv, 'FastEthernet0', sw, 'FastEthernet0/3', 'straight');

    // Obtain DHCP leases on PC0 and PC1
    networkContext.requestDhcp(pc0);
    networkContext.requestDhcp(pc1);

    state.notes.push({
      id: 'n2',
      x: 40,
      y: 30,
      text: '🌐 راوتر R1 مبرمج بـ DHCP Pool تلقائي (192.168.1.0/24). جرب إرسال Ping ✉️ بين الأجهزة أو فحص show ip dhcp binding!'
    });

    state.selectedDeviceId = rtr.id;
    fastForwardTime();
  }

  // Lab 3: Two Routers + OSPF + Two Switches + PCs
  function loadLabOspf() {
    clearWorkspace();
    const r1 = addDevice(findCatalogModel('1941'), 260, 100, 'Router0');
    const r2 = addDevice(findCatalogModel('1941'), 520, 100, 'Router1');
    const sw1 = addDevice(findCatalogModel('2960-24TT'), 220, 240, 'Switch0');
    const sw2 = addDevice(findCatalogModel('2960-24TT'), 560, 240, 'Switch1');
    const pc0 = addDevice(findCatalogModel('PC-PT'), 180, 360, 'PC0');
    const srv = addDevice(findCatalogModel('Server-PT'), 600, 360, 'WebServer');

    connectDevices(r1, 'Serial0/0/0', r2, 'Serial0/0/0', 'serial-dce');
    connectDevices(r1, 'GigabitEthernet0/0', sw1, 'GigabitEthernet0/1', 'straight');
    connectDevices(r2, 'GigabitEthernet0/0', sw2, 'GigabitEthernet0/1', 'straight');
    connectDevices(pc0, 'FastEthernet0', sw1, 'FastEthernet0/1', 'straight');
    connectDevices(srv, 'FastEthernet0', sw2, 'FastEthernet0/1', 'straight');

    for (const c of ['n', 'en', 'conf t', 'hostname R1', 'int g0/0', 'ip address 192.168.10.1 255.255.255.0', 'no shut', 'int s0/0/0', 'ip address 10.0.0.1 255.255.255.252', 'clock rate 64000', 'no shut', 'router ospf 1', 'router-id 1.1.1.1', 'network 192.168.10.0 0.0.0.255 area 0', 'network 10.0.0.0 0.0.0.3 area 0', 'end', 'wr']) {
      PTEngine.executeIosCommand(r1, c, networkContext);
    }
    for (const c of ['n', 'en', 'conf t', 'hostname R2', 'int g0/0', 'ip address 192.168.20.1 255.255.255.0', 'no shut', 'int s0/0/0', 'ip address 10.0.0.2 255.255.255.252', 'no shut', 'router ospf 1', 'router-id 2.2.2.2', 'network 192.168.20.0 0.0.0.255 area 0', 'network 10.0.0.0 0.0.0.3 area 0', 'end', 'wr']) {
      PTEngine.executeIosCommand(r2, c, networkContext);
    }

    pc0.interfaces[0].ip = '192.168.10.10'; pc0.interfaces[0].mask = '255.255.255.0'; pc0.defaultGateway = '192.168.10.1';
    srv.interfaces[0].ip = '192.168.20.10'; srv.interfaces[0].mask = '255.255.255.0'; srv.defaultGateway = '192.168.20.1';

    state.notes.push({
      id: 'n3',
      x: 240,
      y: 20,
      text: '⚡ بروتوكول OSPF مفعل بين R1 و R2 عبر Serial0/0/0! جرب show ip route و show ip ospf neighbor.'
    });

    state.selectedDeviceId = r1.id;
    fastForwardTime();
  }

  // ==================== 14. EVENT LISTENERS & INITIALIZATION ====================
  function bindGlobalEvents() {
    // Tool buttons
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
    });

    // Menu & Toolbar actions
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.action;
        if (act === 'new-topology') clearWorkspace();
        else if (act === 'load-lab-vlan') loadLabVlan();
        else if (act === 'load-lab-roas') loadLabRouterDhcp();
        else if (act === 'load-lab-ospf') loadLabOspf();
        else if (act === 'zoom-in') { state.zoom = Math.min(2, +(state.zoom + 0.15).toFixed(2)); renderCanvas(); }
        else if (act === 'zoom-out') { state.zoom = Math.max(0.5, +(state.zoom - 0.15).toFixed(2)); renderCanvas(); }
        else if (act === 'zoom-reset') { state.zoom = 1; renderCanvas(); }
        else if (act === 'fast-forward') fastForwardTime();
        else if (act === 'power-cycle') powerCycleDevices();
        else if (act === 'tool-pdu') setActiveTool('pdu');
        else if (act === 'delete-selected' && state.selectedDeviceId) deleteDevice(state.selectedDeviceId);
        else if (act === 'copy-device' && state.selectedDeviceId) {
          const orig = getDevice(state.selectedDeviceId);
          if (orig) addDevice(findCatalogModel(orig.model), orig.x + 70, orig.y + 40);
        }
        else if (act === 'toggle-port-labels') { state.showPortLabels = !state.showPortLabels; renderCanvas(); }
        else if (act === 'toggle-model-labels') { state.showModelLabels = !state.showModelLabels; renderCanvas(); }
        else if (act === 'toggle-link-lights') { state.showLinkLights = !state.showLinkLights; renderCanvas(); }
        else if (act === 'toggle-cli-dark') { state.darkCli = !state.darkCli; cliScreen.classList.toggle('dark-cli', state.darkCli); }
        else if (act === 'view-logical') setWorkspaceMode('logical');
        else if (act === 'view-physical') setWorkspaceMode('physical');
        else if (act === 'quick-help') document.getElementById('pt-help-modal').classList.remove('hidden');
        else if (act === 'export-pkt') exportTopologyJson();
        else if (act === 'import-pkt') document.getElementById('pt-file-input').click();
      });
    });

    // Floating Mobile / Touch Action Menu buttons
    document.querySelectorAll('[data-float-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dev = getDevice(state.selectedDeviceId);
        if (!dev) return;
        const fa = btn.dataset.floatAction;
        if (fa === 'open-cli') {
          const isIos = ['switch', 'l3switch', 'router'].includes(dev.type);
          openDeviceModal(dev.id, isIos ? 'cli' : 'desktop');
          if (!isIos) openDesktopUtility(dev, 'cmd');
        } else if (fa === 'open-config') {
          const isIos = ['switch', 'l3switch', 'router'].includes(dev.type);
          openDeviceModal(dev.id, isIos ? 'config' : 'desktop');
          if (!isIos) openDesktopUtility(dev, 'ipconfig');
        } else if (fa === 'quick-cable') {
          state.pendingCableType = 'auto';
          const port = autoPickPort(dev, 'auto');
          if (port) {
            state.cableSource = { devId: dev.id, portName: port.name };
            setActiveTool('connect-cable');
            showActionBanner(`⚡ توصيل من ${dev.displayName} (${PTEngine.shortIfName(port.name)}) — اضغط على الجهاز الثاني`);
          }
        } else if (fa === 'quick-pdu') {
          state.pduSourceDevId = dev.id;
          setActiveTool('pdu');
          showActionBanner(`✉️ المصدر: ${dev.displayName} — اضغط على الجهاز الهدف لإرسال Ping`);
        } else if (fa === 'delete-dev') {
          deleteDevice(dev.id);
        }
      });
    });

    // Logical / Physical toggle buttons
    document.querySelectorAll('[data-ws]').forEach(btn => {
      btn.addEventListener('click', () => setWorkspaceMode(btn.dataset.ws));
    });

    // Realtime / Simulation toggle buttons
    document.querySelectorAll('[data-simmode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.simmode;
        state.simMode = mode;
        document.getElementById('btn-mode-realtime').classList.toggle('active', mode === 'realtime');
        document.getElementById('btn-mode-simulation').classList.toggle('active', mode === 'simulation');
        document.getElementById('pt-simulation-panel').classList.toggle('hidden', mode !== 'simulation');
      });
    });

    document.getElementById('btn-close-sim').addEventListener('click', () => {
      document.getElementById('pt-simulation-panel').classList.add('hidden');
      document.getElementById('btn-mode-realtime').classList.add('active');
      document.getElementById('btn-mode-simulation').classList.remove('active');
    });

    document.getElementById('btn-toggle-pdu-panel').addEventListener('click', () => {
      const dock = document.getElementById('pt-pdu-dock');
      dock.style.display = dock.style.display === 'flex' ? 'none' : 'flex';
    });

    document.getElementById('btn-clear-pdus').addEventListener('click', () => {
      state.pduList = [];
      renderPduTable();
    });

    // Simulation Play / Forward / Back buttons
    document.getElementById('btn-sim-step').addEventListener('click', () => {
      if (state.simEvents.length > 0) {
        state.simCursor = (state.simCursor + 1) % state.simEvents.length;
        renderSimEvents();
        openPduInfoModal(state.simEvents[state.simCursor]);
      } else if (state.devices.length >= 2) {
        const pcs = state.devices.filter(d => d.interfaces.some(i => i.ip));
        if (pcs.length >= 2) fireSimplePdu(pcs[0], pcs[pcs.length - 1]);
      }
    });

    document.getElementById('btn-sim-back').addEventListener('click', () => {
      if (state.simEvents.length > 0) {
        state.simCursor = Math.max(0, state.simCursor - 1);
        renderSimEvents();
      }
    });

    document.getElementById('btn-sim-reset').addEventListener('click', () => {
      state.simCursor = 0;
      renderSimEvents();
    });

    document.getElementById('btn-sim-play').addEventListener('click', () => {
      if (state.devices.length >= 2) {
        const pcs = state.devices.filter(d => d.interfaces.some(i => i.ip));
        if (pcs.length >= 2) fireSimplePdu(pcs[0], pcs[pcs.length - 1]);
      }
    });

    // Device Window tabs & close
    document.querySelectorAll('#pt-dev-tabs .pt-dtab').forEach(btn => {
      btn.addEventListener('click', () => switchDeviceTab(btn.dataset.devtab));
    });

    document.getElementById('btn-close-dev-window').addEventListener('click', () => {
      document.getElementById('pt-device-modal').classList.add('hidden');
    });

    document.getElementById('btn-max-dev-window').addEventListener('click', () => {
      document.getElementById('pt-device-window').classList.toggle('maximized');
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.closeModal).classList.add('hidden');
      });
    });

    // Mobile mode preview toggle
    const mobileBtn = document.getElementById('btn-mobile-mode');
    mobileBtn.addEventListener('click', () => {
      const appEl = document.getElementById('pt-app');
      const active = appEl.classList.toggle('mobile-mode');
      mobileBtn.classList.toggle('active', active);
      mobileBtn.textContent = active ? '🖥️ وضع سطح المكتب' : '📱 وضع الجوال';
    });

    document.getElementById('btn-quick-help').addEventListener('click', () => {
      document.getElementById('pt-help-modal').classList.remove('hidden');
    });

    // Import topology JSON
    document.getElementById('pt-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.devices && data.links) {
            state.devices = data.devices;
            state.links = data.links;
            state.notes = data.notes || [];
            networkContext.refreshLinkStates();
          }
        } catch (err) {
          alert('تعذر قراءة ملف الشبكة');
        }
      };
      reader.readAsText(file);
    });
  }

  function setWorkspaceMode(ws) {
    state.workspaceMode = ws;
    document.getElementById('btn-mode-logical').classList.toggle('active', ws === 'logical');
    document.getElementById('btn-mode-physical').classList.toggle('active', ws === 'physical');
    document.getElementById('logical-workspace').classList.toggle('hidden', ws !== 'logical');
    document.getElementById('physical-workspace').classList.toggle('hidden', ws !== 'physical');
    if (ws === 'physical') renderPhysicalRack();
  }

  function exportTopologyJson() {
    const blob = new Blob([JSON.stringify({ devices: state.devices, links: state.links, notes: state.notes }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'network-topology.pkt.json';
    a.click();
  }

  function updateClockDisplay() {
    const hrs = String(Math.floor(state.uptimeSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((state.uptimeSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(state.uptimeSeconds % 60).padStart(2, '0');
    const el = document.getElementById('pt-clock-display');
    if (el) el.textContent = `Time: ${hrs}:${mins}:${secs}`;
  }

  setInterval(() => {
    state.uptimeSeconds++;
    updateClockDisplay();
  }, 1000);

  // Initialize App
  renderComponentBox();
  bindGlobalEvents();
  loadLabVlan();
})();
