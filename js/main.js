// js/main.js
// Centraliza scripts de todas as páginas: menu + inicializadores por simulador

document.addEventListener('DOMContentLoaded', function () {
  // Menu móvel
  const btn = document.getElementById('menu-toggle');
  if (btn) {
    btn.addEventListener('click', function () {
      const open = document.body.getAttribute('data-menu-open') === 'true';
      document.body.setAttribute('data-menu-open', (!open).toString());
      btn.setAttribute('aria-expanded', (!open).toString());
    });
  }
  const mobileLinks = document.querySelectorAll('.mobile-nav a');
  mobileLinks.forEach(a => a.addEventListener('click', () => {
    document.body.setAttribute('data-menu-open', 'false');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }));

  // formatação de moeda
  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  /*
    limparSimulador(root, options)
    - root: HTMLElement or form element which contains the simulator fields
    - options.clearSelectors: array of selectors (querySelector or element IDs prefixed with #) to clear calculated areas
    Behavior:
    - If a form element exists, call form.reset() to restore defaults
    - Otherwise, reset inputs/selects/textareas to their defaultValue or empty
    - Clear textual/calculated areas provided in options.clearSelectors (set to '—' or empty for inputs)
    - Remove/hide elements with classes .error, .alert, .warning inside root
  */
  function limparSimulador(root, options = {}) {
    if (!root) return;
    const opts = options || {};
    // if root is an ID string, resolve
    if (typeof root === 'string') root = document.getElementById(root) || document.querySelector(root);
    if (!root) return;

    // Try to find a form within root (or root itself)
    let form = null;
    if (root.tagName === 'FORM') form = root;
    else form = root.querySelector('form');
    try {
      if (form && typeof form.reset === 'function') form.reset();
    } catch (e) { /* ignore */ }

    // Reset remaining inputs/selects/textareas explicitly (handles cases where no form element exists)
    const controls = root.querySelectorAll('input, select, textarea');
    controls.forEach(i => {
      try {
        const tag = i.tagName.toLowerCase();
        const type = (i.type || '').toLowerCase();
        if (type === 'checkbox' || type === 'radio') {
          i.checked = !!i.defaultChecked;
        } else if (tag === 'select') {
          // restore to defaultSelected if possible
          for (let k = 0; k < i.options.length; k++) {
            i.options[k].selected = !!i.options[k].defaultSelected;
          }
        } else {
          if (i.defaultValue !== undefined && i.defaultValue !== null) i.value = i.defaultValue;
          else i.value = '';
        }
      } catch (e) { /* ignore per-control errors */ }
    });

    // Clear calculated display areas
    const clearSelectors = Array.isArray(opts.clearSelectors) ? opts.clearSelectors.slice() : [];
    // also support data-reset attribute: elements inside root with data-reset
    root.querySelectorAll('[data-reset]').forEach(el => {
      if (el.id) clearSelectors.push('#' + el.id);
    });
    clearSelectors.forEach(sel => {
      try {
        let el = null;
        if (typeof sel === 'string' && sel[0] === '#') el = document.getElementById(sel.slice(1));
        if (!el) el = root.querySelector(sel);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
          if (el.defaultValue !== undefined) el.value = el.defaultValue; else el.value = '';
        } else {
          // For tables or containers, clear html; for text areas, set placeholder symbol
          if (el.tagName === 'TABLE' || el.tagName === 'DIV' || el.tagName === 'SECTION' || el.tagName === 'UL') el.innerHTML = '';
          else el.textContent = '—';
        }
      } catch (e) { /* ignore */ }
    });

    // remove or hide error/warning elements
    root.querySelectorAll('.error, .alert, .warning').forEach(e => { try { e.textContent = ''; e.style.display = 'none'; } catch (ex) {} });
  }

  // ===== Veículos =====
  function initVeiculos() {
    const priceEl = document.getElementById('price');
    if (!priceEl) return;

    function generateAmortRows(principal, monthlyRate, monthly, months) {
      const rows = [];
      let balance = principal;
      for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        let amort = monthly - interest;
        if (i === months) amort = balance;
        const newBalance = Math.max(0, balance - amort);
        rows.push({ parcela: i, amortizacao: amort, juros: interest, saldo: newBalance });
        balance = newBalance;
      }
      return rows;
    }

    function renderAmortization(principal, monthlyRate, monthly, months) {
      const table = document.getElementById('amortTable');
      if (!table) return;
      table.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'grid grid-cols-4 gap-4 font-bold pb-2 border-b border-[#675532]';
      header.innerHTML = '<div>Parcela</div><div>Amortização</div><div>Juros</div><div>Saldo</div>';
      table.appendChild(header);
      const rows = generateAmortRows(principal, monthlyRate, monthly, months);
      rows.forEach(r => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-4 gap-4 py-2 border-b border-[#3b3223]';
        row.innerHTML = `<div>${r.parcela}</div><div>${fmt(r.amortizacao)}</div><div>${fmt(r.juros)}</div><div>${fmt(r.saldo)}</div>`;
        table.appendChild(row);
      });
    }

    function downloadCsv(principal, monthlyRate, monthly, months, filename) {
      const rows = generateAmortRows(principal, monthlyRate, monthly, months);
      let csv = 'Parcela;Amortizacao;Juros;Saldo\n';
      rows.forEach(r => {
        csv += `${r.parcela};${r.amortizacao.toFixed(2)};${r.juros.toFixed(2)};${r.saldo.toFixed(2)}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'amortizacao.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function calculate() {
      const price = parseFloat(document.getElementById('price').value) || 0;
      const down = parseFloat(document.getElementById('down').value) || 0;
      const months = parseInt(document.getElementById('months').value) || 1;
      const annualRate = parseFloat(document.getElementById('annualRate').value) || 0;
      const principal = Math.max(0, price - down);
      const monthlyRate = annualRate / 100 / 12;
      let monthly;
      if (monthlyRate === 0) monthly = principal / months;
      else monthly = principal * (monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
      const totalPaid = monthly * months + down;
      const totalInterest = totalPaid - price;
      const mEl = document.getElementById('summaryBoxMonthly'); if (mEl) mEl.textContent = fmt(monthly);
      const tEl = document.getElementById('summaryBoxTotal'); if (tEl) tEl.textContent = fmt(totalPaid);
      const iEl = document.getElementById('summaryBoxInterest'); if (iEl) iEl.textContent = fmt(totalInterest);
      document.getElementById('monthly').textContent = fmt(monthly);
      document.getElementById('totalPaid').textContent = fmt(totalPaid);
      document.getElementById('totalInterest').textContent = fmt(totalInterest);
      renderAmortization(principal, monthlyRate, monthly, months);
      return { monthly, totalPaid, totalInterest, principal, months, annualRate, monthlyRate };
    }

    const calcBtn = document.getElementById('calcBtn');
    if (calcBtn) calcBtn.addEventListener('click', e => { e.preventDefault(); calculate(); });
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', e => {
      e.preventDefault();
      const root = document.getElementById('simForm') || document.querySelector('.sim-card') || document.body;
      limparSimulador(root, { clearSelectors: ['#monthly','#totalPaid','#totalInterest','#amortTable','#summaryBoxMonthly','#summaryBoxTotal','#summaryBoxInterest'] });
    });
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', e => { e.preventDefault(); const res = calculate(); downloadCsv(res.principal, res.monthlyRate || (res.annualRate/12), res.monthly, res.months, 'amortizacao_veiculo.csv'); });
    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) whatsappBtn.addEventListener('click', e => { e.preventDefault(); const res = calculate(); const phone = '5511999999999'; const text = `Simulação de financiamento (%0A)Valor do veículo: ${fmt(parseFloat(document.getElementById('price').value || 0))}%0AEntrada: ${fmt(parseFloat(document.getElementById('down').value || 0))}%0AParcela mensal: ${fmt(res.monthly)}%0APrazo: ${res.months} meses%0ATaxa anual: ${res.annualRate}%25`; const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`; window.open(url, '_blank'); });
  }

  // ===== FGTS =====
  function initFgts() {
    const saldoEl = document.getElementById('saldo');
    if (!saldoEl) return;
    function calc() {
      const saldo = parseFloat(document.getElementById('saldo').value) || 0;
      const percent = parseFloat(document.getElementById('percent').value) || 0;
      const months = parseInt(document.getElementById('months').value) || 1;
      const annual = parseFloat(document.getElementById('rate').value) || 0;
      const principal = saldo * (percent / 100);
      const monthlyRate = annual / 100 / 12;
      let monthly = monthlyRate === 0 ? principal / months : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
      const sbL = document.getElementById('summaryBoxLiberado'); if (sbL) sbL.textContent = fmt(principal);
      const sbP = document.getElementById('summaryBoxParcela'); if (sbP) sbP.textContent = fmt(monthly);
      document.getElementById('liberado').textContent = fmt(principal);
      document.getElementById('parcela').textContent = fmt(monthly);
      return { principal, monthly, months };
    }
    const btn = document.getElementById('calc'); if (btn) btn.addEventListener('click', e => { e.preventDefault(); calc(); });
    const clear = document.getElementById('clear'); if (clear) clear.addEventListener('click', e => { e.preventDefault(); const root = document.getElementById('fgtsForm') || document.querySelector('.sim-card') || document.body; limparSimulador(root, { clearSelectors: ['#liberado','#parcela','#summaryBoxLiberado','#summaryBoxParcela'] }); });
    const send = document.getElementById('send'); if (send) send.addEventListener('click', e => { e.preventDefault(); const res = calc(); const phone = '5511999999999'; const text = `Simulação FGTS%0AValor liberado estimado: ${fmt(res.principal)}%0AParcela estimada: ${fmt(res.monthly)}%0APrazo: ${res.months} meses`; window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank'); });
  }

  // ===== Consórcio =====
  function initConsorcio() {
    const valorEl = document.getElementById('valor');
    if (!valorEl) return;
    function simular() {
      const valor = parseFloat(document.getElementById('valor').value) || 0;
      const prazo = parseInt(document.getElementById('prazo').value) || 1;
      const taxa = parseFloat(document.getElementById('taxa').value) || 0;
      const lance = parseFloat(document.getElementById('lance').value) || 0;
      const taxaValor = valor * (taxa / 100);
      const total = valor + taxaValor;
      const saldoAposLance = Math.max(0, total - lance);
      const parcela = saldoAposLance / prazo;
      const parcelaEl = document.getElementById('parcela'); if (parcelaEl) parcelaEl.textContent = fmt(parcela);
      const totalEl = document.getElementById('total'); if (totalEl) totalEl.textContent = fmt(total);
      const saldoEl = document.getElementById('saldo'); if (saldoEl) saldoEl.textContent = fmt(saldoAposLance);
      return { parcela, total, saldoAposLance, prazo };
    }
    const calcBtn = document.getElementById('calc'); if (calcBtn) calcBtn.addEventListener('click', e => { e.preventDefault(); simular(); });
    const clearBtn = document.getElementById('clear'); if (clearBtn) clearBtn.addEventListener('click', e => { e.preventDefault(); const root = document.getElementById('form') || document.querySelector('.sim-card') || document.body; limparSimulador(root, { clearSelectors: ['#parcela','#total','#saldo'] }); });
    const whats = document.getElementById('whats'); if (whats) whats.addEventListener('click', e => { e.preventDefault(); const res = simular(); const phone = '5511999999999'; const text = `Simulação de Consórcio%0AValor: ${fmt(parseFloat(document.getElementById('valor').value || 0))}%0APrazo: ${document.getElementById('prazo').value} meses%0ATaxa administrativa: ${document.getElementById('taxa').value}%0ALance: ${fmt(parseFloat(document.getElementById('lance').value || 0))}%0AParcela estimada: ${fmt(res.parcela)}`; window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank'); });
  }

  // ===== Consignado INSS =====
  function initConsignadoInss() {
    const valorEl = document.getElementById('valor');
    if (!valorEl) return;
    function calc() {
      const valor = parseFloat(document.getElementById('valor').value) || 0;
      const prazo = parseInt(document.getElementById('prazo').value) || 1;
      const taxa = parseFloat(document.getElementById('taxa').value) || 0;
      const renda = parseFloat(document.getElementById('renda').value) || 0;
      const monthlyRate = taxa / 100 / 12;
      const monthly = monthlyRate === 0 ? valor / prazo : valor * monthlyRate / (1 - Math.pow(1 + monthlyRate, -prazo));
      const parcEl = document.getElementById('parc'); if (parcEl) parcEl.textContent = fmt(monthly);
      const propEl = document.getElementById('prop'); if (propEl) propEl.textContent = renda ? Math.round((monthly / renda) * 100) + '%' : '—';
      const sbm = document.getElementById('summaryBoxMonthly'); if (sbm) sbm.textContent = fmt(monthly);
      const sbp = document.getElementById('summaryBoxPrazo'); if (sbp) sbp.textContent = prazo + ' meses';
      const badge = document.getElementById('incomeBadge'); if (badge) {
        if (!renda || renda <= 0) { badge.textContent = '—'; badge.className = 'income-badge'; }
        else { const pct = Math.round((monthly / renda) * 100); badge.textContent = pct + '%'; badge.className = 'income-badge ' + (pct < 30 ? 'good' : (pct < 50 ? 'warn' : 'danger')); }
      }
      return { monthly, prazo };
    }
    function generateAmortRows(principal, monthlyRate, monthly, months) {
      const rows = [];
      let balance = principal;
      for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        let amort = monthly - interest;
        if (i === months) amort = balance;
        const newBalance = Math.max(0, balance - amort);
        rows.push({ parcela: i, amortizacao: amort, juros: interest, saldo: newBalance });
        balance = newBalance;
      }
      return rows;
    }
    function renderAmortization(principal, monthlyRate, monthly, months) {
      const table = document.getElementById('amortTable'); if (!table) return; table.innerHTML = '';
      const header = document.createElement('div'); header.className = 'grid grid-cols-4 gap-4 font-bold pb-2 border-b border-[#675532]'; header.innerHTML = '<div>Parcela</div><div>Amortização</div><div>Juros</div><div>Saldo</div>'; table.appendChild(header);
      const rows = generateAmortRows(principal, monthlyRate, monthly, months);
      rows.forEach(r => { const row = document.createElement('div'); row.className = 'grid grid-cols-4 gap-4 py-2 border-b border-[#3b3223]'; row.innerHTML = `<div>${r.parcela}</div><div>${fmt(r.amortizacao)}</div><div>${fmt(r.juros)}</div><div>${fmt(r.saldo)}</div>`; table.appendChild(row); });
    }
    function downloadCsv(principal, monthlyRate, monthly, months, filename) {
      const rows = generateAmortRows(principal, monthlyRate, monthly, months);
      let csv = 'Parcela;Amortizacao;Juros;Saldo\n';
      rows.forEach(r => { csv += `${r.parcela};${r.amortizacao.toFixed(2)};${r.juros.toFixed(2)};${r.saldo.toFixed(2)}\n`; });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename || 'amortizacao.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }
    const calcBtn = document.getElementById('calc'); if (calcBtn) calcBtn.addEventListener('click', e => { e.preventDefault(); const r = calc(); const principal = parseFloat(document.getElementById('valor').value || 0); const monthlyRate = parseFloat(document.getElementById('taxa').value || 0) / 100 / 12; renderAmortization(principal, monthlyRate, r.monthly, r.prazo); });
    const clearBtn = document.getElementById('clear'); if (clearBtn) clearBtn.addEventListener('click', e => { e.preventDefault(); const root = document.getElementById('form') || document.querySelector('.sim-card') || document.body; limparSimulador(root, { clearSelectors: ['#parc','#prop','#summaryBoxMonthly','#summaryBoxPrazo','#incomeBadge','#amortTable'] }); });
    const sendBtn = document.getElementById('send'); if (sendBtn) sendBtn.addEventListener('click', e => { e.preventDefault(); const r = calc(); const phone = '5511999999999'; const text = `Simulação Consignado INSS%0AValor: ${fmt(parseFloat(document.getElementById('valor').value || 0))}%0AParcela estimada: ${fmt(r.monthly)}%0APrazo: ${r.prazo} meses`; window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank'); });
    const exportBtn = document.getElementById('exportCsv'); if (exportBtn) exportBtn.addEventListener('click', e => { e.preventDefault(); const r = calc(); const principal = parseFloat(document.getElementById('valor').value || 0); const monthlyRate = parseFloat(document.getElementById('taxa').value || 0) / 100 / 12; downloadCsv(principal, monthlyRate, r.monthly, r.prazo, 'amortizacao_consignado_inss.csv'); });
  }

  // ===== Consignado Público =====
  function initConsignadoPublico() {
    const valorEl = document.getElementById('valor');
    if (!valorEl) return;
    function calc() {
      const valor = parseFloat(document.getElementById('valor').value) || 0;
      const prazo = parseInt(document.getElementById('prazo').value) || 1;
      const taxa = parseFloat(document.getElementById('taxa').value) || 0;
      const renda = parseFloat(document.getElementById('renda').value) || 0;
      const monthlyRate = taxa / 100 / 12;
      const monthly = monthlyRate === 0 ? valor / prazo : valor * monthlyRate / (1 - Math.pow(1 + monthlyRate, -prazo));
      const parcEl = document.getElementById('parc'); if (parcEl) parcEl.textContent = fmt(monthly);
      const propEl = document.getElementById('prop'); if (propEl) propEl.textContent = renda ? Math.round((monthly / renda) * 100) + '%' : '—';
      const sbm = document.getElementById('summaryBoxMonthly'); if (sbm) sbm.textContent = fmt(monthly);
      const sbp = document.getElementById('summaryBoxPrazo'); if (sbp) sbp.textContent = prazo + ' meses';
      const badge = document.getElementById('incomeBadge'); if (badge) {
        if (!renda || renda <= 0) { badge.textContent = '—'; badge.className = 'income-badge'; }
        else { const pct = Math.round((monthly / renda) * 100); badge.textContent = pct + '%'; badge.className = 'income-badge ' + (pct < 30 ? 'good' : (pct < 50 ? 'warn' : 'danger')); }
      }
      return { monthly, prazo };
    }
    const calcBtn = document.getElementById('calc'); if (calcBtn) calcBtn.addEventListener('click', e => { e.preventDefault(); calc(); });
    const clearBtn = document.getElementById('clear'); if (clearBtn) clearBtn.addEventListener('click', e => { e.preventDefault(); const root = document.getElementById('form') || document.querySelector('.sim-card') || document.body; limparSimulador(root, { clearSelectors: ['#parc','#prop','#summaryBoxMonthly','#summaryBoxPrazo','#incomeBadge'] }); });
    const sendBtn = document.getElementById('send'); if (sendBtn) sendBtn.addEventListener('click', e => { e.preventDefault(); const r = calc(); const phone = '5511999999999'; const text = `Simulação Consignado Servidores%0AValor: ${fmt(parseFloat(document.getElementById('valor').value || 0))}%0AParcela estimada: ${fmt(r.monthly)}%0APrazo: ${r.prazo} meses`; window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank'); });
  }

  // ===== Garantia de Imóvel =====
  function initGarantiaImovel() {
    const valorImovelEl = document.getElementById('valorImovel');
    if (!valorImovelEl) return;
    function calc() {
      const valorImovel = parseFloat(document.getElementById('valorImovel').value) || 0;
      const ltv = parseFloat(document.getElementById('ltv').value) || 0;
      const prazo = parseInt(document.getElementById('prazo').value) || 1;
      const taxa = parseFloat(document.getElementById('taxa').value) || 0;
      const maxFin = valorImovel * (ltv / 100);
      const monthlyRate = taxa / 100 / 12;
      const monthly = monthlyRate === 0 ? maxFin / prazo : maxFin * monthlyRate / (1 - Math.pow(1 + monthlyRate, -prazo));
      const maxfinEl = document.getElementById('maxfin'); if (maxfinEl) maxfinEl.textContent = fmt(maxFin);
      const parcEl = document.getElementById('parc'); if (parcEl) parcEl.textContent = fmt(monthly);
      return { monthly, maxFin, prazo };
    }
    const calcBtn = document.getElementById('calc'); if (calcBtn) calcBtn.addEventListener('click', e => { e.preventDefault(); calc(); });
    const clearBtn = document.getElementById('clear'); if (clearBtn) clearBtn.addEventListener('click', e => { e.preventDefault(); const root = document.getElementById('form') || document.querySelector('.sim-card') || document.body; limparSimulador(root, { clearSelectors: ['#parc','#maxfin'] }); });
    const sendBtn = document.getElementById('send'); if (sendBtn) sendBtn.addEventListener('click', e => { e.preventDefault(); const r = calc(); const phone = '5511999999999'; const text = `Simulação Garantia Imóvel%0AValor imóvel: ${fmt(parseFloat(document.getElementById('valorImovel').value || 0))}%0ALTV: ${document.getElementById('ltv').value}%0AValor financiável: ${fmt(r.maxFin)}%0AParcela estimada: ${fmt(r.monthly)}%0APrazo: ${r.prazo} meses`; window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank'); });
  }

  // Inicializa os módulos conforme elementos presentes na página
  initVeiculos();
  initFgts();
  initConsorcio();
  initConsignadoInss();
  initConsignadoPublico();
  initGarantiaImovel();
});
