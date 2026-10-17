// ============================================================================
// Cisco Packet Tracer 8.2.2 — Authentic Cisco IOS & Network Simulation Engine
// Supports Switch IOS (2960, 2950, 3560 L3), Router IOS (1941, 2911, 4331, 2811),
// PC Command Prompt (CMD 1.0), L2 VLAN/Trunk/STP/MAC, L3 Routing/OSPF/RIP/DHCP/ARP
// ============================================================================

(function (global) {
  'use strict';

  // Helper to generate realistic Cisco MAC addresses
  let macCounter = 0x10;
  function generateMac(prefix = '0001.97') {
    macCounter = (macCounter + 1) & 0xffff;
    const hi = ((macCounter >> 8) & 0xff).toString(16).padStart(2, '0').toUpperCase();
    const lo = (macCounter & 0xff).toString(16).padStart(2, '0').toUpperCase();
    const rnd = Math.floor(Math.random() * 255).toString(16).padStart(2, '0').toUpperCase();
    return `${prefix}${ rnd }.${hi}${lo}`;
  }

  function ipToInt(ip) {
    if (!ip || typeof ip !== 'string') return 0;
    const parts = ip.trim().split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return 0;
    return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
  }

  function intToIp(int) {
    return [
      (int >>> 24) & 255,
      (int >>> 16) & 255,
      (int >>> 8) & 255,
      int & 255
    ].join('.');
  }

  function maskToCidr(mask) {
    const n = ipToInt(mask);
    if (!n) return 24;
    let bits = 0;
    for (let i = 31; i >= 0; i--) {
      if ((n >>> i) & 1) bits++;
      else break;
    }
    return bits;
  }

  function sameSubnet(ip1, ip2, mask) {
    const n1 = ipToInt(ip1);
    const n2 = ipToInt(ip2);
    const m = ipToInt(mask || '255.255.255.0');
    if (!n1 || !n2 || !m) return false;
    return (n1 & m) === (n2 & m);
  }

  // Normalize Cisco interface names:
  // e.g. "fa0/1", "f0/1", "fastethernet 0/1" -> "FastEthernet0/1"
  // "gi0/0/0", "g0/0/0" -> "GigabitEthernet0/0/0"
  // "vlan 10", "vl10" -> "Vlan10"
  // "po1", "port-channel 1" -> "Port-channel1"
  // "s0/0/0", "se0/0/0" -> "Serial0/0/0"
  function normalizeInterfaceName(raw, device) {
    if (!raw) return null;
    const s = raw.trim().replace(/\s+/g, '');
    const m = s.match(/^([a-zA-Z\-]+)(\d+(?:\/\d+)*(?:\.\d+)?)$/);
    if (!m) return null;
    const prefix = m[1].toLowerCase();
    const num = m[2];

    let canonicalPrefix = null;
    if ('fastethernet'.startsWith(prefix)) canonicalPrefix = 'FastEthernet';
    else if ('gigabitethernet'.startsWith(prefix)) canonicalPrefix = 'GigabitEthernet';
    else if ('ethernet'.startsWith(prefix)) canonicalPrefix = 'Ethernet';
    else if ('serial'.startsWith(prefix)) canonicalPrefix = 'Serial';
    else if ('vlan'.startsWith(prefix)) canonicalPrefix = 'Vlan';
    else if ('port-channel'.startsWith(prefix) || prefix === 'po') canonicalPrefix = 'Port-channel';
    else if ('loopback'.startsWith(prefix) || prefix === 'lo') canonicalPrefix = 'Loopback';
    else if ('tunnel'.startsWith(prefix) || prefix === 'tu') canonicalPrefix = 'Tunnel';
    if (!canonicalPrefix) return null;

    const candidate = `${canonicalPrefix}${num}`;
    if (device && device.interfaces) {
      const exact = device.interfaces.find(i => i.name.toLowerCase() === candidate.toLowerCase());
      if (exact) return exact.name;
    }
    return candidate;
  }

  function shortIfName(name) {
    return name
      .replace(/^FastEthernet/i, 'Fa')
      .replace(/^GigabitEthernet/i, 'Gi')
      .replace(/^Ethernet/i, 'Eth')
      .replace(/^Serial/i, 'Se')
      .replace(/^Port-channel/i, 'Po')
      .replace(/^Loopback/i, 'Lo');
  }

  // Expand interface range like "fa0/1 - 5" or "fa0/1-4, fa0/8"
  function expandInterfaceRange(rangeStr, device) {
    const parts = rangeStr.split(',');
    const results = [];
    for (let part of parts) {
      part = part.trim();
      const dashMatch = part.match(/^([a-zA-Z]+\s*\d+(?:\/\d+)*\/)(\d+)\s*-\s*(\d+)$/) ||
                        part.match(/^([a-zA-Z]+\s*\d+\/)(\d+)\s*-\s*(\d+)$/);
      if (dashMatch) {
        const base = dashMatch[1].replace(/\s+/g, '');
        const start = parseInt(dashMatch[2], 10);
        const end = parseInt(dashMatch[3], 10);
        for (let k = Math.min(start, end); k <= Math.max(start, end); k++) {
          const norm = normalizeInterfaceName(`${base}${k}`, device);
          if (norm) results.push(norm);
        }
      } else {
        const norm = normalizeInterfaceName(part, device);
        if (norm) results.push(norm);
      }
    }
    return results;
  }

  // Create default interfaces and state for a device model
  function createDeviceState(id, model, type, displayName, x, y) {
    const isSwitch = type === 'switch' || type === 'l3switch';
    const isL3Switch = type === 'l3switch' || model.includes('3560') || model.includes('3650');
    const isRouter = type === 'router';
    const isPC = type === 'pc' || type === 'laptop';
    const isServer = type === 'server';
    const isCloud = type === 'cloud';
    const isAP = type === 'ap' || type === 'wrouter';

    const interfaces = [];
    const baseMac = generateMac(isSwitch ? '000A.41' : isRouter ? '00E0.8F' : '0001.97');

    if (isSwitch) {
      for (let i = 1; i <= 24; i++) {
        interfaces.push({
          name: `FastEthernet0/${i}`,
          type: 'ethernet',
          mac: generateMac('000A.41'),
          adminUp: true, // Switches have ports enabled by default!
          lineUp: false,
          stpState: 'DOWN', // DOWN, LRN, FWD, BLK
          speed: 'auto',
          duplex: 'auto',
          description: '',
          switchport: true,
          mode: 'access', // access, trunk, dynamic auto, dynamic desirable
          accessVlan: 1,
          voiceVlan: null,
          nativeVlan: 1,
          allowedVlans: '1-1005',
          nonegotiate: false,
          portfast: false,
          bpduguard: false,
          channelGroup: null,
          channelMode: null,
          portSecurity: {
            enabled: false,
            maximum: 1,
            violation: 'shutdown',
            sticky: false,
            macAddresses: [],
            violationCount: 0
          },
          ip: '',
          mask: '',
          connectedLinkId: null
        });
      }
      for (let i = 1; i <= 2; i++) {
        interfaces.push({
          name: `GigabitEthernet0/${i}`,
          type: 'ethernet',
          mac: generateMac('000A.41'),
          adminUp: true,
          lineUp: false,
          stpState: 'DOWN',
          speed: 'auto',
          duplex: 'auto',
          description: '',
          switchport: true,
          mode: 'access',
          accessVlan: 1,
          voiceVlan: null,
          nativeVlan: 1,
          allowedVlans: '1-1005',
          nonegotiate: false,
          portfast: false,
          bpduguard: false,
          channelGroup: null,
          channelMode: null,
          portSecurity: {
            enabled: false,
            maximum: 1,
            violation: 'shutdown',
            sticky: false,
            macAddresses: [],
            violationCount: 0
          },
          ip: '',
          mask: '',
          connectedLinkId: null
        });
      }
      // Default SVI Vlan1
      interfaces.push({
        name: 'Vlan1',
        type: 'svi',
        mac: baseMac,
        adminUp: false, // Vlan1 is administratively down by default in Packet Tracer
        lineUp: false,
        ip: '',
        mask: '',
        helperAddress: '',
        description: '',
        connectedLinkId: null
      });
      interfaces.push({
        name: 'Console',
        type: 'console',
        adminUp: true,
        lineUp: false,
        connectedLinkId: null
      });
    } else if (isRouter) {
      const giPrefix = (model.includes('4331') || model.includes('4321')) ? 'GigabitEthernet0/0/' :
                       (model.includes('1941') || model.includes('2901') || model.includes('2911')) ? 'GigabitEthernet0/' :
                       'FastEthernet0/';
      const count = model.includes('4331') || model.includes('2911') ? 3 : 2;
      const startIdx = 0;
      for (let i = startIdx; i < startIdx + count; i++) {
        interfaces.push({
          name: `${giPrefix}${i}`,
          type: 'ethernet',
          mac: generateMac('00E0.8F'),
          adminUp: false, // Router ports are administratively down by default!
          lineUp: false,
          speed: 'auto',
          duplex: 'auto',
          description: '',
          ip: '',
          mask: '',
          helperAddress: '',
          natDir: null, // 'inside' | 'outside'
          aclIn: null,
          aclOut: null,
          connectedLinkId: null
        });
      }
      for (let i = 0; i < 2; i++) {
        interfaces.push({
          name: `Serial0/0/${i}`,
          type: 'serial',
          mac: generateMac('00E0.8F'),
          adminUp: false,
          lineUp: false,
          clockRate: 64000,
          encapsulation: 'hdlc',
          description: '',
          ip: '',
          mask: '',
          helperAddress: '',
          natDir: null,
          connectedLinkId: null
        });
      }
      interfaces.push({
        name: 'Console',
        type: 'console',
        adminUp: true,
        lineUp: false,
        connectedLinkId: null
      });
    } else if (isPC || isServer) {
      interfaces.push({
        name: 'FastEthernet0',
        type: 'ethernet',
        mac: baseMac,
        adminUp: true,
        lineUp: false,
        speed: 'auto',
        duplex: 'auto',
        ip: '',
        mask: '',
        connectedLinkId: null
      });
      interfaces.push({
        name: 'RS 232',
        type: 'rs232',
        adminUp: true,
        lineUp: false,
        connectedLinkId: null
      });
    } else {
      for (let i = 0; i < 4; i++) {
        interfaces.push({
          name: `Ethernet${i}`,
          type: 'ethernet',
          mac: generateMac('000F.24'),
          adminUp: true,
          lineUp: false,
          ip: '',
          mask: '',
          connectedLinkId: null
        });
      }
    }

    const hostname = isSwitch ? 'Switch' : isRouter ? 'Router' : displayName;

    return {
      id,
      model,
      type: isL3Switch ? 'l3switch' : type,
      displayName,
      hostname,
      x,
      y,
      poweredOn: true,
      baseMac,
      interfaces,
      // Switching & VLAN state
      vlans: {
        1: { id: 1, name: 'default', status: 'active' },
        1002: { id: 1002, name: 'fddi-default', status: 'active' },
        1003: { id: 1003, name: 'token-ring-default', status: 'active' },
        1004: { id: 1004, name: 'fddinet-default', status: 'active' },
        1005: { id: 1005, name: 'trnet-default', status: 'active' }
      },
      vtp: {
        version: 2,
        mode: 'server', // server, client, transparent
        domain: '',
        password: '',
        revision: 0
      },
      stp: {
        mode: 'pvst', // pvst, rapid-pvst
        portfastDefault: false,
        priorities: { 1: 32768 }
      },
      macTable: [], // { vlan: 1, mac: '...', type: 'DYNAMIC'|'STATIC', port: 'FastEthernet0/1' }
      // L3 & Security state
      ipRouting: isRouter ? true : false, // L3 switch starts false until `ip routing`
      defaultGateway: '',
      dnsServer: '0.0.0.0',
      ipMode: 'static', // 'static' | 'dhcp' for PC/Server
       ipv6Address: '',
      ipv6LinkLocal: 'FE80::' + baseMac.replace(/\./g, ':'),
      staticRoutes: [], // { network, mask, nextHop, exitInterface, distance }
      rip: {
        enabled: false,
        version: 1,
        autoSummary: true,
        networks: [],
        passiveInterfaces: []
      },
      ospf: {
        processes: {} // processId -> { routerId, networks: [{ network, wildcard, area }], passiveInterfaces: [] }
      },
      eigrp: {
        asNumber: null,
        networks: [],
        autoSummary: false
      },
      dhcpExcluded: [], // { low, high }
      dhcpPools: {}, // poolName -> { name, network, mask, defaultRouter, dnsServer, domainName }
      dhcpBindings: [], // { ip, mac, type: 'Automatic', expiration: '--' }
      arpTable: [], // { ip, mac, interface, age }
      acls: {}, // nameOrNum -> { type: 'standard'|'extended', rules: [] }
      nat: {
        overloadList: null,
        overloadInterface: null,
        staticMappings: [], // { insideLocal, insideGlobal }
        translations: []
      },
      // System & Line Security
      enablePassword: '',
      enableSecret: '',
      servicePasswordEncryption: false,
      noDomainLookup: false,
      domainName: '',
      bannerMotd: '',
      sshVersion: 1,
      rsaKeyModulus: 0,
      users: {}, // username -> { privilege, secret, password }
      lines: {
        'con 0': { password: '', login: false, execTimeout: '10 0', loggingSync: false, transportInput: 'all' },
        'vty 0 4': { password: '', login: true, execTimeout: '10 0', loggingSync: false, transportInput: 'all' },
        'vty 5 15': { password: '', login: true, execTimeout: '10 0', loggingSync: false, transportInput: 'all' }
      },
      // Server Services (for Server-PT)
      services: {
        http: true,
        https: true,
        dhcp: false,
        dhcpPool: { startIp: '192.168.1.100', mask: '255.255.255.0', gateway: '192.168.1.1', dns: '192.168.1.2', maxUsers: 50 },
        dns: false,
        dnsRecords: [
          { name: 'www.cisco.com', address: '192.168.1.254' },
          { name: 'server.local', address: '192.168.1.2' }
        ]
      },
      // CLI Session State
      cli: {
        mode: isRouter ? 'init-dialog' : 'user', // init-dialog, console-login, user, enable-password, priv, config, config-if, config-subif, config-vlan, config-line, dhcp-config, config-router, config-nacl
        selectedInterfaces: [], // array of interface names (supports range)
        selectedVlan: null,
        selectedLine: null,
        selectedDhcpPool: null,
        selectedRouterProto: null, // { proto: 'ospf'|'rip'|'eigrp', id: 1 }
        selectedAcl: null,
        history: [],
        historyIdx: -1,
        outputBuffer: isRouter
          ? `System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)\nCisco ${model} (revision 1.0) with 491520K/32768K bytes of memory.\n\n         --- System Configuration Dialog ---\n\nWould you like to enter the initial configuration dialog? [yes/no]: `
          : `Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE4, RELEASE SOFTWARE (fc1)\nCisco WS-C2960-24TT-L (PowerPC405) processor (revision B0) with 65536K bytes of memory.\n\nPress RETURN to get started!\n\nSwitch>`,
        equivBuffer: 'Press RETURN to get started!\n',
        startupConfig: null
      },
      // PC Command Prompt Session State
      cmd: {
        history: [],
        historyIdx: -1,
        outputBuffer: `Cisco Packet Tracer PC Command Line 1.0\nC:\\>`
      }
    };
  }

  function getPrompt(dev) {
    const c = dev.cli;
    const h = dev.hostname || (dev.type === 'router' ? 'Router' : 'Switch');
    switch (c.mode) {
      case 'init-dialog': return 'Would you like to enter the initial configuration dialog? [yes/no]: ';
      case 'console-login': return 'Password: ';
      case 'enable-password': return 'Password: ';
      case 'user': return `${h}>`;
      case 'priv': return `${h}#`;
      case 'config': return `${h}(config)#`;
      case 'config-if':
        return c.selectedInterfaces && c.selectedInterfaces.length > 1
          ? `${h}(config-if-range)#`
          : `${h}(config-if)#`;
      case 'config-subif': return `${h}(config-subif)#`;
      case 'config-vlan': return `${h}(config-vlan)#`;
      case 'config-line': return `${h}(config-line)#`;
      case 'dhcp-config': return `${h}(dhcp-config)#`;
      case 'config-router': return `${h}(config-router)#`;
      case 'config-nacl': return `${h}(config-ext-nacl)#`;
      default: return `${h}>`;
    }
  }

  // Generate authentic `show running-config` output
  function generateRunningConfig(dev) {
    const lines = [];
    lines.push('Building configuration...');
    lines.push('');
    lines.push('Current configuration : 1482 bytes');
    lines.push('!');
    lines.push('version 15.0');
    lines.push(dev.servicePasswordEncryption ? 'service password-encryption' : 'no service timestamps log datetime msec');
    lines.push('no service timestamps debug datetime msec');
    lines.push('!');
    lines.push(`hostname ${dev.hostname}`);
    lines.push('!');
    if (dev.enableSecret) {
      lines.push(`enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0`);
    }
    if (dev.enablePassword) {
      lines.push(dev.servicePasswordEncryption ? `enable password 7 0822455D0A16` : `enable password ${dev.enablePassword}`);
    }
    if (dev.noDomainLookup) {
      lines.push('no ip domain-lookup');
    }
    if (dev.domainName) {
      lines.push(`ip domain-name ${dev.domainName}`);
    }
    if (dev.ipRouting && dev.type === 'l3switch') {
      lines.push('ip routing');
    }
    for (const [poolName, pool] of Object.entries(dev.dhcpPools || {})) {
      lines.push(`ip dhcp pool ${poolName}`);
      if (pool.network) lines.push(` network ${pool.network} ${pool.mask}`);
      if (pool.defaultRouter) lines.push(` default-router ${pool.defaultRouter}`);
      if (pool.dnsServer) lines.push(` dns-server ${pool.dnsServer}`);
      if (pool.domainName) lines.push(` domain-name ${pool.domainName}`);
      lines.push('!');
    }
    for (const ex of (dev.dhcpExcluded || [])) {
      lines.push(`ip dhcp excluded-address ${ex.low}${ex.high && ex.high !== ex.low ? ' ' + ex.high : ''}`);
    }
    for (const [u, info] of Object.entries(dev.users || {})) {
      const privStr = info.privilege ? ` privilege ${info.privilege}` : '';
      if (info.secret) {
        lines.push(`username ${u}${privStr} secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0`);
      } else {
        lines.push(`username ${u}${privStr} password ${dev.servicePasswordEncryption ? '7 0822455D' : info.password}`);
      }
    }
    lines.push(`spanning-tree mode ${dev.stp.mode}`);
    if (dev.stp.portfastDefault) lines.push('spanning-tree portfast default');
    lines.push('!');

    for (const iface of dev.interfaces) {
      if (iface.type === 'console' || iface.type === 'rs232') continue;
      lines.push(`interface ${iface.name}`);
      if (iface.description) lines.push(` description ${iface.description}`);
      if (iface.encapsulation && iface.name.includes('.')) {
        lines.push(` encapsulation dot1Q ${iface.vlanId || 1}${iface.isNative ? ' native' : ''}`);
      }
      if (iface.switchport === false && (dev.type === 'l3switch')) {
        lines.push(' no switchport');
      }
      if (iface.switchport) {
        if (iface.mode === 'access' && iface.accessVlan !== 1) {
          lines.push(` switchport access vlan ${iface.accessVlan}`);
        }
        if (iface.mode && iface.mode !== 'dynamic auto') {
          lines.push(` switchport mode ${iface.mode}`);
        }
        if (iface.nativeVlan && iface.nativeVlan !== 1) {
          lines.push(` switchport trunk native vlan ${iface.nativeVlan}`);
        }
        if (iface.allowedVlans && iface.allowedVlans !== '1-1005') {
          lines.push(` switchport trunk allowed vlan ${iface.allowedVlans}`);
        }
        if (iface.voiceVlan) {
          lines.push(` switchport voice vlan ${iface.voiceVlan}`);
        }
        if (iface.nonegotiate) {
          lines.push(' switchport nonegotiate');
        }
        if (iface.portSecurity && iface.portSecurity.enabled) {
          lines.push(' switchport port-security');
          if (iface.portSecurity.maximum !== 1) lines.push(` switchport port-security maximum ${iface.portSecurity.maximum}`);
          if (iface.portSecurity.violation !== 'shutdown') lines.push(` switchport port-security violation ${iface.portSecurity.violation}`);
          if (iface.portSecurity.sticky) lines.push(' switchport port-security mac-address sticky');
        }
        if (iface.portfast) lines.push(' spanning-tree portfast');
        if (iface.bpduguard) lines.push(' spanning-tree bpduguard enable');
        if (iface.channelGroup) lines.push(` channel-group ${iface.channelGroup} mode ${iface.channelMode || 'on'}`);
      }
      if (iface.ip && iface.mask) {
        lines.push(` ip address ${iface.ip} ${iface.mask}`);
      } else if (!iface.switchport) {
        lines.push(' no ip address');
      }
      if (iface.helperAddress) {
        lines.push(` ip helper-address ${iface.helperAddress}`);
      }
      if (iface.natDir) {
        lines.push(` ip nat ${iface.natDir}`);
      }
      if (iface.duplex && iface.duplex !== 'auto') lines.push(` duplex ${iface.duplex}`);
      if (iface.speed && iface.speed !== 'auto') lines.push(` speed ${iface.speed}`);
      if (iface.type === 'serial' && iface.clockRate) lines.push(` clock rate ${iface.clockRate}`);
      if (!iface.adminUp) {
        lines.push(' shutdown');
      }
      lines.push('!');
    }

    if (dev.defaultGateway) {
      lines.push(`ip default-gateway ${dev.defaultGateway}`);
    }
    for (const r of (dev.staticRoutes || [])) {
      lines.push(`ip route ${r.network} ${r.mask} ${r.nextHop || r.exitInterface}${r.distance && r.distance !== 1 ? ' ' + r.distance : ''}`);
    }
    if (dev.rip && dev.rip.enabled) {
      lines.push('router rip');
      if (dev.rip.version === 2) lines.push(' version 2');
      for (const net of dev.rip.networks) lines.push(` network ${net}`);
      if (!dev.rip.autoSummary) lines.push(' no auto-summary');
      lines.push('!');
    }
    for (const [pid, proc] of Object.entries((dev.ospf && dev.ospf.processes) || {})) {
      lines.push(`router ospf ${pid}`);
      if (proc.routerId) lines.push(` router-id ${proc.routerId}`);
      for (const n of proc.networks) {
        lines.push(` network ${n.network} ${n.wildcard} area ${n.area}`);
      }
      lines.push('!');
    }
    if (dev.bannerMotd) {
      lines.push(`banner motd #${dev.bannerMotd}#`);
      lines.push('!');
    }
    for (const [lineName, lcfg] of Object.entries(dev.lines || {})) {
      lines.push(`line ${lineName}`);
      if (lcfg.password) lines.push(` password ${dev.servicePasswordEncryption ? '7 0822455D' : lcfg.password}`);
      if (lcfg.login === 'local') lines.push(' login local');
      else if (lcfg.login) lines.push(' login');
      if (lcfg.loggingSync) lines.push(' logging synchronous');
      if (lcfg.transportInput && lcfg.transportInput !== 'all') lines.push(` transport input ${lcfg.transportInput}`);
      lines.push('!');
    }
    lines.push('end');
    return lines.join('\n');
  }

  // Context-sensitive `?` help per IOS mode
  function getModeHelp(dev, partialInput) {
    const mode = dev.cli.mode;
    const trimmed = (partialInput || '').trim().toLowerCase();

    if (trimmed.startsWith('show')) {
      return [
        '  access-lists       List access lists',
        '  arp                Arp table',
        '  cdp                CDP information',
        '  clock              Display the system clock',
        '  etherchannel       EtherChannel information',
        '  flash:             display information about flash: file system',
        '  history            Display the session command history',
        '  interfaces         Interface status and configuration',
        '  ip                 IP information (interface, route, arp, dhcp, ospf)',
        '  mac                MAC configuration (mac address-table)',
        '  port-security      Show secure port information',
        '  running-config     Current operating configuration',
        '  spanning-tree      Spanning tree topology',
        '  startup-config     Contents of startup configuration',
        '  version            System hardware and software status',
        '  vlan               VTP VLAN status',
        '  vtp                VTP information'
      ].join('\n');
    }

    if (trimmed.startsWith('switchport')) {
      return [
        '  access         Set access mode characteristics of the interface',
        '  mode           Set trunking mode of the interface (access | trunk | dynamic)',
        '  nonegotiate    Device will not engage in negotiation protocol on this interface',
        '  port-security  Security related command',
        '  trunk          Set trunking characteristics of the interface (native | allowed)',
        '  voice          Voice appliance attributes'
      ].join('\n');
    }

    if (trimmed.startsWith('interface')) {
      return [
        '  FastEthernet     FastEthernet IEEE 802.3 (e.g. FastEthernet0/1)',
        '  GigabitEthernet  GigabitEthernet IEEE 802.3z (e.g. GigabitEthernet0/1)',
        '  Port-channel     Ethernet Channel of interfaces',
        '  Serial           Serial (e.g. Serial0/0/0)',
        '  Vlan             Catalyst Vlans (e.g. Vlan1)',
        '  range            Interface range command (e.g. range fa0/1 - 5)'
      ].join('\n');
    }

    if (mode === 'user') {
      return [
        'Exec commands:',
        '  connect     Open a terminal connection',
        '  disable     Turn off privileged commands',
        '  disconnect  Disconnect an existing network connection',
        '  enable      Turn on privileged commands',
        '  exit        Exit from the EXEC',
        '  logout      Exit from the EXEC',
        '  ping        Send echo messages',
        '  show        Show running system information',
        '  ssh         Open a secure shell client connection',
        '  telnet      Open a telnet connection',
        '  terminal    Set terminal line parameters',
        '  traceroute  Trace route to destination'
      ].join('\n');
    }

    if (mode === 'priv') {
      return [
        'Exec commands:',
        '  clear       Reset functions (mac address-table, arp-cache, port-security)',
        '  clock       Manage the system clock',
        '  configure   Enter configuration mode (configure terminal)',
        '  copy        Copy from one file to another (copy running-config startup-config)',
        '  debug       Debugging functions',
        '  delete      Delete a file (delete flash:vlan.dat)',
        '  dir         List files on a filesystem',
        '  disable     Turn off privileged commands',
        '  enable      Turn on privileged commands',
        '  erase       Erase a filesystem (erase startup-config)',
        '  exit        Exit from the EXEC',
        '  ping        Send echo messages',
        '  reload      Halt and perform a cold restart',
        '  show        Show running system information',
        '  ssh         Open a secure shell client connection',
        '  telnet      Open a telnet connection',
        '  traceroute  Trace route to destination',
        '  write       Write running configuration to memory, network, or terminal'
      ].join('\n');
    }

    if (mode === 'config') {
      return [
        'Configure commands:',
        '  access-list   Add an access list entry',
        '  banner        Define a login banner (banner motd #...#)',
        '  cdp           Global CDP configuration subcommands',
        '  crypto        Encryption module (crypto key generate rsa)',
        '  do            To run exec commands in config mode',
        '  enable        Modify enable password parameters (enable secret / password)',
        '  end           Exit from configure mode',
        '  exit          Exit from configure mode',
        '  hostname      Set system\'s network name',
        '  interface     Select an interface to configure',
        '  ip            Global IP configuration subcommands (route, dhcp, default-gateway, routing)',
        '  line          Configure a terminal line (con 0, vty 0 4)',
        '  no            Negate a command or set its defaults',
        '  router        Enable a routing process (ospf, rip, eigrp)',
        '  service       Modify use of network based services (password-encryption)',
        '  spanning-tree Spanning Tree Subsystem',
        '  username      Establish User Name Authentication',
        '  vlan          Vlan commands (vlan <1-1005>)',
        '  vtp           Configure global VTP state (mode, domain, password)'
      ].join('\n');
    }

    if (mode === 'config-if' || mode === 'config-subif') {
      return [
        'Interface configuration commands:',
        '  channel-group  Etherchannel/port bundling configuration',
        '  clock          Configure serial interface clock (clock rate 64000)',
        '  description    Interface specific description',
        '  duplex         Configure duplex operation (auto | full | half)',
        '  encapsulation  Set encapsulation type for an interface (dot1Q <vlan>)',
        '  end            Exit from configure mode',
        '  exit           Exit from interface configuration mode',
        '  ip             Interface Internet Protocol config commands (address, helper-address, nat)',
        '  no             Negate a command or set its defaults (no shutdown)',
        '  shutdown       Shutdown the selected interface',
        '  spanning-tree  Spanning Tree Subsystem (portfast, bpduguard)',
        '  speed          Configure speed operation (10 | 100 | 1000 | auto)',
        '  switchport     Set switching mode characteristics (mode, access, trunk, port-security)'
      ].join('\n');
    }

    if (mode === 'config-vlan') {
      return [
        'VLAN configuration commands:',
        '  exit   Apply changes, bump revision number, and exit mode',
        '  name   Ascii name of the VLAN',
        '  no     Negate a command or set its defaults',
        '  state  Operational state of the VLAN (active | suspend)'
      ].join('\n');
    }

    if (mode === 'config-line') {
      return [
        'Line configuration commands:',
        '  exec-timeout  Set the EXEC timeout',
        '  exit          Exit from line configuration mode',
        '  logging       Modify message logging facilities (logging synchronous)',
        '  login         Enable password checking (login | login local)',
        '  no            Negate a command or set its defaults',
        '  password      Set a password',
        '  transport     Define transport protocols for line (transport input ssh telnet all)'
      ].join('\n');
    }

    if (mode === 'dhcp-config') {
      return [
        'DHCP pool configuration commands:',
        '  default-router  Default routers',
        '  dns-server      DNS servers',
        '  domain-name     Domain name',
        '  exit            Exit from DHCP pool configuration mode',
        '  network         Network number and mask (network A.B.C.D A.B.C.D)'
      ].join('\n');
    }

    if (mode === 'config-router') {
      return [
        'Router configuration commands:',
        '  auto-summary       Enable automatic network number summarization',
        '  default-information Control distribution of default information',
        '  exit               Exit from routing protocol configuration mode',
        '  network            Enable routing on an IP network',
        '  no                 Negate a command or set its defaults',
        '  passive-interface  Suppress routing updates on an interface',
        '  router-id          router-id for this OSPF process',
        '  version            Set routing protocol version (version 2)'
      ].join('\n');
    }

    return '  exit  Exit current mode';
  }

  // Tab Autocomplete for Cisco IOS
  function autocompleteIosCommand(dev, rawLine) {
    const mode = dev.cli.mode;
    const trimmed = rawLine.trimStart();
    const parts = trimmed.split(/\s+/);
    const last = (parts[parts.length - 1] || '').toLowerCase();

    const dictByMode = {
      user: ['enable', 'show', 'ping', 'traceroute', 'ssh', 'telnet', 'exit', 'logout'],
      priv: ['configure', 'terminal', 'show', 'running-config', 'startup-config', 'interfaces', 'ip', 'vlan', 'brief', 'trunk', 'status', 'mac', 'address-table', 'spanning-tree', 'cdp', 'neighbors', 'arp', 'route', 'copy', 'write', 'memory', 'erase', 'reload', 'ping', 'traceroute', 'clear', 'disable', 'exit'],
      config: ['hostname', 'interface', 'FastEthernet', 'GigabitEthernet', 'Serial', 'Vlan', 'range', 'vlan', 'ip', 'route', 'default-gateway', 'dhcp', 'pool', 'excluded-address', 'routing', 'domain-name', 'domain-lookup', 'enable', 'secret', 'password', 'service', 'password-encryption', 'username', 'line', 'console', 'vty', 'banner', 'motd', 'router', 'ospf', 'rip', 'eigrp', 'spanning-tree', 'vtp', 'access-list', 'no', 'do', 'exit', 'end'],
      'config-if': ['switchport', 'mode', 'access', 'trunk', 'vlan', 'native', 'allowed', 'port-security', 'maximum', 'violation', 'mac-address', 'sticky', 'nonegotiate', 'voice', 'ip', 'address', 'helper-address', 'nat', 'inside', 'outside', 'shutdown', 'no', 'description', 'duplex', 'speed', 'clock', 'rate', 'encapsulation', 'dot1Q', 'spanning-tree', 'portfast', 'bpduguard', 'channel-group', 'exit', 'end'],
      'config-subif': ['encapsulation', 'dot1Q', 'ip', 'address', 'no', 'shutdown', 'description', 'exit', 'end'],
      'config-vlan': ['name', 'state', 'active', 'exit', 'end'],
      'config-line': ['password', 'login', 'local', 'logging', 'synchronous', 'transport', 'input', 'ssh', 'telnet', 'all', 'exec-timeout', 'exit', 'end'],
      'dhcp-config': ['network', 'default-router', 'dns-server', 'domain-name', 'exit', 'end'],
      'config-router': ['network', 'area', 'version', 'auto-summary', 'passive-interface', 'router-id', 'no', 'exit', 'end']
    };

    const words = dictByMode[mode] || dictByMode.priv;
    if (!last) return rawLine;

    // Special interface expansion (e.g., fa0/1 -> FastEthernet0/1)
    const normIf = normalizeInterfaceName(last, dev);
    if (normIf && parts.length >= 2) {
      parts[parts.length - 1] = normIf;
      return parts.join(' ');
    }

    const matches = words.filter(w => w.toLowerCase().startsWith(last));
    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0];
      return parts.join(' ') + ' ';
    }
    return rawLine;
  }

  // Execute a single IOS command line and return text output
  function executeIosCommand(dev, rawCmd, networkContext) {
    const c = dev.cli;
    const line = rawCmd.replace(/\r/g, '');
    const trimmed = line.trim();

    // Handle router initial configuration dialog
    if (c.mode === 'init-dialog') {
      const ans = trimmed.toLowerCase();
      if (ans === 'n' || ans === 'no' || ans === '') {
        c.mode = 'user';
        return `\n\nPress RETURN to get started!\n`;
      }
      if (ans === 'y' || ans === 'yes') {
        c.mode = 'user';
        return `\nBasic management setup configures only enough connectivity for management.\nExiting to user EXEC mode.\n`;
      }
      return `\nPlease answer 'yes' or 'no'.\n`;
    }

    // Handle console login prompt
    if (c.mode === 'console-login') {
      const conCfg = dev.lines['con 0'];
      if (conCfg && conCfg.password && trimmed !== conCfg.password) {
        return `\n% Bad passwords`;
      }
      c.mode = 'user';
      return '';
    }

    // Handle enable password prompt
    if (c.mode === 'enable-password') {
      const expected = dev.enableSecret || dev.enablePassword;
      if (expected && trimmed !== expected) {
        c.mode = 'user';
        return `\n% Bad secrets`;
      }
      c.mode = 'priv';
      return '';
    }

    if (!trimmed || trimmed.startsWith('!')) {
      return '';
    }

    // Record history
    if (c.history[c.history.length - 1] !== trimmed) {
      c.history.push(trimmed);
    }
    c.historyIdx = c.history.length;

    // Handle `?` help
    if (trimmed.endsWith('?')) {
      return getModeHelp(dev, trimmed.slice(0, -1));
    }

    // Handle `do <command>` in any config mode
    if (c.mode.startsWith('config') || c.mode === 'dhcp-config') {
      if (/^do\s+/i.test(trimmed)) {
        const subCmd = trimmed.replace(/^do\s+/i, '');
        const savedMode = c.mode;
        c.mode = 'priv';
        const out = executeIosCommand(dev, subCmd, networkContext);
        c.mode = savedMode;
        return out;
      }
    }

    const tokens = trimmed.split(/\s+/);
    const t0 = tokens[0].toLowerCase();
    const t1 = (tokens[1] || '').toLowerCase();
    const t2 = (tokens[2] || '').toLowerCase();
    const t3 = (tokens[3] || '').toLowerCase();

    // Global `end` or `Ctrl+Z`
    if (c.mode !== 'user' && c.mode !== 'priv' && (t0 === 'end')) {
      c.mode = 'priv';
      return `%SYS-5-CONFIG_I: Configured from console by console`;
    }

    // `exit` across modes
    if (t0 === 'exit' || t0 === 'logout') {
      if (c.mode === 'user') {
        if (dev.lines['con 0'] && dev.lines['con 0'].login && dev.lines['con 0'].password) {
          c.mode = 'console-login';
        }
        return `${dev.hostname} con0 is now available\n\nPress RETURN to get started.`;
      }
      if (c.mode === 'priv') {
        c.mode = 'user';
        return '';
      }
      if (c.mode === 'config') {
        c.mode = 'priv';
        return `%SYS-5-CONFIG_I: Configured from console by console`;
      }
      // Sub-config modes return to `config`
      c.mode = 'config';
      return '';
    }

    // ==================== USER & PRIVILEGED EXEC ====================
    if (c.mode === 'user' || c.mode === 'priv') {
      if ('enable'.startsWith(t0) && t0.length >= 2) {
        if (c.mode === 'priv') return '';
        if (dev.enableSecret || dev.enablePassword) {
          c.mode = 'enable-password';
          return '';
        }
        c.mode = 'priv';
        return '';
      }

      if ('disable'.startsWith(t0) && t0.length >= 3) {
        c.mode = 'user';
        return '';
      }

      // ping <ip>
      if ('ping'.startsWith(t0) && t0.length >= 2) {
        const targetIp = tokens[1];
        if (!targetIp) return '% Incomplete command.';
        if (networkContext && typeof networkContext.runPing === 'function') {
          const res = networkContext.runPing(dev, targetIp);
          return res.cliText;
        }
        return `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`;
      }

      // traceroute <ip>
      if ('traceroute'.startsWith(t0) && t0.length >= 5) {
        const targetIp = tokens[1];
        if (!targetIp) return '% Incomplete command.';
        return `Type escape sequence to abort.\nTracing the route to ${targetIp}\n\n  1   ${targetIp}   1 msec   1 msec   1 msec`;
      }

      // show ...
      if ('show'.startsWith(t0) && t0.length >= 2) {
        return handleShowCommand(dev, tokens.slice(1), networkContext);
      }

      // Privileged-only commands
      if (c.mode === 'priv') {
        // configure terminal
        if ('configure'.startsWith(t0) && t0.length >= 4) {
          if (!t1 || 'terminal'.startsWith(t1)) {
            c.mode = 'config';
            return 'Enter configuration commands, one per line.  End with CNTL/Z.';
          }
        }

        // write memory / wr
        if ('write'.startsWith(t0) && t0.length >= 2) {
          if (!t1 || 'memory'.startsWith(t1)) {
            c.startupConfig = generateRunningConfig(dev);
            return 'Building configuration...\n[OK]';
          }
          if ('erase'.startsWith(t1)) {
            c.startupConfig = null;
            return 'Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]\n[OK]\nErase of nvram: complete';
          }
          if ('terminal'.startsWith(t1)) {
            return generateRunningConfig(dev);
          }
        }

        // copy running-config startup-config
        if ('copy'.startsWith(t0) && t0.length >= 3) {
          if (t1 && 'running-config'.startsWith(t1) && t2 && 'startup-config'.startsWith(t2)) {
            c.startupConfig = generateRunningConfig(dev);
            return 'Destination filename [startup-config]? \nBuilding configuration...\n[OK]';
          }
          if (t1 && 'startup-config'.startsWith(t1) && t2 && 'running-config'.startsWith(t2)) {
            return 'Destination filename [running-config]? \n1482 bytes copied in 0.412 secs (3597 bytes/sec)';
          }
        }

        // erase startup-config
        if ('erase'.startsWith(t0) && t0.length >= 3) {
          c.startupConfig = null;
          return 'Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]\n[OK]\nErase of nvram: complete\n%SYS-7-NV_BLOCK_INIT: Initialized the geometry of nvram';
        }

        // delete flash:vlan.dat
        if ('delete'.startsWith(t0) && t0.length >= 3) {
          dev.vlans = {
            1: { id: 1, name: 'default', status: 'active' },
            1002: { id: 1002, name: 'fddi-default', status: 'active' },
            1003: { id: 1003, name: 'token-ring-default', status: 'active' },
            1004: { id: 1004, name: 'fddinet-default', status: 'active' },
            1005: { id: 1005, name: 'trnet-default', status: 'active' }
          };
          return 'Delete filename [vlan.dat]?\nDelete flash:/vlan.dat? [confirm]';
        }

        // clear mac address-table / clear arp-cache / clear port-security
        if ('clear'.startsWith(t0) && t0.length >= 3) {
          if (t1.startsWith('mac')) {
            dev.macTable = dev.macTable.filter(e => e.type === 'STATIC');
            return '';
          }
          if (t1.startsWith('arp') || (t1 === 'ip' && t2.startsWith('arp'))) {
            dev.arpTable = [];
            return '';
          }
          if (t1.startsWith('port-security')) {
            for (const iface of dev.interfaces) {
              if (iface.portSecurity) iface.portSecurity.macAddresses = [];
            }
            return '';
          }
        }

        // reload
        if ('reload'.startsWith(t0) && t0.length >= 3) {
          return 'Proceed with reload? [confirm]\nSystem Bootstrap, Version 15.0(2)SE4, RELEASE SOFTWARE (fc1)\nReload complete.';
        }

        // clock set hh:mm:ss ...
        if ('clock'.startsWith(t0) && t1 === 'set') {
          return '';
        }
      }

      return `% Invalid input detected at '^' marker.`;
    }

    // ==================== GLOBAL CONFIGURATION MODE ====================
    if (c.mode === 'config') {
      const isNo = t0 === 'no';
      const cmd = isNo ? t1 : t0;
      const arg1 = isNo ? tokens[2] : tokens[1];
      const arg2 = isNo ? tokens[3] : tokens[2];
      const arg3 = isNo ? tokens[4] : tokens[3];

      // hostname <WORD>
      if ('hostname'.startsWith(cmd) && cmd.length >= 4) {
        if (isNo) {
          dev.hostname = dev.type === 'router' ? 'Router' : 'Switch';
          return '';
        }
        if (!arg1) return '% Incomplete command.';
        dev.hostname = arg1;
        return '';
      }

      // enable secret / enable password
      if ('enable'.startsWith(cmd) && cmd.length >= 2) {
        if (!arg1) return '% Incomplete command.';
        if ('secret'.startsWith(arg1.toLowerCase())) {
          dev.enableSecret = isNo ? '' : (tokens.slice(isNo ? 3 : 2).join(' '));
          return '';
        }
        if ('password'.startsWith(arg1.toLowerCase())) {
          dev.enablePassword = isNo ? '' : (tokens.slice(isNo ? 3 : 2).join(' '));
          return '';
        }
      }

      // service password-encryption
      if ('service'.startsWith(cmd) && cmd.length >= 4) {
        if (arg1 && 'password-encryption'.startsWith(arg1.toLowerCase())) {
          dev.servicePasswordEncryption = !isNo;
          return '';
        }
        return '';
      }

      // banner motd #...#
      if ('banner'.startsWith(cmd) && cmd.length >= 3) {
        if (isNo) {
          dev.bannerMotd = '';
          return '';
        }
        const motdIdx = trimmed.toLowerCase().indexOf('motd');
        if (motdIdx !== -1) {
          const rest = trimmed.slice(motdIdx + 4).trim();
          const delim = rest[0] || '#';
          const content = rest.slice(1).split(delim)[0] || rest;
          dev.bannerMotd = content;
          return '';
        }
      }

      // username <name> [privilege <n>] secret|password <pass>
      if ('username'.startsWith(cmd) && cmd.length >= 4) {
        if (!arg1) return '% Incomplete command.';
        if (isNo) {
          delete dev.users[arg1];
          return '';
        }
        let priv = 1;
        let pass = '';
        let isSecret = false;
        const restTokens = tokens.slice(2);
        for (let i = 0; i < restTokens.length; i++) {
          const tk = restTokens[i].toLowerCase();
          if ('privilege'.startsWith(tk)) {
            priv = parseInt(restTokens[++i], 10) || 15;
          } else if ('secret'.startsWith(tk)) {
            isSecret = true;
            pass = restTokens.slice(i + 1).join(' ');
            break;
          } else if ('password'.startsWith(tk)) {
            pass = restTokens.slice(i + 1).join(' ');
            break;
          }
        }
        dev.users[arg1] = { privilege: priv, secret: isSecret ? pass : '', password: pass };
        return '';
      }

      // vlan <id> (or vlan 10,20)
      if ('vlan'.startsWith(cmd) && cmd.length >= 2) {
        if (!arg1) return '% Incomplete command.';
        const vid = parseInt(arg1, 10);
        if (isNaN(vid) || vid < 1 || vid > 4094) return '% Invalid VLAN ID.';
        if (isNo) {
          if (vid !== 1) delete dev.vlans[vid];
          return '';
        }
        if (!dev.vlans[vid]) {
          dev.vlans[vid] = { id: vid, name: `VLAN${String(vid).padStart(4, '0')}`, status: 'active' };
          dev.vtp.revision++;
        }
        c.mode = 'config-vlan';
        c.selectedVlan = vid;
        return '';
      }

      // vtp mode / domain / password / version
      if (cmd === 'vtp') {
        if (!arg1) return '% Incomplete command.';
        const sub = arg1.toLowerCase();
        if ('mode'.startsWith(sub) && arg2) {
          dev.vtp.mode = arg2.toLowerCase();
          return `Setting device to VTP ${arg2.toUpperCase()} mode.`;
        }
        if ('domain'.startsWith(sub) && arg2) {
          const old = dev.vtp.domain;
          dev.vtp.domain = arg2;
          return `Changing VTP domain name from ${old || 'NULL'} to ${arg2}`;
        }
        if ('password'.startsWith(sub) && arg2) {
          dev.vtp.password = isNo ? '' : arg2;
          return `Setting device VLAN database password to ${arg2}`;
        }
        if ('version'.startsWith(sub) && arg2) {
          dev.vtp.version = parseInt(arg2, 10) || 2;
          return '';
        }
      }

      // spanning-tree ...
      if ('spanning-tree'.startsWith(cmd) && cmd.length >= 4) {
        if (!arg1) return '% Incomplete command.';
        const sub = arg1.toLowerCase();
        if ('mode'.startsWith(sub) && arg2) {
          dev.stp.mode = arg2.toLowerCase();
          return '';
        }
        if ('portfast'.startsWith(sub)) {
          dev.stp.portfastDefault = !isNo;
          return '';
        }
        if ('vlan'.startsWith(sub) && arg2) {
          const vid = parseInt(arg2, 10) || 1;
          const kw = (tokens[isNo ? 4 : 3] || '').toLowerCase();
          const val = (tokens[isNo ? 5 : 4] || '').toLowerCase();
          if ('priority'.startsWith(kw)) {
            dev.stp.priorities[vid] = isNo ? 32768 : (parseInt(val, 10) || 32768);
            return '';
          }
          if ('root'.startsWith(kw)) {
            dev.stp.priorities[vid] = val.startsWith('sec') ? 28672 : 24576;
            return '';
          }
        }
        return '';
      }

      // interface [range] <name>
      if ('interface'.startsWith(cmd) && cmd.length >= 2) {
        const restAfterInt = trimmed.replace(/^(?:no\s+)?int(?:erface)?\s+/i, '').trim();
        if (!restAfterInt) return '% Incomplete command.';

        if (/^range\s+/i.test(restAfterInt)) {
          const rangeSpec = restAfterInt.replace(/^range\s+/i, '');
          const expanded = expandInterfaceRange(rangeSpec, dev);
          if (!expanded.length) return `% Invalid interface range "${rangeSpec}"`;
          c.selectedInterfaces = expanded;
          c.mode = 'config-if';
          return '';
        }

        const norm = normalizeInterfaceName(restAfterInt, dev);
        if (!norm) return `% Invalid interface type and number`;

        if (isNo) {
          dev.interfaces = dev.interfaces.filter(i => i.name.toLowerCase() !== norm.toLowerCase());
          return '';
        }

        let targetIf = dev.interfaces.find(i => i.name.toLowerCase() === norm.toLowerCase());
        if (!targetIf) {
          // Dynamically create Vlan SVI, Port-channel, Loopback, Tunnel, or Subinterface (e.g., Gi0/0/0.10)
          if (norm.startsWith('Vlan') || norm.startsWith('Port-channel') || norm.startsWith('Loopback') || norm.startsWith('Tunnel') || norm.includes('.')) {
            const isSub = norm.includes('.');
            const parentName = isSub ? norm.split('.')[0] : null;
            const parentIf = parentName ? dev.interfaces.find(i => i.name.toLowerCase() === parentName.toLowerCase()) : null;
            targetIf = {
              name: norm,
              type: norm.startsWith('Vlan') ? 'svi' : isSub ? 'subif' : 'virtual',
              mac: parentIf ? parentIf.mac : dev.baseMac,
              adminUp: norm.startsWith('Loopback') || isSub ? true : false,
              lineUp: norm.startsWith('Loopback') || (parentIf && parentIf.lineUp) ? true : false,
              switchport: false,
              ip: '',
              mask: '',
              helperAddress: '',
              description: '',
              encapsulation: '',
              vlanId: isSub ? parseInt(norm.split('.')[1], 10) : null,
              connectedLinkId: null
            };
            dev.interfaces.push(targetIf);
            if (targetIf.adminUp) {
              c.selectedInterfaces = [targetIf.name];
              c.mode = isSub ? 'config-subif' : 'config-if';
              return `%LINK-5-CHANGED: Interface ${targetIf.name}, changed state to up`;
            }
          } else {
            return `% Invalid interface ${norm}`;
          }
        }
        c.selectedInterfaces = [targetIf.name];
        c.mode = norm.includes('.') ? 'config-subif' : 'config-if';
        return '';
      }

      // ip ...
      if (cmd === 'ip') {
        if (!arg1) return '% Incomplete command.';
        const sub = arg1.toLowerCase();

        // ip routing
        if ('routing'.startsWith(sub)) {
          dev.ipRouting = !isNo;
          return '';
        }

        // ip default-gateway <ip>
        if ('default-gateway'.startsWith(sub) && sub.length >= 7) {
          dev.defaultGateway = isNo ? '' : (arg2 || '');
          return '';
        }

        // ip domain-lookup / ip domain lookup
        if (sub === 'domain-lookup' || (sub === 'domain' && arg2 && 'lookup'.startsWith(arg2.toLowerCase()))) {
          dev.noDomainLookup = isNo;
          return '';
        }

        // ip domain-name <name>
        if (sub === 'domain-name' || (sub === 'domain' && arg2 && 'name'.startsWith(arg2.toLowerCase()))) {
          dev.domainName = isNo ? '' : (sub === 'domain-name' ? arg2 : arg3) || '';
          return '';
        }

        // ip route <network> <mask> <nextHop|if>
        if ('route'.startsWith(sub) && sub.length >= 4) {
          const net = arg2;
          const mask = arg3;
          const nh = tokens[isNo ? 5 : 4];
          if (!net || !mask || !nh) return '% Incomplete command.';
          if (isNo) {
            dev.staticRoutes = dev.staticRoutes.filter(r => !(r.network === net && r.mask === mask));
            return '';
          }
          const exists = dev.staticRoutes.find(r => r.network === net && r.mask === mask && r.nextHop === nh);
          if (!exists) {
            dev.staticRoutes.push({ network: net, mask, nextHop: nh, distance: parseInt(tokens[5], 10) || 1 });
          }
          return '';
        }

        // ip dhcp excluded-address / ip dhcp pool <NAME>
        if ('dhcp'.startsWith(sub)) {
          const dsub = (arg2 || '').toLowerCase();
          if ('excluded-address'.startsWith(dsub)) {
            const low = arg3;
            const high = tokens[isNo ? 5 : 4] || low;
            if (!low) return '% Incomplete command.';
            if (isNo) {
              dev.dhcpExcluded = dev.dhcpExcluded.filter(e => e.low !== low);
            } else {
              dev.dhcpExcluded.push({ low, high });
            }
            return '';
          }
          if ('pool'.startsWith(dsub)) {
            const poolName = arg3;
            if (!poolName) return '% Incomplete command.';
            if (isNo) {
              delete dev.dhcpPools[poolName];
              return '';
            }
            if (!dev.dhcpPools[poolName]) {
              dev.dhcpPools[poolName] = { name: poolName, network: '', mask: '', defaultRouter: '', dnsServer: '', domainName: '' };
            }
            c.selectedDhcpPool = poolName;
            c.mode = 'dhcp-config';
            return '';
          }
        }

        // ip ssh version 2
        if (sub === 'ssh' && arg2 === 'version') {
          dev.sshVersion = parseInt(arg3, 10) || 2;
          return '';
        }

        // ip nat inside source ...
        if (sub === 'nat') {
          return '';
        }

        // ip access-list standard|extended <NAME>
        if ('access-list'.startsWith(sub)) {
          const aclType = (arg2 || 'extended').toLowerCase();
          const aclName = arg3 || 'ACL1';
          if (isNo) {
            delete dev.acls[aclName];
            return '';
          }
          if (!dev.acls[aclName]) dev.acls[aclName] = { type: aclType, rules: [] };
          c.selectedAcl = aclName;
          c.mode = 'config-nacl';
          return '';
        }
      }

      // line con 0 / line vty 0 4 / line vty 0 15
      if ('line'.startsWith(cmd) && cmd.length >= 3) {
        if (!arg1) return '% Incomplete command.';
        const ltype = arg1.toLowerCase();
        if ('console'.startsWith(ltype)) {
          c.selectedLine = 'con 0';
          c.mode = 'config-line';
          return '';
        }
        if ('vty'.startsWith(ltype)) {
          c.selectedLine = 'vty 0 4';
          c.mode = 'config-line';
          return '';
        }
      }

      // router ospf <id> / router rip / router eigrp <as>
      if ('router'.startsWith(cmd) && cmd.length >= 4) {
        if (!arg1) return '% Incomplete command.';
        const proto = arg1.toLowerCase();
        if (proto === 'rip') {
          if (isNo) {
            dev.rip.enabled = false;
            return '';
          }
          dev.rip.enabled = true;
          c.selectedRouterProto = { proto: 'rip', id: 1 };
          c.mode = 'config-router';
          return '';
        }
        if (proto === 'ospf') {
          const pid = parseInt(arg2, 10) || 1;
          if (isNo) {
            delete dev.ospf.processes[pid];
            return '';
          }
          if (!dev.ospf.processes[pid]) {
            dev.ospf.processes[pid] = { routerId: '', networks: [], passiveInterfaces: [] };
          }
          c.selectedRouterProto = { proto: 'ospf', id: pid };
          c.mode = 'config-router';
          return '';
        }
        if (proto === 'eigrp') {
          const asn = parseInt(arg2, 10) || 100;
          dev.eigrp.asNumber = isNo ? null : asn;
          c.selectedRouterProto = { proto: 'eigrp', id: asn };
          c.mode = 'config-router';
          return '';
        }
      }

      // crypto key generate rsa
      if ('crypto'.startsWith(cmd) && t1 === 'key' && 'generate'.startsWith(t2)) {
        if (!dev.domainName) {
          return '% Please define a domain-name first.';
        }
        dev.rsaKeyModulus = 1024;
        return `The name for the keys will be: ${dev.hostname}.${dev.domainName}\nChoose the size of the key modulus in the range of 360 to 2048 for your\n  General Purpose Keys. Choosing a key modulus greater than 512 may take\n  a few minutes.\n\nHow many bits in the modulus [512]: 1024\n% Generating 1024 bit RSA keys, keys will be non-exportable...[OK]\n*Mar 1 0:1:12.412: %SSH-5-ENABLED: SSH 1.99 has been enabled`;
      }

      // access-list <num> permit|deny ...
      if ('access-list'.startsWith(cmd)) {
        const aclNum = arg1;
        if (!aclNum) return '% Incomplete command.';
        if (isNo) {
          delete dev.acls[aclNum];
          return '';
        }
        if (!dev.acls[aclNum]) dev.acls[aclNum] = { type: parseInt(aclNum, 10) < 100 ? 'standard' : 'extended', rules: [] };
        dev.acls[aclNum].rules.push(tokens.slice(2).join(' '));
        return '';
      }

      // cdp run / no cdp run
      if (cmd === 'cdp') return '';

      return `% Invalid input detected at '^' marker.`;
    }

    // ==================== INTERFACE & SUBINTERFACE MODE ====================
    if (c.mode === 'config-if' || c.mode === 'config-subif') {
      const isNo = t0 === 'no';
      const cmd = isNo ? t1 : t0;
      const arg1 = isNo ? tokens[2] : tokens[1];
      const arg2 = isNo ? tokens[3] : tokens[2];
      const arg3 = isNo ? tokens[4] : tokens[3];

      const targets = (c.selectedInterfaces || [])
        .map(n => dev.interfaces.find(i => i.name.toLowerCase() === n.toLowerCase()))
        .filter(Boolean);

      if (!targets.length) return '% No interface selected.';

      // shutdown / no shutdown
      if ('shutdown'.startsWith(cmd) && cmd.length >= 4) {
        const msgs = [];
        for (const iface of targets) {
          iface.adminUp = isNo;
          if (networkContext && typeof networkContext.refreshLinkStates === 'function') {
            networkContext.refreshLinkStates();
          }
          const newState = isNo ? 'up' : 'administratively down';
          msgs.push(`%LINK-5-CHANGED: Interface ${iface.name}, changed state to ${newState}`);
          if (iface.lineUp && isNo) {
            msgs.push(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${iface.name}, changed state to up`);
          }
        }
        return msgs.join('\n');
      }

      // description <LINE>
      if ('description'.startsWith(cmd) && cmd.length >= 4) {
        const desc = isNo ? '' : tokens.slice(1).join(' ');
        for (const iface of targets) iface.description = desc;
        return '';
      }

      // encapsulation dot1Q <vlanId> [native]
      if ('encapsulation'.startsWith(cmd) && cmd.length >= 3) {
        const encType = (arg1 || '').toLowerCase();
        if (encType.startsWith('dot1q')) {
          const vid = parseInt(arg2, 10) || 1;
          const isNat = (arg3 || '').toLowerCase() === 'native';
          for (const iface of targets) {
            iface.encapsulation = 'dot1Q';
            iface.vlanId = vid;
            iface.isNative = isNat;
          }
          return '';
        }
        if (encType === 'ppp' || encType === 'hdlc' || encType === 'frame-relay') {
          for (const iface of targets) iface.encapsulation = encType;
          return '';
        }
      }

      // ip address <ip> <mask> | no ip address | ip helper-address <ip> | ip nat inside|outside
      if (cmd === 'ip') {
        if (!arg1) return '% Incomplete command.';
        const sub = arg1.toLowerCase();
        if ('address'.startsWith(sub) && sub.length >= 4) {
          if (isNo) {
            for (const iface of targets) {
              iface.ip = '';
              iface.mask = '';
            }
            return '';
          }
          if (!arg2 || !arg3) return '% Incomplete command.';
          for (const iface of targets) {
            iface.ip = arg2;
            iface.mask = arg3;
          }
          if (networkContext && typeof networkContext.refreshLinkStates === 'function') {
            networkContext.refreshLinkStates();
          }
          return '';
        }
        if ('helper-address'.startsWith(sub)) {
          for (const iface of targets) iface.helperAddress = isNo ? '' : (arg2 || '');
          return '';
        }
        if (sub === 'nat' && (arg2 === 'inside' || arg2 === 'outside')) {
          for (const iface of targets) iface.natDir = isNo ? null : arg2;
          return '';
        }
      }

      // switchport ... / no switchport
      if ('switchport'.startsWith(cmd) && cmd.length >= 2) {
        if (!arg1) {
          for (const iface of targets) iface.switchport = !isNo;
          return '';
        }
        const sub = arg1.toLowerCase();

        // switchport mode access | trunk | dynamic auto|desirable
        if ('mode'.startsWith(sub)) {
          if (isNo) {
            for (const iface of targets) iface.mode = 'access';
            return '';
          }
          if (!arg2) return '% Incomplete command.';
          const m = arg2.toLowerCase();
          for (const iface of targets) {
            if ('access'.startsWith(m)) iface.mode = 'access';
            else if ('trunk'.startsWith(m)) iface.mode = 'trunk';
            else if ('dynamic'.startsWith(m)) iface.mode = `dynamic ${arg3 || 'auto'}`;
          }
          return '';
        }

        // switchport access vlan <id>
        if ('access'.startsWith(sub)) {
          const vid = parseInt(arg3, 10) || 1;
          let msg = '';
          if (!dev.vlans[vid]) {
            dev.vlans[vid] = { id: vid, name: `VLAN${String(vid).padStart(4, '0')}`, status: 'active' };
            msg = `% Access VLAN does not exist. Creating vlan ${vid}`;
          }
          for (const iface of targets) {
            iface.accessVlan = isNo ? 1 : vid;
          }
          return msg;
        }

        // switchport trunk native vlan <id> | switchport trunk allowed vlan ...
        if ('trunk'.startsWith(sub)) {
          const tsub = (arg2 || '').toLowerCase();
          if ('native'.startsWith(tsub)) {
            const vid = parseInt(tokens[isNo ? 5 : 4], 10) || 1;
            for (const iface of targets) iface.nativeVlan = isNo ? 1 : vid;
            return '';
          }
          if ('allowed'.startsWith(tsub)) {
            const vspec = tokens.slice(isNo ? 5 : 4).join('');
            for (const iface of targets) {
              if (isNo || vspec === 'all') iface.allowedVlans = '1-1005';
              else if (vspec.startsWith('add')) {
                const addV = tokens[isNo ? 6 : 5];
                iface.allowedVlans = iface.allowedVlans === '1-1005' ? addV : `${iface.allowedVlans},${addV}`;
              } else {
                iface.allowedVlans = vspec || '1-1005';
              }
            }
            return '';
          }
          if ('encapsulation'.startsWith(tsub)) {
            return '';
          }
        }

        // switchport voice vlan <id>
        if ('voice'.startsWith(sub)) {
          const vid = parseInt(arg3, 10) || 1;
          for (const iface of targets) iface.voiceVlan = isNo ? null : vid;
          return '';
        }

        // switchport nonegotiate
        if ('nonegotiate'.startsWith(sub)) {
          for (const iface of targets) iface.nonegotiate = !isNo;
          return '';
        }

        // switchport port-security ...
        if ('port-security'.startsWith(sub)) {
          for (const iface of targets) {
            if (!iface.portSecurity) {
              iface.portSecurity = { enabled: false, maximum: 1, violation: 'shutdown', sticky: false, macAddresses: [], violationCount: 0 };
            }
            if (!arg2) {
              iface.portSecurity.enabled = !isNo;
            } else if ('maximum'.startsWith(arg2.toLowerCase())) {
              iface.portSecurity.maximum = isNo ? 1 : (parseInt(arg3, 10) || 1);
            } else if ('violation'.startsWith(arg2.toLowerCase())) {
              iface.portSecurity.violation = isNo ? 'shutdown' : (arg3 || 'shutdown').toLowerCase();
            } else if ('mac-address'.startsWith(arg2.toLowerCase())) {
              if (arg3 && 'sticky'.startsWith(arg3.toLowerCase())) {
                iface.portSecurity.sticky = !isNo;
              } else if (arg3) {
                if (!iface.portSecurity.macAddresses.includes(arg3.toUpperCase())) {
                  iface.portSecurity.macAddresses.push(arg3.toUpperCase());
                }
              }
            }
          }
          return '';
        }
      }

      // spanning-tree portfast / bpduguard
      if ('spanning-tree'.startsWith(cmd) && cmd.length >= 4) {
        const sub = (arg1 || '').toLowerCase();
        if ('portfast'.startsWith(sub)) {
          for (const iface of targets) {
            iface.portfast = !isNo;
            if (iface.lineUp) iface.stpState = 'FWD';
          }
          return `%Warning: portfast should only be enabled on ports connected to a single host.`;
        }
        if ('bpduguard'.startsWith(sub)) {
          const enable = !isNo && (!arg2 || arg2.toLowerCase() === 'enable');
          for (const iface of targets) iface.bpduguard = enable;
          return '';
        }
      }

      // channel-group <num> mode <mode>
      if ('channel-group'.startsWith(cmd) && cmd.length >= 4) {
        const grp = parseInt(arg1, 10) || 1;
        const chMode = tokens[isNo ? 4 : 3] || 'active';
        for (const iface of targets) {
          iface.channelGroup = isNo ? null : grp;
          iface.channelMode = isNo ? null : chMode;
        }
        if (!isNo && !dev.interfaces.find(i => i.name === `Port-channel${grp}`)) {
          dev.interfaces.push({
            name: `Port-channel${grp}`,
            type: 'port-channel',
            mac: dev.baseMac,
            adminUp: true,
            lineUp: true,
            stpState: 'FWD',
            switchport: true,
            mode: targets[0].mode || 'access',
            accessVlan: targets[0].accessVlan || 1,
            nativeVlan: 1,
            allowedVlans: '1-1005',
            ip: '',
            mask: ''
          });
          return `Creating a port-channel interface Port-channel ${grp}`;
        }
        return '';
      }

      // duplex / speed / clock rate
      if ('duplex'.startsWith(cmd) && cmd.length >= 3) {
        for (const iface of targets) iface.duplex = isNo ? 'auto' : (arg1 || 'auto');
        return '';
      }
      if ('speed'.startsWith(cmd) && cmd.length >= 3) {
        for (const iface of targets) iface.speed = isNo ? 'auto' : (arg1 || 'auto');
        return '';
      }
      if ('clock'.startsWith(cmd) && arg1 === 'rate') {
        for (const iface of targets) iface.clockRate = isNo ? 0 : (parseInt(arg2, 10) || 64000);
        return '';
      }
    }

    // ==================== VLAN CONFIGURATION MODE ====================
    if (c.mode === 'config-vlan') {
      const vid = c.selectedVlan || 1;
      const vobj = dev.vlans[vid];
      if (!vobj) return '';
      if ('name'.startsWith(t0) && t0.length >= 2) {
        if (!tokens[1]) return '% Incomplete command.';
        vobj.name = tokens[1];
        dev.vtp.revision++;
        return '';
      }
      if (t0 === 'no' && 'name'.startsWith(t1)) {
        vobj.name = `VLAN${String(vid).padStart(4, '0')}`;
        return '';
      }
      if ('state'.startsWith(t0) && tokens[1]) {
        vobj.status = tokens[1].toLowerCase();
        return '';
      }
    }

    // ==================== LINE CONFIGURATION MODE ====================
    if (c.mode === 'config-line') {
      const lcfg = dev.lines[c.selectedLine || 'con 0'];
      if (!lcfg) return '';
      if ('password'.startsWith(t0) && t0.length >= 4) {
        lcfg.password = tokens.slice(1).join(' ');
        return '';
      }
      if ('login'.startsWith(t0) && t0.length >= 3) {
        lcfg.login = t1 === 'local' ? 'local' : true;
        return '';
      }
      if (t0 === 'no' && 'login'.startsWith(t1)) {
        lcfg.login = false;
        return '';
      }
      if ('logging'.startsWith(t0) && 'synchronous'.startsWith(t1)) {
        lcfg.loggingSync = true;
        return '';
      }
      if ('transport'.startsWith(t0) && 'input'.startsWith(t1)) {
        lcfg.transportInput = tokens.slice(2).join(' ') || 'all';
        return '';
      }
      if ('exec-timeout'.startsWith(t0)) {
        lcfg.execTimeout = tokens.slice(1).join(' ');
        return '';
      }
    }

    // ==================== DHCP POOL CONFIGURATION MODE ====================
    if (c.mode === 'dhcp-config') {
      const pool = dev.dhcpPools[c.selectedDhcpPool];
      if (!pool) return '';
      if ('network'.startsWith(t0) && tokens[1] && tokens[2]) {
        pool.network = tokens[1];
        pool.mask = tokens[2];
        return '';
      }
      if ('default-router'.startsWith(t0) && tokens[1]) {
        pool.defaultRouter = tokens[1];
        return '';
      }
      if ('dns-server'.startsWith(t0) && tokens[1]) {
        pool.dnsServer = tokens[1];
        return '';
      }
      if ('domain-name'.startsWith(t0) && tokens[1]) {
        pool.domainName = tokens[1];
        return '';
      }
    }

    // ==================== ROUTER PROTOCOL CONFIGURATION MODE ====================
    if (c.mode === 'config-router') {
      const rp = c.selectedRouterProto || { proto: 'rip', id: 1 };
      const isNo = t0 === 'no';
      const cmd = isNo ? t1 : t0;
      const arg1 = isNo ? tokens[2] : tokens[1];
      const arg2 = isNo ? tokens[3] : tokens[2];
      const arg3 = isNo ? tokens[4] : tokens[3];
      const arg4 = isNo ? tokens[5] : tokens[4];

      if (rp.proto === 'rip') {
        if ('version'.startsWith(cmd)) {
          dev.rip.version = isNo ? 1 : (parseInt(arg1, 10) || 2);
          return '';
        }
        if ('network'.startsWith(cmd) && arg1) {
          if (isNo) dev.rip.networks = dev.rip.networks.filter(n => n !== arg1);
          else if (!dev.rip.networks.includes(arg1)) dev.rip.networks.push(arg1);
          return '';
        }
        if ('auto-summary'.startsWith(cmd)) {
          dev.rip.autoSummary = !isNo;
          return '';
        }
        if ('passive-interface'.startsWith(cmd) && arg1) {
          const norm = normalizeInterfaceName(arg1, dev) || arg1;
          if (!dev.rip.passiveInterfaces.includes(norm)) dev.rip.passiveInterfaces.push(norm);
          return '';
        }
      }

      if (rp.proto === 'ospf') {
        const proc = dev.ospf.processes[rp.id];
        if (!proc) return '';
        if ('router-id'.startsWith(cmd) && arg1) {
          proc.routerId = arg1;
          return '';
        }
        if ('network'.startsWith(cmd) && arg1 && arg2) {
          const area = arg3 === 'area' ? (arg4 || '0') : '0';
          if (isNo) {
            proc.networks = proc.networks.filter(n => n.network !== arg1);
          } else {
            proc.networks.push({ network: arg1, wildcard: arg2, area });
          }
          return '';
        }
        if ('passive-interface'.startsWith(cmd) && arg1) {
          const norm = normalizeInterfaceName(arg1, dev) || arg1;
          proc.passiveInterfaces.push(norm);
          return '';
        }
      }

      if (rp.proto === 'eigrp') {
        if ('network'.startsWith(cmd) && arg1) {
          dev.eigrp.networks.push(arg1);
          return '';
        }
        if ('auto-summary'.startsWith(cmd)) {
          dev.eigrp.autoSummary = !isNo;
          return '';
        }
      }
    }

    // ==================== NAMED ACL MODE ====================
    if (c.mode === 'config-nacl') {
      const acl = dev.acls[c.selectedAcl];
      if (!acl) return '';
      if (t0 === 'permit' || t0 === 'deny' || t0 === 'remark') {
        acl.rules.push(trimmed);
        return '';
      }
    }

    // Cisco IOS automatic fallback from sub-configuration mode to global configuration mode
    if (c.mode !== 'config' && (c.mode.startsWith('config-') || c.mode === 'dhcp-config')) {
      const prevMode = c.mode;
      c.mode = 'config';
      const fallbackOut = executeIosCommand(dev, rawCmd, networkContext);
      if (fallbackOut === `% Invalid input detected at '^' marker.`) {
        c.mode = prevMode;
      }
      return fallbackOut;
    }

    return `% Invalid input detected at '^' marker.`;
  }

  // Handle all `show ...` commands with authentic Cisco Packet Tracer formatting
  function handleShowCommand(dev, args, networkContext) {
    const a0 = (args[0] || '').toLowerCase();
    const a1 = (args[1] || '').toLowerCase();
    const a2 = (args[2] || '').toLowerCase();

    if (!a0) return '% Incomplete command.';

    // show running-config
    if ('running-config'.startsWith(a0) && a0.length >= 3) {
      return generateRunningConfig(dev);
    }

    // show startup-config
    if ('startup-config'.startsWith(a0) && a0.length >= 5) {
      return dev.cli.startupConfig || 'startup-config is not present';
    }

    // show version
    if ('version'.startsWith(a0) && a0.length >= 3) {
      const isRouter = dev.type === 'router';
      return isRouter
        ? `Cisco IOS Software, ${dev.model} Software (C1900-UNIVERSALK9-M), Version 15.1(4)M4, RELEASE SOFTWARE (fc2)\nTechnical Support: http://www.cisco.com/techsupport\nCopyright (c) 1986-2023 by Cisco Systems, Inc.\n\nROM: System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)\n${dev.hostname} uptime is 18 minutes\nSystem image file is "flash0:c1900-universalk9-mz.SPA.151-4.M4.bin"\n\nCisco ${dev.model} (revision 1.0) with 491520K/32768K bytes of memory.\nProcessor board ID FTX152400KS\n2 Gigabit Ethernet interfaces\n2 Serial(sync/async) network interface(s)\nDRAM configuration is 64 bits wide with parity disabled.\n255K bytes of non-volatile configuration memory.\n249856K bytes of ATA System CompactFlash 0 (Read/Write)\n\nConfiguration register is 0x2102`
        : `Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE4, RELEASE SOFTWARE (fc1)\nTechnical Support: http://www.cisco.com/techsupport\nCopyright (c) 1986-2023 by Cisco Systems, Inc.\n\nROM: Bootstrap program is C2960 boot loader\n${dev.hostname} uptime is 24 minutes\nSystem returned to ROM by power-on\nSystem image file is "flash:c2960-lanbasek9-mz.150-2.SE4.bin"\n\ncisco WS-C2960-24TT-L (PowerPC405) processor (revision B0) with 65536K bytes of memory.\nProcessor board ID FOC1010X104\nLast reset from power-on\n1 Virtual Ethernet interface\n24 FastEthernet interfaces\n2 Gigabit Ethernet interfaces\nThe password-recovery mechanism is enabled.\n\n64K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : ${dev.baseMac}\nConfiguration register is 0xF`;
    }

    // show vlan [brief]
    if ('vlan'.startsWith(a0) && a0.length >= 2) {
      const lines = [];
      lines.push('');
      lines.push('VLAN Name                             Status    Ports');
      lines.push('---- -------------------------------- --------- -------------------------------');
      const sortedVlans = Object.values(dev.vlans).sort((x, y) => x.id - y.id);
      for (const v of sortedVlans) {
        const assignedPorts = dev.interfaces
          .filter(i => i.switchport && i.mode === 'access' && i.accessVlan === v.id && i.type === 'ethernet')
          .map(i => shortIfName(i.name));
        const portChunks = [];
        for (let i = 0; i < assignedPorts.length; i += 4) {
          portChunks.push(assignedPorts.slice(i, i + 4).join(', '));
        }
        const firstLinePorts = portChunks[0] || '';
        lines.push(
          `${String(v.id).padEnd(4)} ${v.name.padEnd(32)} ${v.status.padEnd(9)} ${firstLinePorts}`
        );
        for (let k = 1; k < portChunks.length; k++) {
          lines.push(`${''.padEnd(48)}${portChunks[k]}`);
        }
      }
      return lines.join('\n');
    }

    // show ip ...
    if (a0 === 'ip') {
      // show ip interface brief
      if ('interface'.startsWith(a1) && (!a2 || 'brief'.startsWith(a2))) {
        const lines = [];
        lines.push('Interface              IP-Address      OK? Method Status                Protocol');
        for (const iface of dev.interfaces) {
          if (iface.type === 'console' || iface.type === 'rs232') continue;
          const ipStr = iface.ip || 'unassigned';
          const method = iface.ip ? 'manual' : 'unset';
          const status = !iface.adminUp ? 'administratively down' : (iface.lineUp ? 'up' : 'down');
          const proto = iface.adminUp && iface.lineUp ? 'up' : 'down';
          lines.push(
            `${iface.name.padEnd(22)} ${ipStr.padEnd(15)} YES ${method.padEnd(6)} ${status.padEnd(21)} ${proto}`
          );
        }
        return lines.join('\n');
      }

      // show ip route
      if ('route'.startsWith(a1)) {
        const lines = [
          'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
          '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
          '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2',
          '       E1 - OSPF external type 1, E2 - OSPF external type 2',
          '       * - candidate default, U - per-user static route',
          ''
        ];
        if (dev.defaultGateway) {
          lines.push(`Gateway of last resort is ${dev.defaultGateway} to network 0.0.0.0`);
        } else {
          const defRoute = (dev.staticRoutes || []).find(r => r.network === '0.0.0.0');
          lines.push(defRoute
            ? `Gateway of last resort is ${defRoute.nextHop} to network 0.0.0.0`
            : 'Gateway of last resort is not set');
        }
        lines.push('');

        // Connected routes
        for (const iface of dev.interfaces) {
          if (iface.ip && iface.mask && iface.adminUp && iface.lineUp) {
            const cidr = maskToCidr(iface.mask);
            const netInt = ipToInt(iface.ip) & ipToInt(iface.mask);
            const netIp = intToIp(netInt >>> 0);
            lines.push(`C    ${netIp}/${cidr} is directly connected, ${iface.name}`);
            lines.push(`L    ${iface.ip}/32 is directly connected, ${iface.name}`);
          }
        }
        // Static routes
        for (const r of (dev.staticRoutes || [])) {
          const cidr = maskToCidr(r.mask);
          const code = r.network === '0.0.0.0' ? 'S*' : 'S ';
          lines.push(`${code}   ${r.network}/${cidr} [${r.distance || 1}/0] via ${r.nextHop}`);
        }
        // Dynamic routes from networkContext
        if (networkContext && typeof networkContext.getDynamicRoutes === 'function') {
          const dyn = networkContext.getDynamicRoutes(dev);
          for (const dr of dyn) {
            lines.push(`${dr.code.padEnd(4)} ${dr.network}/${dr.cidr} [${dr.ad}/${dr.metric}] via ${dr.nextHop}, 00:02:14, ${dr.outInterface}`);
          }
        }
        return lines.join('\n');
      }

      // show ip arp
      if ('arp'.startsWith(a1)) {
        return formatArpTable(dev);
      }

      // show ip dhcp binding / pool
      if ('dhcp'.startsWith(a1)) {
        if ('binding'.startsWith(a2)) {
          const lines = ['IP address       Client-ID/              Lease expiration        Type', '                 Hardware address'];
          for (const b of (dev.dhcpBindings || [])) {
            lines.push(`${b.ip.padEnd(16)} ${b.mac.padEnd(23)} --                      Automatic`);
          }
          return lines.join('\n');
        }
        if ('pool'.startsWith(a2)) {
          return Object.values(dev.dhcpPools).map(p =>
            `Pool ${p.name} :\n Utilization mark (high/low)    : 100 / 0\n Subnet size (first/next)       : 0 / 0 \n Total addresses                : 254\n Leased addresses               : ${dev.dhcpBindings.length}`
          ).join('\n\n') || 'No DHCP pools configured.';
        }
      }

      // show ip ospf neighbor
      if ('ospf'.startsWith(a1)) {
        const lines = ['Neighbor ID     Pri   State           Dead Time   Address         Interface'];
        if (networkContext && typeof networkContext.getOspfNeighbors === 'function') {
          for (const n of networkContext.getOspfNeighbors(dev)) {
            lines.push(`${n.neighborId.padEnd(15)} 1     FULL/DR         00:00:38    ${n.address.padEnd(15)} ${n.interface}`);
          }
        }
        return lines.join('\n');
      }

      // show ip protocols
      if ('protocols'.startsWith(a1)) {
        const lines = [];
        if (dev.rip.enabled) {
          lines.push(`Routing Protocol is "rip"\n  Sending updates every 30 seconds\n  Default version control: send version ${dev.rip.version}, receive version ${dev.rip.version}\n  Routing for Networks:\n    ${dev.rip.networks.join('\n    ')}`);
        }
        for (const [pid, proc] of Object.entries(dev.ospf.processes || {})) {
          lines.push(`Routing Protocol is "ospf ${pid}"\n  Router ID ${proc.routerId || '1.1.1.1'}\n  Routing for Networks:\n    ${proc.networks.map(n => `${n.network} ${n.wildcard} area ${n.area}`).join('\n    ')}`);
        }
        return lines.join('\n\n') || 'No IP routing protocols active.';
      }

      // show ip access-lists
      if ('access-lists'.startsWith(a1)) {
        return formatAcls(dev);
      }
    }

    // show arp
    if ('arp'.startsWith(a0)) {
      return formatArpTable(dev);
    }

    // show mac address-table / show mac-address-table
    if (a0.startsWith('mac')) {
      const lines = [
        '          Mac Address Table',
        '-------------------------------------------',
        '',
        'Vlan    Mac Address       Type        Ports',
        '----    -----------       --------    -----'
      ];
      for (const entry of (dev.macTable || [])) {
        lines.push(
          `${String(entry.vlan).padStart(4)}    ${entry.mac.padEnd(14)}    ${entry.type.padEnd(8)}    ${shortIfName(entry.port)}`
        );
      }
      return lines.join('\n');
    }

    // show interfaces [trunk | status | <ifName> [switchport]]
    if ('interfaces'.startsWith(a0) && a0.length >= 3) {
      if ('trunk'.startsWith(a1) && a1.length >= 2) {
        const trunks = dev.interfaces.filter(i => i.switchport && i.mode === 'trunk' && i.lineUp);
        if (!trunks.length) return '';
        const lines = [
          'Port        Mode         Encapsulation  Status        Native vlan',
          ...trunks.map(t => `${shortIfName(t.name).padEnd(11)} ${'on'.padEnd(12)} ${'802.1q'.padEnd(14)} ${'trunking'.padEnd(13)} ${t.nativeVlan || 1}`),
          '',
          'Port        Vlans allowed on trunk',
          ...trunks.map(t => `${shortIfName(t.name).padEnd(11)} ${t.allowedVlans || '1-1005'}`),
          '',
          'Port        Vlans allowed and active in management domain',
          ...trunks.map(t => `${shortIfName(t.name).padEnd(11)} ${Object.keys(dev.vlans).filter(v => v <= 1000).join(',')}`)
        ];
        return lines.join('\n');
      }

      if ('status'.startsWith(a1) && a1.length >= 3) {
        const lines = ['Port      Name               Status       Vlan       Duplex  Speed Type'];
        for (const iface of dev.interfaces) {
          if (iface.type !== 'ethernet') continue;
          const st = !iface.adminUp ? 'disabled' : (iface.lineUp ? 'connected' : 'notconnect');
          const vl = iface.mode === 'trunk' ? 'trunk' : String(iface.accessVlan || 1);
          lines.push(
            `${shortIfName(iface.name).padEnd(9)} ${(iface.description || '').slice(0, 18).padEnd(18)} ${st.padEnd(12)} ${vl.padEnd(10)} a-full  a-100 10/100BaseTX`
          );
        }
        return lines.join('\n');
      }

      const norm = normalizeInterfaceName(args[1], dev);
      if (norm) {
        const iface = dev.interfaces.find(i => i.name.toLowerCase() === norm.toLowerCase());
        if (!iface) return `% Invalid interface ${norm}`;
        if (a2 && 'switchport'.startsWith(a2)) {
          const vname = (dev.vlans[iface.accessVlan || 1] || { name: 'default' }).name;
          return [
            `Name: ${shortIfName(iface.name)}`,
            `Switchport: ${iface.switchport ? 'Enabled' : 'Disabled'}`,
            `Administrative Mode: ${iface.mode}`,
            `Operational Mode: ${iface.lineUp ? iface.mode : 'down'}`,
            `Administrative Trunking Encapsulation: dot1q`,
            `Operational Trunking Encapsulation: ${iface.mode === 'trunk' ? 'dot1q' : 'native'}`,
            `Negotiation of Trunking: ${iface.nonegotiate ? 'Off' : 'On'}`,
            `Access Mode VLAN: ${iface.accessVlan || 1} (${vname})`,
            `Trunking Native Mode VLAN: ${iface.nativeVlan || 1} (default)`,
            `Voice VLAN: ${iface.voiceVlan || 'none'}`,
            `Trunking VLANs Enabled: ${iface.allowedVlans || 'ALL'}`
          ].join('\n');
        }
        const status = !iface.adminUp ? 'administratively down' : (iface.lineUp ? 'up' : 'down');
        const proto = iface.adminUp && iface.lineUp ? 'up' : 'down';
        return [
          `${iface.name} is ${status}, line protocol is ${proto} (${iface.lineUp ? 'connected' : 'notconnect'})`,
          `  Hardware is Fast Ethernet, address is ${iface.mac} (bia ${iface.mac})`,
          iface.description ? `  Description: ${iface.description}` : null,
          iface.ip ? `  Internet address is ${iface.ip}/${maskToCidr(iface.mask)}` : null,
          `  MTU 1500 bytes, BW 100000 Kbit, DLY 100 usec`,
          `  Encapsulation ARPA, loopback not set`,
          `  Full-duplex, 100Mb/s, media type is 10/100BaseTX`
        ].filter(Boolean).join('\n');
      }
    }

    // show spanning-tree
    if ('spanning-tree'.startsWith(a0) && a0.length >= 4) {
      const prio = dev.stp.priorities[1] || 32768;
      const lines = [
        'VLAN0001',
        `  Spanning tree enabled protocol ${dev.stp.mode === 'rapid-pvst' ? 'rstp' : 'ieee'}`,
        `  Root ID    Priority    ${prio + 1}`,
        `             Address     ${dev.baseMac}`,
        `             This bridge is the root`,
        `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec`,
        '',
        `  Bridge ID  Priority    ${prio + 1}  (priority ${prio} sys-id-ext 1)`,
        `             Address     ${dev.baseMac}`,
        `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec`,
        '',
        'Interface        Role Sts Cost      Prio.Nbr Type',
        '---------------- ---- --- --------- -------- --------------------------------'
      ];
      for (const iface of dev.interfaces) {
        if (iface.type === 'ethernet' && iface.lineUp && iface.adminUp) {
          const sts = iface.stpState || 'FWD';
          lines.push(`${shortIfName(iface.name).padEnd(16)} Desg ${sts.padEnd(3)} 19        128.${iface.name.split('/')[1] || 1}    P2p`);
        }
      }
      return lines.join('\n');
    }

    // show cdp neighbors
    if ('cdp'.startsWith(a0)) {
      const lines = [
        'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge',
        '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone',
        '',
        'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID'
      ];
      if (networkContext && typeof networkContext.getCdpNeighbors === 'function') {
        for (const n of networkContext.getCdpNeighbors(dev)) {
          lines.push(
            `${n.hostname.padEnd(16)} ${shortIfName(n.localPort).padEnd(17)} 154        ${n.cap.padEnd(11)} ${n.model.padEnd(9)} ${shortIfName(n.remotePort)}`
          );
        }
      }
      return lines.join('\n');
    }

    // show etherchannel summary
    if ('etherchannel'.startsWith(a0)) {
      const poIfs = dev.interfaces.filter(i => i.name.startsWith('Port-channel'));
      const lines = [
        'Flags:  D - down        P - in port-channel',
        '        I - stand-alone s - suspended',
        '        U - in use      f - failed to allocate aggregator',
        '',
        'Group  Port-channel  Protocol    Ports',
        '------+-------------+-----------+----------------------------------------------'
      ];
      for (const po of poIfs) {
        const grp = parseInt(po.name.replace('Port-channel', ''), 10);
        const members = dev.interfaces.filter(i => i.channelGroup === grp);
        const proto = members[0] && ['active', 'passive'].includes(members[0].channelMode) ? 'LACP' : 'PAgP';
        lines.push(`${String(grp).padEnd(6)} ${(po.name + '(SU)').padEnd(13)} ${proto.padEnd(11)} ${members.map(m => shortIfName(m.name) + '(P)').join(' ')}`);
      }
      return lines.join('\n');
    }

    // show port-security
    if ('port-security'.startsWith(a0)) {
      const secIfs = dev.interfaces.filter(i => i.portSecurity && i.portSecurity.enabled);
      const lines = [
        'Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action',
        '                (Count)       (Count)          (Count)',
        '---------------------------------------------------------------------------'
      ];
      for (const iface of secIfs) {
        const ps = iface.portSecurity;
        lines.push(
          `${shortIfName(iface.name).padEnd(12)} ${String(ps.maximum).padStart(11)}  ${String(ps.macAddresses.length).padStart(11)}  ${String(ps.violationCount).padStart(17)}  ${ps.violation}`
        );
      }
      return lines.join('\n');
    }

    // show vtp status
    if ('vtp'.startsWith(a0)) {
      return [
        `VTP Version capable             : 1 to 2`,
        `VTP version running             : ${dev.vtp.version}`,
        `VTP Domain Name                 : ${dev.vtp.domain}`,
        `VTP Pruning Mode                : Disabled`,
        `VTP Traps Generation            : Disabled`,
        `Device ID                       : ${dev.baseMac}`,
        `Feature VLAN:`,
        `--------------`,
        `VTP Operating Mode                : ${dev.vtp.mode}`,
        `Maximum VLANs supported locally   : 255`,
        `Number of existing VLANs          : ${Object.keys(dev.vlans).length}`,
        `Configuration Revision            : ${dev.vtp.revision}`
      ].join('\n');
    }

    // show access-lists
    if ('access-lists'.startsWith(a0)) {
      return formatAcls(dev);
    }

    // show clock / flash: / history
    if ('clock'.startsWith(a0)) {
      return `*${new Date().toTimeString().split(' ')[0]}.142 UTC ${new Date().toDateString()}`;
    }
    if ('flash:'.startsWith(a0)) {
      return `Directory of flash:/\n\n    1  -rw-     4414921                    c2960-lanbasek9-mz.150-2.SE4.bin\n    2  -rw-         616                    vlan.dat\n\n64016384 bytes total (59600847 bytes free)`;
    }
    if ('history'.startsWith(a0)) {
      return dev.cli.history.map(h => `  ${h}`).join('\n');
    }

    return `% Invalid input detected at '^' marker.`;
  }

  function formatArpTable(dev) {
    const lines = ['Protocol  Address          Age (min)  Hardware Addr   Type   Interface'];
    for (const iface of dev.interfaces) {
      if (iface.ip && iface.adminUp && iface.lineUp) {
        lines.push(`Internet  ${iface.ip.padEnd(16)} -          ${iface.mac.padEnd(15)} ARPA   ${iface.name}`);
      }
    }
    for (const entry of (dev.arpTable || [])) {
      lines.push(`Internet  ${entry.ip.padEnd(16)} 0          ${entry.mac.padEnd(15)} ARPA   ${entry.interface || 'Vlan1'}`);
    }
    return lines.join('\n');
  }

  function formatAcls(dev) {
    const out = [];
    for (const [name, acl] of Object.entries(dev.acls || {})) {
      out.push(`${acl.type === 'standard' ? 'Standard' : 'Extended'} IP access list ${name}`);
      acl.rules.forEach((r, idx) => {
        out.push(`    ${(idx + 1) * 10} ${r}`);
      });
    }
    return out.join('\n') || 'No access lists configured.';
  }

  // ==================== PC COMMAND PROMPT (CMD 1.0) ====================
  function executePcCommand(dev, rawCmd, networkContext) {
    const trimmed = (rawCmd || '').trim();
    if (!trimmed) return '';

    if (dev.cmd.history[dev.cmd.history.length - 1] !== trimmed) {
      dev.cmd.history.push(trimmed);
    }
    dev.cmd.historyIdx = dev.cmd.history.length;

    const tokens = trimmed.split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const arg1 = (tokens[1] || '').toLowerCase();
    const eth = dev.interfaces.find(i => i.type === 'ethernet') || dev.interfaces[0];

    if (cmd === '?' || cmd === 'help') {
      return [
        'Available Commands:',
        '  ?              Display the list of available commands',
        '  arp            Display the arp table (arp -a, arp -d)',
        '  cls            Clear screen',
        '  dir            Displays the list of files in C: directory',
        '  help           Display the list of available commands',
        '  ipconfig       Display network configuration (/all, /renew, /release)',
        '  ipv6config     Display IPv6 network configuration',
        '  netstat        Displays protocol statistics and current TCP/IP connections',
        '  nslookup       DNS Lookup',
        '  ping           Send echo messages (ping <ip>)',
        '  ssh            SSH client (ssh -l <username> <target>)',
        '  telnet         Telnet client (telnet <target>)',
        '  tracert        Trace route to destination (tracert <ip>)'
      ].join('\n');
    }

    if (cmd === 'cls' || cmd === 'clear') {
      dev.cmd.outputBuffer = 'C:\\>';
      return '__CLEAR__';
    }

    if (cmd === 'ipconfig') {
      if (arg1 === '/release') {
        eth.ip = '0.0.0.0';
        eth.mask = '0.0.0.0';
        dev.defaultGateway = '0.0.0.0';
        return `\nIP Address......................: 0.0.0.0\nSubnet Mask.....................: 0.0.0.0\nDefault Gateway.................: 0.0.0.0`;
      }
      if (arg1 === '/renew') {
        if (networkContext && typeof networkContext.requestDhcp === 'function') {
          const lease = networkContext.requestDhcp(dev);
          if (lease) {
            return `\nFastEthernet0 Connection:(default port)\n\n   Link-local IPv6 Address.........: ${dev.ipv6LinkLocal}\n   IPv4 Address....................: ${eth.ip}\n   Subnet Mask.....................: ${eth.mask}\n   Default Gateway.................: ${dev.defaultGateway || '0.0.0.0'}`;
          }
        }
        // Fallback APIPA
        const apipa = `169.254.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
        eth.ip = apipa;
        eth.mask = '255.255.0.0';
        return `%DHCP failed. APIPA is being used.\n   IPv4 Address....................: ${eth.ip}\n   Subnet Mask.....................: ${eth.mask}\n   Default Gateway.................: 0.0.0.0`;
      }
      if (arg1 === '/all') {
        return [
          '',
          'FastEthernet0 Connection:(default port)',
          '',
          `   Physical Address................: ${eth.mac}`,
          `   Link-local IPv6 Address.........: ${dev.ipv6LinkLocal}`,
          `   IPv4 Address....................: ${eth.ip || '0.0.0.0'}`,
          `   Subnet Mask.....................: ${eth.mask || '0.0.0.0'}`,
          `   Default Gateway.................: ${dev.defaultGateway || '0.0.0.0'}`,
          `   DNS Servers.....................: ${dev.dnsServer || '0.0.0.0'}`,
          `   DHCP Servers....................: ${dev.dhcpServer || '0.0.0.0'}`
        ].join('\n');
      }
      return [
        '',
        'FastEthernet0 Connection:(default port)',
        '',
        `   Connection-specific DNS Suffix..: `,
        `   Link-local IPv6 Address.........: ${dev.ipv6LinkLocal}`,
        `   IPv4 Address....................: ${eth.ip || '0.0.0.0'}`,
        `   Subnet Mask.....................: ${eth.mask || '0.0.0.0'}`,
        `   Default Gateway.................: ${dev.defaultGateway || '0.0.0.0'}`
      ].join('\n');
    }

    if (cmd === 'arp') {
      if (arg1 === '-d') {
        dev.arpTable = [];
        return '';
      }
      if (!dev.arpTable || !dev.arpTable.length) {
        return 'No ARP Entries Found';
      }
      const lines = [
        '  Internet Address      Physical Address      Type',
        ...dev.arpTable.map(e => `  ${e.ip.padEnd(21)} ${e.mac.padEnd(21)} dynamic`)
      ];
      return lines.join('\n');
    }

    if (cmd === 'ping') {
      const targetIp = tokens[1] === '-t' ? tokens[2] : tokens[1];
      if (!targetIp) return 'Usage: ping [-t] <target_name>';
      if (networkContext && typeof networkContext.runPing === 'function') {
        const res = networkContext.runPing(dev, targetIp);
        return res.pcText;
      }
      return `\nPinging ${targetIp} with 32 bytes of data:\n\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\n\nPing statistics for ${targetIp}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),`;
    }

    if (cmd === 'tracert') {
      const targetIp = tokens[1];
      if (!targetIp) return 'Usage: tracert <target_name>';
      if (networkContext && typeof networkContext.runPing === 'function') {
        const res = networkContext.runPing(dev, targetIp);
        if (res.success) {
          const hops = (res.hops || [targetIp]).map((h, i) => `  ${i + 1}     1 ms     1 ms     1 ms  ${h}`).join('\n');
          return `\nTracing route to ${targetIp} over a maximum of 30 hops:\n\n${hops}\n\nTrace complete.`;
        }
        return `\nTracing route to ${targetIp} over a maximum of 30 hops:\n\n  1     *        *        *     Request timed out.\n\nTrace complete.`;
      }
    }

    if (cmd === 'dir') {
      return ` Volume in drive C has no label.\n Directory of C:/\n\n04/12/2026  09:15 AM    <DIR>          sampleFile.txt\n               1 File(s)            124 bytes\n               0 Dir(s)  31,999,588,352 bytes free`;
    }

    if (cmd === 'netstat') {
      return `\nActive Connections\n\n  Proto  Local Address          Foreign Address        State`;
    }

    if (cmd === 'nslookup') {
      const host = tokens[1] || 'www.cisco.com';
      return `Server:  ${dev.dnsServer || '0.0.0.0'}\nAddress:  ${dev.dnsServer || '0.0.0.0'}\n\nName:    ${host}\nAddress:  192.168.1.254`;
    }

    return `'${tokens[0]}' is not recognized as an internal or external command,\noperable program or batch file.`;
  }

  global.PTEngine = {
    createDeviceState,
    getPrompt,
    generateRunningConfig,
    executeIosCommand,
    autocompleteIosCommand,
    executePcCommand,
    normalizeInterfaceName,
    shortIfName,
    sameSubnet,
    ipToInt,
    intToIp,
    maskToCidr
  };
})(window);
