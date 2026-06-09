const http = require('http');
const zlib = require('zlib');
const xml2js = require('xml2js');

const HOST       = process.env.TALLY_HOST       || '103.107.67.46';
const PORT       = parseInt(process.env.TALLY_PORT       || '9061');
const LOCAL_HOST = process.env.TALLY_LOCAL_HOST || 'localhost';
const LOCAL_PORT = parseInt(process.env.TALLY_LOCAL_PORT || '9003');
const COMPANY    = process.env.TALLY_COMPANY    || 'ASSOCIATED INDIA';

// ── JSON GET (Postman-style headers) ────────────────────────────
const tallyGetJson = (collectionId, extraHeaders = {}, bodyObj = null) =>
  new Promise((resolve, reject) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : '{}';
    const options = {
      hostname: HOST, port: PORT, path: '/', method: 'GET',
      headers: {
        'Content-Type':       'application/json',
        'Content-Length':     Buffer.byteLength(body),
        'Accept':             '*/*',
        'Accept-Encoding':    'gzip, deflate, br',
        'Cache-Control':      'no-cache',
        'Connection':         'close',
        'User-Agent':         'PostmanRuntime/7.36.0',
        'version':            '1',
        'tallyrequest':       'export',
        'type':               'collection',
        'id':                 collectionId,
        ...extraHeaders,
      },
    };
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const encoding = res.headers['content-encoding'] || '';
        const decode = encoding.includes('br')
          ? (cb) => zlib.brotliDecompress(buf, cb)
          : encoding.includes('gzip')
          ? (cb) => zlib.gunzip(buf, cb)
          : encoding.includes('deflate')
          ? (cb) => zlib.inflate(buf, cb)
          : (cb) => cb(null, buf);

        decode((err, decoded) => {
          if (err) { reject(new Error('Decompress failed')); return; }
          try {
            const json = JSON.parse(decoded.toString('utf8'));
            // Only reject if Tally returns its "not ready" ping response
            if (typeof json?.response === 'string') {
              reject(new Error('Tally not ready: ' + json.response));
            } else {
              resolve(json);
            }
          } catch { reject(new Error('Invalid JSON from Tally')); }
        });
      });
    });
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Tally timeout')); });
    req.on('error', reject);
    req.write(body || '{}');
    req.end();
  });

// ── JSON GET with Type:Data and body params ──────────────────────
const tallyGetData = (reportId, params = {}, timeoutMs = 30000) => {
  const body = JSON.stringify({
    static_variables: [
      { name: 'svExportFormat',    value: 'jsonex' },
      { name: 'svCurrentCompany',  value: COMPANY },
      ...Object.entries(params).map(([name, value]) => ({ name, value })),
    ],
    tdlmessage: [{
      definitions: [{
        metadata:   { name: reportId, type: 'Report', ismodify: true },
        attributes: [{ 'Export Empty Fields': 'No' }],
      }],
    }],
  });
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST, port: PORT, path: '/', method: 'GET',
      headers: {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(body),
        'Accept':          '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control':   'no-cache',
        'Connection':      'close',
        'User-Agent':      'PostmanRuntime/7.36.0',
        'version':         '1',
        'tallyrequest':    'export',
        'Type':            'Data',
        'Id':              reportId,
      },
    };
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'] || '';
        const decode = enc.includes('br') ? (cb) => zlib.brotliDecompress(buf, cb)
          : enc.includes('gzip') ? (cb) => zlib.gunzip(buf, cb)
          : enc.includes('deflate') ? (cb) => zlib.inflate(buf, cb)
          : (cb) => cb(null, buf);
        decode((err, decoded) => {
          if (err) { reject(new Error('Decompress failed')); return; }
          try {
            const json = JSON.parse(decoded.toString('utf8'));
            if (typeof json?.response === 'string') reject(new Error('Tally not ready'));
            else resolve(json);
          } catch { reject(new Error('Invalid JSON')); }
        });
      });
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Tally timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ── Core XML POST ────────────────────────────────────────────────
const postXml = (xml, timeoutMs = 60000) =>
  new Promise((resolve, reject) => {
    const buf = Buffer.from(xml, 'utf8');
    const req = http.request(
      { hostname: HOST, port: PORT, path: '/', method: 'POST',
        headers: { 'Content-Type': 'text/xml', 'Content-Length': buf.length } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Tally timeout')); });
    req.on('error', reject);
    req.write(buf);
    req.end();
  });

// ── XML parse (lowercase tags, attrs under 'metadata') ──────────
const parseXml = (raw) =>
  xml2js.parseStringPromise(raw, {
    explicitArray: false,
    normalizeTags:  true,
    attrkey:        'metadata',
    trim:           true,
    emptyTag:       null,
  });

// ── Helpers ──────────────────────────────────────────────────────
const toArr = (v) => Array.isArray(v) ? v : v != null ? [v] : [];

const toTallyDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}`;
};

const fromTallyDate = (s) => {
  if (!s) return '';
  const c = String(s).replace(/\D/g, '');
  if (c.length < 8) return s;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${c.slice(6,8)}-${months[parseInt(c.slice(4,6))-1]}-${c.slice(2,4)}`;
};

const parseAmt = (s) => {
  if (!s) return 0;
  const str = String(s).trim();
  const num = parseFloat(str.replace(/[^0-9.\-]/g, '')) || 0;
  // Tally appends " Cr" for credit (money owed TO the party = negative in our sign convention)
  if (/\bCr\b/i.test(str)) return -Math.abs(num);
  if (/\bDr\b/i.test(str)) return  Math.abs(num);
  return num;
};

const fmtAmt = (s) => {
  if (!s) return null;
  const n = parseAmt(s);
  if (n === 0) return null;
  const fmt = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${fmt} ${n < 0 ? 'Cr' : 'Dr'}`;
};

// Extract ledger name — attrs stay uppercase after normalizeTags
const ledgerName = (l) =>
  l?.metadata?.NAME || l?.metadata?.name || l?.name || '';

// Extract only LEDGER entries from the TALLYMESSAGE array
const ledgersFromMessages = (messages) =>
  toArr(messages)
    .filter((m) => m?.ledger)
    .map((m) => m.ledger);

// ── XML templates ────────────────────────────────────────────────
const xmlLedgerList = () => `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA>
    <REQUESTDESC>
      <REPORTNAME>List of Accounts</REPORTNAME>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${COMPANY}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </REQUESTDESC>
  </EXPORTDATA></BODY>
</ENVELOPE>`.trim();

// Targeted ledger-only XML — much smaller than List of Accounts
const xmlLedgerDetails = () => `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA>
    <REQUESTDESC>
      <REPORTNAME>List of Ledgers</REPORTNAME>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${COMPANY}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </REQUESTDESC>
  </EXPORTDATA></BODY>
</ENVELOPE>`.trim();


const xmlVouchers = (ledger, from, to) => `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA>
    <REQUESTDESC>
      <REPORTNAME>Ledger</REPORTNAME>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${COMPANY}</SVCURRENTCOMPANY>
        <SVFROMDATE>${toTallyDate(from)}</SVFROMDATE>
        <SVTODATE>${toTallyDate(to)}</SVTODATE>
        <LEDGERNAME>${ledger}</LEDGERNAME>
      </STATICVARIABLES>
    </REQUESTDESC>
  </EXPORTDATA></BODY>
</ENVELOPE>`.trim();

const xmlOutstanding = (ledger) => `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA>
    <REQUESTDESC>
      <REPORTNAME>Outstandings</REPORTNAME>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${COMPANY}</SVCURRENTCOMPANY>
        <LEDGERNAME>${ledger}</LEDGERNAME>
      </STATICVARIABLES>
    </REQUESTDESC>
  </EXPORTDATA></BODY>
</ENVELOPE>`.trim();

// ── Fetchers ─────────────────────────────────────────────────────

// Pull collection array from wherever Tally puts it
const getCollection = (json) =>
  toArr(json?.data?.collection || json?.collection || []);

// Extract from JSON collection response → ledger array
const f = (item, ...keys) => {
  for (const k of keys) {
    const v = item?.[k] || item?.[k.toUpperCase()] || item?.[k.toLowerCase()];
    if (v) return v;
  }
  return '';
};

const collectionToLedgers = (json) =>
  getCollection(json)
    .map((item) => ({
      name:    item?.metadata?.name || '',
      group:   f(item, 'parent', 'PARENT', 'parentname'),
      phone:   f(item, 'ledgermobile', 'LEDGERMOBILE', 'ledgerphone', 'LEDGERPHONE', 'phone'),
      state:   f(item, 'ledstatename', 'LEDSTATENAME', 'state'),
      gstin:   f(item, 'partygstin', 'PARTYGSTIN', 'gstin'),
      gstType: f(item, 'gstregistrationtype', 'GSTREGISTRATIONTYPE'),
      openingBalance: item?.openingbalance || item?.OPENINGBALANCE || null,
    }))
    .filter((l) => l.name);

// Extract value from Tally field — handles both plain string and {type, value} object
const tallyVal = (v) => (v && typeof v === 'object' ? v.value || '' : v || '');

const collectionToItems = (json) =>
  getCollection(json)
    .map((item) => ({
      name:           item?.metadata?.name                || '',
      group:          tallyVal(item?.parent)              || '',
      unit:           tallyVal(item?.baseunits)           || '',
      hsn:            tallyVal(item?.hsn)                 || '',
      openingBalance: tallyVal(item?.openingbalance)      || '',
      closingBalance: tallyVal(item?.closingbalance)      || '',
      rate:           tallyVal(item?.absstandardrate)     || '',
      gst:            tallyVal(item?.gst)                 || '',
    }))
    .filter((i) => i.name);

const getLedgerList = async () => {
  const json = await tallyGetJson('Ledger', {}, {
    static_variables: [
      { name: 'svExportFormat',   value: 'jsonex' },
      { name: 'svCurrentCompany', value: COMPANY  },
    ],
    fetch_List: ['Name'],
  });
  return getCollection(json)
    .map((item) => item?.metadata?.name || '')
    .filter(Boolean)
    .sort();
};

const getLedgerMaster = async () => {
  // List of Accounts XML — returns full master data including PARENT, LEDGERMOBILE, PARTYGSTIN etc.
  // Allow 5 min timeout since this is a one-time sync cached in localStorage
  const raw     = await postXml(xmlLedgerList(), 300000);
  const parsed  = await parseXml(raw);
  const messages = parsed?.envelope?.body?.importdata?.requestdata?.tallymessage;
  return ledgersFromMessages(messages).map((l) => ({
    name:    ledgerName(l),
    group:   f(l, 'parent', 'PARENT'),
    phone:   f(l, 'ledgermobile', 'LEDGERMOBILE', 'ledgerphone', 'LEDGERPHONE'),
    state:   f(l, 'ledstatename', 'LEDSTATENAME'),
    gstin:   f(l, 'partygstin', 'PARTYGSTIN'),
    gstType: f(l, 'gstregistrationtype', 'GSTREGISTRATIONTYPE'),
  })).filter((l) => l.name);
};

const getLedgerVouchers = async (ledger, from, to) => {
  const json = await tallyGetData('Ledger Vouchers', {
    ledgername: ledger,
    svFromDate: toTallyDate(from),
    svToDate:   toTallyDate(to),
  });

  const rows = toArr(json?.data?.lvbody?.dspvchdetail);
  let totalDebit = 0, totalCredit = 0;

  const transactions = rows.map((v) => {
    const debit  = v?.dspvchdramt != null ? Math.abs(Number(v.dspvchdramt)) : null;
    const credit = v?.dspvchcramt != null ? Math.abs(Number(v.dspvchcramt)) : null;
    if (debit)  totalDebit  += debit;
    if (credit) totalCredit += credit;
    return {
      date:        v?.dspvchdate        || '',
      particulars: v?.dspvchledaccount  || '',
      vchType:     v?.dspvchtype        || '',
      vchNo:       v?.dspvchnum         || null,
      debit:       debit  || null,
      credit:      credit || null,
    };
  }).filter((t) => t.date);

  // Fetch actual opening & closing balances from Ledger object for the period
  let openingBal = 0;
  let closingBal = 0;
  try {
    const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>OBJECT</TYPE>
    <SUBTYPE>Ledger</SUBTYPE>
    <ID TYPE="Name">${ledger}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${COMPANY}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>${toTallyDate(from)}</SVFROMDATE>
        <SVTODATE>${toTallyDate(to)}</SVTODATE>
      </STATICVARIABLES>
      <FETCHLIST>
        <FETCH>OPENINGBALANCE</FETCH>
        <FETCH>CLOSINGBALANCE</FETCH>
      </FETCHLIST>
    </DESC>
  </BODY>
</ENVELOPE>`.trim();
    const raw = await postXml(xml);
    const parsed = await parseXml(raw);
    const ledgerObj = parsed?.envelope?.body?.data?.tallymessage?.ledger;
    const opRaw = ledgerObj?.openingbalance?._ || ledgerObj?.openingbalance || '0';
    const clRaw = ledgerObj?.closingbalance?._ || ledgerObj?.closingbalance || '0';
    openingBal = parseAmt(opRaw);
    closingBal = parseAmt(clRaw);
  } catch (err) {
    console.error('Error fetching ledger balances:', err.message);
  }

  return {
    transactions,
    summary: {
      openingBalanceDebit:  openingBal > 0 ? openingBal : null,
      openingBalanceCredit: openingBal < 0 ? Math.abs(openingBal) : null,
      currentTotalDebit:    totalDebit  || null,
      currentTotalCredit:   totalCredit || null,
      closingBalance:       Math.abs(closingBal),
      closingBalanceType:   closingBal < 0 ? 'Cr' : 'Dr',
    },
  };
};

const fmtBillAmt = (val) => {
  if (val == null) return null;
  const n = Number(Array.isArray(val) ? val[0] : val);
  if (!n) return null;
  const fmt = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${fmt} ${n < 0 ? 'Cr' : 'Dr'}`;
};

const getLedgerOutstanding = async (ledger, from, to) => {
  const params = { ledgername: ledger };
  if (from) params.svFromDate = toTallyDate(from);
  if (to)   params.svToDate   = toTallyDate(to);
  const json = await tallyGetData('Ledger Outstandings', params);
  const bills = toArr(json?.data?.ledbillbody?.billdetail);

  let totalOpening = 0, totalPending = 0;

  const rows = bills.map((b) => {
    const op = Number(b?.billop || 0);
    const cl = Number(Array.isArray(b?.billcl) ? b.billcl[0] : b?.billcl || 0);
    totalOpening += op;
    totalPending += cl;
    const overdue = parseInt(b?.billoverdue || '0', 10) || 0;
    return {
      date:          b?.billfixed?.billdate || '',
      refNo:         b?.billfixed?.billref  || 'On Account',
      openingAmount: fmtBillAmt(b?.billop),
      pendingAmount: fmtBillAmt(b?.billcl),
      dueOn:         b?.billdue || null,
      overdueByDays: overdue,
    };
  }).filter((r) => r.refNo);

  return {
    rows,
    summary: {
      totalOpening: fmtBillAmt(totalOpening),
      totalPending: fmtBillAmt(totalPending),
      grandTotal:   fmtBillAmt(totalPending),
    },
  };
};

const xmlItemMaster = () => `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA>
    <REQUESTDESC>
      <REPORTNAME>List of Stock Items</REPORTNAME>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${COMPANY}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </REQUESTDESC>
  </EXPORTDATA></BODY>
</ENVELOPE>`.trim();

const getItemMaster = async () => {
  const json = await tallyGetJson('ABSItemColl', {}, {
    static_variables: [
      { name: 'svExportFormat',   value: 'jsonex' },
      { name: 'svCurrentCompany', value: COMPANY  },
    ],
    fetch_List: ['Name', 'Parent', 'Closing Balance', 'Base units', 'AdvanceDetails', 'HSN', 'Opening Balance', 'GST'],
  });
  return collectionToItems(json);
};

const getOutstandingReport = async () => {
  const json = await tallyGetData('Bills Receivable', {});
  const bills = toArr(json?.data?.billbody?.billdetail);
  return bills.map((b) => ({
    party:    b?.billfixed?.billparty || '',
    beat:     b?.billfixed?.billbeat  || '',
    billRef:  b?.billfixed?.billref   || '',
    billDate: b?.billfixed?.billdate  || '',
    dueDate:  b?.billdue              || '',
    overdue:  parseInt(b?.billoverdue || '0', 10) || 0,
    salesman: b?.billfixed?.billsalesman || '',
    amount:   Math.abs(Number(Array.isArray(b?.billcl) ? b.billcl[0] : b?.billcl || 0)),
  })).filter(r => r.party || r.billRef);
};

const getSalesVouchers = async () => {
  const body = JSON.stringify({
    static_variables: [
      { name: 'svExportFormat',   value: 'jsonex' },
      { name: 'svCurrentCompany', value: COMPANY  },
    ],
  });

  console.log(`[sales] Connecting to Tally at ${LOCAL_HOST}:${LOCAL_PORT}...`);

  const json = await new Promise((resolve, reject) => {
    const options = {
      hostname: LOCAL_HOST, port: LOCAL_PORT, path: '/', method: 'GET',
      headers: {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(body),
        'version':         '1',
        'tallyrequest':    'Export',
        'type':            'collection',
        'id':              'SalesDataApiSrc',
        'Connection':      'close',
      },
    };
    const req = http.request(options, (res) => {
      console.log(`[sales] Tally responded: HTTP ${res.statusCode}, encoding: ${res.headers['content-encoding'] || 'none'}`);
      const chunks = [];
      res.on('data', (c) => { chunks.push(c); process.stdout.write('.'); });
      res.on('end', () => {
        console.log(`\n[sales] Received ${chunks.reduce((s,c)=>s+c.length,0)} bytes`);
        const buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'] || '';
        const decode = enc.includes('br') ? (cb) => zlib.brotliDecompress(buf, cb)
          : enc.includes('gzip') ? (cb) => zlib.gunzip(buf, cb)
          : enc.includes('deflate') ? (cb) => zlib.inflate(buf, cb)
          : (cb) => cb(null, buf);
        decode((err, decoded) => {
          if (err) { reject(new Error('Decompress failed: ' + err.message)); return; }
          try { resolve(JSON.parse(decoded.toString('utf8'))); }
          catch (e) { reject(new Error('Invalid JSON from Tally: ' + e.message)); }
        });
      });
      res.on('error', reject);
    });
    req.on('socket', (socket) => {
      socket.setTimeout(300000);
      socket.on('timeout', () => { req.destroy(); reject(new Error('Socket timeout')); });
    });
    req.setTimeout(300000, () => { req.destroy(); reject(new Error('Tally local timeout after 5min')); });
    req.on('error', (e) => { console.error('[sales] Request error:', e.message, e.code); reject(e); });
    req.write(body);
    req.end();
    console.log('[sales] Request sent, waiting for Tally...');
  });

  const entries = getCollection(json);
  return entries
    .filter((e) => e?.metadata?.type === 'Inventory Entry')
    .map((e) => ({
      billno:        tallyVal(e.billno)        || '',
      billdate:      tallyVal(e.billdate)      || '',
      party:         tallyVal(e.party)         || '',
      stockitemname: tallyVal(e.stockitemname) || '',
      rate:          tallyVal(e.rate)          || '',
      discount:      (tallyVal(e.discount)     || '0').trim(),
      billedqty:     (tallyVal(e.billedqty)    || '').trim(),
      amount:        tallyVal(e.amount)        || '0',
      totalamt:      tallyVal(e.totalamt)      || '0',
    }));
};

module.exports = { getLedgerList, getLedgerMaster, getLedgerVouchers, getLedgerOutstanding, getItemMaster, getOutstandingReport, getSalesVouchers };
