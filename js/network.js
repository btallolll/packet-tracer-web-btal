// ============================================================================
// Packet Tracer Web — js/network.js
// L2/L3 Network Simulation Engine: Links, STP, VLAN/Trunk, OSPF, Routing, DHCP, Ping
// ============================================================================
(function (G) {
  'use strict';
  const PT = G.PT = G.PT || {};

  class NetworkEngine {
    constructor() {
      this.devices = [];
      this.links = []; // { id, cableType, devA, portA, devB, portB }
      this.notes = [];
      this.listeners = new Set();
    }

    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    notify() { for (const fn of this.listeners) try { fn(); } catch (e) { console.error(e); } }

    getDevice(id) { return this.devices.find(d => d.id === id) || null; }
    getDeviceByName(name) { return this.devices.find(d => (d.name === name || (d.cfg && d.cfg.hostname === name))) || null; }

    addDevice(dev) {
      this.devices.push(dev);
      this.refreshLinkStates();
      return dev;
    }

    removeDevice(devId) {
      // Remove connected links
      const linksToRemove = this.links.filter(l => l.devA === devId || l.devB === devId);
      for (const l of linksToRemove) this.removeLink(l.id);
      this.devices = this.devices.filter(d => d.id !== devId);
      this.refreshLinkStates();
    }

    connect(devAId, portAName, devBId, portBName, cableType = 'straight') {
      const devA = this.getDevice(devAId);
      const devB = this.getDevice(devBId);
      if (!devA || !devB) return null;
      const pA = devA.ports.find(p => p.name === portAName);
      const pB = devB.ports.find(p => p.name === portBName);
      if (!pA || !pB) return null;
      if (pA.linkId || pB.linkId) return null;

      // Auto cable resolution
      let resolvedCable = cableType;
      if (cableType === 'auto') {
        const isDTE_A = ['pc', 'laptop', 'server', 'router'].includes(devA.type);
        const isDTE_B = ['pc', 'laptop', 'server', 'router'].includes(devB.type);
        if (isDTE_A && isDTE_B) resolvedCable = 'cross';
        else if (devA.type === 'switch' && devB.type === 'switch') resolvedCable = 'cross';
        else resolvedCable = 'straight';
      }

      const linkId = `link_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const link = { id: linkId, cableType: resolvedCable, devA: devAId, portA: portAName, devB: devBId, portB: portBName };
      pA.linkId = linkId;
      pB.linkId = linkId;
      this.links.push(link);

      // STP port transition: switch ports go Amber (LRN) for 2.8s before Green (FWD)
      const isSwA = devA.type === 'switch' || devA.type === 'l3switch';
      const isSwB = devB.type === 'switch' || devB.type === 'l3switch';
      devA.rt = devA.rt || PT.freshRuntime(devA);
      devB.rt = devB.rt || PT.freshRuntime(devB);

      if (isSwA) {
        devA.rt.lastStatus[pA.name] = 'LRN';
        setTimeout(() => {
          if (pA.linkId === linkId && devA.rt) {
            devA.rt.lastStatus[pA.name] = 'FWD';
            this.notify();
          }
        }, 2800);
      }
      if (isSwB) {
        devB.rt.lastStatus[pB.name] = 'LRN';
        setTimeout(() => {
          if (pB.linkId === linkId && devB.rt) {
            devB.rt.lastStatus[pB.name] = 'FWD';
            this.notify();
          }
        }, 2800);
      }

      this.refreshLinkStates();
      return link;
    }

    removeLink(linkId) {
      const link = this.links.find(l => l.id === linkId);
      if (!link) return;
      const devA = this.getDevice(link.devA);
      const devB = this.getDevice(link.devB);
      if (devA) {
        const pA = devA.ports.find(p => p.name === link.portA);
        if (pA) pA.linkId = null;
      }
      if (devB) {
        const pB = devB.ports.find(p => p.name === link.portB);
        if (pB) pB.linkId = null;
      }
      this.links = this.links.filter(l => l.id !== linkId);
      this.refreshLinkStates();
    }

    refreshLinkStates() {
      for (const link of this.links) {
        const devA = this.getDevice(link.devA);
        const devB = this.getDevice(link.devB);
        if (!devA || !devB) continue;
        const pA = devA.ports.find(p => p.name === link.portA);
        const pB = devB.ports.find(p => p.name === link.portB);
        if (!pA || !pB) continue;

        const ifcA = (devA.cfg && devA.cfg.ifaces && devA.cfg.ifaces[pA.name]) || {};
        const ifcB = (devB.cfg && devB.cfg.ifaces && devB.cfg.ifaces[pB.name]) || {};

        const bothUp = Boolean(devA.power && devB.power && !ifcA.shutdown && !ifcB.shutdown);
        pA.lineUp = bothUp;
        pB.lineUp = bothUp;
      }

      // Update Switch SVIs (Vlan1, Vlan10, etc.)
      for (const dev of this.devices) {
        if (!dev.cfg || !dev.cfg.ifaces) continue;
        for (const [ifName, ifc] of Object.entries(dev.cfg.ifaces)) {
          if (ifName.startsWith('Vlan')) {
            const vid = parseInt(ifName.replace(/^Vlan/i, ''), 10) || 1;
            const hasUpPort = dev.ports.some(p => {
              const pi = dev.cfg.ifaces[p.name];
              return p.lineUp && pi && !pi.shutdown &&
                ((pi.mode === 'access' && (pi.accessVlan || 1) === vid) || pi.mode === 'trunk');
            });
            ifc.lineUp = !ifc.shutdown && hasUpPort;
          } else if (ifName.includes('.')) {
            // Router subinterface
            const parentName = ifName.split('.')[0];
            const parentPort = dev.ports.find(p => p.name.toLowerCase() === parentName.toLowerCase());
            const parentIfc = dev.cfg.ifaces[parentName];
            ifc.lineUp = !ifc.shutdown && Boolean(parentPort && parentPort.lineUp && parentIfc && !parentIfc.shutdown);
          }
        }
      }
      this.notify();
    }

    // CDP Neighbors list for show cdp neighbors
    getCdpNeighbors(dev) {
      const res = [];
      for (const link of this.links) {
        const isA = link.devA === dev.id;
        const isB = link.devB === dev.id;
        if (!isA && !isB) continue;
        const peerDev = this.getDevice(isA ? link.devB : link.devA);
        if (!peerDev || !peerDev.power) continue;
        const localPort = isA ? link.portA : link.portB;
        const remotePort = isA ? link.portB : link.portA;
        const lp = dev.ports.find(p => p.name === localPort);
        if (!lp || !lp.lineUp) continue;

        let cap = 'H';
        if (peerDev.type === 'router') cap = 'R';
        else if (peerDev.type === 'l3switch') cap = 'R S I';
        else if (peerDev.type === 'switch') cap = 'S I';

        res.push({
          hostname: peerDev.cfg ? peerDev.cfg.hostname : peerDev.name,
          localPort,
          remotePort,
          cap,
          model: peerDev.model
        });
      }
      return res;
    }

    // Dynamic OSPF / RIP routes
    getDynamicRoutes(dev) {
      const routes = [];
      if (!dev.cfg) return routes;

      // OSPF
      const hasOspf = Object.keys(dev.cfg.ospf || {}).length > 0;
      if (hasOspf) {
        for (const other of this.devices) {
          if (other.id === dev.id || !other.power || !other.cfg) continue;
          if (!Object.keys(other.cfg.ospf || {}).length) continue;

          // Find common link
          let nextHopIp = null;
          let exitIf = null;
          for (const link of this.links) {
            const isA = link.devA === dev.id && link.devB === other.id;
            const isB = link.devB === dev.id && link.devA === other.id;
            if (isA || isB) {
              const myPort = isA ? link.portA : link.portB;
              const remPort = isA ? link.portB : link.portA;
              const remIfc = other.cfg.ifaces[remPort];
              if (remIfc && remIfc.ip) nextHopIp = remIfc.ip;
              exitIf = myPort;
              break;
            }
          }

          if (nextHopIp && exitIf) {
            for (const [ifName, ifc] of Object.entries(other.cfg.ifaces)) {
              if (ifc.ip && ifc.mask && !ifc.shutdown && ifc.ip !== nextHopIp) {
                const net = PT.n2ip(PT.netOf(ifc.ip, ifc.mask));
                const cidr = PT.maskLen(ifc.mask);
                routes.push({
                  code: 'O',
                  network: net,
                  cidr,
                  ad: 110,
                  metric: 2,
                  nextHop: nextHopIp,
                  outInterface: exitIf
                });
              }
            }
          }
        }
      }
      return routes;
    }

    // DHCP Request Engine (Supports Router IOS pools & Server-PT DHCP service!)
    requestDhcp(clientDev) {
      const clientPort = clientDev.ports.find(p => p.kind === 'fa' || p.kind === 'eth' || p.kind === 'gi');
      if (!clientPort || !clientPort.linkId) return null;
      const clientIfc = clientDev.cfg.ifaces[clientPort.name];
      if (!clientIfc) return null;

      // Determine client's VLAN
      let clientVlan = 1;
      const link = this.links.find(l => l.id === clientPort.linkId);
      if (link) {
        const peerDev = this.getDevice(link.devA === clientDev.id ? link.devB : link.devA);
        const peerPortName = link.devA === clientDev.id ? link.portB : link.portA;
        if (peerDev && (peerDev.type === 'switch' || peerDev.type === 'l3switch')) {
          const peerIfc = peerDev.cfg.ifaces[peerPortName];
          if (peerIfc && peerIfc.mode === 'access') {
            clientVlan = peerIfc.accessVlan || 1;
          }
        }
      }

      // Collect all already assigned IP addresses in the entire topology
      const usedIps = new Set();
      for (const d of this.devices) {
        if (!d.cfg || !d.cfg.ifaces) continue;
        for (const ifc of Object.values(d.cfg.ifaces)) {
          if (ifc.ip) usedIps.add(ifc.ip);
        }
      }

      // 1. Search Server-PT devices with DHCP service enabled
      for (const srv of this.devices) {
        if (!srv.power || srv.type !== 'server') continue;
        const srvCfg = srv.cfg;
        if (!srvCfg || !srvCfg.services || !srvCfg.services.dhcp || !srvCfg.services.dhcp.on) continue;

        const dhcpSrv = srvCfg.services.dhcp;
        const pools = dhcpSrv.pools || [];
        const pool = pools[0];
        if (!pool) continue;

        const startInt = PT.ip2n(pool.start || '192.168.1.100');
        const mask = pool.mask || '255.255.255.0';
        const maxUsers = pool.max || 50;

        for (let i = 0; i < maxUsers; i++) {
          const candidate = PT.n2ip(startInt + i);
          if (!usedIps.has(candidate)) {
            clientIfc.ip = candidate;
            clientIfc.mask = mask;
            clientDev.cfg.host.gateway = pool.gateway || '';
            clientDev.cfg.host.dns = pool.dns || '';
            clientDev.cfg.defaultGateway = pool.gateway || '';
            clientDev.cfg.dnsServer = pool.dns || '';
            return { ip: candidate, mask, gateway: pool.gateway, dns: pool.dns };
          }
        }
      }

      // 2. Search Router / L3 Switch IOS DHCP Pools
      for (const rtr of this.devices) {
        if (!rtr.power || (rtr.type !== 'router' && rtr.type !== 'l3switch')) continue;
        const rcfg = rtr.cfg;
        if (!rcfg || !rcfg.dhcpPools) continue;

        for (const [poolName, pool] of Object.entries(rcfg.dhcpPools)) {
          if (!pool.network || !pool.mask) continue;
          const netInt = PT.netOf(pool.network, pool.mask);

          // Add excluded addresses
          const excludedIps = new Set();
          for (const ex of (rcfg.dhcpExcluded || [])) {
            const low = PT.ip2n(ex.low);
            const high = PT.ip2n(ex.high || ex.low);
            for (let k = low; k <= high; k++) excludedIps.add(PT.n2ip(k));
          }

          // Allocate first free host address in pool
          for (let host = 10; host < 250; host++) {
            const candidate = PT.n2ip(netInt + host);
            if (!usedIps.has(candidate) && !excludedIps.has(candidate)) {
              clientIfc.ip = candidate;
              clientIfc.mask = pool.mask;
              clientDev.cfg.host.gateway = pool.defaultRouter || '';
              clientDev.cfg.host.dns = pool.dnsServer || '';
              clientDev.cfg.defaultGateway = pool.defaultRouter || '';
              clientDev.cfg.dnsServer = pool.dnsServer || '';

              rtr.rt = rtr.rt || PT.freshRuntime(rtr);
              return { ip: candidate, mask: pool.mask, gateway: pool.defaultRouter, dns: pool.dnsServer };
            }
          }
        }
      }
      return null;
    }

    fastForwardTime() {
      for (const dev of this.devices) {
        if (!dev.rt || !dev.ports) continue;
        for (const p of dev.ports) {
          if (dev.rt.lastStatus && dev.rt.lastStatus[p.name] === 'LRN') {
            dev.rt.lastStatus[p.name] = 'FWD';
          }
        }
      }
      this.refreshLinkStates();
      this.notify();
    }

    powerCycleDevices() {
      for (const dev of this.devices) {
        dev.rt = PT.freshRuntime(dev);
        if (dev.ports) {
          for (const p of dev.ports) {
            if (p.linkId && (dev.type === 'switch' || dev.type === 'l3switch')) {
              dev.rt.lastStatus[p.name] = 'LRN';
              setTimeout(() => {
                if (dev.rt && dev.rt.lastStatus) {
                  dev.rt.lastStatus[p.name] = 'FWD';
                  this.notify();
                }
              }, 2800);
            }
          }
        }
      }
      this.refreshLinkStates();
      this.notify();
    }

    exportTopology() {
      return {
        devices: this.devices,
        links: this.links,
        notes: this.notes
      };
    }

    importTopology(data) {
      if (!data || !Array.isArray(data.devices)) return false;
      this.devices = data.devices || [];
      this.links = data.links || [];
      this.notes = data.notes || [];
      this.refreshLinkStates();
      this.notify();
      return true;
    }

    learnMacAndArpAlongPath(nodePath, srcDev, srcPortName, dstDev, dstPortName) {
      const srcPort = srcDev.ports.find(p => p.name === srcPortName) || srcDev.ports[0];
      const dstPort = dstDev.ports.find(p => p.name === dstPortName) || dstDev.ports[0];
      if (!srcPort || !dstPort) return;
      const srcIfc = (srcDev.cfg && srcDev.cfg.ifaces && srcDev.cfg.ifaces[srcPortName]) || {};
      const dstIfc = (dstDev.cfg && dstDev.cfg.ifaces && dstDev.cfg.ifaces[dstPortName]) || {};

      srcDev.rt = srcDev.rt || PT.freshRuntime(srcDev);
      dstDev.rt = dstDev.rt || PT.freshRuntime(dstDev);
      srcDev.rt.arp = srcDev.rt.arp || [];
      dstDev.rt.arp = dstDev.rt.arp || [];

      if (srcIfc.ip && dstIfc.ip) {
        if (!srcDev.rt.arp.some(e => e.ip === dstIfc.ip)) {
          srcDev.rt.arp.push({ ip: dstIfc.ip, mac: dstPort.mac, port: srcPortName });
        }
        if (!dstDev.rt.arp.some(e => e.ip === srcIfc.ip)) {
          dstDev.rt.arp.push({ ip: srcIfc.ip, mac: srcPort.mac, port: dstPortName });
        }
      }

      for (let i = 0; i < nodePath.length; i++) {
        const dev = this.getDevice(nodePath[i]);
        if (!dev || (dev.type !== 'switch' && dev.type !== 'l3switch')) continue;
        dev.rt = dev.rt || PT.freshRuntime(dev);
        dev.rt.mac = dev.rt.mac || [];
        if (i > 0) {
          const prevId = nodePath[i - 1];
          const link = this.links.find(l => (l.devA === dev.id && l.devB === prevId) || (l.devB === dev.id && l.devA === prevId));
          if (link) {
            const inPort = link.devA === dev.id ? link.portA : link.portB;
            const swIf = (dev.cfg && dev.cfg.ifaces && dev.cfg.ifaces[inPort]) || {};
            const vlan = swIf.accessVlan || 1;
            if (!dev.rt.mac.some(m => m.mac === srcPort.mac && m.port === inPort)) {
              dev.rt.mac.push({ vlan, mac: srcPort.mac, type: 'DYNAMIC', port: inPort });
            }
          }
        }
        if (i < nodePath.length - 1) {
          const nextId = nodePath[i + 1];
          const link = this.links.find(l => (l.devA === dev.id && l.devB === nextId) || (l.devB === dev.id && l.devA === nextId));
          if (link) {
            const outPort = link.devA === dev.id ? link.portA : link.portB;
            const swIf = (dev.cfg && dev.cfg.ifaces && dev.cfg.ifaces[outPort]) || {};
            const vlan = swIf.accessVlan || 1;
            if (!dev.rt.mac.some(m => m.mac === dstPort.mac && m.port === outPort)) {
              dev.rt.mac.push({ vlan, mac: dstPort.mac, type: 'DYNAMIC', port: outPort });
            }
          }
        }
      }
    }

    // Ping & Path Tracing Simulation
    runPing(srcDev, targetIp, animate = true) {
      if (!srcDev || !targetIp) return { success: false, cliText: '.....\nSuccess rate is 0 percent (0/5)', nodePath: [] };

      // Find destination device that has targetIp
      let dstDev = null;
      let dstIfName = null;
      for (const d of this.devices) {
        if (!d.power || !d.cfg || !d.cfg.ifaces) continue;
        for (const [ifName, ifc] of Object.entries(d.cfg.ifaces)) {
          if (ifc.ip === targetIp && !ifc.shutdown) {
            dstDev = d;
            dstIfName = ifName;
            break;
          }
        }
        if (dstDev) break;
      }

      if (!dstDev) {
        return {
          success: false,
          cliText: 'Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ' + targetIp + ', timeout is 2 seconds:\n.....\nSuccess rate is 0 percent (0/5)',
          pcText: `\nPinging ${targetIp} with 32 bytes of data:\n\nRequest timed out.\nRequest timed out.\nRequest timed out.\nRequest timed out.\n\nPing statistics for ${targetIp}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),`,
          nodePath: []
        };
      }

      // Check src interface
      let srcIfc = null;
      let srcPortName = null;
      for (const [ifName, ifc] of Object.entries(srcDev.cfg.ifaces)) {
        if (ifc.ip && !ifc.shutdown) {
          srcIfc = ifc;
          srcPortName = ifName;
          break;
        }
      }
      if (!srcIfc) {
        return { success: false, cliText: '% No valid IP interface on source device.', pcText: '\nRequest timed out.\n', nodePath: [] };
      }

      // Subnet check: if different subnet, srcDev must have a default gateway
      const sameSubnet = PT.sameNet(srcIfc.ip, targetIp, srcIfc.mask);
      const hostCfg = (srcDev.cfg && srcDev.cfg.host) || {};
      const gateway = hostCfg.gateway || srcDev.cfg.defaultGateway;
      if (!sameSubnet && (!gateway || gateway === '0.0.0.0') && srcDev.type !== 'router' && srcDev.type !== 'l3switch') {
        return {
          success: false,
          nodePath: [srcDev.id],
          hops: [],
          cliText: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:\n.....\nSuccess rate is 0 percent (0/5)`,
          pcText: `\nPinging ${targetIp} with 32 bytes of data:\n\nRequest timed out.\nRequest timed out.\nRequest timed out.\nRequest timed out.\n\nPing statistics for ${targetIp}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),`
        };
      }

      // Trace BFS path across links
      const pathResult = this.findPath(srcDev, dstDev, srcIfc.ip, targetIp, srcPortName, dstIfName);

      if (pathResult.success) {
        this.learnMacAndArpAlongPath(pathResult.nodePath, srcDev, srcPortName, dstDev, dstIfName);
        return {
          success: true,
          nodePath: pathResult.nodePath,
          hops: pathResult.hops,
          cliText: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
          pcText: `\nPinging ${targetIp} with 32 bytes of data:\n\nReply from ${targetIp}: bytes=32 time=1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\n\nPing statistics for ${targetIp}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),\nApproximate round trip times in milli-seconds:\n    Minimum = 0ms, Maximum = 1ms, Average = 0ms`
        };
      } else {
        return {
          success: false,
          nodePath: pathResult.nodePath || [srcDev.id],
          hops: [],
          cliText: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:\n.....\nSuccess rate is 0 percent (0/5)`,
          pcText: `\nPinging ${targetIp} with 32 bytes of data:\n\nRequest timed out.\nRequest timed out.\nRequest timed out.\nRequest timed out.\n\nPing statistics for ${targetIp}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),`
        };
      }
    }

    findPath(srcDev, dstDev, srcIp, dstIp, srcPortName, dstPortName) {
      if (srcDev.id === dstDev.id) {
        return { success: true, nodePath: [srcDev.id], hops: [] };
      }

      const isVlanAllowed = (spec, vid) => {
        if (!spec || spec === 'all' || spec === '1-1005' || spec === '1-4094') return true;
        if (spec === 'none') return false;
        const set = PT.vlanListParse(spec);
        return set ? set.has(vid) : true;
      };

      const srcPort = srcDev.ports.find(p => p.name === srcPortName) || srcDev.ports[0];
      const srcIfc = (srcDev.cfg && srcDev.cfg.ifaces && srcDev.cfg.ifaces[srcPort.name]) || {};
      const initialVlan = (srcIfc.mode === 'access' ? srcIfc.accessVlan : 1) || 1;

      // State in BFS: { devId, vlan, path, hops }
      const queue = [{ devId: srcDev.id, vlan: initialVlan, path: [srcDev.id], hops: [] }];
      const visited = new Set([`${srcDev.id}:${initialVlan}`]);

      while (queue.length > 0) {
        const cur = queue.shift();
        const curDev = this.getDevice(cur.devId);
        if (!curDev || !curDev.power) continue;

        if (cur.devId === dstDev.id) {
          return { success: true, nodePath: cur.path, hops: cur.hops };
        }

        const canRoute = curDev.type === 'router' || (curDev.type === 'l3switch' && curDev.cfg && curDev.cfg.ipRouting);

        // Find connected neighbors
        for (const link of this.links) {
          if (link.cableType === 'console') continue;
          const isA = link.devA === cur.devId;
          const isB = link.devB === cur.devId;
          if (!isA && !isB) continue;

          const nxtId = isA ? link.devB : link.devA;
          const outPortName = isA ? link.portA : link.portB;
          const inPortName = isA ? link.portB : link.portA;
          const nxtDev = this.getDevice(nxtId);
          if (!nxtDev || !nxtDev.power) continue;

          const outPort = curDev.ports.find(p => p.name === outPortName);
          const inPort = nxtDev.ports.find(p => p.name === inPortName);
          if (!outPort || !inPort || !outPort.lineUp || !inPort.lineUp) continue;

          // STP check: if switch port is in LRN or BLK, packet cannot pass yet
          if (curDev.rt && curDev.rt.lastStatus && (curDev.rt.lastStatus[outPort.name] === 'LRN' || curDev.rt.lastStatus[outPort.name] === 'BLK')) {
            continue;
          }
          if (nxtDev.rt && nxtDev.rt.lastStatus && (nxtDev.rt.lastStatus[inPort.name] === 'LRN' || nxtDev.rt.lastStatus[inPort.name] === 'BLK')) {
            continue;
          }

          const outIfc = (curDev.cfg && curDev.cfg.ifaces && curDev.cfg.ifaces[outPort.name]) || {};
          const inIfc = (nxtDev.cfg && nxtDev.cfg.ifaces && nxtDev.cfg.ifaces[inPort.name]) || {};
          if (outIfc.shutdown || inIfc.shutdown) continue;

          // Determine candidate egress VLANs
          const candidateVlans = new Set();
          if (curDev.type === 'switch' || (curDev.type === 'l3switch' && !curDev.cfg.ipRouting)) {
            if (outIfc.mode === 'trunk') {
              if (isVlanAllowed(outIfc.allowedVlans, cur.vlan) && (curDev.cfg.vlans[cur.vlan] || cur.vlan === 1)) {
                candidateVlans.add(cur.vlan);
              }
            } else {
              const accVlan = outIfc.accessVlan || 1;
              if (accVlan === cur.vlan && (curDev.cfg.vlans[cur.vlan] || cur.vlan === 1)) {
                candidateVlans.add(cur.vlan);
              }
            }
          } else if (canRoute) {
            // Router can route between subnets and VLANs
            candidateVlans.add(outIfc.accessVlan || 1);
            // Check subinterfaces
            if (curDev.cfg && curDev.cfg.ifaces) {
              for (const [sName, sIfc] of Object.entries(curDev.cfg.ifaces)) {
                if (sName.startsWith(outPort.name + '.') && !sIfc.shutdown && sIfc.vlanId) {
                  candidateVlans.add(sIfc.vlanId);
                }
              }
            }
          } else {
            // PC / Server / Host
            candidateVlans.add(1);
          }

          for (const txVlan of candidateVlans) {
            let rxVlan = txVlan;
            if (nxtDev.type === 'switch' || nxtDev.type === 'l3switch') {
              if (inIfc.mode === 'trunk') {
                if (!isVlanAllowed(inIfc.allowedVlans, txVlan)) continue;
                rxVlan = txVlan;
              } else {
                const accVlan = inIfc.accessVlan || 1;
                if (curDev.type === 'pc' || curDev.type === 'laptop' || curDev.type === 'server' || curDev.type === 'router') {
                  rxVlan = accVlan;
                } else if (accVlan !== txVlan) {
                  continue;
                }
              }
            } else if (nxtDev.type === 'router') {
              // Router incoming: physical port or dot1Q subinterface for txVlan
              let hasMatch = false;
              if (inIfc.ip && !inIfc.shutdown) hasMatch = true;
              if (nxtDev.cfg && nxtDev.cfg.ifaces) {
                for (const [sName, sIfc] of Object.entries(nxtDev.cfg.ifaces)) {
                  if (sName.startsWith(inPort.name + '.') && sIfc.vlanId === txVlan && !sIfc.shutdown && sIfc.ip) {
                    hasMatch = true;
                    break;
                  }
                }
              }
              if (!hasMatch) continue;
            }

            const stateKey = `${nxtId}:${rxVlan}`;
            if (!visited.has(stateKey)) {
              visited.add(stateKey);
              const nxtHops = [...cur.hops];
              if (curDev.type === 'router' && curDev.id !== srcDev.id) {
                nxtHops.push(curDev.cfg.hostname || curDev.name);
              }
              queue.push({ devId: nxtId, vlan: rxVlan, path: [...cur.path, nxtId], hops: nxtHops });
            }
          }
        }
      }
      return { success: false, nodePath: [srcDev.id], hops: [] };
    }
  }

  PT.NetworkEngine = NetworkEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = PT;
})(typeof window !== 'undefined' ? window : globalThis);

