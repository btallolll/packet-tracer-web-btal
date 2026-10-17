// ============================================================================
// Packet Tracer Web — core.js
// IP/MAC helpers, interface naming, device catalog and device factory.
// Works in the browser (window.PT) and in Node (module.exports) for testing.
// ============================================================================
(function (G) {
  'use strict';
  const PT = G.PT = G.PT || {};

  // ---------------------------------------------------------------- IP utils
  function ip2n(s) {
    if (typeof s !== 'string') return null;
    const m = s.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const p = m.slice(1).map(Number);
    if (p.some(x => x > 255)) return null;
    return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
  }
  function n2ip(n) {
    n = n >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  const isIp = s => ip2n(s) !== null;
  function maskLen(mask) {
    const n = typeof mask === 'number' ? mask : ip2n(mask);
    if (n === null) return -1;
    let len = 0, seenZero = false;
    for (let i = 31; i >= 0; i--) {
      const bit = (n >>> i) & 1;
      if (bit) { if (seenZero) return -1; len++; } else seenZero = true;
    }
    return len;
  }
  const isMask = m => maskLen(m) >= 0;
  function lenMask(len) { return len <= 0 ? 0 : (0xFFFFFFFF << (32 - len)) >>> 0; }
  function netOf(ip, mask) {
    const a = typeof ip === 'number' ? ip : ip2n(ip);
    const m = typeof mask === 'number' ? mask : ip2n(mask);
    return (a & m) >>> 0;
  }
  function sameNet(a, b, mask) {
    const x = ip2n(a), y = ip2n(b), m = ip2n(mask);
    if (x === null || y === null || m === null) return false;
    return ((x & m) >>> 0) === ((y & m) >>> 0);
  }
  function classfulLen(ip) {
    const n = typeof ip === 'number' ? ip : ip2n(ip);
    const first = n >>> 24;
    if (first < 128) return 8;
    if (first < 192) return 16;
    if (first < 224) return 24;
    return 32;
  }
  function classfulMask(ip) { return n2ip(lenMask(classfulLen(ip))); }
  function wildMatch(ip, net, wild) {
    const a = ip2n(ip), n = ip2n(net), w = ip2n(wild);
    if (a === null || n === null || w === null) return false;
    return ((a & ~w) >>> 0) === ((n & ~w) >>> 0);
  }
  function invMask(m) { return n2ip((~ip2n(m)) >>> 0); }
  function isHostAddr(ip, mask) {
    const a = ip2n(ip), m = ip2n(mask);
    if (a === null || m === null) return false;
    const len = maskLen(m);
    if (len >= 31) return true;
    const host = (a & ~m) >>> 0;
    return host !== 0 && host !== ((~m) >>> 0);
  }

  // ---------------------------------------------------------------- MAC utils
  const OUIS = ['0001.42', '0001.43', '0001.63', '0001.64', '0001.96', '0001.97', '0002.16', '0002.17', '0002.4A', '0003.E4',
    '0004.9A', '0005.5E', '0006.2A', '0007.EC', '0009.7C', '000A.41', '000B.BE', '000C.85', '000C.CF', '000D.BD', '0010.11',
    '0030.A3', '0030.F2', '0040.0B', '0050.0F', '0060.2F', '0060.3E', '0060.47', '0060.5C', '0060.70', '0090.0C', '0090.21',
    '0090.2B', '00D0.58', '00D0.97', '00D0.BA', '00D0.D3', '00E0.8F', '00E0.A3', '00E0.B0', '00E0.F7', '00E0.F9'];
  function hex2(n) { return n.toString(16).toUpperCase().padStart(2, '0'); }
  function randomBaseMac() {
    const oui = OUIS[Math.floor(Math.random() * OUIS.length)];
    const b4 = Math.floor(Math.random() * 256), b5 = Math.floor(Math.random() * 256);
    return `${oui}${hex2(b4)}.${hex2(b5)}01`;
  }
  function macAdd(mac, inc) {
    const hex = mac.replace(/\./g, '');
    let n = BigInt('0x' + hex) + BigInt(inc);
    const s = n.toString(16).toUpperCase().padStart(12, '0').slice(-12);
    return `${s.slice(0, 4)}.${s.slice(4, 8)}.${s.slice(8, 12)}`;
  }
  function normMac(s) {
    if (!s) return null;
    const hex = String(s).replace(/[.:\-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{12}$/.test(hex)) return null;
    return `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8, 12)}`;
  }
  function linkLocal(mac) {
    const hex = mac.replace(/\./g, '').toUpperCase();
    const b = [];
    for (let i = 0; i < 12; i += 2) b.push(parseInt(hex.slice(i, i + 2), 16));
    b[0] ^= 0x02;
    const eui = [b[0], b[1], b[2], 0xFF, 0xFE, b[3], b[4], b[5]];
    const groups = [];
    for (let i = 0; i < 8; i += 2) groups.push(((eui[i] << 8) | eui[i + 1]).toString(16).toUpperCase());
    return 'FE80::' + groups.join(':');
  }

  // ---------------------------------------------------------------- interface names
  const IF_TYPES = [
    { full: 'Ethernet', short: 'Eth', cdp: 'Eth', help: 'IEEE 802.3' },
    { full: 'FastEthernet', short: 'Fa', cdp: 'Fas', help: 'FastEthernet IEEE 802.3' },
    { full: 'GigabitEthernet', short: 'Gi', cdp: 'Gig', help: 'GigabitEthernet IEEE 802.3z' },
    { full: 'Loopback', short: 'Lo', cdp: 'Lo', help: 'Loopback interface' },
    { full: 'Port-channel', short: 'Po', cdp: 'Po', help: 'Ethernet Channel of interfaces' },
    { full: 'Serial', short: 'Se', cdp: 'Ser', help: 'Serial' },
    { full: 'Tunnel', short: 'Tu', cdp: 'Tu', help: 'Tunnel interface' },
    { full: 'Vlan', short: 'Vl', cdp: 'Vl', help: 'Catalyst Vlans' }
  ];
  function ifTypeByPrefix(prefix) {
    const p = prefix.toLowerCase();
    const matches = IF_TYPES.filter(t => t.full.toLowerCase().startsWith(p));
    if (matches.length === 1) return matches[0];
    const exact = IF_TYPES.find(t => t.full.toLowerCase() === p);
    return exact || null;
  }
  // "fa0/1" -> {type:'FastEthernet', num:'0/1', name:'FastEthernet0/1'}
  function parseIfName(str) {
    if (!str) return null;
    const s = String(str).replace(/\s+/g, '');
    const m = s.match(/^([A-Za-z][A-Za-z\-]*?)(\d+(?:\/\d+)*(?:\.\d+)?)$/);
    if (!m) return null;
    const t = ifTypeByPrefix(m[1]);
    if (!t) return null;
    return { type: t.full, num: m[2], name: t.full + m[2] };
  }
  function shortIf(name) {
    for (const t of IF_TYPES) if (name.startsWith(t.full)) return t.short + name.slice(t.full.length);
    return name;
  }
  function statusIf(name) { // show interfaces status / trunk style (Fa0/1, Gig0/1)
    if (name.startsWith('GigabitEthernet')) return 'Gig' + name.slice(15);
    return shortIf(name);
  }
  function cdpIf(name) {
    for (const t of IF_TYPES) if (name.startsWith(t.full)) return t.cdp + ' ' + name.slice(t.full.length);
    return name;
  }
  function ifSortKey(name) {
    const order = ['Ethernet', 'FastEthernet', 'GigabitEthernet', 'Serial', 'Port-channel', 'Loopback', 'Tunnel', 'Vlan'];
    const t = IF_TYPES.find(x => name.startsWith(x.full));
    const idx = t ? order.indexOf(t.full) : 99;
    const nums = (name.match(/\d+/g) || []).map(Number);
    return [idx, ...nums];
  }
  function cmpIf(a, b) {
    const ka = ifSortKey(a), kb = ifSortKey(b);
    for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
      const x = ka[i] === undefined ? -1 : ka[i], y = kb[i] === undefined ? -1 : kb[i];
      if (x !== y) return x - y;
    }
    return 0;
  }

  // ---------------------------------------------------------------- catalog
  const A = 'art/';
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const fa = n => ({ name: 'FastEthernet' + n, kind: 'fa', bw: 100000 });
  const gi = n => ({ name: 'GigabitEthernet' + n, kind: 'gi', bw: 1000000 });
  const se = n => ({ name: 'Serial' + n, kind: 'se', bw: 1544 });
  const eth = n => ({ name: 'Ethernet' + n, kind: 'eth', bw: 10000 });
  const con = () => ({ name: 'Console', kind: 'console' });
  const rs232 = () => ({ name: 'RS 232', kind: 'rs232' });

  // Serial module slot naming per router family
  const MODULES = {
    'HWIC-2T': { label: 'HWIC-2T', desc: 'Dual-port Serial WAN interface card (2 x Serial).', ports: slot => [se(`0/${slot}/0`), se(`0/${slot}/1`)] },
    'NIM-2T': { label: 'NIM-2T', desc: 'Dual-port Serial Network Interface Module (2 x Serial).', ports: slot => [se(`0/${slot}/0`), se(`0/${slot}/1`)] },
    'WIC-2T': { label: 'WIC-2T', desc: 'Dual-port Serial WAN interface card (2 x Serial).', ports: slot => [se(`0/${slot}/0`), se(`0/${slot}/1`)] }
  };

  const MODELS = {
    // ------------------------------------------------ Routers
    '4331': { type: 'router', prefix: 'Router', label: 'ISR4331', canvas: 'ISR4331', box: 'Specific4331_40x40.png', icon: 'iRouter@2x.png', chassis: 'iRealRouter4331.png', ios: '16.6.4', series: 'ISR4300', cdpPlatform: 'ISR4300',
      ports: () => [gi('0/0/0'), gi('0/0/1'), gi('0/0/2')], slots: [1, 2], module: 'NIM-2T', pid: 'ISR4331/K9' },
    '4321': { type: 'router', prefix: 'Router', label: 'ISR4321', canvas: 'ISR4321', box: 'Specific4321_40x40.png', icon: 'iRouter@2x.png', chassis: 'iRealRouter4321.png', ios: '16.6.4', series: 'ISR4300', cdpPlatform: 'ISR4300',
      ports: () => [gi('0/0/0'), gi('0/0/1')], slots: [1, 2], module: 'NIM-2T', pid: 'ISR4321/K9' },
    '1941': { type: 'router', prefix: 'Router', label: '1941', canvas: '1941', box: 'Specific1941_40x40.png', icon: 'iRouter@2x.png', chassis: 'iRealRouter1941Back.png', ios: '15.1', series: 'C1900', cdpPlatform: 'C1900',
      ports: () => [gi('0/0'), gi('0/1')], slots: [0, 1], module: 'HWIC-2T', pid: 'CISCO1941/K9' },
    '2901': { type: 'router', prefix: 'Router', label: '2901', canvas: '2901', box: 'Specific2901_40x40.png', icon: 'iRouter@2x.png', chassis: 'iRealRouter2901.png', ios: '15.1', series: 'C2900', cdpPlatform: 'C2900',
      ports: () => [gi('0/0'), gi('0/1')], slots: [0, 1, 2, 3], module: 'HWIC-2T', pid: 'CISCO2901/K9' },
    '2911': { type: 'router', prefix: 'Router', label: '2911', canvas: '2911', box: 'Specific2911_40x40.png', icon: 'iRouter@2x.png', chassis: 'iRealRouter2911.png', ios: '15.1', series: 'C2900', cdpPlatform: 'C2900',
      ports: () => [gi('0/0'), gi('0/1'), gi('0/2')], slots: [0, 1, 2, 3], module: 'HWIC-2T', pid: 'CISCO2911/K9' },
    '2811': { type: 'router', prefix: 'Router', label: '2811', canvas: '2811', box: 'Specific2811_40x40.png', icon: 'iRouter@2x.png', chassis: 'iRealFrontRouter2811.png', ios: '12.4', series: 'C2800', cdpPlatform: '2811',
      ports: () => [fa('0/0'), fa('0/1')], slots: [0, 1, 2, 3], module: 'HWIC-2T', pid: 'CISCO2811' },
    '1841': { type: 'router', prefix: 'Router', label: '1841', canvas: '1841', box: 'Specific1841_40x40.png', icon: 'iRouter@2x.png', chassis: 'iRealRouter1841.png', ios: '12.4', series: 'C1841', cdpPlatform: '1841',
      ports: () => [fa('0/0'), fa('0/1')], slots: [0, 1], module: 'WIC-2T', pid: 'CISCO1841' },
    'Router-PT': { type: 'router', prefix: 'Router', label: 'PT-Router', canvas: 'Router-PT', box: 'SpecificArtificialRouter_40x40.png', icon: 'iRouter@2x.png', chassis: 'iPTRealRouter.png', ios: '12.2', series: 'PT1000', cdpPlatform: 'PT1000',
      ports: () => [fa('0/0'), fa('1/0'), se('2/0'), se('3/0'), fa('4/0'), fa('5/0')], slots: [], pid: 'PT-ROUTER' },
    // ------------------------------------------------ Switches
    '2960-24TT': { type: 'switch', prefix: 'Switch', label: '2960 IOS15', canvas: '2960-24TT', box: 'Specific2960_40x40.png', icon: 'iSwitch@2x.png', chassis: 'iRealSwitch2960_24TTFront.png', ios: '15.0', series: 'C2960', cdpPlatform: '2960',
      ports: () => [...range(1, 24).map(i => fa('0/' + i)), gi('0/1'), gi('0/2')], pid: 'WS-C2960-24TT-L' },
    '2950-24': { type: 'switch', prefix: 'Switch', label: '2950-24', canvas: '2950-24', box: 'Specific2950-24_40x40.png', icon: 'iSwitch@2x.png', chassis: 'iRealSwitch2950Front.png', ios: '12.1', series: 'C2950', cdpPlatform: '2950',
      ports: () => range(1, 24).map(i => fa('0/' + i)), pid: 'WS-C2950-24' },
    '2950T-24': { type: 'switch', prefix: 'Switch', label: '2950T-24', canvas: '2950T-24', box: 'Specific2950T_40x40.png', icon: 'iSwitch@2x.png', chassis: 'iRealSwitch2950TFront.png', ios: '12.1', series: 'C2950', cdpPlatform: '2950',
      ports: () => [...range(1, 24).map(i => fa('0/' + i)), gi('0/1'), gi('0/2')], pid: 'WS-C2950T-24' },
    '3560-24PS': { type: 'l3switch', prefix: 'Multilayer Switch', label: '3560 24PS', canvas: '3560-24PS', box: 'Specific3560_24PS_40x40.png', icon: 'iSwitch3560@2x.png', chassis: 'iRealSwitch3560Front.png', ios: '12.2', series: 'C3560', cdpPlatform: '3560',
      ports: () => [...range(1, 24).map(i => fa('0/' + i)), gi('0/1'), gi('0/2')], pid: 'WS-C3560-24PS' },
    '3650-24PS': { type: 'l3switch', prefix: 'Multilayer Switch', label: '3650 24PS', canvas: '3650-24PS', box: 'Specific3650.png', icon: 'iSwitch3560@2x.png', chassis: '3650Physical_Front.png', ios: '16.3.2', series: 'C3650', cdpPlatform: '3650',
      ports: () => [...range(1, 24).map(i => gi('1/0/' + i)), ...range(1, 4).map(i => gi('1/1/' + i))], pid: 'WS-C3650-24PS' },
    'Switch-PT': { type: 'switch', prefix: 'Switch', label: 'Switch-PT', canvas: 'Switch-PT', box: 'SpecificArtificialSwitch_40x40.png', icon: 'iSwitch@2x.png', chassis: 'iPTRealSwitch.png', ios: '12.1', series: 'PT', cdpPlatform: 'PT',
      ports: () => [0, 1, 2, 3, 4, 5].map(i => fa(i + '/1')), pid: 'Switch-PT' },
    // ------------------------------------------------ Hubs
    'Hub-PT': { type: 'hub', prefix: 'Hub', label: 'Hub-PT', canvas: 'Hub-PT', box: 'SpecificArtificialHub_40x40.png', icon: 'iHub@2x.png', chassis: 'iPTRealHub.png',
      ports: () => range(0, 5).map(i => ({ name: 'Port ' + i, kind: 'port', bw: 10000 })) },
    'Repeater-PT': { type: 'hub', prefix: 'Repeater', label: 'Repeater-PT', canvas: 'Repeater-PT', box: 'SpecificArtificialRepeater_40x40.png', icon: 'iRepeater@2x.png', chassis: 'iPTRealRepeater.png',
      ports: () => [0, 1].map(i => ({ name: 'Port ' + i, kind: 'port', bw: 10000 })) },
    // ------------------------------------------------ End devices
    'PC-PT': { type: 'pc', prefix: 'PC', label: 'PC', canvas: 'PC-PT', box: 'SpecificArtificialWorkstation_40x40.png', icon: 'iWorkstation@2x.png', chassis: 'iRealWiredEndDevice.png',
      ports: () => [fa(''), rs232()] },
    'Laptop-PT': { type: 'pc', prefix: 'Laptop', label: 'Laptop', canvas: 'Laptop-PT', box: 'SpecificArtificialLaptop_40x40.png', icon: 'iLaptop@2x.png', chassis: 'iRealLaptop.png',
      ports: () => [fa(''), rs232()] },
    'Server-PT': { type: 'server', prefix: 'Server', label: 'Server', canvas: 'Server-PT', box: 'SpecificArtificialServer_40x40.png', icon: 'iServer@2x.png', chassis: 'iRealServer.png',
      ports: () => [fa('')] },
    'Printer-PT': { type: 'pc', prefix: 'Printer', label: 'Printer', canvas: 'Printer-PT', box: 'SpecificArtificialPrinter_40x40.png', icon: 'iPrinter@2x.png', chassis: 'iRealPrinter.png',
      ports: () => [fa('')], noDesktop: true }
  };
  for (const [k, m] of Object.entries(MODELS)) {
    m.key = k;
    m.boxIcon = A + 'ComponentBox/' + m.box;
    m.canvasIcon = A + 'Workspace/Logical/' + m.icon;
    m.chassisImg = A + 'PhysicalView/Devices/' + m.chassis;
  }

  const CABLES = {
    auto: { key: 'auto', label: 'Automatically Choose Connection Type', box: 'SpecificAutoConnect_40x40.png' },
    console: { key: 'console', label: 'Console', box: 'SpecificConsole_40x40.png' },
    straight: { key: 'straight', label: 'Copper Straight-Through', box: 'SpecificCopperStraight_40x40.png' },
    cross: { key: 'cross', label: 'Copper Cross-Over', box: 'SpecificCrossConnect_40x40.png' },
    fiber: { key: 'fiber', label: 'Fiber', box: 'SpecificFiber_40x40.png' },
    'serial-dce': { key: 'serial-dce', label: 'Serial DCE', box: 'SpecificSerialDCE_40x40.png' },
    'serial-dte': { key: 'serial-dte', label: 'Serial DTE', box: 'SpecificSerialDTE_40x40.png' }
  };
  for (const c of Object.values(CABLES)) c.boxIcon = A + 'ComponentBox/' + c.box;

  const CATEGORIES = [
    { key: 'network', label: 'Network Devices', icon: 'group0', subs: [
      { key: 'routers', label: 'Routers', icon: 'subgroup0', items: ['4331', '4321', '1941', '2901', '2911', '2811', '1841', 'Router-PT'] },
      { key: 'switches', label: 'Switches', icon: 'subgroup1', items: ['2960-24TT', '2950-24', '2950T-24', '3560-24PS', '3650-24PS', 'Switch-PT'] },
      { key: 'hubs', label: 'Hubs', icon: 'subgroup2', items: ['Hub-PT', 'Repeater-PT'] }
    ] },
    { key: 'end', label: 'End Devices', icon: 'group1', subs: [
      { key: 'enddev', label: 'End Devices', icon: 'subgroup6', items: ['PC-PT', 'Laptop-PT', 'Server-PT', 'Printer-PT'] }
    ] },
    { key: 'connections', label: 'Connections', icon: 'group3', subs: [
      { key: 'cables', label: 'Connections', icon: 'subgroup14', cables: true, items: ['auto', 'console', 'straight', 'cross', 'serial-dce', 'serial-dte'] }
    ] }
  ];

  // ---------------------------------------------------------------- device factory
  const counters = {};
  let idSeq = 1;
  function resetCounters() { for (const k of Object.keys(counters)) delete counters[k]; }
  function nextName(prefix, existing) {
    if (counters[prefix] === undefined) counters[prefix] = 0;
    let name;
    do { name = prefix + (counters[prefix]++); } while (existing && existing.has(name));
    return name;
  }

  function defaultIfaceCfg(dev, port) {
    const t = dev.type;
    const switchish = t === 'switch' || t === 'l3switch';
    const c = {
      desc: '',
      shutdown: t === 'router',
      ip: '', mask: '', dhcp: false, helpers: [],
      speed: 'auto', duplex: 'auto', bandwidth: null, delay: null,
      aclIn: null, aclOut: null, nat: null,
      ospfCost: null, ospfPriority: null
    };
    if (port.kind === 'se') { delete c.speed; delete c.duplex; c.encap = 'hdlc'; c.clockRate = null; }
    if (switchish && port.physical) {
      Object.assign(c, {
        switchport: true,
        mode: (dev.modelKey === 'Switch-PT') ? 'access' : 'dynamic auto',
        accessVlan: 1, nativeVlan: 1, allowed: null, voiceVlan: null,
        trunkEncap: t === 'l3switch' ? 'auto' : 'dot1q', nonegotiate: false,
        portfast: false, bpduguard: false,
        psec: { enabled: false, max: 1, violation: 'shutdown', sticky: false, macs: [] },
        channelGroup: null, channelMode: null
      });
      delete c.ip; delete c.mask;
      if (t === 'l3switch') { c.ip = ''; c.mask = ''; }
    }
    return c;
  }

  function defaultCfg(dev) {
    const t = dev.type;
    const cfg = {
      hostname: dev.type === 'router' ? 'Router' : (dev.type === 'switch' || dev.type === 'l3switch') ? 'Switch' : dev.name,
      enableSecret: null, enablePassword: null, servicePwEnc: false,
      domainName: '', domainLookup: true, nameServers: [], banner: '',
      users: {}, sshVersion: null, cryptoKey: 0, sshTimeout: 120, sshRetries: 3,
      lines: {
        con: { password: '', login: false, execTimeout: null, logSync: false, privilege: null },
        aux: { password: '', login: false },
        vty: { password: '', login: true, transport: null, execTimeout: null, logSync: false, accessClass: null, privilege: null },
        vty2: { password: '', login: true, transport: null }
      },
      ifaces: {},
      vlans: {},
      vtp: { mode: 'server', domain: '', password: '', version: 1, revision: 0 },
      stp: { mode: 'pvst', prio: {}, portfastDefault: false, bpduguardDefault: false },
      ipRouting: t === 'router',
      defaultGateway: '',
      routes: [],
      ospf: {}, rip: null, eigrp: {},
      dhcpPools: {}, dhcpExcluded: [],
      acls: {},
      nat: { statics: [], rules: [], pools: {} },
      cdp: true,
      clockRateDefaults: {},
      termLen: 24,
      host: { gateway: '', dns: '', dhcp: false, ipv6Gateway: '', ipv6Dns: '' },
      services: null
    };
    if (t === 'switch' || t === 'l3switch') {
      cfg.vlans = {
        1: { name: 'default', state: 'active' },
        1002: { name: 'fddi-default', state: 'act/unsup' },
        1003: { name: 'token-ring-default', state: 'act/unsup' },
        1004: { name: 'fddinet-default', state: 'act/unsup' },
        1005: { name: 'trnet-default', state: 'act/unsup' }
      };
    }
    for (const p of dev.ports) {
      if (p.kind === 'console' || p.kind === 'rs232' || p.kind === 'port') continue;
      cfg.ifaces[p.name] = defaultIfaceCfg(dev, p);
      if (dev.type === 'pc' || dev.type === 'server') cfg.ifaces[p.name].shutdown = false;
    }
    if (t === 'switch' || t === 'l3switch') {
      cfg.ifaces.Vlan1 = { desc: '', shutdown: true, ip: '', mask: '', dhcp: false, helpers: [], aclIn: null, aclOut: null, nat: null };
    }
    if (t === 'router' && /^(1941|2901|2911|1841|2811)$/.test(dev.modelKey)) {
      // ISR G2 routers in Packet Tracer show an "interface Vlan1" stanza by default
      cfg.ifaces.Vlan1 = { desc: '', shutdown: true, ip: '', mask: '', dhcp: false, helpers: [], aclIn: null, aclOut: null, nat: null, hidden: true };
    }
    if (t === 'server') {
      cfg.services = {
        http: { on: true, https: true, files: { 'index.html': DEFAULT_INDEX_HTML, 'helloworld.html': '<html><center><font size=\'+2\' color=\'blue\'>Hello World</font></center></html>', 'copyrights.html': '<html><center><p>Cisco Packet Tracer</p></center></html>' } },
        dhcp: { on: false, pools: [{ name: 'serverPool', gateway: '0.0.0.0', dns: '0.0.0.0', start: '0.0.0.0', mask: '0.0.0.0', max: 512, tftp: '0.0.0.0', wlc: '0.0.0.0' }] },
        dns: { on: false, records: [] },
        tftp: { on: true }, syslog: { on: false }, aaa: { on: false }, ntp: { on: true }, email: { on: true }, ftp: { on: true }
      };
    }
    return cfg;
  }

  const DEFAULT_INDEX_HTML = `<html>
<center><font size='+2' color='blue'>Cisco Packet Tracer</font></center>
<hr>Welcome to Cisco Packet Tracer. Opening doors to new opportunities. Mind Wide Open.
<p>Quick Links:
<br><a href='helloworld.html'>A small page</a>
<br><a href='copyrights.html'>Copyrights</a>
<br><a href='image.html'>Image page</a>
<br><a href='cscoptlogo177x111.jpg'>Image</a>
</html>`;

  function createDevice(modelKey, opts = {}) {
    const m = MODELS[modelKey];
    if (!m) throw new Error('Unknown model ' + modelKey);
    const dev = {
      id: opts.id || ('d' + Date.now().toString(36) + (idSeq++).toString(36)),
      modelKey,
      model: m.canvas,
      type: m.type,
      name: opts.name || nextName(m.prefix, opts.existingNames),
      x: opts.x || 100, y: opts.y || 100,
      power: true,
      baseMac: opts.baseMac || randomBaseMac(),
      modules: opts.modules || {},
      ports: [],
      serial: 'FTX' + Math.floor(1000 + Math.random() * 8999) + (['A', 'B', 'C', 'D', 'K', 'L'][Math.floor(Math.random() * 6)]) + Math.floor(10 + Math.random() * 89),
      startup: null,
      rt: null
    };
    buildPorts(dev);
    dev.cfg = defaultCfg(dev);
    if (dev.type === 'pc' || dev.type === 'server') dev.cfg.hostname = dev.name;
    dev.rt = freshRuntime(dev);
    return dev;
  }

  function buildPorts(dev) {
    const m = MODELS[dev.modelKey];
    const list = m.ports().map(p => Object.assign({}, p, { physical: p.kind !== 'console' && p.kind !== 'rs232' }));
    if (m.slots) {
      for (const slot of m.slots) {
        const mod = dev.modules[slot];
        if (mod && MODULES[mod]) list.push(...MODULES[mod].ports(slot).map(p => Object.assign(p, { physical: true, slot })));
      }
    }
    if (m.type !== 'pc' && m.type !== 'server' && m.type !== 'hub') list.push(Object.assign(con(), { physical: false }));
    let i = 0;
    const old = new Map((dev.ports || []).map(p => [p.name, p]));
    dev.ports = list.map(p => {
      const prev = old.get(p.name);
      const mac = prev ? prev.mac : macAdd(dev.baseMac, i);
      i++;
      return Object.assign(p, { mac, linkId: prev ? prev.linkId : null });
    });
    if (m.type === 'pc' || m.type === 'server') {
      dev.ports.forEach(p => { if (p.kind === 'fa') p.name = 'FastEthernet0'; });
    }
  }

  function freshRuntime(dev) {
    return {
      arp: [], mac: [], dhcpBindings: [], natTrans: [],
      errdis: {}, portUpAt: {}, logs: [], lastStatus: {},
      ospfNbrs: {}, eigrpNbrs: {}, dnsCache: {},
      dhcpInfo: {}, bootAt: Date.now(), consoleOut: '',
      stickyLearned: {}
    };
  }

  function getModel(d) {
    if (!d) return null;
    if (typeof d === 'string') {
      return MODELS[d] || Object.values(MODELS).find(m => m.model === d || m.label === d || m.key === d) || null;
    }
    return MODELS[d.modelKey] || MODELS[d.model] || (d.modelKey ? Object.values(MODELS).find(m => m.model === d.modelKey || m.label === d.modelKey) : null) || null;
  }

  // ---------------------------------------------------------------- misc helpers
  const pad = (s, n) => { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); };
  const lpad = (s, n) => { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; };
  const clone = o => JSON.parse(JSON.stringify(o));
  function uptimeStr(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  function vlanListParse(spec) { // "1,10-20" -> Set
    const set = new Set();
    for (const part of String(spec).split(',')) {
      const p = part.trim();
      if (!p) continue;
      const m = p.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return null;
      const a = +m[1], b = m[2] ? +m[2] : a;
      if (a < 1 || b > 4094 || a > b) return null;
      for (let v = a; v <= b; v++) set.add(v);
    }
    return set;
  }
  function vlanListFormat(arr) {
    const s = [...arr].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < s.length; i++) {
      let j = i;
      while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
      out.push(j > i ? `${s[i]}-${s[j]}` : `${s[i]}`);
      i = j;
    }
    return out.join(',');
  }

  const normalizeInterfaceName = s => { const p = parseIfName(s); return p ? p.name : s; };

  Object.assign(PT, {
    ip2n, n2ip, isIp, maskLen, isMask, lenMask, netOf, sameNet, classfulLen, classfulMask, wildMatch, invMask, isHostAddr,
    randomBaseMac, macAdd, normMac, linkLocal,
    IF_TYPES, parseIfName, shortIf, statusIf, cdpIf, cmpIf, ifTypeByPrefix, normalizeInterfaceName, shortIfName: shortIf,
    MODELS, MODULES, CABLES, CATEGORIES,
    createDevice, buildPorts, defaultCfg, defaultIfaceCfg, freshRuntime, getModel, findCatalogModel: getModel,
    resetCounters, nextName, counters,
    pad, lpad, clone, uptimeStr, vlanListParse, vlanListFormat,
    ipToInt: ip2n, intToIp: n2ip, sameSubnet: sameNet, maskToCidr: maskLen
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = PT;
})(typeof window !== 'undefined' ? window : globalThis);

