// ============================================================================
// Packet Tracer Web — js/smart_tools.js
// Advanced Features Beyond Cisco Packet Tracer:
// 1. AI Network Copilot & Diagnostics Auditor
// 2. Interactive Subnet & VLSM Planner with 1-Click Auto-Assign
// 3. Web Wireshark Live Packet Sniffer & Protocol Analyzer
// 4. Interactive CCNA Lab Challenges & Auto-Grading Engine
// 5. Topology Architecture Matrix & Documentation Generator
// 6. Comprehensive Dark / Light Theme System
// ============================================================================
(function (G) {
  'use strict';
  const PT = G.PT = G.PT || {};

  // ---------------------------------------------------------------- State & Packet Storage
  const smartState = {
    capturedPackets: [],
    packetFilter: '',
    activeChallenge: null,
    darkTheme: false,
    vlsmResults: null
  };
  PT.smartState = smartState;

  // ---------------------------------------------------------------- 1. AI NETWORK COPILOT & AUDITOR
  PT.runNetworkAudit = function () {
    const net = PT.net;
    if (!net || !net.devices) return { healthScore: 100, issues: [] };

    const issues = [];
    let penalty = 0;
    const ipMap = {}; // ip -> { devName, ifName }

    // 1. IP Conflict & Basic Interface Checks
    for (const dev of net.devices) {
      if (!dev.cfg) continue;
      const c = dev.cfg;

      // Host device (PC / Laptop / Server)
      if (c.host && c.host.ip) {
        const ip = c.host.ip;
        if (ipMap[ip]) {
          issues.push({
            id: `ip-dup-${ip}`,
            severity: 'critical',
            icon: '⛔',
            title: `تعارض في عناوين IP (Duplicate IP Conflict)`,
            desc: `العنوان ${ip} مستخدم على جهازين: "${ipMap[ip].devName}" و "${dev.name}". يجب أن يكون كل عنوان فريداً.`,
            device: dev.name,
            fixCmd: `تغيير IP الجهاز إلى عنوان متاح غير مستخدم`,
            autoFix: () => {
              const parts = ip.split('.');
              parts[3] = String(Math.floor(Math.random() * 200) + 20);
              c.host.ip = parts.join('.');
              if (PT.renderCanvas) PT.renderCanvas();
            }
          });
          penalty += 20;
        } else {
          ipMap[ip] = { devName: dev.name, ifName: 'NIC' };
        }

        // Check missing default gateway if connected to router/other subnets
        if (!c.host.gateway && net.links.some(l => l.devAId === dev.id || l.devBId === dev.id)) {
          issues.push({
            id: `gw-missing-${dev.id}`,
            severity: 'warning',
            icon: '⚠️',
            title: `بوابة افتراضية مفقودة (Missing Default Gateway)`,
            desc: `الجهاز "${dev.name}" لا يحتوي على Default Gateway. لن يتمكن من الوصول إلى خارج شبكته المحلية.`,
            device: dev.name,
            fixCmd: `تعيين Default Gateway (مثلاً: 192.168.1.1)`,
            autoFix: () => {
              const parts = (c.host.ip || '192.168.1.10').split('.');
              parts[3] = '1';
              c.host.gateway = parts.join('.');
            }
          });
          penalty += 10;
        }
      }

      // Router / Switch interfaces
      if (c.ifaces) {
        for (const [ifName, ifc] of Object.entries(c.ifaces)) {
          if (ifc.ip) {
            const ip = ifc.ip;
            if (ipMap[ip]) {
              issues.push({
                id: `ip-dup-${ip}`,
                severity: 'critical',
                icon: '⛔',
                title: `تعارض في عناوين IP على منفذ ${ifName}`,
                desc: `العنوان ${ip} مكرر بين "${ipMap[ip].devName}" و "${dev.name} (${ifName})".`,
                device: dev.name,
                fixCmd: `interface ${ifName} \n ip address ...`,
                autoFix: () => {
                  const parts = ip.split('.');
                  parts[3] = String(parseInt(parts[3], 10) + 1);
                  ifc.ip = parts.join('.');
                }
              });
              penalty += 20;
            } else {
              ipMap[ip] = { devName: dev.name, ifName };
            }
          }

          // Check if link is connected but interface is administratively shutdown (common router issue!)
          const isConnected = net.links.some(l =>
            (l.devAId === dev.id && l.portA === ifName) ||
            (l.devBId === dev.id && l.portB === ifName)
          );
          if (isConnected && ifc.shutdown && dev.type === 'router') {
            issues.push({
              id: `shut-${dev.id}-${ifName}`,
              severity: 'critical',
              icon: '🔌',
              title: `المنفذ مغلق (Interface Administratively Down)`,
              desc: `المنفذ "${dev.name} ${ifName}" متصل بكابل لكنه في وضع الإغلاق (shutdown).`,
              device: dev.name,
              fixCmd: `interface ${ifName}\n no shutdown`,
              autoFix: () => {
                ifc.shutdown = false;
                if (net.refreshLinkStates) net.refreshLinkStates();
                if (PT.renderCanvas) PT.renderCanvas();
              }
            });
            penalty += 15;
          }
        }
      }

      // Security & Password Audit
      if (dev.type === 'switch' || dev.type === 'router') {
        const hasPlainPass = (c.enablePassword && !PT.isType7(c.enablePassword)) ||
          (c.lines && c.lines.con && c.lines.con.password && !PT.isType7(c.lines.con.password));
        if (!c.servicePwEnc && hasPlainPass) {
          issues.push({
            id: `sec-pw-enc-${dev.id}`,
            severity: 'warning',
            icon: '🔒',
            title: `كلمات المرور غير مشفرة (Unencrypted Passwords)`,
            desc: `الجهاز "${dev.name}" يحتوي على كلمات مرور صريحة في الإعدادات. يُوصى بتفعيل تشفير Cisco Type 7.`,
            device: dev.name,
            fixCmd: `service password-encryption`,
            autoFix: () => {
              c.servicePwEnc = true;
              if (PT.encryptExistingPasswords) PT.encryptExistingPasswords(dev);
            }
          });
          penalty += 10;
        }

        if (!c.enableSecret && !c.enablePassword) {
          issues.push({
            id: `sec-no-enable-${dev.id}`,
            severity: 'warning',
            icon: '🛡️',
            title: `عدم وجود كلمة مرور للـ Enable`,
            desc: `الجهاز "${dev.name}" غير محمي بكلمة سر للوصول إلى نمط Privileged EXEC.`,
            device: dev.name,
            fixCmd: `enable secret cisco`,
            autoFix: () => {
              c.enableSecret = { type: 5, hash: PT.encryptType5('cisco'), plain: 'cisco' };
            }
          });
          penalty += 10;
        }
      }
    }

    // 2. Link Subnet & VLAN Consistency Checks
    for (const link of net.links) {
      const devA = net.getDevice(link.devAId);
      const devB = net.getDevice(link.devBId);
      if (!devA || !devB) continue;

      const ipA = getPortIp(devA, link.portA);
      const ipB = getPortIp(devB, link.portB);

      if (ipA && ipB) {
        const sameSubnet = checkSameSubnet(ipA.ip, ipA.mask, ipB.ip, ipB.mask);
        if (!sameSubnet) {
          issues.push({
            id: `subnet-mismatch-${link.id}`,
            severity: 'critical',
            icon: '⚡',
            title: `عدم تطابق الشبكة الفرعية (Subnet Mismatch on Link)`,
            desc: `المنفذ "${devA.name} ${link.portA}" (${ipA.ip}/${ipA.mask}) والمنفذ "${devB.name} ${link.portB}" (${ipB.ip}/${ipB.mask}) ليسا في نفس الشبكة الفرعية! لن يتم تبادل الحزم بينهما.`,
            device: `${devA.name} ↔ ${devB.name}`,
            fixCmd: `تعديل عنوان أحد المنفذين ليكونا في نفس الشبكة`,
            autoFix: () => {
              const parts = ipA.ip.split('.');
              parts[3] = '2';
              setPortIp(devB, link.portB, parts.join('.'), ipA.mask);
            }
          });
          penalty += 20;
        }
      }

      // Switch to Switch Trunk Check
      if ((devA.type === 'switch' || devA.type === 'l3switch') && (devB.type === 'switch' || devB.type === 'l3switch')) {
        const ifcA = devA.cfg.ifaces[link.portA] || {};
        const ifcB = devB.cfg.ifaces[link.portB] || {};
        if (ifcA.mode !== 'trunk' && ifcB.mode !== 'trunk') {
          issues.push({
            id: `trunk-rec-${link.id}`,
            severity: 'info',
            icon: '💡',
            title: `يُوصى بتفعيل Trunk بين السويتشين`,
            desc: `الكابل بين "${devA.name} ${link.portA}" و "${devB.name} ${link.portB}" يعمل بوضع Access. لن يتم تمرير حزم الـ VLANs المتعددة بدون Trunk.`,
            device: `${devA.name} & ${devB.name}`,
            fixCmd: `interface ${link.portA}\n switchport mode trunk`,
            autoFix: () => {
              ifcA.mode = 'trunk';
              ifcB.mode = 'trunk';
            }
          });
          penalty += 5;
        }
      }
    }

    const healthScore = Math.max(10, 100 - penalty);
    return { healthScore, issues };
  };

  function getPortIp(dev, portName) {
    if (!dev || !dev.cfg) return null;
    if (dev.cfg.host && dev.cfg.host.ip) {
      return { ip: dev.cfg.host.ip, mask: dev.cfg.host.mask || '255.255.255.0' };
    }
    if (dev.cfg.ifaces && dev.cfg.ifaces[portName] && dev.cfg.ifaces[portName].ip) {
      return { ip: dev.cfg.ifaces[portName].ip, mask: dev.cfg.ifaces[portName].mask || '255.255.255.0' };
    }
    return null;
  }

  function setPortIp(dev, portName, ip, mask) {
    if (!dev || !dev.cfg) return;
    if (dev.cfg.host) {
      dev.cfg.host.ip = ip;
      dev.cfg.host.mask = mask;
    } else if (dev.cfg.ifaces && dev.cfg.ifaces[portName]) {
      dev.cfg.ifaces[portName].ip = ip;
      dev.cfg.ifaces[portName].mask = mask;
    }
  }

  function checkSameSubnet(ipA, maskA, ipB, maskB) {
    if (maskA !== maskB) return false;
    const aNum = ipToLong(ipA) & ipToLong(maskA);
    const bNum = ipToLong(ipB) & ipToLong(maskB);
    return aNum === bNum;
  }

  function ipToLong(ip) {
    return ip.split('.').reduce((acc, oct) => ((acc << 8) + parseInt(oct, 10)) >>> 0, 0);
  }

  function longToIp(long) {
    return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
  }

  // AI Knowledge-Base Q&A Assistant
  PT.askAiAssistant = function (query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return 'مرحباً بك! أنا مساعد الشبكات الذكي (AI Network Copilot). اسألني أي سؤال عن إعدادات سيسكو، الـ VLANs، التوجيه OSPF، التشفير، أو تشخيص الشبكة.';

    if (q.includes('ospf')) {
      return `### 🧭 كيفية إعداد بروتوكول التوجيه OSPF على راوتر سيسكو:\n\n` +
        `\`\`\`cisco\n` +
        `Router# configure terminal\n` +
        `Router(config)# router ospf 1\n` +
        `Router(config-router)# router-id 1.1.1.1\n` +
        `Router(config-router)# network 192.168.1.0 0.0.0.255 area 0\n` +
        `Router(config-router)# network 10.0.0.0 0.0.0.3 area 0\n` +
        `Router(config-router)# exit\n` +
        `\`\`\`\n\n` +
        `**نصيحة ذكية:** تأكد من أن الـ Wildcard Mask صحيح (عكس الـ Subnet Mask) وأن كلا الراوترين متصلان بنفس الـ Area (غالباً Area 0).`;
    }

    if (q.includes('vlan') || q.includes('سويتش')) {
      return `### 🖧 كيفية إنشاء VLAN وتعيين المنافذ:\n\n` +
        `\`\`\`cisco\n` +
        `Switch# conf t\n` +
        `Switch(config)# vlan 10\n` +
        `Switch(config-vlan)# name Sales\n` +
        `Switch(config-vlan)# exit\n` +
        `Switch(config)# interface range fa0/1 - 5\n` +
        `Switch(config-if-range)# switchport mode access\n` +
        `Switch(config-if-range)# switchport access vlan 10\n` +
        `Switch(config-if-range)# exit\n` +
        `\`\`\`\n\n` +
        `لإنشاء منفذ Trunk لنقل كل الـ VLANs لسويتش آخر أو راوتر:\n` +
        `\`\`\`cisco\n` +
        `Switch(config)# interface gi0/1\n` +
        `Switch(config-if)# switchport mode trunk\n` +
        `\`\`\``;
    }

    if (q.includes('باسوورد') || q.includes('تشفير') || q.includes('password') || q.includes('secret')) {
      return `### 🔒 إعداد كلمات المرور والتشفير المعتمد في Cisco:\n\n` +
        `1. **تشفير Type 5 (الأقوى باستخدام MD5):**\n` +
        `\`\`\`cisco\n` +
        `Switch(config)# enable secret cisco\n` +
        `\`\`\`\n\n` +
        `2. **تشفير Type 7 لجميع كلمات المرور العامة:**\n` +
        `\`\`\`cisco\n` +
        `Switch(config)# service password-encryption\n` +
        `Switch(config)# line con 0\n` +
        `Switch(config-line)# password cisco123\n` +
        `Switch(config-line)# login\n` +
        `\`\`\`\n` +
        `الآن عند كتابة \`show running-config\` ستجد كل كلمات المرور مشفرة بـ Type 5 و Type 7!`;
    }

    if (q.includes('dhcp') || q.includes('توزيع')) {
      return `### 🌐 إعداد خادم DHCP على راوتر سيسكو:\n\n` +
        `\`\`\`cisco\n` +
        `Router(config)# ip dhcp excluded-address 192.168.1.1 192.168.1.10\n` +
        `Router(config)# ip dhcp pool LAN_POOL\n` +
        `Router(dhcp-config)# network 192.168.1.0 255.255.255.0\n` +
        `Router(dhcp-config)# default-router 192.168.1.1\n` +
        `Router(dhcp-config)# dns-server 8.8.8.8\n` +
        `Router(dhcp-config)# exit\n` +
        `\`\`\``;
    }

    if (q.includes('ping') || q.includes('فشل') || q.includes('خطأ')) {
      return `### 🛠️ خطوات تصحيح فشل الاتصال (Ping Troubleshooting):\n\n` +
        `1. **تأكد من فتح المنفذ:** اكتب \`no shutdown\` على منفذ الراوتر.\n` +
        `2. **تأكد من الـ Default Gateway:** يجب أن يكون عنوان IP الخاص بالراوتر مسجلاً في إعدادات الـ PC كـ Gateway.\n` +
        `3. **تأكد من الـ VLANs:** إذا كان الجهازان في VLANs مختلفة، يلزم وجود راوتر (Router-on-a-Stick) مع Sub-interfaces.\n` +
        `4. **اضغط زر "Fast Forward Time"** لتجاوز فترة انتظار بروتوكول STP (الضوء البرتقالي).`;
    }

    return `### 💡 إجابة المساعد الذكي:\n\nلإجراء هذا التكوين على سيسكو، انتقل إلى وضع الإعداد:\n\`\`\`cisco\nenable\nconfigure terminal\n\`\`\`\nيمكنك فحص الشبكة الحالية تلقائياً بالضغط على زر **"فحص وتشخيص الشبكة"** بالأعلى وسأكتشف الأخطاء وأصلحها لك فوراً!`;
  };

  // ---------------------------------------------------------------- 2. VLSM & SUBNET PLANNER
  PT.calculateVlsm = function (majorNet, majorCidr, subnetsReq) {
    // subnetsReq: [{ name: 'LAN A', hosts: 50 }, { name: 'LAN B', hosts: 20 }, ...]
    const sorted = [...subnetsReq].sort((a, b) => b.hosts - a.hosts);
    let curIp = ipToLong(majorNet);
    const results = [];

    for (const sub of sorted) {
      const neededHosts = sub.hosts;
      // Formula: 2^h - 2 >= neededHosts -> 2^h >= neededHosts + 2
      const hostBits = Math.ceil(Math.log2(neededHosts + 2));
      const subCidr = 32 - hostBits;
      const totalCapacity = Math.pow(2, hostBits);
      const usableCapacity = totalCapacity - 2;

      const maskLong = (0xffffffff << hostBits) >>> 0;
      const maskStr = longToIp(maskLong);
      const wildcardStr = longToIp((~maskLong) >>> 0);

      const netLong = (curIp & maskLong) >>> 0;
      const broadcastLong = (netLong + totalCapacity - 1) >>> 0;
      const firstUsable = (netLong + 1) >>> 0;
      const lastUsable = (broadcastLong - 1) >>> 0;

      results.push({
        name: sub.name,
        neededHosts,
        usableCapacity,
        totalCapacity,
        cidr: subCidr,
        mask: maskStr,
        wildcard: wildcardStr,
        networkIp: longToIp(netLong),
        firstUsableIp: longToIp(firstUsable),
        lastUsableIp: longToIp(lastUsable),
        broadcastIp: longToIp(broadcastLong)
      });

      curIp = (broadcastLong + 1) >>> 0;
    }

    smartState.vlsmResults = results;
    return results;
  };

  PT.applyVlsmToTopology = function (vlsmResults) {
    const net = PT.net;
    if (!net || !vlsmResults || !vlsmResults.length) return 0;

    let appliedCount = 0;
    const pcs = net.devices.filter(d => d.type === 'pc' || d.type === 'laptop');

    for (let i = 0; i < pcs.length && i < vlsmResults.length; i++) {
      const pc = pcs[i];
      const sub = vlsmResults[i];
      if (pc.cfg && pc.cfg.host) {
        pc.cfg.host.ip = sub.firstUsableIp;
        pc.cfg.host.mask = sub.mask;
        pc.cfg.host.gateway = sub.lastUsableIp; // usually last or first
        appliedCount++;
      }
    }

    if (PT.renderCanvas) PT.renderCanvas();
    return appliedCount;
  };

  // ---------------------------------------------------------------- 3. WEB WIRESHARK PACKET SNIFFER
  PT.recordPacket = function (packetData) {
    const pkt = {
      id: smartState.capturedPackets.length + 1,
      time: (performance.now() / 1000).toFixed(4),
      srcDev: packetData.srcDev || 'Unknown',
      dstDev: packetData.dstDev || 'Unknown',
      srcIp: packetData.srcIp || '0.0.0.0',
      dstIp: packetData.dstIp || '0.0.0.0',
      srcMac: packetData.srcMac || '00:00:00:00:00:00',
      dstMac: packetData.dstMac || 'ff:ff:ff:ff:ff:ff',
      proto: (packetData.proto || 'ICMP').toUpperCase(),
      len: packetData.len || 64,
      info: packetData.info || 'Packet Transfer',
      layers: packetData.layers || generateDefaultLayers(packetData),
      hexDump: generateHexDump(packetData)
    };

    smartState.capturedPackets.push(pkt);
    if (smartState.capturedPackets.length > 500) smartState.capturedPackets.shift();

    // Notify UI if open
    if (typeof PT.onPacketCaptured === 'function') {
      PT.onPacketCaptured(pkt);
    }
  };

  function generateDefaultLayers(p) {
    return [
      {
        name: `Frame ${p.id || 1}: ${p.len || 64} bytes on wire`,
        details: [
          `Arrival Time: ${new Date().toISOString()}`,
          `Frame Length: ${p.len || 64} bytes`,
          `Protocols in frame: eth:ethertype:ip:${(p.proto || 'icmp').toLowerCase()}`
        ]
      },
      {
        name: `Ethernet II, Src: ${p.srcMac || '00:01:42:aa:11:01'}, Dst: ${p.dstMac || 'ff:ff:ff:ff:ff:ff'}`,
        details: [
          `Destination: ${p.dstMac || 'Broadcast'}`,
          `Source: ${p.srcMac || '00:01:42:aa:11:01'}`,
          `Type: IPv4 (0x0800)`
        ]
      },
      {
        name: `Internet Protocol Version 4, Src: ${p.srcIp || '192.168.1.10'}, Dst: ${p.dstIp || '192.168.1.1'}`,
        details: [
          `Version: 4`,
          `Header Length: 20 bytes`,
          `Time to Live (TTL): 128`,
          `Protocol: ${p.proto || 'ICMP'} (${p.proto === 'TCP' ? 6 : p.proto === 'UDP' ? 17 : 1})`,
          `Source Address: ${p.srcIp || '192.168.1.10'}`,
          `Destination Address: ${p.dstIp || '192.168.1.1'}`
        ]
      },
      {
        name: `${p.proto || 'ICMP'} Protocol Details`,
        details: [
          `Type: ${p.proto === 'ICMP' ? '8 (Echo request)' : 'Application Data'}`,
          `Code: 0`,
          `Checksum: 0x4f2a [correct]`,
          `Identifier: 0x0001`,
          `Sequence Number: 1`,
          `Data: ${p.len || 32} bytes`
        ]
      }
    ];
  }

  function generateHexDump(p) {
    const hex = [];
    const ascii = [];
    const lines = [];
    const str = `PACKET-SIM-${p.proto || 'ICMP'}-${p.srcIp || ''}->${p.dstIp || ''}-DATA-PAYLOAD-OK`;

    for (let i = 0; i < Math.min(64, p.len || 64); i++) {
      const code = i < str.length ? str.charCodeAt(i) : (0x20 + (i % 60));
      hex.push(code.toString(16).padStart(2, '0').toUpperCase());
      ascii.push(code >= 32 && code <= 126 ? String.fromCharCode(code) : '.');

      if (hex.length === 16 || i === (p.len || 64) - 1) {
        const offset = (Math.floor(i / 16) * 16).toString(16).padStart(4, '0');
        lines.push(`${offset}   ${hex.join(' ').padEnd(48, ' ')}   ${ascii.join('')}`);
        hex.length = 0;
        ascii.length = 0;
      }
    }
    return lines.join('\n');
  }

  // Hook into PT.NetworkEngine runPing to record packets automatically!
  if (PT.NetworkEngine) {
    const origPing = PT.NetworkEngine.prototype.runPing;
    PT.NetworkEngine.prototype.runPing = function (srcDev, targetIp, isCli) {
      const res = origPing.call(this, srcDev, targetIp, isCli);
      const targetDev = this.devices.find(d => {
        if (d.cfg && d.cfg.host && d.cfg.host.ip === targetIp) return true;
        if (d.cfg && d.cfg.ifaces) {
          return Object.values(d.cfg.ifaces).some(x => x.ip === targetIp);
        }
        return false;
      });

      const srcIp = (srcDev.cfg && srcDev.cfg.host && srcDev.cfg.host.ip) || '192.168.1.10';
      const srcMac = srcDev.baseMac || '0001.42aa.1101';
      const dstMac = (targetDev && targetDev.baseMac) || '0001.42bb.2202';

      // Record Echo Request
      PT.recordPacket({
        srcDev: srcDev.name,
        dstDev: (targetDev && targetDev.name) || 'Unknown',
        srcIp: srcIp,
        dstIp: targetIp,
        srcMac: srcMac,
        dstMac: dstMac,
        proto: 'ICMP',
        len: 74,
        info: `Echo (ping) request id=0x0001 seq=1 ttl=128`
      });

      if (res && res.success) {
        // Record Echo Reply
        PT.recordPacket({
          srcDev: (targetDev && targetDev.name) || 'Target',
          dstDev: srcDev.name,
          srcIp: targetIp,
          dstIp: srcIp,
          srcMac: dstMac,
          dstMac: srcMac,
          proto: 'ICMP',
          len: 74,
          info: `Echo (ping) reply id=0x0001 seq=1 ttl=128 (success)`
        });
      }
      return res;
    };
  }

  // ---------------------------------------------------------------- 4. INTERACTIVE CCNA LAB CHALLENGES
  PT.CHALLENGES = [
    {
      id: 'challenge-sec',
      title: 'تحدي تأمين السويتش (Switch Hardening & Passwords)',
      desc: 'قم بضبط إعدادات الأمان الأساسية على السويتش: تعيين اسم، وتشفير كلمات المرور Type 5 و Type 7، وضبط كلمة مرور الكونسول.',
      tasks: [
        {
          id: 't-host',
          name: 'تغيير اسم السويتش من Switch إلى SW1',
          weight: 20,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            return sw && sw.cfg && sw.cfg.hostname === 'SW1';
          }
        },
        {
          id: 't-sec',
          name: 'تفعيل enable secret بكلمة مرور مشفرة (Type 5)',
          weight: 25,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            return sw && sw.cfg && sw.cfg.enableSecret != null;
          }
        },
        {
          id: 't-enc',
          name: 'تفعيل أمر تشفير كلمات المرور العامة service password-encryption',
          weight: 25,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            return sw && sw.cfg && sw.cfg.servicePwEnc === true;
          }
        },
        {
          id: 't-con',
          name: 'ضبط كلمة مرور لمنفذ الكونسول line con 0 مع أمر login',
          weight: 20,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            return sw && sw.cfg && sw.cfg.lines && sw.cfg.lines.con && sw.cfg.lines.con.password && sw.cfg.lines.con.login;
          }
        },
        {
          id: 't-banner',
          name: 'ضبط رسالة ترحيب وتحذير banner motd #...#',
          weight: 10,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            return sw && sw.cfg && !!sw.cfg.banner;
          }
        }
      ]
    },
    {
      id: 'challenge-vlan',
      title: 'تحدي الـ VLANs و الـ 802.1Q Trunking',
      desc: 'قم بإنشاء VLAN 10 و VLAN 20 وتعيين المنافذ وتفعيل منفذ Trunk على السويتش.',
      tasks: [
        {
          id: 't-vlan10',
          name: 'إنشاء VLAN 10 وتسميته Sales',
          weight: 25,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            return sw && sw.cfg && sw.cfg.vlans && sw.cfg.vlans[10];
          }
        },
        {
          id: 't-vlan20',
          name: 'إنشاء VLAN 20 وتسميته IT أو Marketing',
          weight: 25,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            return sw && sw.cfg && sw.cfg.vlans && sw.cfg.vlans[20];
          }
        },
        {
          id: 't-acc',
          name: 'تعيين منفذ Fa0/1 بوضع Access إلى VLAN 10',
          weight: 25,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            const ifc = sw && sw.cfg && sw.cfg.ifaces && (sw.cfg.ifaces['FastEthernet0/1'] || sw.cfg.ifaces['Fa0/1']);
            return ifc && ifc.mode === 'access' && ifc.accessVlan === 10;
          }
        },
        {
          id: 't-trunk',
          name: 'ضبط المنفذ Gi0/1 ليعمل بوضع Trunk (802.1Q)',
          weight: 25,
          test: (net) => {
            const sw = net.devices.find(d => d.type === 'switch');
            const ifc = sw && sw.cfg && sw.cfg.ifaces && (sw.cfg.ifaces['GigabitEthernet0/1'] || sw.cfg.ifaces['Gi0/1']);
            return ifc && ifc.mode === 'trunk';
          }
        }
      ]
    },
    {
      id: 'challenge-ospf',
      title: 'تحدي التوجيه الديناميكي OSPF Routing',
      desc: 'قم بتفعيل OSPF Area 0 على الراوتر لربط الشبكات الفرعية بنجاح.',
      tasks: [
        {
          id: 't-ospf-proc',
          name: 'تفعيل بروتوكول OSPF (router ospf 1)',
          weight: 35,
          test: (net) => {
            const r = net.devices.find(d => d.type === 'router');
            return r && r.cfg && r.cfg.ospf && Object.keys(r.cfg.ospf).length > 0;
          }
        },
        {
          id: 't-ospf-net',
          name: 'إعلان الشبكات داخل Area 0 (network ... area 0)',
          weight: 35,
          test: (net) => {
            const r = net.devices.find(d => d.type === 'router');
            if (!r || !r.cfg || !r.cfg.ospf) return false;
            return Object.values(r.cfg.ospf).some(p => p.networks && p.networks.length > 0);
          }
        },
        {
          id: 't-ospf-up',
          name: 'تأكد من أن جميع منافذ الراوتر نشطة (no shutdown)',
          weight: 30,
          test: (net) => {
            const r = net.devices.find(d => d.type === 'router');
            if (!r || !r.cfg || !r.cfg.ifaces) return false;
            return Object.values(r.cfg.ifaces).some(ifc => ifc.ip && !ifc.shutdown);
          }
        }
      ]
    }
  ];

  PT.evaluateChallenge = function (challengeId) {
    const ch = PT.CHALLENGES.find(c => c.id === challengeId);
    if (!ch) return null;

    const net = PT.net;
    let score = 0;
    const taskStatus = [];

    for (const t of ch.tasks) {
      const passed = net ? t.test(net) : false;
      if (passed) score += t.weight;
      taskStatus.push({ id: t.id, name: t.name, weight: t.weight, passed });
    }

    return {
      id: ch.id,
      title: ch.title,
      score: Math.min(100, score),
      passed: score >= 100,
      tasks: taskStatus
    };
  };

  // ---------------------------------------------------------------- 5. TOPOLOGY REPORT GENERATOR
  PT.generateTopologyReport = function () {
    const net = PT.net;
    if (!net) return 'No network data available.';

    const rows = [];
    for (const dev of net.devices) {
      const c = dev.cfg || {};
      if (c.host && c.host.ip) {
        rows.push({
          device: dev.name,
          model: dev.modelKey || dev.type,
          iface: 'NIC',
          ip: c.host.ip,
          mask: c.host.mask || '255.255.255.0',
          gateway: c.host.gateway || 'N/A',
          vlan: 'N/A',
          status: dev.power ? 'Up' : 'Down'
        });
      }
      if (c.ifaces) {
        for (const [ifName, ifc] of Object.entries(c.ifaces)) {
          if (ifc.ip || ifc.mode) {
            rows.push({
              device: dev.name,
              model: dev.modelKey || dev.type,
              iface: ifName,
              ip: ifc.ip || 'Unassigned',
              mask: ifc.mask || 'N/A',
              gateway: c.defaultGateway || 'N/A',
              vlan: ifc.mode === 'trunk' ? 'Trunk (All)' : (ifc.accessVlan || '1'),
              status: ifc.shutdown ? 'Admin Down' : 'Up'
            });
          }
        }
      }
    }
    return rows;
  };

  // ---------------------------------------------------------------- 6. THEME TOGGLE
  PT.toggleTheme = function () {
    smartState.darkTheme = !smartState.darkTheme;
    const root = document.getElementById('pt-app') || document.body;
    root.classList.toggle('pt-dark-theme', smartState.darkTheme);
    return smartState.darkTheme;
  };

  // ---------------------------------------------------------------- UI CONTROLLERS & BINDERS
  function initSmartUI() {
    // Modal Open Buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.action;
        if (act === 'open-ai-copilot') {
          const m = document.getElementById('pt-ai-modal');
          if (m) { m.classList.remove('hidden'); renderAiAudit(); }
        } else if (act === 'open-vlsm-planner') {
          const m = document.getElementById('pt-vlsm-modal');
          if (m) m.classList.remove('hidden');
        } else if (act === 'open-web-wireshark') {
          const m = document.getElementById('pt-wireshark-modal');
          if (m) { m.classList.remove('hidden'); renderWiresharkPackets(); }
        } else if (act === 'open-challenges') {
          const m = document.getElementById('pt-challenges-modal');
          if (m) { m.classList.remove('hidden'); renderChallenge(); }
        } else if (act === 'open-topo-report') {
          const m = document.getElementById('pt-report-modal');
          if (m) { m.classList.remove('hidden'); renderTopoReport(); }
        } else if (act === 'toggle-global-theme') {
          PT.toggleTheme();
        }
      });
    });

    // 1. AI Copilot Controller
    const btnReAudit = document.getElementById('btn-re-audit');
    if (btnReAudit) btnReAudit.onclick = renderAiAudit;

    const btnAutoFixAll = document.getElementById('btn-auto-fix-all');
    if (btnAutoFixAll) {
      btnAutoFixAll.onclick = () => {
        const audit = PT.runNetworkAudit();
        for (const iss of audit.issues) {
          if (typeof iss.autoFix === 'function') iss.autoFix();
        }
        renderAiAudit();
      };
    }

    // AI Chat
    const aiInput = document.getElementById('pt-ai-input');
    const aiSend = document.getElementById('btn-ai-send');
    const aiMessages = document.getElementById('pt-ai-chat-messages');

    function sendAiQuestion(text) {
      const q = text || (aiInput ? aiInput.value : '');
      if (!q.trim() || !aiMessages) return;

      const userDiv = document.createElement('div');
      userDiv.className = 'pt-ai-msg user';
      userDiv.textContent = q;
      aiMessages.appendChild(userDiv);

      if (aiInput) aiInput.value = '';

      const answer = PT.askAiAssistant(q);
      const botDiv = document.createElement('div');
      botDiv.className = 'pt-ai-msg bot';
      botDiv.innerHTML = formatMarkdown(answer);
      aiMessages.appendChild(botDiv);

      aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    if (aiSend) aiSend.onclick = () => sendAiQuestion();
    if (aiInput) {
      aiInput.onkeydown = (e) => {
        if (e.key === 'Enter') sendAiQuestion();
      };
    }

    document.querySelectorAll('[data-ai-ask]').forEach(chip => {
      chip.onclick = () => sendAiQuestion(chip.dataset.aiAsk);
    });

    // 2. VLSM Planner Controller
    const btnCalcVlsm = document.getElementById('btn-calc-vlsm');
    if (btnCalcVlsm) {
      btnCalcVlsm.onclick = () => {
        const majorNet = (document.getElementById('vlsm-major-net') || {}).value || '192.168.1.0';
        const majorCidr = parseInt((document.getElementById('vlsm-major-cidr') || {}).value || '24', 10);

        const rows = document.querySelectorAll('#pt-vlsm-req-tbody tr');
        const reqs = [];
        rows.forEach(r => {
          const inputs = r.querySelectorAll('input');
          const name = inputs[0] ? inputs[0].value : 'Subnet';
          const hosts = inputs[1] ? parseInt(inputs[1].value, 10) : 10;
          if (name && !isNaN(hosts)) reqs.push({ name, hosts });
        });

        const res = PT.calculateVlsm(majorNet, majorCidr, reqs);
        renderVlsmResults(res);
      };
    }

    const btnAddSub = document.getElementById('btn-add-vlsm-sub');
    if (btnAddSub) {
      btnAddSub.onclick = () => {
        const tbody = document.getElementById('pt-vlsm-req-tbody');
        if (!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" value="شبكة جديدة (LAN)" /></td>
          <td><input type="number" value="14" min="2" max="1000" /></td>
          <td><button class="pt-table-del-btn" onclick="this.closest('tr').remove()">✕</button></td>
        `;
        tbody.appendChild(tr);
      };
    }

    const btnApplyVlsm = document.getElementById('btn-apply-vlsm-topo');
    if (btnApplyVlsm) {
      btnApplyVlsm.onclick = () => {
        if (!smartState.vlsmResults || !smartState.vlsmResults.length) {
          alert('يرجى الضغط على "حساب تقسيم الـ VLSM" أولاً قبل التطبيق.');
          return;
        }
        const count = PT.applyVlsmToTopology(smartState.vlsmResults);
        alert(`تم تطبيق العناوين بنجاح على ${count} من أجهزة الشبكة في المساحة!`);
      };
    }

    // 3. Web Wireshark Controller
    const wsFilterInput = document.getElementById('pt-ws-filter-input');
    const btnWsFilterApply = document.getElementById('btn-ws-filter-apply');
    const btnWsFilterClear = document.getElementById('btn-ws-filter-clear');
    const btnWsClear = document.getElementById('btn-ws-clear-packets');
    const btnWsExport = document.getElementById('btn-ws-export-json');

    if (btnWsFilterApply) {
      btnWsFilterApply.onclick = () => {
        smartState.packetFilter = (wsFilterInput ? wsFilterInput.value : '').toLowerCase().trim();
        renderWiresharkPackets();
      };
    }
    if (btnWsFilterClear) {
      btnWsFilterClear.onclick = () => {
        if (wsFilterInput) wsFilterInput.value = '';
        smartState.packetFilter = '';
        renderWiresharkPackets();
      };
    }
    if (btnWsClear) {
      btnWsClear.onclick = () => {
        smartState.capturedPackets = [];
        renderWiresharkPackets();
      };
    }
    if (btnWsExport) {
      btnWsExport.onclick = () => {
        const blob = new Blob([JSON.stringify(smartState.capturedPackets, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `packet-capture-${Date.now()}.pcap.json`;
        a.click();
      };
    }

    // Wireshark live listener
    PT.onPacketCaptured = function () {
      const modal = document.getElementById('pt-wireshark-modal');
      if (modal && !modal.classList.contains('hidden')) {
        renderWiresharkPackets();
      }
    };

    // 4. Challenges Controller
    const chSelect = document.getElementById('pt-challenge-select');
    const btnCheckCh = document.getElementById('btn-check-challenge');
    const btnPrintCert = document.getElementById('btn-print-cert');

    if (chSelect) {
      chSelect.onchange = () => renderChallenge();
    }
    if (btnCheckCh) {
      btnCheckCh.onclick = () => renderChallenge();
    }
    if (btnPrintCert) {
      btnPrintCert.onclick = () => window.print();
    }

    // 5. Topology Report Controller
    const btnPrintReport = document.getElementById('btn-print-topo-report');
    if (btnPrintReport) {
      btnPrintReport.onclick = () => window.print();
    }
  }

  // ---------------------------------------------------------------- Render Helpers
  function renderAiAudit() {
    const audit = PT.runNetworkAudit();
    const scoreNum = document.getElementById('pt-audit-score-num');
    const statusText = document.getElementById('pt-audit-status-text');
    const subText = document.getElementById('pt-audit-subtext');
    const list = document.getElementById('pt-audit-issues-list');

    if (scoreNum) {
      scoreNum.textContent = `${audit.healthScore}%`;
      const circle = scoreNum.closest('.pt-audit-score-circle');
      if (circle) {
        circle.style.background = audit.healthScore >= 80 ? '#10b981' : audit.healthScore >= 50 ? '#f59e0b' : '#ef4444';
      }
    }

    if (statusText) {
      statusText.textContent = audit.healthScore >= 90 ? 'الشبكة ممتازة وجاهزة' :
        audit.healthScore >= 60 ? 'توجد ملاحظات وتعارضات يُنصح بمعالجتها' :
        'توجد أخطاء حرجة تعطل الاتصال في الشبكة!';
    }
    if (subText) {
      subText.textContent = audit.issues.length ?
        `تم اكتشاف ${audit.issues.length} مشكلة/ملاحظة. يمكنك استخدام زر "إصلاح فوري" لحلها بنقرة واحدة.` :
        'لم يتم اكتشاف أي تعارضات أو مشاكل في التكوين الحالي.';
    }

    if (list) {
      if (!audit.issues.length) {
        list.innerHTML = '<div class="pt-audit-empty" style="text-align:center; padding:15px; color:#15803d; font-weight:700;">✅ جميع الأجهزة والروابط مضبوطة بنجاح وبدون أي أخطاء!</div>';
      } else {
        list.innerHTML = audit.issues.map(iss => `
          <div class="pt-issue-card ${iss.severity}">
            <div class="pt-issue-icon">${iss.icon}</div>
            <div class="pt-issue-content">
              <div class="pt-issue-title">${iss.title} (${iss.device})</div>
              <div class="pt-issue-desc">${iss.desc}</div>
              <div style="margin-top: 4px; font-family: monospace; font-size: 11px; color: #4338ca;">الأمر المقترح: ${iss.fixCmd.replace(/\n/g, ' ')}</div>
            </div>
            ${iss.autoFix ? `<button class="pt-issue-fix-btn" data-fix-id="${iss.id}">⚡ إصلاح فوري</button>` : ''}
          </div>
        `).join('');

        list.querySelectorAll('[data-fix-id]').forEach(btn => {
          btn.onclick = () => {
            const iss = audit.issues.find(x => x.id === btn.dataset.fixId);
            if (iss && typeof iss.autoFix === 'function') {
              iss.autoFix();
              renderAiAudit();
            }
          };
        });
      }
    }
  }

  function renderVlsmResults(results) {
    const tbody = document.getElementById('pt-vlsm-res-tbody');
    if (!tbody || !results) return;

    tbody.innerHTML = results.map(r => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.neededHosts}</td>
        <td>${r.usableCapacity}</td>
        <td><code>${r.networkIp}/${r.cidr}</code></td>
        <td><code>${r.mask}</code></td>
        <td><code>${r.firstUsableIp} - ${r.lastUsableIp}</code></td>
        <td><code>${r.broadcastIp}</code></td>
        <td><code>${r.wildcard}</code></td>
      </tr>
    `).join('');
  }

  function renderWiresharkPackets() {
    const tbody = document.getElementById('pt-ws-packet-tbody');
    if (!tbody) return;

    const filter = smartState.packetFilter;
    const pkts = smartState.capturedPackets.filter(p => {
      if (!filter) return true;
      return p.proto.toLowerCase().includes(filter) ||
        p.srcIp.includes(filter) ||
        p.dstIp.includes(filter) ||
        p.info.toLowerCase().includes(filter);
    });

    if (!pkts.length) {
      tbody.innerHTML = `<tr class="pt-ws-empty-row"><td colspan="7">No matching packets. (Filter: "${filter || 'none'}")</td></tr>`;
      return;
    }

    tbody.innerHTML = pkts.map((p, idx) => `
      <tr class="proto-${p.proto.toLowerCase()}" data-pkt-idx="${idx}">
        <td>${p.id}</td>
        <td>${p.time}</td>
        <td>${p.srcIp} (${p.srcDev})</td>
        <td>${p.dstIp} (${p.dstDev})</td>
        <td><strong>${p.proto}</strong></td>
        <td>${p.len}</td>
        <td>${p.info}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr[data-pkt-idx]').forEach(tr => {
      tr.onclick = () => {
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        const p = pkts[parseInt(tr.dataset.pktIdx, 10)];
        if (p) showPacketDetails(p);
      };
    });
  }

  function showPacketDetails(p) {
    const treeDiv = document.getElementById('pt-ws-layers-tree');
    const hexText = document.getElementById('pt-ws-hex-text');

    if (treeDiv) {
      treeDiv.innerHTML = (p.layers || []).map(layer => `
        <div class="pt-ws-layer-item">
          <div class="pt-ws-layer-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
            ▶ ${layer.name}
          </div>
          <div class="pt-ws-layer-details">
            ${layer.details.map(d => `<div>• ${d}</div>`).join('')}
          </div>
        </div>
      `).join('');
    }

    if (hexText) {
      hexText.textContent = p.hexDump || 'No raw data available.';
    }
  }

  function renderChallenge() {
    const chSelect = document.getElementById('pt-challenge-select');
    const chId = chSelect ? chSelect.value : 'challenge-sec';
    const evalRes = PT.evaluateChallenge(chId);
    if (!evalRes) return;

    const titleEl = document.getElementById('pt-challenge-title');
    const scoreBadge = document.getElementById('pt-challenge-score');
    const barFill = document.getElementById('pt-challenge-bar-fill');
    const descEl = document.getElementById('pt-challenge-desc');
    const listEl = document.getElementById('pt-challenge-tasks-list');
    const certBox = document.getElementById('pt-cert-box');

    const chObj = PT.CHALLENGES.find(c => c.id === chId) || {};
    if (titleEl) titleEl.textContent = evalRes.title;
    if (scoreBadge) scoreBadge.textContent = `${evalRes.score}% مكتمل`;
    if (barFill) barFill.style.width = `${evalRes.score}%`;
    if (descEl) descEl.textContent = chObj.desc || '';

    if (listEl) {
      listEl.innerHTML = evalRes.tasks.map(t => `
        <div class="pt-task-row ${t.passed ? 'passed' : ''}">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${t.passed ? '✅' : '⏳'}</span>
            <span style="font-size: 13px; font-weight: ${t.passed ? '700' : '500'};">${t.name}</span>
          </div>
          <div class="pt-task-status ${t.passed ? 'done' : 'pending'}">
            ${t.passed ? `+${t.weight}% منجز` : `${t.weight}%`}
          </div>
        </div>
      `).join('');
    }

    if (certBox) {
      certBox.classList.toggle('hidden', evalRes.score < 100);
    }
  }

  function renderTopoReport() {
    const tbody = document.getElementById('pt-report-tbody');
    if (!tbody) return;

    const rows = PT.generateTopologyReport();
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">لا توجد أجهزة في مساحة العمل الحالية. أضف أجهزة بالرسم لتوليد جدول العناوين.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><strong>${r.device}</strong></td>
        <td>${r.model}</td>
        <td><code>${r.iface}</code></td>
        <td><code>${r.ip}</code></td>
        <td><code>${r.mask}</code></td>
        <td><code>${r.gateway}</code></td>
        <td>${r.vlan}</td>
        <td><span style="color: ${r.status === 'Up' ? '#16a34a' : '#dc2626'}; font-weight:700;">${r.status}</span></td>
      </tr>
    `).join('');
  }

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/### (.*?)\n/g, '<h4 style="margin: 6px 0;">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```cisco([\s\S]*?)```/g, '<pre>$1</pre>')
      .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
      .replace(/`(.*?)`/g, '<code style="background:#e2e8f0; padding:2px 5px; border-radius:3px;">$1</code>')
      .replace(/\n/g, '<br/>');
  }

  // Auto initialize on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSmartUI);
    } else {
      initSmartUI();
    }
  }

})(typeof window !== 'undefined' ? window : global);

