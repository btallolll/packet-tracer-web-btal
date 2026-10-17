// ============================================================================
// Packet Tracer Web — js/ios.js
// Authentic Cisco IOS Command Line Interface (CLI) Parser & Execution Engine
// ============================================================================
(function (G) {
  'use strict';
  const PT = G.PT = G.PT || {};

  // ---------------------------------------------------------------- IOS Mode Hierarchy
  // Modes:
  //   'user'            Switch> or Router>
  //   'priv'            Switch# or Router#
  //   'config'          Switch(config)# or Router(config)#
  //   'config-if'       Switch(config-if)#
  //   'config-subif'    Router(config-subif)#
  //   'config-vlan'     Switch(config-vlan)#
  //   'config-line'     Switch(config-line)#
  //   'dhcp-config'     Router(dhcp-config)#
  //   'config-router'   Router(config-router)#
  //   'init-dialog'     Router initial configuration dialog [yes/no]
  //   'console-login'   Password:
  //   'enable-password' Password:

  function getPrompt(dev) {
    if (!dev || !dev.cfg) return 'Router>';
    const c = dev.cfg;
    const name = c.hostname || dev.name || 'Router';
    const m = dev.rt ? dev.rt.cliMode : 'user';

    switch (m) {
      case 'init-dialog':
        return 'Would you like to enter the initial configuration dialog? [yes/no]: ';
      case 'console-login':
      case 'enable-password':
        return 'Password: ';
      case 'user':
        return `${name}>`;
      case 'priv':
        return `${name}#`;
      case 'config':
        return `${name}(config)#`;
      case 'config-if':
        return `${name}(config-if)#`;
      case 'config-subif':
        return `${name}(config-subif)#`;
      case 'config-vlan':
        return `${name}(config-vlan)#`;
      case 'config-line':
        return `${name}(config-line)#`;
      case 'dhcp-config':
        return `${name}(dhcp-config)#`;
      case 'config-router':
        return `${name}(config-router)#`;
      default:
        return `${name}>`;
    }
  }

  // ---------------------------------------------------------------- Cisco Cryptographic Algorithms (Type 5 & Type 7)
  const CISCO_KEY = [
    0x64, 0x73, 0x54, 0x64, 0x6c, 0x53, 0x66, 0x5b,
    0x5b, 0x5f, 0x55, 0x5c, 0x53, 0x6c, 0x5d, 0x52
  ];

  function encryptType7(plaintext, seed) {
    if (plaintext == null || plaintext === '') return '';
    const s = (typeof seed === 'number' ? seed : Math.floor(Math.random() * 12) + 2) % 16;
    let hex = String(s).padStart(2, '0');
    for (let i = 0; i < plaintext.length; i++) {
      const k = CISCO_KEY[(s + i) % CISCO_KEY.length];
      const enc = plaintext.charCodeAt(i) ^ k;
      hex += enc.toString(16).toUpperCase().padStart(2, '0');
    }
    return hex;
  }

  function decryptType7(ciphertext) {
    if (!ciphertext || typeof ciphertext !== 'string' || ciphertext.length < 4) return ciphertext;
    const s = parseInt(ciphertext.slice(0, 2), 10);
    if (isNaN(s)) return ciphertext;
    let out = '';
    for (let i = 2, idx = 0; i < ciphertext.length; i += 2, idx++) {
      const byte = parseInt(ciphertext.slice(i, i + 2), 16);
      if (isNaN(byte)) return ciphertext;
      const k = CISCO_KEY[(s + idx) % CISCO_KEY.length];
      out += String.fromCharCode(byte ^ k);
    }
    return out;
  }

  function isType7(str) {
    if (!str || typeof str !== 'string' || str.length < 4 || (str.length % 2 !== 0)) return false;
    const s = parseInt(str.slice(0, 2), 10);
    if (isNaN(s) || s < 0 || s > 15) return false;
    return /^[0-9A-Fa-f]+$/.test(str);
  }

  function md5(string) {
    function rotateLeft(lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function addUnsigned(lX, lY) {
      const lX4 = lX & 0x40000000, lY4 = lY & 0x40000000;
      const lX8 = lX & 0x80000000, lY8 = lY & 0x80000000;
      const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
      if (lX4 | lY4) {
        if (lResult & 0x40000000) return lResult ^ 0xC0000000 ^ lX8 ^ lY8;
        else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
      } else return lResult ^ lX8 ^ lY8;
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return x ^ y ^ z; }
    function I(x, y, z) { return y ^ (x | (~z)); }

    function FF(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(str) {
      const lMessageLength = str.length;
      const lNumberOfWords_temp1 = lMessageLength + 8;
      const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      const lWordArray = new Array(lNumberOfWords);
      for (let i = 0; i < lNumberOfWords; i++) lWordArray[i] = 0;
      let lBytePosition = 0;
      let lByteCount = 0;
      while (lByteCount < lMessageLength) {
        const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }

    function wordToHex(lValue) {
      let WordToHexValue = '', lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        const s = '0' + lByte.toString(16);
        WordToHexValue = WordToHexValue + s.slice(-2);
      }
      return WordToHexValue;
    }

    const x = convertToWordArray(string);
    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a, BB = b, CC = c, DD = d;
      a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);

      a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
      c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);

      a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
      a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);

      a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }

  function toCiscoBase64(hexStr) {
    const itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let res = '';
    const bytes = [];
    for (let i = 0; i < hexStr.length; i += 2) {
      bytes.push(parseInt(hexStr.substr(i, 2), 16));
    }
    for (let i = 0; i < 15; i += 3) {
      const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      res += itoa64[v & 0x3f] + itoa64[(v >> 6) & 0x3f] + itoa64[(v >> 12) & 0x3f] + itoa64[(v >> 18) & 0x3f];
    }
    const v = bytes[15];
    res += itoa64[v & 0x3f] + itoa64[(v >> 6) & 0x3f];
    return res;
  }

  function encryptType5(plain, salt) {
    if (!plain) return '';
    const sStr = String(plain);
    if (sStr.startsWith('$1$')) return sStr;
    const s = salt || 'mERr';
    const hash = md5(sStr + s);
    return `$1$${s}$${toCiscoBase64(hash)}`;
  }

  function formatPasswordForRunningConfig(pw, servicePwEnc) {
    if (!pw) return '';
    if (typeof pw === 'object') {
      if (pw.type === 7 || servicePwEnc || isType7(pw.enc)) {
        return `7 ${pw.enc || encryptType7(pw.plain || '')}`;
      }
      return pw.plain || pw.enc || '';
    }
    if (typeof pw === 'string') {
      if (isType7(pw)) {
        return `7 ${pw}`;
      }
      if (servicePwEnc) {
        return `7 ${encryptType7(pw)}`;
      }
      return pw;
    }
    return String(pw);
  }

  function encryptExistingPasswords(dev) {
    if (!dev || !dev.cfg) return;
    const c = dev.cfg;
    if (c.enablePassword) {
      if (typeof c.enablePassword === 'object') {
        c.enablePassword.type = 7;
        if (!c.enablePassword.enc && c.enablePassword.plain) {
          c.enablePassword.enc = encryptType7(c.enablePassword.plain);
        }
      } else if (typeof c.enablePassword === 'string') {
        const plain = isType7(c.enablePassword) ? decryptType7(c.enablePassword) : c.enablePassword;
        const enc = isType7(c.enablePassword) ? c.enablePassword : encryptType7(c.enablePassword);
        c.enablePassword = { type: 7, enc: enc, plain: plain };
      }
    }
    if (c.lines) {
      for (const k of Object.keys(c.lines)) {
        const lineObj = c.lines[k];
        if (lineObj && lineObj.password) {
          if (typeof lineObj.password === 'object') {
            lineObj.password.type = 7;
            if (!lineObj.password.enc && lineObj.password.plain) {
              lineObj.password.enc = encryptType7(lineObj.password.plain);
            }
          } else if (typeof lineObj.password === 'string') {
            const plain = isType7(lineObj.password) ? decryptType7(lineObj.password) : lineObj.password;
            const enc = isType7(lineObj.password) ? lineObj.password : encryptType7(lineObj.password);
            lineObj.password = { type: 7, enc: enc, plain: plain };
          }
        }
      }
    }
    if (c.users) {
      for (const u of Object.values(c.users)) {
        if (u.password) {
          if (typeof u.password === 'object') {
            u.password.type = 7;
            if (!u.password.enc && u.password.plain) {
              u.password.enc = encryptType7(u.password.plain);
            }
          } else if (typeof u.password === 'string') {
            const plain = isType7(u.password) ? decryptType7(u.password) : u.password;
            const enc = isType7(u.password) ? u.password : encryptType7(u.password);
            u.password = { type: 7, enc: enc, plain: plain };
          }
        }
      }
    }
  }

  PT.encryptType7 = encryptType7;
  PT.decryptType7 = decryptType7;
  PT.isType7 = isType7;
  PT.encryptType5 = encryptType5;
  PT.md5 = md5;

  // ---------------------------------------------------------------- Tab Autocomplete
  // Returns { completed: string, matches: string[], changed: boolean }
  function autocomplete(dev, rawLine) {
    const mode = (dev.rt && dev.rt.cliMode) || (dev.type === 'router' ? 'init-dialog' : 'user');
    if (mode === 'init-dialog' || mode === 'console-login' || mode === 'enable-password') {
      return { line: rawLine, matches: [] };
    }

    const trimmedLeft = rawLine.replace(/^\s+/, '');
    const endsWithSpace = /\s$/.test(rawLine);
    const tokens = trimmedLeft.split(/\s+/).filter(Boolean);

    // If input is empty
    if (!tokens.length) {
      return { line: rawLine, matches: [] };
    }

    // Determine token index being typed
    const tokenIndex = endsWithSpace ? tokens.length : tokens.length - 1;
    const currentWord = endsWithSpace ? '' : tokens[tokens.length - 1];

    // Build valid command tree based on mode and previous tokens
    const candidates = getCompletionsAt(dev, mode, tokens, tokenIndex, currentWord);

    const matches = candidates.filter(w => w.toLowerCase().startsWith(currentWord.toLowerCase()));

    if (matches.length === 1) {
      const match = matches[0];
      let newLine;
      if (endsWithSpace) {
        newLine = rawLine + match + ' ';
      } else {
        const parts = rawLine.split(/\s+/);
        parts[parts.length - 1] = match;
        newLine = parts.join(' ') + ' ';
      }
      return { line: newLine, matches: [match] };
    }

    // If multiple matches share a common prefix longer than currentWord, complete up to common prefix
    if (matches.length > 1) {
      const common = longestCommonPrefix(matches);
      if (common.length > currentWord.length) {
        const parts = rawLine.split(/\s+/);
        parts[parts.length - 1] = common;
        return { line: parts.join(' '), matches };
      }
    }

    return { line: rawLine, matches };
  }

  function longestCommonPrefix(arr) {
    if (!arr.length) return '';
    let prefix = arr[0];
    for (let i = 1; i < arr.length; i++) {
      while (arr[i].toLowerCase().indexOf(prefix.toLowerCase()) !== 0) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return '';
      }
    }
    return prefix;
  }

  function getCompletionsAt(dev, mode, tokens, index, currentWord) {
    const isRouter = dev.type === 'router';
    const isSwitch = dev.type === 'switch' || dev.type === 'l3switch';
    const isL3Switch = dev.type === 'l3switch';

    // Global 'do' command handling inside config modes
    if (mode.startsWith('config') || mode === 'dhcp-config') {
      if (tokens[0] && tokens[0].toLowerCase() === 'do') {
        if (index === 0) return ['do'];
        return getCompletionsAt(dev, 'priv', tokens.slice(1), index - 1, currentWord);
      }
    }

    // USER EXEC MODE
    if (mode === 'user') {
      if (index === 0) {
        return ['enable', 'show', 'ping', 'traceroute', 'ssh', 'telnet', 'terminal', 'exit', 'logout'];
      }
      if (index === 1 && tokens[0].toLowerCase() === 'show') {
        return ['version', 'ip', 'interfaces', 'clock', 'history'];
      }
      return [];
    }

    // PRIVILEGED EXEC MODE
    if (mode === 'priv') {
      if (index === 0) {
        const list = [
          'configure', 'show', 'enable', 'disable', 'exit', 'logout', 'clear', 'clock',
          'copy', 'write', 'erase', 'reload', 'ping', 'traceroute', 'terminal', 'delete', 'dir'
        ];
        if (isSwitch) list.push('vlan');
        return list;
      }
      const t0 = tokens[0].toLowerCase();
      if ('configure'.startsWith(t0)) {
        if (index === 1) return ['terminal', 'memory'];
        return [];
      }
      if ('show'.startsWith(t0)) {
        if (index === 1) {
          const s = [
            'running-config', 'startup-config', 'ip', 'interfaces', 'version', 'clock',
            'history', 'arp', 'mac-address-table', 'cdp', 'users'
          ];
          if (isSwitch) {
            s.push('vlan', 'spanning-tree', 'etherchannel', 'port-security', 'vtp');
          }
          return s;
        }
        const t1 = tokens[1].toLowerCase();
        if ('ip'.startsWith(t1)) {
          if (index === 2) {
            const ips = ['interface', 'route', 'arp', 'dhcp', 'ospf', 'rip', 'protocols', 'nat'];
            return ips;
          }
          if (index === 3 && 'interface'.startsWith(tokens[2].toLowerCase())) {
            return ['brief'];
          }
          if (index === 3 && 'dhcp'.startsWith(tokens[2].toLowerCase())) {
            return ['binding', 'pool', 'server'];
          }
          if (index === 3 && 'ospf'.startsWith(tokens[2].toLowerCase())) {
            return ['neighbor', 'database', 'interface'];
          }
        }
        if ('interfaces'.startsWith(t1)) {
          if (index === 2) {
            const ifNames = dev.ports.map(p => PT.shortIf(p.name)).concat(['trunk', 'status', 'description']);
            return ifNames;
          }
        }
        if ('vlan'.startsWith(t1)) {
          if (index === 2) return ['brief', 'id', 'summary'];
        }
        if ('mac-address-table'.startsWith(t1) || 'mac'.startsWith(t1)) {
          if (index === 2) return ['dynamic', 'static', 'vlan', 'interface', 'count'];
        }
        if ('cdp'.startsWith(t1)) {
          if (index === 2) return ['neighbors', 'interface'];
          if (index === 3 && 'neighbors'.startsWith(tokens[2].toLowerCase())) return ['detail'];
        }
        if ('spanning-tree'.startsWith(t1)) {
          if (index === 2) return ['vlan', 'summary', 'detail'];
        }
        if ('port-security'.startsWith(t1)) {
          if (index === 2) return ['interface', 'address'];
        }
        if ('etherchannel'.startsWith(t1)) {
          if (index === 2) return ['summary', 'port-channel', 'detail'];
        }
      }
      if ('copy'.startsWith(t0)) {
        if (index === 1) return ['running-config', 'startup-config', 'tftp:', 'flash:'];
        if (index === 2) return ['startup-config', 'running-config', 'tftp:'];
      }
      if ('erase'.startsWith(t0)) {
        if (index === 1) return ['startup-config'];
      }
      if ('clear'.startsWith(t0)) {
        if (index === 1) return ['mac-address-table', 'arp-cache', 'ip', 'counters'];
      }
      if ('clock'.startsWith(t0)) {
        if (index === 1) return ['set'];
        return [];
      }
      return [];
    }

    // GLOBAL CONFIG MODE
    if (mode === 'config') {
      if (index === 0) {
        // EXACT Cisco IOS commands valid at root config mode! Note: 'exit' is unique for 'ex'!
        const roots = [
          'hostname', 'interface', 'ip', 'router', 'vlan', 'line', 'enable', 'service',
          'banner', 'username', 'no', 'do', 'exit', 'end', 'spanning-tree', 'vtp',
          'crypto', 'access-list', 'show', 'clock'
        ];
        return roots;
      }
      const t0 = tokens[0].toLowerCase();

      if ('show'.startsWith(t0)) {
        return getCompletionsAt(dev, 'priv', tokens, index, currentWord);
      }
      if ('clock'.startsWith(t0)) {
        if (index === 1) return ['timezone', 'set'];
        return [];
      }

      if ('interface'.startsWith(t0) || t0 === 'int') {
        if (index === 1) {
          const ifs = ['range', 'FastEthernet', 'GigabitEthernet', 'Serial', 'Vlan', 'Loopback', 'Port-channel'];
          dev.ports.forEach(p => ifs.push(PT.shortIf(p.name)));
          return ifs;
        }
        if (index === 2 && tokens[1].toLowerCase() === 'range') {
          return ['fa0/1-24', 'fa0/1-5', 'gi0/1-2'];
        }
      }

      if ('ip'.startsWith(t0)) {
        if (index === 1) {
          const sub = ['route', 'dhcp', 'default-gateway', 'domain-name', 'domain-lookup', 'routing', 'nat', 'access-list', 'ssh'];
          return sub;
        }
        const t1 = tokens[1].toLowerCase();
        if ('dhcp'.startsWith(t1)) {
          if (index === 2) return ['pool', 'excluded-address'];
        }
        if ('route'.startsWith(t1)) {
          if (index === 2) return ['0.0.0.0'];
        }
      }

      if ('vlan'.startsWith(t0)) {
        if (index === 1) return ['10', '20', '30', '99'];
      }

      if ('line'.startsWith(t0)) {
        if (index === 1) return ['console', 'vty', 'aux', 'con'];
        if (index === 2 && (tokens[1].toLowerCase() === 'vty')) return ['0'];
        if (index === 3 && (tokens[1].toLowerCase() === 'vty')) return ['4', '15'];
        if (index === 2 && (tokens[1].toLowerCase() === 'console' || tokens[1].toLowerCase() === 'con')) return ['0'];
      }

      if ('router'.startsWith(t0)) {
        if (index === 1) return ['ospf', 'rip', 'eigrp', 'bgp'];
        if (index === 2 && tokens[1].toLowerCase() === 'ospf') return ['1', '10'];
        if (index === 2 && tokens[1].toLowerCase() === 'eigrp') return ['100'];
      }

      if ('enable'.startsWith(t0)) {
        if (index === 1) return ['secret', 'password'];
        if (index === 2 && tokens[1].toLowerCase() === 'secret') return ['5', '0'];
        if (index === 2 && tokens[1].toLowerCase() === 'password') return ['7', '0'];
      }

      if ('service'.startsWith(t0)) {
        if (index === 1) return ['password-encryption'];
      }

      if ('username'.startsWith(t0)) {
        if (index === 2) return ['privilege', 'secret', 'password'];
        if (index === 3 && tokens[2].toLowerCase() === 'secret') return ['5', '0'];
        if (index === 3 && tokens[2].toLowerCase() === 'password') return ['7', '0'];
        if (index === 4 && tokens[2].toLowerCase() === 'privilege') return ['secret', 'password'];
      }

      if ('banner'.startsWith(t0)) {
        if (index === 1) return ['motd'];
      }

      if ('spanning-tree'.startsWith(t0)) {
        if (index === 1) return ['mode', 'portfast', 'vlan'];
        if (index === 2 && tokens[1].toLowerCase() === 'mode') return ['pvst', 'rapid-pvst', 'mst'];
        if (index === 2 && tokens[1].toLowerCase() === 'portfast') return ['default'];
      }

      if ('vtp'.startsWith(t0)) {
        if (index === 1) return ['mode', 'domain', 'password', 'version'];
        if (index === 2 && tokens[1].toLowerCase() === 'mode') return ['server', 'client', 'transparent'];
      }

      if ('crypto'.startsWith(t0)) {
        if (index === 1) return ['key'];
        if (index === 2 && tokens[1].toLowerCase() === 'key') return ['generate'];
        if (index === 3 && tokens[2].toLowerCase() === 'generate') return ['rsa'];
      }

      if ('no'.startsWith(t0)) {
        return getCompletionsAt(dev, 'config', tokens.slice(1), index - 1, currentWord);
      }

      return [];
    }

    // INTERFACE CONFIG MODE
    if (mode === 'config-if' || mode === 'config-subif') {
      if (index === 0) {
        const ifRoots = [
          'ip', 'shutdown', 'no', 'description', 'exit', 'end', 'do', 'show', 'clock'
        ];
        if (isSwitch) {
          ifRoots.push('switchport', 'spanning-tree', 'channel-group', 'duplex', 'speed');
        }
        if (isRouter) {
          ifRoots.push('encapsulation', 'bandwidth', 'clock', 'duplex', 'speed');
        }
        // Sub-mode direct switching commands
        ifRoots.push('interface', 'vlan', 'line', 'router');
        return ifRoots;
      }

      const t0 = tokens[0].toLowerCase();

      if ('show'.startsWith(t0)) {
        return getCompletionsAt(dev, 'priv', tokens, index, currentWord);
      }
      if ('clock'.startsWith(t0)) {
        if (index === 1) return ['rate', 'set'];
        if (index === 2 && tokens[1].toLowerCase() === 'rate') return ['64000', '128000', '56000', '9600'];
        return [];
      }

      if ('switchport'.startsWith(t0)) {
        if (index === 1) return ['mode', 'access', 'trunk', 'nonegotiate', 'port-security', 'voice'];
        const t1 = tokens[1].toLowerCase();
        if ('mode'.startsWith(t1)) {
          if (index === 2) return ['access', 'trunk', 'dynamic'];
          if (index === 3 && tokens[2].toLowerCase() === 'dynamic') return ['auto', 'desirable'];
        }
        if ('access'.startsWith(t1)) {
          if (index === 2) return ['vlan'];
          if (index === 3) return ['10', '20', '30'];
        }
        if ('trunk'.startsWith(t1)) {
          if (index === 2) return ['native', 'allowed', 'encapsulation'];
          if (index === 3 && tokens[2].toLowerCase() === 'native') return ['vlan'];
          if (index === 3 && tokens[2].toLowerCase() === 'allowed') return ['vlan'];
          if (index === 4 && tokens[3].toLowerCase() === 'vlan') return ['add', 'remove', 'all', '1,10,20'];
        }
        if ('port-security'.startsWith(t1)) {
          if (index === 2) return ['mac-address', 'maximum', 'violation'];
          if (index === 3 && tokens[2].toLowerCase() === 'mac-address') return ['sticky'];
          if (index === 3 && tokens[2].toLowerCase() === 'violation') return ['shutdown', 'restrict', 'protect'];
        }
      }

      if ('ip'.startsWith(t0)) {
        if (index === 1) return ['address', 'helper-address', 'nat', 'ospf', 'access-group'];
        if (index === 2 && tokens[1].toLowerCase() === 'address') return ['192.168.1.1', '10.0.0.1'];
        if (index === 3 && tokens[1].toLowerCase() === 'address') return ['255.255.255.0', '255.255.0.0', '255.0.0.0'];
        if (index === 2 && tokens[1].toLowerCase() === 'nat') return ['inside', 'outside'];
      }

      if ('encapsulation'.startsWith(t0)) {
        if (index === 1) return ['dot1Q'];
        if (index === 2 && tokens[1].toLowerCase() === 'dot1q') return ['10', '20', '30'];
        if (index === 3 && tokens[1].toLowerCase() === 'dot1q') return ['native'];
      }

      if ('spanning-tree'.startsWith(t0)) {
        if (index === 1) return ['portfast', 'bpduguard'];
        if (index === 2 && tokens[1].toLowerCase() === 'bpduguard') return ['enable', 'disable'];
      }

      if ('channel-group'.startsWith(t0)) {
        if (index === 1) return ['1', '2'];
        if (index === 2) return ['mode'];
        if (index === 3) return ['active', 'passive', 'desirable', 'auto', 'on'];
      }

      if ('no'.startsWith(t0)) {
        if (index === 1) return ['shutdown', 'switchport', 'ip', 'spanning-tree', 'description'];
      }

      return [];
    }

    // VLAN CONFIG MODE
    if (mode === 'config-vlan') {
      if (index === 0) return ['name', 'state', 'no', 'exit', 'end', 'vlan', 'interface', 'do'];
      if (index === 1 && tokens[0].toLowerCase() === 'state') return ['active', 'suspend'];
      return [];
    }

    // LINE CONFIG MODE
    if (mode === 'config-line') {
      if (index === 0) return ['password', 'login', 'transport', 'logging', 'exec-timeout', 'no', 'exit', 'end', 'do'];
      const t0 = tokens[0].toLowerCase();
      if ('password'.startsWith(t0) && index === 1) return ['7', '0'];
      if ('login'.startsWith(t0) && index === 1) return ['local'];
      if ('transport'.startsWith(t0)) {
        if (index === 1) return ['input'];
        if (index === 2) return ['ssh', 'telnet', 'all', 'none'];
      }
      if ('logging'.startsWith(t0) && index === 1) return ['synchronous'];
      return [];
    }

    // DHCP POOL CONFIG MODE
    if (mode === 'dhcp-config') {
      if (index === 0) return ['network', 'default-router', 'dns-server', 'domain-name', 'lease', 'no', 'exit', 'end', 'do'];
      return [];
    }

    // ROUTER CONFIG MODE
    if (mode === 'config-router') {
      if (index === 0) return ['network', 'router-id', 'passive-interface', 'version', 'auto-summary', 'no', 'exit', 'end', 'do'];
      const t0 = tokens[0].toLowerCase();
      if ('network'.startsWith(t0)) {
        if (index === 3) return ['area'];
        if (index === 4) return ['0'];
      }
      return [];
    }

    return ['exit', 'end'];
  }

  // ---------------------------------------------------------------- IOS Command Execution
  // Executes a line in the context of device, updates device config/runtime state,
  // and returns string response (or empty string if normal success with no message).
  function execute(dev, rawLine, netCtx) {
    if (!dev) return '';
    dev.rt = dev.rt || PT.freshRuntime(dev);
    const rt = dev.rt;
    rt.cliMode = rt.cliMode || (dev.type === 'router' ? 'init-dialog' : 'user');

    const line = String(rawLine || '').replace(/\r/g, '');
    const trimmed = line.trim();

    // Init dialog handler (Router first boot)
    if (rt.cliMode === 'init-dialog') {
      const lower = trimmed.toLowerCase();
      if (lower === 'no' || lower === 'n' || lower === '') {
        rt.cliMode = 'user';
        return '\n\nPress RETURN to get started!\n';
      }
      if (lower === 'yes' || lower === 'y') {
        rt.cliMode = 'user';
        return '\n\n% Exiting to user EXEC mode.\n\nPress RETURN to get started!\n';
      }
      return '\nPlease answer \'yes\' or \'no\'.\n';
    }

    // Console password check
    if (rt.cliMode === 'console-login') {
      const expected = dev.cfg && dev.cfg.lines && dev.cfg.lines.con && dev.cfg.lines.con.password;
      if (!expected) {
        rt.cliMode = 'user';
        return '';
      }
      const plain = typeof expected === 'object' ? expected.plain : (isType7(expected) ? decryptType7(expected) : expected);
      const enc = typeof expected === 'object' ? expected.enc : (isType7(expected) ? expected : encryptType7(expected));
      if (trimmed === plain || trimmed === enc) {
        rt.cliMode = 'user';
        return '';
      }
      return '\n% Bad passwords\n';
    }

    // Enable password check
    if (rt.cliMode === 'enable-password') {
      // 1. Check enableSecret if present (Cisco priority)
      if (dev.cfg && dev.cfg.enableSecret) {
        const sec = dev.cfg.enableSecret;
        const plain = (typeof sec === 'object' ? sec.plain : null);
        const hash = (typeof sec === 'object' ? sec.hash : sec);
        let matched = false;
        if (plain && trimmed === plain) {
          matched = true;
        } else if (hash && hash.startsWith('$1$')) {
          const parts = hash.split('$');
          const salt = parts[2] || 'mERr';
          if (encryptType5(trimmed, salt) === hash || trimmed === hash) {
            matched = true;
          }
        } else if (trimmed === hash) {
          matched = true;
        }
        if (matched) {
          rt.cliMode = 'priv';
          return '';
        }
        rt.cliMode = 'user';
        return '\n% Bad secrets\n';
      }

      // 2. Check enablePassword if present
      if (dev.cfg && dev.cfg.enablePassword) {
        const pw = dev.cfg.enablePassword;
        const plain = typeof pw === 'object' ? pw.plain : (isType7(pw) ? decryptType7(pw) : pw);
        const enc = typeof pw === 'object' ? pw.enc : (isType7(pw) ? pw : encryptType7(pw));
        if (trimmed === plain || trimmed === enc) {
          rt.cliMode = 'priv';
          return '';
        }
        rt.cliMode = 'user';
        return '\n% Bad passwords\n';
      }

      // If neither is set, allow transition
      rt.cliMode = 'priv';
      return '';
    }

    // Empty line / comment
    if (!trimmed || trimmed.startsWith('!')) {
      return '';
    }

    // History tracking
    rt.cliHistory = rt.cliHistory || [];
    if (rt.cliHistory[rt.cliHistory.length - 1] !== trimmed) {
      rt.cliHistory.push(trimmed);
    }
    rt.cliHistoryIdx = rt.cliHistory.length;

    // Help ?
    if (trimmed.endsWith('?')) {
      return getHelpText(dev, trimmed.slice(0, -1));
    }

    // Handle 'do <cmd>' in config modes
    if (rt.cliMode.startsWith('config') || rt.cliMode === 'dhcp-config') {
      if (/^do\s+/i.test(trimmed)) {
        const sub = trimmed.replace(/^do\s+/i, '');
        const savedMode = rt.cliMode;
        rt.cliMode = 'priv';
        const out = execute(dev, sub, netCtx);
        rt.cliMode = savedMode;
        return out;
      }
    }

    const tokens = trimmed.split(/\s+/);
    // Arabic command alias mapping
    const arMap = {
      'كلك': 'clock',
      'شو': 'show',
      'شاو': 'show',
      'انترفيس': 'interface',
      'انترفيّس': 'interface',
      'خروج': 'exit',
      'اكزت': 'exit',
      'انبل': 'enable',
      'بنق': 'ping',
      'شاتداون': 'shutdown',
      'تعيين': 'set',
      'كونفق': 'configure',
      'راوتر': 'router',
      'سويتش': 'switch'
    };
    for (let i = 0; i < tokens.length; i++) {
      const low = tokens[i].toLowerCase();
      if (arMap[low]) tokens[i] = arMap[low];
    }
    const t0 = tokens[0].toLowerCase();
    const t1 = (tokens[1] || '').toLowerCase();
    const t2 = (tokens[2] || '').toLowerCase();
    const t3 = (tokens[3] || '').toLowerCase();

    // Universal 'show' / 'sh' support across all modes (standard in Cisco PT and expected by students)
    if (t0 === 'show' || (t0 === 'sh' && (tokens.length > 1 || rt.cliMode === 'user' || rt.cliMode === 'priv'))) {
      if (rt.cliMode === 'config-if' && tokens.length === 1 && t0 === 'sh') {
        return '% Ambiguous command: "sh" (could be show or shutdown)';
      }
      return executeShow(dev, tokens.slice(1), netCtx);
    }

    // Global navigation commands: 'end' / Ctrl+Z
    if (t0 === 'end' && rt.cliMode !== 'user' && rt.cliMode !== 'priv') {
      rt.cliMode = 'priv';
      return '%SYS-5-CONFIG_I: Configured from console by console';
    }

    // 'exit' or 'logout'
    if (('exit'.startsWith(t0) && t0.length >= 2) || ('logout'.startsWith(t0) && t0.length >= 2)) {
      if (rt.cliMode === 'user') {
        if (dev.cfg && dev.cfg.lines && dev.cfg.lines.con && dev.cfg.lines.con.login && dev.cfg.lines.con.password) {
          rt.cliMode = 'console-login';
        }
        return `${dev.cfg.hostname || dev.name} con0 is now available\n\nPress RETURN to get started.`;
      }
      if (rt.cliMode === 'priv') {
        rt.cliMode = 'user';
        return '';
      }
      if (rt.cliMode === 'config') {
        rt.cliMode = 'priv';
        return '%SYS-5-CONFIG_I: Configured from console by console';
      }
      // Sub-config modes step back to 'config'
      rt.cliMode = 'config';
      return '';
    }

    // ------------------------------------------------ USER & PRIVILEGED EXEC
    if (rt.cliMode === 'user' || rt.cliMode === 'priv') {
      // enable
      if ('enable'.startsWith(t0) && t0.length >= 2) {
        if (rt.cliMode === 'priv') return '';
        const pass = dev.cfg.enableSecret || dev.cfg.enablePassword;
        if (pass) {
          rt.cliMode = 'enable-password';
          return '';
        }
        rt.cliMode = 'priv';
        return '';
      }

      // disable
      if ('disable'.startsWith(t0) && t0.length >= 3) {
        rt.cliMode = 'user';
        return '';
      }

      // configure terminal (or conf t, con t, conf)
      if (('configure'.startsWith(t0) && t0.length >= 3) || t0 === 'conf' || t0 === 'con') {
        if (rt.cliMode !== 'priv') return '% Unknown command or computer name, or unable to find computer address';
        rt.cliMode = 'config';
        return 'Enter configuration commands, one per line.  End with CNTL/Z.';
      }

      // write / copy run start
      if (t0 === 'wr' || t0 === 'write' || ('copy'.startsWith(t0) && t1.startsWith('run'))) {
        if (rt.cliMode !== 'priv') return '% Invalid command.';
        dev.startup = PT.clone(dev.cfg);
        return 'Building configuration...\n[OK]';
      }

      // reload
      if ('reload'.startsWith(t0) && t0.length >= 3) {
        if (rt.cliMode !== 'priv') return '% Invalid command.';
        if (dev.startup) {
          dev.cfg = PT.clone(dev.startup);
        }
        dev.rt = PT.freshRuntime(dev);
        if (netCtx && typeof netCtx.refreshLinkStates === 'function') netCtx.refreshLinkStates();
        return 'System Bootstrap, Version 15.0(2)SE4\nRebooting...\n\nPress RETURN to get started!';
      }

      // ping <ip>
      if ('ping'.startsWith(t0)) {
        const targetIp = tokens[1];
        if (!targetIp) return '% Incomplete command.';
        if (netCtx && typeof netCtx.runPing === 'function') {
          const res = netCtx.runPing(dev, targetIp, true);
          return res.cliText || (res.success ? '!!!!!\nSuccess rate is 100 percent (5/5)' : '.....\nSuccess rate is 0 percent (0/5)');
        }
        return 'Sending 5, 100-byte ICMP Echos to ' + targetIp + ', timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5)';
      }

      // traceroute <ip>
      if ('traceroute'.startsWith(t0) || 'tracert'.startsWith(t0)) {
        const targetIp = tokens[1];
        if (!targetIp) return '% Incomplete command.';
        return `Tracing the route to ${targetIp}\n\n  1   ${targetIp} 1 msec 0 msec 1 msec`;
      }

      // dir / dir flash:
      if (t0 === 'dir') {
        return showFlash(dev);
      }

      // clock set hh:mm:ss dd Month yyyy
      if ('clock'.startsWith(t0)) {
        if (t1 === 'set' && tokens[2]) {
          dev.rt.customClock = tokens.slice(2).join(' ');
          return '';
        }
        return '% Incomplete command. Syntax: clock set hh:mm:ss day month year';
      }

      // show commands
      if ('show'.startsWith(t0) && t0.length >= 2) {
        return executeShow(dev, tokens.slice(1), netCtx);
      }

      return '% Invalid input detected at \'^\' marker.';
    }

    // ------------------------------------------------ GLOBAL CONFIG MODE
    if (rt.cliMode === 'config') {
      const isNo = t0 === 'no';
      const cmd = isNo ? t1 : t0;
      const arg1 = isNo ? tokens[2] : tokens[1];
      const arg2 = isNo ? tokens[3] : tokens[2];
      const arg3 = isNo ? tokens[4] : tokens[3];

      // clock timezone / clock set
      if ('clock'.startsWith(cmd)) {
        if (arg1 === 'timezone') {
          dev.cfg.clockTimezone = tokens.slice(isNo ? 3 : 2).join(' ');
          return '';
        }
        if (arg1 === 'set' && arg2) {
          dev.rt.customClock = tokens.slice(isNo ? 3 : 2).join(' ');
          return '';
        }
        return '% Incomplete command. Syntax: clock timezone <zone> <offset>';
      }

      // hostname <name>
      if ('hostname'.startsWith(cmd) && cmd.length >= 2) {
        if (!arg1) return '% Incomplete command.';
        dev.cfg.hostname = isNo ? (dev.type === 'switch' ? 'Switch' : 'Router') : arg1;
        dev.name = dev.cfg.hostname;
        return '';
      }

      // interface <name> or interface range <spec>
      if ('interface'.startsWith(cmd) && cmd.length >= 2) {
        const rest = trimmed.replace(/^(?:no\s+)?(?:interface|interfac|interfa|interf|inter|inte|int|in)\s+/i, '').trim();
        if (!rest) return '% Incomplete command.';

        if (/^range\s+/i.test(rest)) {
          const rangeSpec = rest.replace(/^range\s+/i, '');
          const expanded = expandRange(rangeSpec, dev);
          if (!expanded.length) return `% Invalid interface range "${rangeSpec}"`;
          rt.selectedIfaces = expanded;
          rt.cliMode = 'config-if';
          return '';
        }

        const parsed = PT.parseIfName(rest);
        if (!parsed) return `% Invalid interface type and number`;

        const canonicalName = parsed.name;
        // Dynamically create Subinterface (e.g. GigabitEthernet0/0.10) or SVI (Vlan10) or Loopback
        ensureInterfaceExists(dev, canonicalName);

        rt.selectedIfaces = [canonicalName];
        rt.cliMode = canonicalName.includes('.') ? 'config-subif' : 'config-if';
        return '';
      }

      // vlan <id>
      if ('vlan'.startsWith(cmd) && cmd.length >= 2) {
        const vid = parseInt(arg1, 10);
        if (isNaN(vid) || vid < 1 || vid > 4094) return '% Incomplete command or invalid VLAN ID.';
        if (isNo) {
          if (vid === 1 || vid >= 1002) return `% Default VLAN ${vid} cannot be deleted.`;
          delete dev.cfg.vlans[vid];
          return '';
        }
        if (!dev.cfg.vlans[vid]) {
          dev.cfg.vlans[vid] = { name: `VLAN${String(vid).padStart(4, '0')}`, state: 'active' };
          dev.cfg.vtp.revision++;
        }
        rt.selectedVlan = vid;
        rt.cliMode = 'config-vlan';
        return '';
      }

      // ip dhcp ...
      if (cmd === 'ip' && arg1 === 'dhcp') {
        const sub = arg2;
        if (sub === 'pool') {
          const poolName = arg3;
          if (!poolName) return '% Incomplete command.';
          dev.cfg.dhcpPools[poolName] = dev.cfg.dhcpPools[poolName] || {
            name: poolName, network: '', mask: '', defaultRouter: '', dnsServer: '', domainName: ''
          };
          rt.selectedDhcpPool = poolName;
          rt.cliMode = 'dhcp-config';
          return '';
        }
        if (sub === 'excluded-address') {
          const low = arg3;
          const high = isNo ? tokens[5] : tokens[4];
          if (!low) return '% Incomplete command.';
          if (isNo) {
            dev.cfg.dhcpExcluded = (dev.cfg.dhcpExcluded || []).filter(x => x.low !== low);
          } else {
            dev.cfg.dhcpExcluded.push({ low, high: high || low });
          }
          return '';
        }
      }

      // ip route <prefix> <mask> <next-hop | exit-if>
      if (cmd === 'ip' && ('route'.startsWith(arg1) || arg1 === 'ro')) {
        const prefix = arg2;
        const mask = arg3;
        const nextHop = isNo ? tokens[5] : tokens[4];
        if (!prefix || !mask || !nextHop) return '% Incomplete command.';
        if (isNo) {
          dev.cfg.routes = dev.cfg.routes.filter(r => !(r.network === prefix && r.mask === mask));
        } else {
          dev.cfg.routes.push({ network: prefix, mask, nextHop });
        }
        return '';
      }

      // ip routing (enable L3 routing on 3560 / 3650)
      if (cmd === 'ip' && ('routing'.startsWith(arg1) || arg1 === 'rout')) {
        dev.cfg.ipRouting = !isNo;
        return '';
      }

      // ip default-gateway <ip>
      if (cmd === 'ip' && ('default-gateway'.startsWith(arg1) || arg1 === 'def' || arg1 === 'dg')) {
        dev.cfg.defaultGateway = isNo ? '' : (arg2 || '');
        return '';
      }

      // ip domain-name <name>
      if (cmd === 'ip' && 'domain-name'.startsWith(arg1)) {
        dev.cfg.domainName = isNo ? '' : (arg2 || '');
        return '';
      }

      // ip domain-lookup / no ip domain-lookup
      if (cmd === 'ip' && ('domain-lookup'.startsWith(arg1) || arg1 === 'domain-lo')) {
        dev.cfg.domainLookup = !isNo;
        return '';
      }

      // router ospf <id> / router rip / router eigrp <as>
      if ('router'.startsWith(cmd) && cmd.length >= 2) {
        const proto = (arg1 || '').toLowerCase();
        if (proto === 'ospf') {
          const pid = parseInt(arg2, 10) || 1;
          dev.cfg.ospf[pid] = dev.cfg.ospf[pid] || { routerId: '', networks: [], passiveIfs: [] };
          rt.selectedRouter = { proto: 'ospf', id: pid };
          rt.cliMode = 'config-router';
          return '';
        }
        if (proto === 'rip') {
          dev.cfg.rip = dev.cfg.rip || { version: 1, networks: [], autoSummary: true, passiveIfs: [] };
          rt.selectedRouter = { proto: 'rip' };
          rt.cliMode = 'config-router';
          return '';
        }
      }

      // line console 0 / line vty 0 4
      if ('line'.startsWith(cmd) && cmd.length >= 1) {
        const lineType = (arg1 || '').toLowerCase();
        if (lineType.startsWith('con')) {
          rt.selectedLine = 'con';
          rt.cliMode = 'config-line';
          return '';
        }
        if (lineType.startsWith('vty')) {
          rt.selectedLine = 'vty';
          rt.cliMode = 'config-line';
          return '';
        }
      }

      // enable secret / enable password
      if ('enable'.startsWith(cmd) && cmd.length >= 2) {
        if (arg1 === 'secret' || arg1 === 'sec') {
          if (isNo) {
            dev.cfg.enableSecret = null;
            return '';
          }
          let type = 0;
          let pass = '';
          if (arg2 === '5') {
            type = 5;
            pass = arg3 || '';
          } else if (arg2 === '0') {
            type = 0;
            pass = arg3 || '';
          } else {
            pass = arg2 || '';
          }
          if (!pass) return '% Incomplete command.';

          if (type === 5 || pass.startsWith('$1$')) {
            dev.cfg.enableSecret = {
              type: 5,
              hash: pass,
              plain: ''
            };
          } else {
            dev.cfg.enableSecret = {
              type: 5,
              hash: encryptType5(pass),
              plain: pass
            };
          }
          return '';
        }
        if (arg1 === 'password' || arg1 === 'pass') {
          if (isNo) {
            dev.cfg.enablePassword = null;
            return '';
          }
          let type = 0;
          let pass = '';
          if (arg2 === '7') {
            type = 7;
            pass = arg3 || '';
          } else if (arg2 === '0') {
            type = 0;
            pass = arg3 || '';
          } else {
            pass = arg2 || '';
          }
          if (!pass) return '% Incomplete command.';

          if (type === 7 || isType7(pass)) {
            dev.cfg.enablePassword = {
              type: 7,
              enc: pass,
              plain: decryptType7(pass)
            };
          } else {
            dev.cfg.enablePassword = {
              type: dev.cfg.servicePwEnc ? 7 : 0,
              enc: encryptType7(pass),
              plain: pass
            };
          }
          return '';
        }
      }

      // service password-encryption
      if ('service'.startsWith(cmd) && (arg1 === 'password-encryption' || (arg1 === 'password' && arg2 === 'encryption'))) {
        dev.cfg.servicePwEnc = !isNo;
        if (!isNo) {
          encryptExistingPasswords(dev);
        }
        return '';
      }

      // username <name> [privilege <lvl>] secret [5] <pass>
      // username <name> [privilege <lvl>] password [7|0] <pass>
      // no username <name>
      if ('username'.startsWith(cmd) && cmd.length >= 4) {
        const uTokens = isNo ? tokens.slice(1) : tokens;
        const uname = uTokens[1];
        if (!uname) return '% Incomplete command.';
        dev.cfg.users = dev.cfg.users || {};
        if (isNo) {
          delete dev.cfg.users[uname];
          return '';
        }
        let priv = 1;
        let idx = 2;
        if (uTokens[idx] === 'privilege') {
          priv = parseInt(uTokens[idx + 1], 10) || 1;
          idx += 2;
        }
        const authType = (uTokens[idx] || '').toLowerCase();
        idx++;
        let encFlag = null;
        if (uTokens[idx] === '0' || uTokens[idx] === '5' || uTokens[idx] === '7') {
          encFlag = uTokens[idx];
          idx++;
        }
        const passVal = uTokens.slice(idx).join(' ');
        if (!passVal) return '% Incomplete command.';

        const uObj = dev.cfg.users[uname] || { privilege: priv };
        uObj.privilege = priv;

        if (authType === 'secret' || authType === 'sec') {
          uObj.secret = {
            type: 5,
            hash: (encFlag === '5' || passVal.startsWith('$1$')) ? passVal : encryptType5(passVal),
            plain: (encFlag === '5' || passVal.startsWith('$1$')) ? '' : passVal
          };
          delete uObj.password;
        } else {
          if (encFlag === '7' || isType7(passVal)) {
            uObj.password = {
              type: 7,
              enc: passVal,
              plain: decryptType7(passVal)
            };
          } else {
            uObj.password = {
              type: dev.cfg.servicePwEnc ? 7 : 0,
              enc: encryptType7(passVal),
              plain: passVal
            };
          }
          delete uObj.secret;
        }
        dev.cfg.users[uname] = uObj;
        return '';
      }

      // banner motd #...#
      if ('banner'.startsWith(cmd) && arg1 === 'motd') {
        const full = trimmed.replace(/^banner\s+motd\s+/i, '');
        const delim = full.charAt(0);
        const endIdx = full.lastIndexOf(delim);
        if (endIdx > 0) {
          dev.cfg.banner = full.slice(1, endIdx);
        } else {
          dev.cfg.banner = full.replace(/^[#^]/, '').replace(/[#^]$/, '');
        }
        return '';
      }

      // spanning-tree mode ...
      if ('spanning-tree'.startsWith(cmd)) {
        if (arg1 === 'mode' && arg2) {
          dev.cfg.stp.mode = arg2.toLowerCase();
          return '';
        }
        if (arg1 === 'portfast' && arg2 === 'default') {
          dev.cfg.stp.portfastDefault = !isNo;
          return '';
        }
      }

      // vtp mode / domain / password
      if ('vtp'.startsWith(cmd)) {
        if (arg1 === 'mode' && arg2) {
          dev.cfg.vtp.mode = arg2.toLowerCase();
          return `Setting device to VTP ${arg2.toUpperCase()} mode.`;
        }
        if (arg1 === 'domain' && arg2) {
          dev.cfg.vtp.domain = arg2;
          return `Changing VTP domain name from NULL to ${arg2}`;
        }
      }

      // crypto key generate rsa
      if ('crypto'.startsWith(cmd) && arg1 === 'key' && 'generate'.startsWith(arg2)) {
        dev.cfg.cryptoKey = 1024;
        dev.cfg.sshVersion = 2;
        return 'How many bits in the modulus [512]: 1024\n% Generating 1024 bit RSA keys, keys will be non-exportable...[OK]\n*Mar  1 00:00:02.100: %SSH-5-ENABLED: SSH 1.99 has been enabled';
      }

      return '% Invalid input detected at \'^\' marker.';
    }

    // ------------------------------------------------ INTERFACE CONFIG MODE
    if (rt.cliMode === 'config-if' || rt.cliMode === 'config-subif') {
      const isNo = t0 === 'no';
      const cmd = isNo ? t1 : t0;
      const arg1 = isNo ? tokens[2] : tokens[1];
      const arg2 = isNo ? tokens[3] : tokens[2];
      const arg3 = isNo ? tokens[4] : tokens[3];

      const targets = rt.selectedIfaces || [];
      if (!targets.length) return '% No interface selected.';

      // clock rate <speed> (Serial DCE) or clock set
      if ('clock'.startsWith(cmd)) {
        if (arg1 === 'rate' && arg2) {
          const rate = parseInt(arg2, 10) || 64000;
          targets.forEach(n => {
            const ifc = dev.cfg.ifaces[n];
            if (ifc) ifc.clockRate = rate;
          });
          return '';
        }
        if (arg1 === 'set' && arg2) {
          dev.rt.customClock = tokens.slice(isNo ? 3 : 2).join(' ');
          return '';
        }
        return '% Incomplete command. Syntax: clock rate <speed>';
      }

      // shutdown / no shutdown (supports sh, shut, shutdown, no sh, no shut)
      if ('shutdown'.startsWith(cmd) && cmd.length >= 2) {
        for (const ifName of targets) {
          const ifc = dev.cfg.ifaces[ifName];
          if (ifc) ifc.shutdown = !isNo;
        }
        if (netCtx && typeof netCtx.refreshLinkStates === 'function') netCtx.refreshLinkStates();
        const stateStr = isNo ? 'up' : 'administratively down';
        const msgs = targets.map(n => `%LINK-5-CHANGED: Interface ${n}, changed state to ${stateStr}`);
        return msgs.join('\n');
      }

      // ip address <ip> <mask > (supports ip add, ip address)
      if (cmd === 'ip' && ('address'.startsWith(arg1) || arg1 === 'add')) {
        if (isNo) {
          targets.forEach(n => {
            const ifc = dev.cfg.ifaces[n];
            if (ifc) { ifc.ip = ''; ifc.mask = ''; }
          });
          if (netCtx && typeof netCtx.refreshLinkStates === 'function') netCtx.refreshLinkStates();
          return '';
        }
        if (!arg2 || !arg3) return '% Incomplete command.';
        if (!PT.isIp(arg2) || !PT.isMask(arg3)) return '% Invalid IP address or subnet mask.';
        targets.forEach(n => {
          const ifc = dev.cfg.ifaces[n];
          if (ifc) { ifc.ip = arg2; ifc.mask = arg3; }
        });
        if (netCtx && typeof netCtx.refreshLinkStates === 'function') netCtx.refreshLinkStates();
        return '';
      }

      // ip helper-address <ip> (DHCP Relay)
      if (cmd === 'ip' && ('helper-address'.startsWith(arg1) || arg1 === 'helper')) {
        if (!arg2) return '% Incomplete command.';
        targets.forEach(n => {
          const ifc = dev.cfg.ifaces[n];
          if (ifc) {
            ifc.helpers = ifc.helpers || [];
            if (isNo) ifc.helpers = ifc.helpers.filter(h => h !== arg2);
            else if (!ifc.helpers.includes(arg2)) ifc.helpers.push(arg2);
          }
        });
        return '';
      }

      // switchport mode access | trunk (supports sw mo acc, sw mo tr, sw acc vl 10, etc.)
      if ('switchport'.startsWith(cmd) && cmd.length >= 2) {
        if (!arg1) return '';
        if ('mode'.startsWith(arg1)) {
          const modeVal = (arg2 || '').toLowerCase();
          targets.forEach(n => {
            const ifc = dev.cfg.ifaces[n];
            if (ifc) {
              if ('access'.startsWith(modeVal)) ifc.mode = 'access';
              else if ('trunk'.startsWith(modeVal)) ifc.mode = 'trunk';
            }
          });
          if (netCtx && typeof netCtx.refreshLinkStates === 'function') netCtx.refreshLinkStates();
          return '';
        }
        if ('access'.startsWith(arg1) && ('vlan'.startsWith(arg2) || arg2 === 'v' || arg2 === 'vl')) {
          const vid = parseInt(arg3, 10);
          if (isNaN(vid)) return '% Incomplete command.';
          let msg = '';
          if (!dev.cfg.vlans[vid]) {
            dev.cfg.vlans[vid] = { name: `VLAN${String(vid).padStart(4, '0')}`, state: 'active' };
            msg = `% Access VLAN does not exist. Creating vlan ${vid}`;
          }
          targets.forEach(n => {
            const ifc = dev.cfg.ifaces[n];
            if (ifc) ifc.accessVlan = isNo ? 1 : vid;
          });
          return msg;
        }
        if ('trunk'.startsWith(arg1)) {
          if ('native'.startsWith(arg2) && ('vlan'.startsWith(arg3) || arg3 === 'v' || arg3 === 'vl')) {
            const vid = parseInt(tokens[isNo ? 5 : 4], 10) || 1;
            targets.forEach(n => {
              const ifc = dev.cfg.ifaces[n];
              if (ifc) ifc.nativeVlan = vid;
            });
            return '';
          }
          if ('allowed'.startsWith(arg2) || arg2 === 'all') {
            const vspec = tokens.slice(isNo ? 5 : 4).join('');
            targets.forEach(n => {
              const ifc = dev.cfg.ifaces[n];
              if (ifc) ifc.allowed = vspec === 'all' ? null : vspec;
            });
            return '';
          }
        }
        if ('port-security'.startsWith(arg1)) {
          targets.forEach(n => {
            const ifc = dev.cfg.ifaces[n];
            if (!ifc) return;
            ifc.psec = ifc.psec || { enabled: false, max: 1, violation: 'shutdown', sticky: false, macs: [] };
            if (!arg2) {
              ifc.psec.enabled = !isNo;
            } else if ('maximum'.startsWith(arg2)) {
              ifc.psec.max = parseInt(arg3, 10) || 1;
            } else if ('mac-address'.startsWith(arg2)) {
              if (arg3 === 'sticky') ifc.psec.sticky = !isNo;
              else if (arg3) ifc.psec.macs.push(arg3.toUpperCase());
            } else if ('violation'.startsWith(arg2)) {
              ifc.psec.violation = arg3 || 'shutdown';
            }
          });
          return '';
        }
      }

      // encapsulation dot1Q <vid> [native] (for router subinterfaces)
      if ('encapsulation'.startsWith(cmd) && cmd.length >= 3) {
        if ('dot1q'.startsWith(arg1.toLowerCase())) {
          const vid = parseInt(arg2, 10) || 1;
          targets.forEach(n => {
            const ifc = dev.cfg.ifaces[n];
            if (ifc) {
              ifc.encap = 'dot1Q';
              ifc.vlanId = vid;
            }
          });
          return '';
        }
      }

      // spanning-tree portfast / bpduguard
      if ('spanning-tree'.startsWith(cmd)) {
        if ('portfast'.startsWith(arg1.toLowerCase())) {
          targets.forEach(n => {
            const ifc = dev.cfg.ifaces[n];
            if (ifc) ifc.portfast = !isNo;
          });
          return '%Warning: portfast should only be enabled on ports connected to a single host.';
        }
        if ('bpduguard'.startsWith(arg1.toLowerCase())) {
          targets.forEach(n => {
            const ifc = dev.cfg.ifaces[n];
            if (ifc) ifc.bpduguard = !isNo;
          });
          return '';
        }
      }

      // description <text>
      if ('description'.startsWith(cmd) && cmd.length >= 4) {
        const desc = isNo ? '' : trimmed.replace(/^(?:no\s+)?desc(?:ription)?\s+/i, '');
        targets.forEach(n => {
          const ifc = dev.cfg.ifaces[n];
          if (ifc) ifc.desc = desc;
        });
        return '';
      }

      // Automatic fallback to global config commands (e.g. typing 'int fa0/2' from 'config-if')
      const prevMode = rt.cliMode;
      rt.cliMode = 'config';
      const fallback = execute(dev, rawLine, netCtx);
      if (fallback === '% Invalid input detected at \'^\' marker.') {
        rt.cliMode = prevMode;
      }
      return fallback;
    }

    // ------------------------------------------------ VLAN CONFIG MODE
    if (rt.cliMode === 'config-vlan') {
      const vid = rt.selectedVlan || 1;
      const vobj = dev.cfg.vlans[vid];
      if ('name'.startsWith(t0) && t0.length >= 2) {
        if (!tokens[1]) return '% Incomplete command.';
        if (vobj) vobj.name = tokens[1];
        dev.cfg.vtp.revision++;
        return '';
      }
      // Sub-mode fallback to global config
      const prevMode = rt.cliMode;
      rt.cliMode = 'config';
      const fallback = execute(dev, rawLine, netCtx);
      if (fallback === '% Invalid input detected at \'^\' marker.') {
        rt.cliMode = prevMode;
      }
      return fallback;
    }

    // ------------------------------------------------ LINE CONFIG MODE
    if (rt.cliMode === 'config-line') {
      const lcfg = dev.cfg.lines[rt.selectedLine || 'con'];
      if ('password'.startsWith(t0) && t0.length >= 4) {
        if (!lcfg) return '';
        if (tokens.length < 2) return '% Incomplete command.';
        let type = 0;
        let pass = '';
        if (tokens[1] === '7') {
          type = 7;
          pass = tokens[2] || '';
        } else if (tokens[1] === '0') {
          type = 0;
          pass = tokens[2] || '';
        } else {
          pass = tokens.slice(1).join(' ');
        }
        if (!pass) return '% Incomplete command.';

        if (type === 7 || isType7(pass)) {
          lcfg.password = {
            type: 7,
            enc: pass,
            plain: decryptType7(pass)
          };
        } else {
          lcfg.password = {
            type: dev.cfg.servicePwEnc ? 7 : 0,
            enc: encryptType7(pass),
            plain: pass
          };
        }
        return '';
      }
      if (t0 === 'no' && 'password'.startsWith(t1) && t1.length >= 4) {
        if (lcfg) lcfg.password = null;
        return '';
      }
      if ('login'.startsWith(t0)) {
        if (lcfg) lcfg.login = t1 === 'local' ? 'local' : true;
        return '';
      }
      if (t0 === 'no' && t1 === 'login') {
        if (lcfg) lcfg.login = false;
        return '';
      }
      if ('logging'.startsWith(t0) && 'synchronous'.startsWith(t1)) {
        if (lcfg) lcfg.logSync = true;
        return '';
      }
      if ('transport'.startsWith(t0) && t1 === 'input') {
        if (lcfg) lcfg.transport = tokens.slice(2).join(' ') || 'all';
        return '';
      }
      // Fallback
      const prevMode = rt.cliMode;
      rt.cliMode = 'config';
      const fallback = execute(dev, rawLine, netCtx);
      if (fallback === '% Invalid input detected at \'^\' marker.') {
        rt.cliMode = prevMode;
      }
      return fallback;
    }

    // ------------------------------------------------ DHCP CONFIG MODE
    if (rt.cliMode === 'dhcp-config') {
      const pool = dev.cfg.dhcpPools[rt.selectedDhcpPool];
      if ('network'.startsWith(t0) && tokens[1] && tokens[2]) {
        if (pool) { pool.network = tokens[1]; pool.mask = tokens[2]; }
        return '';
      }
      if ('default-router'.startsWith(t0) && tokens[1]) {
        if (pool) pool.defaultRouter = tokens[1];
        return '';
      }
      if ('dns-server'.startsWith(t0) && tokens[1]) {
        if (pool) pool.dnsServer = tokens[1];
        return '';
      }
      if ('domain-name'.startsWith(t0) && tokens[1]) {
        if (pool) pool.domainName = tokens[1];
        return '';
      }
      // Fallback
      const prevMode = rt.cliMode;
      rt.cliMode = 'config';
      const fallback = execute(dev, rawLine, netCtx);
      if (fallback === '% Invalid input detected at \'^\' marker.') {
        rt.cliMode = prevMode;
      }
      return fallback;
    }

    // ------------------------------------------------ ROUTER PROTOCOL CONFIG MODE
    if (rt.cliMode === 'config-router') {
      const rproto = rt.selectedRouter || { proto: 'ospf', id: 1 };
      if (rproto.proto === 'ospf') {
        const proc = dev.cfg.ospf[rproto.id];
        if ('network'.startsWith(t0) && tokens[1] && tokens[2]) {
          const area = tokens[3] === 'area' ? (tokens[4] || '0') : '0';
          if (proc) proc.networks.push({ network: tokens[1], wildcard: tokens[2], area });
          return '';
        }
        if ('router-id'.startsWith(t0) && tokens[1]) {
          if (proc) proc.routerId = tokens[1];
          return '';
        }
        if ('passive-interface'.startsWith(t0) && tokens[1]) {
          if (proc) proc.passiveIfs.push(tokens[1]);
          return '';
        }
      }
      if (rproto.proto === 'rip') {
        const rip = dev.cfg.rip;
        if ('network'.startsWith(t0) && tokens[1]) {
          if (rip && !rip.networks.includes(tokens[1])) rip.networks.push(tokens[1]);
          return '';
        }
        if ('version'.startsWith(t0) && tokens[1]) {
          if (rip) rip.version = parseInt(tokens[1], 10) || 2;
          return '';
        }
        if ('auto-summary'.startsWith(t0)) {
          if (rip) rip.autoSummary = t0 !== 'no';
          return '';
        }
      }
      // Fallback
      const prevMode = rt.cliMode;
      rt.cliMode = 'config';
      const fallback = execute(dev, rawLine, netCtx);
      if (fallback === '% Invalid input detected at \'^\' marker.') {
        rt.cliMode = prevMode;
      }
      return fallback;
    }

    return '% Invalid input detected at \'^\' marker.';
  }

  // ---------------------------------------------------------------- SHOW COMMANDS
  function executeShow(dev, rawTokens, netCtx) {
    if (!rawTokens || !rawTokens.length) return '% Incomplete command.';

    let tokens = [...rawTokens];
    let pipeFilter = null;
    const pipeIdx = tokens.indexOf('|');
    if (pipeIdx !== -1) {
      pipeFilter = {
        type: (tokens[pipeIdx + 1] || 'include').toLowerCase(),
        pattern: tokens.slice(pipeIdx + 2).join(' ')
      };
      tokens = tokens.slice(0, pipeIdx);
      if (!tokens.length) return '% Incomplete command.';
    }

    const res = executeShowInternal(dev, tokens, netCtx);
    if (!pipeFilter || !pipeFilter.pattern || typeof res !== 'string') return res;

    const lines = res.split('\n');
    const pat = pipeFilter.pattern.toLowerCase();
    if (pipeFilter.type.startsWith('inc')) {
      return lines.filter(l => l.toLowerCase().includes(pat)).join('\n');
    }
    if (pipeFilter.type.startsWith('exc')) {
      return lines.filter(l => !l.toLowerCase().includes(pat)).join('\n');
    }
    if (pipeFilter.type.startsWith('beg')) {
      const idx = lines.findIndex(l => l.toLowerCase().includes(pat));
      return idx !== -1 ? lines.slice(idx).join('\n') : '';
    }
    if (pipeFilter.type.startsWith('sec')) {
      const out = [];
      let inSection = false;
      for (const l of lines) {
        if (!l.startsWith(' ') && l.toLowerCase().includes(pat)) {
          inSection = true;
          out.push(l);
        } else if (inSection) {
          if (!l.startsWith(' ') && l !== '!') {
            inSection = false;
          } else {
            out.push(l);
          }
        }
      }
      return out.join('\n');
    }
    return res;
  }

  function executeShowInternal(dev, tokens, netCtx) {
    if (!tokens.length) return '% Incomplete command.';
    const t0 = tokens[0].toLowerCase();
    const t1 = (tokens[1] || '').toLowerCase();
    const t2 = (tokens[2] || '').toLowerCase();

    // show clock
    if ('clock'.startsWith(t0)) {
      return showClock(dev);
    }

    // show running-config
    if ('running-config'.startsWith(t0) || t0 === 'run' || t0 === 'r') {
      return generateRunningConfig(dev);
    }

    // show startup-config
    if ('startup-config'.startsWith(t0) || t0 === 'start') {
      if (!dev.startup) return 'startup-config is not present';
      const tmp = PT.clone(dev);
      tmp.cfg = dev.startup;
      return generateRunningConfig(tmp);
    }

    // show ip ...
    if ('ip'.startsWith(t0)) {
      if ('interface'.startsWith(t1) || t1 === 'int') {
        if ('brief'.startsWith(t2) || t2 === 'br' || !t2) {
          return showIpInterfaceBrief(dev);
        }
        return showInterfaceDetail(dev, tokens[2]);
      }
      if ('route'.startsWith(t1) || t1 === 'ro') {
        return showIpRoute(dev, netCtx);
      }
      if ('arp'.startsWith(t1)) {
        return showArp(dev);
      }
      if ('dhcp'.startsWith(t1)) {
        if ('binding'.startsWith(t2)) return showIpDhcpBinding(dev);
        if ('pool'.startsWith(t2)) return showIpDhcpPool(dev);
        return showIpDhcpBinding(dev);
      }
      if ('protocols'.startsWith(t1) || t1 === 'proto') {
        return showIpProtocols(dev);
      }
    }

    // show arp
    if ('arp'.startsWith(t0)) {
      return showArp(dev);
    }

    // show interfaces ...
    if ('interfaces'.startsWith(t0) || t0 === 'int') {
      if ('trunk'.startsWith(t1)) return showInterfacesTrunk(dev);
      if ('status'.startsWith(t1)) return showInterfacesStatus(dev);
      if ('description'.startsWith(t1) || t1 === 'desc') return showInterfacesDescription(dev);
      if (t1) {
        return showInterfaceDetail(dev, tokens[1]);
      }
      return showAllInterfaces(dev);
    }

    // show vlan brief
    if ('vlan'.startsWith(t0)) {
      return showVlanBrief(dev);
    }

    // show mac-address-table / show mac address-table
    if ('mac-address-table'.startsWith(t0) || ('mac'.startsWith(t0) && t1.startsWith('add'))) {
      return showMacAddressTable(dev);
    }

    // show cdp neighbors
    if ('cdp'.startsWith(t0) && 'neighbors'.startsWith(t1)) {
      return showCdpNeighbors(dev, netCtx);
    }

    // show spanning-tree
    if ('spanning-tree'.startsWith(t0) || t0 === 'span') {
      return showSpanningTree(dev);
    }

    // show version
    if ('version'.startsWith(t0) || t0 === 'ver') {
      return showVersion(dev);
    }

    // show flash: / show flash
    if ('flash'.startsWith(t0) || t0 === 'flash:') {
      return showFlash(dev);
    }

    // show history
    if ('history'.startsWith(t0) || t0 === 'hist') {
      return showHistory(dev);
    }

    // show users
    if ('users'.startsWith(t0)) {
      return showUsers(dev);
    }

    // show etherchannel
    if ('etherchannel'.startsWith(t0)) {
      return 'No etherchannel groups configured';
    }

    // show port-security
    if ('port-security'.startsWith(t0)) {
      return 'Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action\n--------------------------------------------------------------------------------';
    }

    return '% Invalid input detected at \'^\' marker.';
  }

  function showClock(dev) {
    if (dev.rt && dev.rt.customClock) {
      return `*${dev.rt.customClock} UTC`;
    }
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `*${timeStr} UTC ${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`;
  }

  function showInterfaceDetail(dev, ifName) {
    const parsed = PT.parseIfName(ifName);
    const targetName = parsed ? parsed.name : ifName;
    const ifc = dev.cfg.ifaces[targetName] || dev.cfg.ifaces[ifName];
    if (!ifc) {
      return `% Invalid interface type and number`;
    }
    const p = dev.ports.find(x => x.name === targetName || x.name === ifName);
    const isUp = p ? (!ifc.shutdown && p.linkId) : (!ifc.shutdown);
    const status = ifc.shutdown ? 'administratively down' : isUp ? 'up' : 'down';
    const proto = isUp ? 'up' : 'down';
    const mac = (p && p.mac) || dev.baseMac || '0001.42ab.cd01';
    const bw = targetName.startsWith('Gig') ? '1000000 Kbit/sec' : targetName.startsWith('Serial') ? '1544 Kbit/sec' : '100000 Kbit/sec';
    const media = targetName.startsWith('Gig') ? '10/100/1000BaseTX' : targetName.startsWith('Serial') ? 'V.35' : '10/100BaseTX';
    const ipStr = ifc.ip ? `\n  Internet address is ${ifc.ip}/${PT.maskToCidr ? PT.maskToCidr(ifc.mask || '255.255.255.0') : 24}` : '';

    return `${targetName} is ${status}, line protocol is ${proto}
  Hardware is ${targetName.startsWith('Serial') ? 'HD64570' : 'FastEthernet'}, address is ${mac} (bia ${mac})${ipStr}
  MTU 1500 bytes, BW ${bw}, DLY 100 usec,
     reliability 255/255, txload 1/255, rxload 1/255
  Encapsulation ARPA, loopback not set
  Keepalive set (10 sec)
  Full-duplex, 100Mb/s, media type is ${media}
  output flow-control is unsupported, input flow-control is off
  ARP type: ARPA, ARP Timeout 04:00:00
  Last input 00:00:08, output 00:00:02, output hang never
  Last clearing of "show interface" counters never
  Input queue: 0/75/0/0 (size/max/drops/flushes); Total output drops: 0
  Queueing strategy: fifo
  Output queue: 0/40 (size/max)
  5 minute input rate 0 bits/sec, 0 packets/sec
  5 minute output rate 0 bits/sec, 0 packets/sec
     32 packets input, 2140 bytes, 0 no buffer
     Received 24 broadcasts (0 multicasts)
     0 runts, 0 giants, 0 throttles
     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored
     0 watchdog, 0 multicast, 0 pause input
     48 packets output, 3890 bytes, 0 underruns
     0 output errors, 0 collisions, 1 interface resets
     0 unknown protocol drops`;
  }

  function showAllInterfaces(dev) {
    const keys = Object.keys(dev.cfg.ifaces).slice(0, 3);
    return keys.map(k => showInterfaceDetail(dev, k)).join('\n\n');
  }

  function showInterfacesDescription(dev) {
    const lines = [
      'Interface                      Status         Protocol Description'
    ];
    for (const [ifName, ifc] of Object.entries(dev.cfg.ifaces)) {
      const p = dev.ports.find(x => x.name === ifName);
      const isUp = p ? (!ifc.shutdown && p.linkId) : (!ifc.shutdown);
      const status = ifc.shutdown ? 'admin down' : isUp ? 'up' : 'down';
      const proto = isUp ? 'up' : 'down';
      lines.push(`${PT.pad(PT.shortIf(ifName), 30)} ${PT.pad(status, 14)} ${PT.pad(proto, 8)} ${ifc.desc || ''}`);
    }
    return lines.join('\n');
  }

  function showArp(dev) {
    const lines = [
      'Protocol  Address          Age (min)  Hardware Addr   Type   Interface'
    ];
    const arp = (dev.rt && dev.rt.arp) || {};
    for (const [ip, item] of Object.entries(arp)) {
      lines.push(`Internet  ${PT.pad(ip, 16)} ${PT.pad(String(item.age || '-'), 10)} ${PT.pad(item.mac, 15)} ARPA   ${PT.shortIf(item.port || 'Vlan1')}`);
    }
    for (const [ifName, ifc] of Object.entries(dev.cfg.ifaces)) {
      if (ifc.ip) {
        const p = dev.ports.find(x => x.name === ifName);
        const mac = (p && p.mac) || dev.baseMac || '0001.42ab.cd01';
        lines.push(`Internet  ${PT.pad(ifc.ip, 16)} ${PT.pad('-', 10)} ${PT.pad(mac, 15)} ARPA   ${PT.shortIf(ifName)}`);
      }
    }
    return lines.join('\n');
  }

  function showFlash(dev) {
    const binName = dev.type === 'switch' ? 'c2960-lanbasek9-mz.150-2.SE4.bin' : 'c1941-universalk9-mz.SPA.151-4.M4.bin';
    return `Directory of flash:/

    1  -rw-    33591760                    ${binName}
    2  -rw-         616                    vlan.dat

64016384 bytes total (30424008 bytes free)`;
  }

  function showHistory(dev) {
    const hist = (dev.rt && dev.rt.cliHistory) || [];
    return hist.slice(-10).join('\n');
  }

  function showUsers(dev) {
    return `    Line       User       Host(s)              Idle       Location
*  0 con 0                idle                 00:00:00   

  Interface    User       Mode                 Idle     Peer Address`;
  }

  function showIpProtocols(dev) {
    const ospf = dev.cfg.ospf;
    if (ospf && ospf.enabled) {
      return `Routing Protocol is "ospf ${ospf.pid}"
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is not set
  Router ID ${ospf.routerId || '0.0.0.0'}
  Number of areas in this router is 1. 1 normal 0 stub 0 nssa
  Maximum path: 4
  Routing for Networks:
${(ospf.networks || []).map(n => `    ${n.network} ${n.wildcard} area ${n.area}`).join('\n')}`;
    }
    return `*** IP Routing is ${dev.cfg.ipRouting ? 'enabled' : 'disabled'} ***`;
  }

  function showIpDhcpPool(dev) {
    const pools = Object.values(dev.cfg.dhcpPools || {});
    if (!pools.length) return 'No DHCP pools configured.';
    return pools.map(p => `Pool ${p.name} :
  Subnet size (lines/total)      : 1 / 254
  Addresses                      : 254
  Leased addresses               : 0
  Excluded addresses             : 0
  1 subnet is currently in the pool :
  Current index        IP pool range                    Leased addresses
  ${p.network}          ${p.network} - ${p.network.replace(/\d+$/, '254')}    0`).join('\n\n');
  }

  function showIpInterfaceBrief(dev) {
    const lines = [
      'Interface              IP-Address      OK? Method Status                Protocol'
    ];
    // Gather all physical ports + SVIs + subinterfaces
    const ifKeys = Object.keys(dev.cfg.ifaces).sort(PT.cmpIf);
    for (const ifName of ifKeys) {
      const ifc = dev.cfg.ifaces[ifName];
      const p = dev.ports.find(x => x.name === ifName);
      const isUp = p ? (!ifc.shutdown && p.linkId) : (!ifc.shutdown);
      const ip = ifc.ip || 'unassigned';
      const status = ifc.shutdown ? 'administratively down' : isUp ? 'up' : 'down';
      const proto = isUp ? 'up' : 'down';
      const colIf = PT.pad(ifName, 22);
      const colIp = PT.pad(ip, 15);
      const colOk = PT.pad('YES', 4);
      const colMeth = PT.pad('unset', 7);
      const colStat = PT.pad(status, 22);
      lines.push(`${colIf} ${colIp}${colOk}${colMeth}${colStat}${proto}`);
    }
    return lines.join('\n');
  }

  function showVlanBrief(dev) {
    const lines = [
      '',
      'VLAN Name                             Status    Ports',
      '---- -------------------------------- --------- -------------------------------'
    ];
    const vlans = Object.keys(dev.cfg.vlans || {}).map(Number).sort((a, b) => a - b);
    for (const vid of vlans) {
      const v = dev.cfg.vlans[vid];
      // Gather access ports assigned to this vlan
      const ports = [];
      for (const [ifName, ifc] of Object.entries(dev.cfg.ifaces)) {
        if (ifc.mode === 'access' && (ifc.accessVlan || 1) === vid) {
          ports.push(PT.shortIf(ifName));
        }
      }
      const vidStr = PT.pad(String(vid), 4);
      const nameStr = PT.pad(v.name || `VLAN${vid}`, 32);
      const statusStr = PT.pad(v.state || 'active', 9);
      const portStr = ports.join(', ');
      lines.push(`${vidStr} ${nameStr} ${statusStr} ${portStr}`);
    }
    return lines.join('\n');
  }

  function showInterfacesTrunk(dev) {
    const trunks = [];
    for (const [ifName, ifc] of Object.entries(dev.cfg.ifaces)) {
      if (ifc.mode === 'trunk') trunks.push(ifName);
    }
    if (!trunks.length) return '';
    const lines = [
      'Port        Mode         Encapsulation  Status        Native vlan',
      '================================================================='
    ];
    for (const t of trunks) {
      const ifc = dev.cfg.ifaces[t];
      lines.push(`${PT.pad(PT.shortIf(t), 11)} on           802.1q         trunking      ${ifc.nativeVlan || 1}`);
    }
    lines.push('');
    lines.push('Port        Vlans allowed on trunk');
    lines.push('=================================================================');
    for (const t of trunks) {
      const ifc = dev.cfg.ifaces[t];
      lines.push(`${PT.pad(PT.shortIf(t), 11)} ${ifc.allowed || '1-1005'}`);
    }
    return lines.join('\n');
  }

  function showInterfacesStatus(dev) {
    const lines = [
      'Port      Name               Status       Vlan       Duplex  Speed Type'
    ];
    for (const p of dev.ports) {
      if (p.kind === 'console' || p.kind === 'rs232') continue;
      const ifc = dev.cfg.ifaces[p.name] || {};
      const status = ifc.shutdown ? 'disabled' : p.linkId ? 'connected' : 'notconnect';
      const vlan = ifc.mode === 'trunk' ? 'trunk' : String(ifc.accessVlan || 1);
      lines.push(`${PT.pad(PT.statusIf(p.name), 9)} ${PT.pad(ifc.desc || '', 18)} ${PT.pad(status, 12)} ${PT.pad(vlan, 10)} auto    auto  10/100BaseTX`);
    }
    return lines.join('\n');
  }

  function showMacAddressTable(dev) {
    const rt = dev.rt || {};
    const table = rt.mac || [];
    const lines = [
      '          Mac Address Table',
      '-------------------------------------------',
      '',
      'Vlan    Mac Address       Type        Ports',
      '----    -----------       --------    -----'
    ];
    if (!table.length) {
      lines.push(' Total Mac Addresses for this criterion: 0');
      return lines.join('\n');
    }
    for (const entry of table) {
      lines.push(`${PT.pad(String(entry.vlan || 1), 7)} ${PT.pad(entry.mac, 17)} ${PT.pad(entry.type || 'DYNAMIC', 11)} ${PT.shortIf(entry.port)}`);
    }
    lines.push(` Total Mac Addresses for this criterion: ${table.length}`);
    return lines.join('\n');
  }

  function showIpRoute(dev, netCtx) {
    const lines = [
      'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
      '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
      '',
      'Gateway of last resort is not set',
      ''
    ];
    // Connected routes
    for (const [ifName, ifc] of Object.entries(dev.cfg.ifaces)) {
      if (ifc.ip && ifc.mask && !ifc.shutdown) {
        const net = PT.n2ip(PT.netOf(ifc.ip, ifc.mask));
        const len = PT.maskLen(ifc.mask);
        lines.push(`C    ${net}/${len} is directly connected, ${PT.shortIf(ifName)}`);
        lines.push(`L    ${ifc.ip}/32 is directly connected, ${PT.shortIf(ifName)}`);
      }
    }
    // Static routes
    for (const r of (dev.cfg.routes || [])) {
      lines.push(`S    ${r.network}/${PT.maskLen(r.mask)} [1/0] via ${r.nextHop}`);
    }
    // Dynamic routes from network context
    if (netCtx && typeof netCtx.getDynamicRoutes === 'function') {
      const dyn = netCtx.getDynamicRoutes(dev);
      for (const d of dyn) {
        lines.push(`${d.code}    ${d.network}/${d.cidr} [${d.ad}/${d.metric}] via ${d.nextHop}, ${PT.shortIf(d.outInterface)}`);
      }
    }
    return lines.join('\n');
  }

  function showCdpNeighbors(dev, netCtx) {
    const lines = [
      'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge',
      '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone',
      '',
      'Device ID    Local Intrfce   Holdtme    Capability   Platform    Port ID'
    ];
    if (netCtx && typeof netCtx.getCdpNeighbors === 'function') {
      const neighbors = netCtx.getCdpNeighbors(dev);
      for (const n of neighbors) {
        lines.push(`${PT.pad(n.hostname, 12)} ${PT.pad(PT.cdpIf(n.localPort), 15)} 160        ${PT.pad(n.cap, 12)} ${PT.pad(n.model, 11)} ${PT.cdpIf(n.remotePort)}`);
      }
    }
    return lines.join('\n');
  }

  function showSpanningTree(dev) {
    const lines = [
      'VLAN0001',
      '  Spanning tree enabled protocol ieee',
      '  Root ID    Priority    32769',
      `             Address     ${dev.baseMac}`,
      '             This bridge is the root',
      '             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec',
      '',
      '  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)',
      `             Address     ${dev.baseMac}`,
      '             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec',
      '             Aging Time  20',
      '',
      'Interface        Role Sts Cost      Prio.Nbr Type',
      '---------------- ---- --- --------- -------- --------------------------------'
    ];
    for (const p of dev.ports) {
      if (p.linkId && p.physical) {
        lines.push(`${PT.pad(PT.shortIf(p.name), 16)} Desg FWD 19        128.1    P2p`);
      }
    }
    return lines.join('\n');
  }

  function showIpDhcpBinding(dev) {
    const lines = [
      'IP address       Client-ID/              Lease expiration        Type',
      '                 Hardware address',
      '------------------------------------------------------------------------'
    ];
    const bindings = (dev.rt && dev.rt.dhcpBindings) || [];
    for (const b of bindings) {
      lines.push(`${PT.pad(b.ip, 16)} 0063.6973.636f-${b.mac}  --                      Automatic`);
    }
    return lines.join('\n');
  }

  function showVersion(dev) {
    return `Cisco IOS Software, ${dev.model} Software, Version 15.0(2)SE4, RELEASE SOFTWARE (fc1)\nTechnical Support: http://www.cisco.com/techsupport\nCompiled Wed 26-Nov-14 02:49 by prod_rel_team\n\nROM: Bootstrap program is C2960 boot loader\nBOOTLDR: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\n${dev.cfg.hostname || dev.name} uptime is ${PT.uptimeStr(Date.now() - (dev.rt ? dev.rt.bootAt : Date.now()))}\nSystem returned to ROM by power-on\nCisco ${dev.model} processor with 65536K bytes of memory.`;
  }

  // ---------------------------------------------------------------- RUNNING-CONFIG GENERATOR
  function generateRunningConfig(dev) {
    const c = dev.cfg;
    const lines = [
      'Current configuration : 1240 bytes',
      '!',
      'version 15.0',
      'no service timestamps log datetime msec',
      'no service timestamps debug datetime msec'
    ];
    if (c.servicePwEnc) lines.push('service password-encryption');
    lines.push('!');
    lines.push(`hostname ${c.hostname}`);
    lines.push('!');
    if (c.enableSecret) {
      let secHash = '';
      if (typeof c.enableSecret === 'object') {
        secHash = c.enableSecret.hash || encryptType5(c.enableSecret.plain || 'cisco');
      } else if (typeof c.enableSecret === 'string') {
        secHash = c.enableSecret.startsWith('$1$') ? c.enableSecret : encryptType5(c.enableSecret);
      }
      if (secHash) lines.push(`enable secret 5 ${secHash}`);
    }
    if (c.enablePassword) {
      const pwStr = formatPasswordForRunningConfig(c.enablePassword, c.servicePwEnc);
      if (pwStr) lines.push(`enable password ${pwStr}`);
    }
    // Usernames
    for (const [uname, u] of Object.entries(c.users || {})) {
      let uLine = `username ${uname}`;
      if (u.privilege != null && u.privilege !== 1) uLine += ` privilege ${u.privilege}`;
      if (u.secret) {
        let secHash = typeof u.secret === 'object' ? (u.secret.hash || encryptType5(u.secret.plain || '')) : (u.secret.startsWith('$1$') ? u.secret : encryptType5(u.secret));
        uLine += ` secret 5 ${secHash}`;
      } else if (u.password) {
        uLine += ` password ${formatPasswordForRunningConfig(u.password, c.servicePwEnc)}`;
      }
      lines.push(uLine);
    }
    if (c.banner) lines.push(`banner motd #${c.banner}#`);
    if (!c.domainLookup) lines.push('no ip domain-lookup');
    if (c.domainName) lines.push(`ip domain-name ${c.domainName}`);
    if (c.ipRouting) lines.push('ip routing');

    // DHCP excluded addresses
    for (const ex of (c.dhcpExcluded || [])) {
      lines.push(`ip dhcp excluded-address ${ex.low}${ex.high && ex.high !== ex.low ? ' ' + ex.high : ''}`);
    }
    // DHCP pools
    for (const [pName, p] of Object.entries(c.dhcpPools || {})) {
      lines.push(`ip dhcp pool ${pName}`);
      if (p.network && p.mask) lines.push(` network ${p.network} ${p.mask}`);
      if (p.defaultRouter) lines.push(` default-router ${p.defaultRouter}`);
      if (p.dnsServer) lines.push(` dns-server ${p.dnsServer}`);
      if (p.domainName) lines.push(` domain-name ${p.domainName}`);
      lines.push('!');
    }

    lines.push(`spanning-tree mode ${c.stp.mode || 'pvst'}`);
    if (c.stp.portfastDefault) lines.push('spanning-tree portfast default');
    lines.push('!');

    // Interfaces
    const ifKeys = Object.keys(c.ifaces).sort(PT.cmpIf);
    for (const ifName of ifKeys) {
      const ifc = c.ifaces[ifName];
      lines.push(`interface ${ifName}`);
      if (ifc.desc) lines.push(` description ${ifc.desc}`);
      if (ifc.encap === 'dot1Q' && ifc.vlanId) lines.push(` encapsulation dot1Q ${ifc.vlanId}`);
      if (ifc.ip && ifc.mask) lines.push(` ip address ${ifc.ip} ${ifc.mask}`);
      for (const h of (ifc.helpers || [])) lines.push(` ip helper-address ${h}`);
      if (ifc.mode === 'access') {
        lines.push(' switchport mode access');
        if (ifc.accessVlan && ifc.accessVlan !== 1) lines.push(` switchport access vlan ${ifc.accessVlan}`);
      } else if (ifc.mode === 'trunk') {
        lines.push(' switchport mode trunk');
        if (ifc.nativeVlan && ifc.nativeVlan !== 1) lines.push(` switchport trunk native vlan ${ifc.nativeVlan}`);
        if (ifc.allowed) lines.push(` switchport trunk allowed vlan ${ifc.allowed}`);
      }
      if (ifc.psec && ifc.psec.enabled) {
        lines.push(' switchport port-security');
        if (ifc.psec.sticky) lines.push(' switchport port-security mac-address sticky');
      }
      if (ifc.portfast) lines.push(' spanning-tree portfast');
      if (ifc.shutdown) lines.push(' shutdown');
      lines.push('!');
    }

    // Static routes
    for (const r of (c.routes || [])) {
      lines.push(`ip route ${r.network} ${r.mask} ${r.nextHop}`);
    }

    // OSPF
    for (const [pid, proc] of Object.entries(c.ospf || {})) {
      lines.push(`router ospf ${pid}`);
      if (proc.routerId) lines.push(` router-id ${proc.routerId}`);
      for (const net of (proc.networks || [])) {
        lines.push(` network ${net.network} ${net.wildcard} area ${net.area}`);
      }
      lines.push('!');
    }

    // Lines
    lines.push('line con 0');
    if (c.lines && c.lines.con && c.lines.con.password) {
      lines.push(` password ${formatPasswordForRunningConfig(c.lines.con.password, c.servicePwEnc)}`);
    }
    if (c.lines && c.lines.con && c.lines.con.login) lines.push(' login');
    if (c.lines && c.lines.con && c.lines.con.logSync) lines.push(' logging synchronous');
    lines.push('!');
    lines.push('line vty 0 4');
    if (c.lines && c.lines.vty && c.lines.vty.password) {
      lines.push(` password ${formatPasswordForRunningConfig(c.lines.vty.password, c.servicePwEnc)}`);
    }
    if (c.lines && c.lines.vty && c.lines.vty.login) {
      lines.push(c.lines.vty.login === 'local' ? ' login local' : ' login');
    }
    if (c.lines && c.lines.vty && c.lines.vty.transport) lines.push(` transport input ${c.lines.vty.transport}`);
    lines.push('!');
    lines.push('end');
    return lines.join('\n');
  }

  // ---------------------------------------------------------------- Helpers
  function ensureInterfaceExists(dev, name) {
    if (dev.cfg.ifaces[name]) return;
    const isSub = name.includes('.');
    const isSvi = name.startsWith('Vlan');
    const isLoop = name.startsWith('Loopback');
    dev.cfg.ifaces[name] = {
      desc: '', shutdown: !isLoop && !isSub,
      ip: '', mask: '', dhcp: false, helpers: [],
      encap: isSub ? 'dot1Q' : null,
      vlanId: isSub ? parseInt(name.split('.')[1], 10) : null
    };
  }

  function expandRange(spec, dev) {
    const list = [];
    for (const part of spec.split(',')) {
      const p = part.trim();
      const m = p.match(/^([A-Za-z]+)(\d+(?:\/\d+)*\/)(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const fullPrefix = m[1];
        const slot = m[2];
        const s = parseInt(m[3], 10);
        const e = parseInt(m[4], 10);
        const parsed = PT.ifTypeByPrefix(fullPrefix);
        const typeName = parsed ? parsed.full : fullPrefix;
        for (let i = s; i <= e; i++) list.push(`${typeName}${slot}${i}`);
      } else {
        const parsed = PT.parseIfName(p);
        if (parsed) list.push(parsed.name);
      }
    }
    return list;
  }

  function getHelpText(dev, partial) {
    return '  configure  Enter configuration mode\n  show       Show running system information\n  enable     Turn on privileged commands\n  exit       Exit from the EXEC\n  ping       Send echo messages';
  }

  function executePcCommand(dev, rawCmd, net) {
    const trimmed = (rawCmd || '').trim();
    if (!trimmed) return '';

    dev.rt = dev.rt || PT.freshRuntime(dev);
    dev.rt.cliHistory = dev.rt.cliHistory || [];
    if (dev.rt.cliHistory[dev.rt.cliHistory.length - 1] !== trimmed) {
      dev.rt.cliHistory.push(trimmed);
    }
    dev.rt.cliHistoryIdx = dev.rt.cliHistory.length;

    const tokens = trimmed.split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const arg1 = (tokens[1] || '').toLowerCase();
    const port = (dev.ports && (dev.ports.find(p => p.physical) || dev.ports[0])) || { name: 'FastEthernet0', mac: dev.baseMac || '0001.4200.0001' };
    const ifc = (dev.cfg && dev.cfg.ifaces && dev.cfg.ifaces[port.name]) || {};
    const hostCfg = (dev.cfg && dev.cfg.host) || {};
    const gw = hostCfg.gateway || dev.cfg.defaultGateway || '0.0.0.0';
    const dns = hostCfg.dns || dev.cfg.dnsServer || '0.0.0.0';
    const linkLocal = PT.linkLocal ? PT.linkLocal(port.mac) : `FE80::${port.mac.replace(/\./g, ':')}`;

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
      return '__CLEAR__';
    }

    if (cmd === 'ipconfig') {
      if (arg1 === '/release') {
        ifc.ip = '0.0.0.0';
        ifc.mask = '0.0.0.0';
        hostCfg.gateway = '0.0.0.0';
        return `\nIP Address......................: 0.0.0.0\nSubnet Mask.....................: 0.0.0.0\nDefault Gateway.................: 0.0.0.0`;
      }
      if (arg1 === '/renew') {
        if (net && typeof net.requestDhcp === 'function') {
          const lease = net.requestDhcp(dev);
          if (lease) {
            return `\nFastEthernet0 Connection:(default port)\n\n   Link-local IPv6 Address.........: ${linkLocal}\n   IPv4 Address....................: ${ifc.ip}\n   Subnet Mask.....................: ${ifc.mask}\n   Default Gateway.................: ${gw}`;
          }
        }
        const apipa = `169.254.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
        ifc.ip = apipa;
        ifc.mask = '255.255.0.0';
        return `%DHCP failed. APIPA is being used.\n   IPv4 Address....................: ${ifc.ip}\n   Subnet Mask.....................: ${ifc.mask}\n   Default Gateway.................: 0.0.0.0`;
      }
      if (arg1 === '/all') {
        return [
          '',
          `${port.name} Connection:(default port)`,
          '',
          `   Physical Address................: ${port.mac}`,
          `   Link-local IPv6 Address.........: ${linkLocal}`,
          `   IPv4 Address....................: ${ifc.ip || '0.0.0.0'}`,
          `   Subnet Mask.....................: ${ifc.mask || '0.0.0.0'}`,
          `   Default Gateway.................: ${gw}`,
          `   DNS Servers.....................: ${dns}`,
          `   DHCP Servers....................: ${dev.cfg.dhcpServer || '0.0.0.0'}`
        ].join('\n');
      }
      return [
        '',
        `${port.name} Connection:(default port)`,
        '',
        `   Connection-specific DNS Suffix..: `,
        `   Link-local IPv6 Address.........: ${linkLocal}`,
        `   IPv4 Address....................: ${ifc.ip || '0.0.0.0'}`,
        `   Subnet Mask.....................: ${ifc.mask || '0.0.0.0'}`,
        `   Default Gateway.................: ${gw}`
      ].join('\n');
    }

    if (cmd === 'arp') {
      if (arg1 === '-d') {
        dev.rt.arp = [];
        return '';
      }
      const arpList = (dev.rt.arp || []);
      if (!arpList.length) {
        return 'No ARP Entries Found';
      }
      const lines = [
        '  Internet Address      Physical Address      Type',
        ...arpList.map(e => `  ${String(e.ip).padEnd(21)} ${String(e.mac).padEnd(21)} dynamic`)
      ];
      return lines.join('\n');
    }

    if (cmd === 'ping') {
      const targetIp = tokens[1] === '-t' ? tokens[2] : tokens[1];
      if (!targetIp) return '\nUsage: ping [-t] <target_name>\n';
      if (net && typeof net.runPing === 'function') {
        const res = net.runPing(dev, targetIp);
        return res.pcText || res.cliText || '\nRequest timed out.\n';
      }
      return `\nPinging ${targetIp} with 32 bytes of data:\n\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\nReply from ${targetIp}: bytes=32 time<1ms TTL=128\n\nPing statistics for ${targetIp}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),`;
    }

    if (cmd === 'tracert') {
      const targetIp = tokens[1];
      if (!targetIp) return '\nUsage: tracert <target_name>\n';
      if (net && typeof net.runPing === 'function') {
        const res = net.runPing(dev, targetIp);
        if (res.success) {
          const hops = (res.hops && res.hops.length ? res.hops : [targetIp]).map((h, i) => `  ${i + 1}     1 ms     1 ms     1 ms  ${h}`).join('\n');
          return `\nTracing route to ${targetIp} over a maximum of 30 hops:\n\n${hops}\n\nTrace complete.`;
        }
        return `\nTracing route to ${targetIp} over a maximum of 30 hops:\n\n  1     *        *        *     Request timed out.\n\nTrace complete.`;
      }
    }

    if (cmd === 'dir') {
      return ` Volume in drive C has no label.\n Directory of C:/\n\n04/12/2026  09:15 AM    <DIR>          sampleFile.txt\n               1 File(s)            124 bytes\n               0 Dir(s)  31,999,588,352 bytes free`;
    }

    if (cmd === 'netstat') {
      return `Active Connections\n\n  Proto  Local Address          Foreign Address        State\n  TCP    127.0.0.1:1025         127.0.0.1:1026         ESTABLISHED`;
    }

    return `'${cmd}' is not recognized as an internal or external command,\noperable program or batch file.`;
  }

  // Export
  Object.assign(PT, {
    getPrompt,
    autocomplete,
    autocompleteIosCommand: autocomplete,
    execute,
    executeIosCommand: execute,
    executePcCommand,
    generateRunningConfig
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = PT;
})(typeof window !== 'undefined' ? window : globalThis);

