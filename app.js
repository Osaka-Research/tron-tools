(() => {
  const TRONGRID = "https://api.trongrid.io";
  const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  const SUN_PER_TRX = 1_000_000;

  const tronWeb = new TronWeb({
    fullHost: TRONGRID,
  });

  const $ = (id) => document.getElementById(id);

  // Tabs
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
    });
  });

  // Toast
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 1600);
  }

  // Copy buttons (delegated)
  document.addEventListener("click", async (e) => {
    const b = e.target.closest(".copy");
    if (!b) return;
    const el = $(b.dataset.target);
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.textContent);
      toast("Copied");
    } catch {
      toast("Copy failed");
    }
  });

  // ---------- Wallet generator ----------
  $("genBtn").addEventListener("click", () => {
    try {
      const acc = TronWeb.utils.accounts.generateAccount();
      $("wAddr").textContent = acc.address.base58;
      $("wHex").textContent = acc.address.hex;
      $("wPriv").textContent = acc.privateKey;
      $("wPub").textContent = acc.publicKey;
      $("walletOut").classList.remove("hidden");
    } catch (err) {
      alert("Generation failed: " + err.message);
    }
  });

  // ---------- Address validator ----------
  $("vBtn").addEventListener("click", () => {
    const addr = $("vAddr").value.trim();
    const out = $("vOut");
    if (!addr) {
      out.innerHTML = '<p class="err">Enter an address.</p>';
      return;
    }
    const valid = TronWeb.isAddress(addr);
    if (valid) {
      let base58 = addr, hex = addr;
      try {
        if (addr.startsWith("T")) hex = TronWeb.address.toHex(addr);
        else base58 = TronWeb.address.fromHex(addr);
      } catch {}
      out.innerHTML = `<p class="ok">Valid Tron address.</p>
        <dl class="kv">
          <dt>Base58</dt><dd>${base58}</dd>
          <dt>Hex</dt><dd>${hex}</dd>
        </dl>`;
    } else {
      out.innerHTML = '<p class="err">Not a valid Tron address.</p>';
    }
  });

  // ---------- Balance ----------
  $("bBtn").addEventListener("click", async () => {
    const addr = $("bAddr").value.trim();
    const out = $("bOut");
    if (!TronWeb.isAddress(addr)) {
      out.innerHTML = '<p class="err">Enter a valid Tron address.</p>';
      return;
    }
    out.innerHTML = '<p class="hint">Fetching…</p>';
    try {
      const [trxSun, usdtRaw] = await Promise.all([
        tronWeb.trx.getBalance(addr),
        fetchUsdtBalance(addr),
      ]);
      const trx = (Number(trxSun) / SUN_PER_TRX).toLocaleString("en-US", { maximumFractionDigits: 6 });
      const usdt = (Number(usdtRaw) / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 6 });
      out.innerHTML = `<dl class="kv">
        <dt>TRX</dt><dd>${trx}</dd>
        <dt>USDT</dt><dd>${usdt}</dd>
        <dt>Address</dt><dd>${addr}</dd>
      </dl>`;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.message || String(err))}</p>`;
    }
  });

  async function fetchUsdtBalance(ownerAddr) {
    // triggerConstantContract: balanceOf(address)
    const ownerHex = TronWeb.address.toHex(ownerAddr).replace(/^41/, "0x");
    const param = ownerHex.replace(/^0x/, "").padStart(64, "0");
    const data = "70a08231" + param;
    const res = await fetch(`${TRONGRID}/wallet/triggerconstantcontract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: TronWeb.address.toHex(ownerAddr),
        contract_address: TronWeb.address.toHex(USDT_CONTRACT),
        function_selector: "balanceOf(address)",
        parameter: param,
        visible: false,
      }),
    });
    const j = await res.json();
    if (!j.constant_result || !j.constant_result[0]) return 0n;
    return BigInt("0x" + j.constant_result[0]);
  }

  // ---------- Tx lookup ----------
  $("tBtn").addEventListener("click", async () => {
    const hash = $("tHash").value.trim();
    const out = $("tOut");
    if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
      out.innerHTML = '<p class="err">Enter a 64-char hex tx hash.</p>';
      return;
    }
    out.innerHTML = '<p class="hint">Fetching…</p>';
    try {
      const [tx, info] = await Promise.all([
        tronWeb.trx.getTransaction(hash).catch(() => null),
        tronWeb.trx.getTransactionInfo(hash).catch(() => null),
      ]);
      if (!tx || Object.keys(tx).length === 0) {
        out.innerHTML = '<p class="err">Transaction not found.</p>';
        return;
      }
      const contract = tx.raw_data?.contract?.[0];
      const type = contract?.type || "unknown";
      const val = contract?.parameter?.value || {};
      const from = val.owner_address ? TronWeb.address.fromHex(val.owner_address) : "—";
      const to = val.to_address ? TronWeb.address.fromHex(val.to_address) : (val.contract_address ? TronWeb.address.fromHex(val.contract_address) : "—");
      const amt = val.amount ? (val.amount / SUN_PER_TRX) + " TRX" : "—";
      const block = info?.blockNumber ?? "—";
      const fee = info?.fee != null ? (info.fee / SUN_PER_TRX) + " TRX" : "0 TRX";
      const res = info?.receipt?.result || (info ? "SUCCESS" : "PENDING");
      out.innerHTML = `<dl class="kv">
        <dt>Type</dt><dd>${escapeHtml(type)}</dd>
        <dt>Status</dt><dd>${escapeHtml(res)}</dd>
        <dt>Block</dt><dd>${block}</dd>
        <dt>From</dt><dd>${from}</dd>
        <dt>To</dt><dd>${to}</dd>
        <dt>Amount</dt><dd>${amt}</dd>
        <dt>Fee</dt><dd>${fee}</dd>
        <dt>Hash</dt><dd>${hash}</dd>
      </dl>`;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.message || String(err))}</p>`;
    }
  });

  // ---------- Resources ----------
  $("rBtn").addEventListener("click", async () => {
    const addr = $("rAddr").value.trim();
    const out = $("rOut");
    if (!TronWeb.isAddress(addr)) {
      out.innerHTML = '<p class="err">Enter a valid Tron address.</p>';
      return;
    }
    out.innerHTML = '<p class="hint">Fetching…</p>';
    try {
      const [res, acc] = await Promise.all([
        tronWeb.trx.getAccountResources(addr),
        tronWeb.trx.getAccount(addr),
      ]);
      const bwUsed = res.NetUsed || 0;
      const bwLimit = res.NetLimit || 0;
      const freeBwUsed = res.freeNetUsed || 0;
      const freeBwLimit = res.freeNetLimit || 0;
      const enUsed = res.EnergyUsed || 0;
      const enLimit = res.EnergyLimit || 0;
      const balanceTrx = ((acc.balance || 0) / SUN_PER_TRX).toLocaleString("en-US", { maximumFractionDigits: 6 });
      const frozenV2 = (acc.frozenV2 || []).reduce((s, f) => s + (f.amount || 0), 0);
      const frozenTrx = (frozenV2 / SUN_PER_TRX).toLocaleString("en-US", { maximumFractionDigits: 6 });
      out.innerHTML = `<dl class="kv">
        <dt>TRX balance</dt><dd>${balanceTrx}</dd>
        <dt>Frozen (v2)</dt><dd>${frozenTrx} TRX</dd>
        <dt>Bandwidth</dt><dd>${bwUsed} / ${bwLimit} (staked) · ${freeBwUsed} / ${freeBwLimit} (free)</dd>
        <dt>Energy</dt><dd>${enUsed} / ${enLimit}</dd>
      </dl>`;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.message || String(err))}</p>`;
    }
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- TRX/USD converter ----------
  let trxPrice = null;
  async function refreshPrice() {
    const out = $("cPrice");
    out.innerHTML = '<p class="hint">Fetching…</p>';
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd");
      const j = await res.json();
      trxPrice = j.tron.usd;
      out.innerHTML = `<p class="ok">1 TRX = $${trxPrice} USD</p>`;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.message || String(err))}</p>`;
    }
  }
  $("cRefreshBtn").addEventListener("click", refreshPrice);
  $("cTrx").addEventListener("input", () => {
    if (trxPrice == null) return;
    $("cUsd").value = (parseFloat($("cTrx").value || 0) * trxPrice).toFixed(6);
  });
  $("cUsd").addEventListener("input", () => {
    if (trxPrice == null) return;
    $("cTrx").value = (parseFloat($("cUsd").value || 0) / trxPrice).toFixed(6);
  });

  // ---------- Multi-address balance checker ----------
  $("mBtn").addEventListener("click", async () => {
    const lines = $("mAddrs").value.split("\n").map((s) => s.trim()).filter(Boolean);
    const out = $("mOut");
    if (!lines.length) {
      out.innerHTML = '<p class="err">Paste at least one address.</p>';
      return;
    }
    out.innerHTML = '<p class="hint">Fetching…</p>';
    try {
      const rows = await Promise.all(
        lines.map(async (addr) => {
          if (!TronWeb.isAddress(addr)) return { addr, error: "invalid address" };
          try {
            const [trxSun, usdtRaw] = await Promise.all([
              tronWeb.trx.getBalance(addr),
              fetchUsdtBalance(addr),
            ]);
            return {
              addr,
              trx: (Number(trxSun) / SUN_PER_TRX).toLocaleString("en-US", { maximumFractionDigits: 6 }),
              usdt: (Number(usdtRaw) / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 6 }),
            };
          } catch (e) {
            return { addr, error: e.message || String(e) };
          }
        })
      );
      out.innerHTML = `<table class="tbl"><thead><tr><th>Address</th><th>TRX</th><th>USDT</th></tr></thead><tbody>${rows
        .map((r) =>
          r.error
            ? `<tr><td>${escapeHtml(r.addr)}</td><td colspan="2" class="err">${escapeHtml(r.error)}</td></tr>`
            : `<tr><td>${escapeHtml(r.addr)}</td><td>${r.trx}</td><td>${r.usdt}</td></tr>`
        )
        .join("")}</tbody></table>`;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.message || String(err))}</p>`;
    }
  });

  // ---------- Generic TRC-20 token info ----------
  async function triggerConstant(contract, selector, owner) {
    const ownerAddr = owner || contract;
    const res = await fetch(`${TRONGRID}/wallet/triggerconstantcontract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: TronWeb.address.toHex(ownerAddr),
        contract_address: TronWeb.address.toHex(contract),
        function_selector: selector,
        parameter: "",
        visible: false,
      }),
    });
    const j = await res.json();
    if (j.result && j.result.result === false) {
      throw new Error(j.result.message ? hexToUtf8Safe(j.result.message) : "call failed");
    }
    return j.constant_result && j.constant_result[0];
  }
  function hexToUtf8Safe(hex) {
    try {
      const bytes = new Uint8Array(hex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return hex;
    }
  }
  function decodeAbiString(hex) {
    if (!hex) return "";
    const len = parseInt(hex.slice(64, 128), 16) || 0;
    const strHex = hex.slice(128, 128 + len * 2);
    let out = "";
    for (let i = 0; i < strHex.length; i += 2) out += String.fromCharCode(parseInt(strHex.substr(i, 2), 16));
    return out;
  }
  async function balanceOf(contract, owner) {
    const ownerHex = TronWeb.address.toHex(owner).replace(/^41/, "").padStart(64, "0");
    const res = await fetch(`${TRONGRID}/wallet/triggerconstantcontract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: TronWeb.address.toHex(owner),
        contract_address: TronWeb.address.toHex(contract),
        function_selector: "balanceOf(address)",
        parameter: ownerHex,
        visible: false,
      }),
    });
    const j = await res.json();
    if (!j.constant_result || !j.constant_result[0]) return 0n;
    return BigInt("0x" + j.constant_result[0]);
  }
  $("trcBtn").addEventListener("click", async () => {
    const contract = $("trcContract").value.trim();
    const owner = $("trcOwner").value.trim();
    const out = $("trcOut");
    if (!TronWeb.isAddress(contract)) {
      out.innerHTML = '<p class="err">Enter a valid contract address.</p>';
      return;
    }
    out.innerHTML = '<p class="hint">Fetching…</p>';
    try {
      const [nameHex, symbolHex, decHex] = await Promise.all([
        triggerConstant(contract, "name()"),
        triggerConstant(contract, "symbol()"),
        triggerConstant(contract, "decimals()"),
      ]);
      const name = decodeAbiString(nameHex);
      const symbol = decodeAbiString(symbolHex);
      const decimals = parseInt(decHex, 16) || 0;
      let balRow = "";
      if (owner) {
        if (!TronWeb.isAddress(owner)) {
          balRow = `<dt>Balance</dt><dd class="err">invalid owner address</dd>`;
        } else {
          const raw = await balanceOf(contract, owner);
          const bal = Number(raw) / Math.pow(10, decimals);
          balRow = `<dt>Balance</dt><dd>${bal.toLocaleString("en-US", { maximumFractionDigits: decimals })}</dd>`;
        }
      }
      out.innerHTML = `<dl class="kv">
        <dt>Name</dt><dd>${escapeHtml(name)}</dd>
        <dt>Symbol</dt><dd>${escapeHtml(symbol)}</dd>
        <dt>Decimals</dt><dd>${decimals}</dd>
        ${balRow}
      </dl>`;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.message || String(err))}</p>`;
    }
  });

  // ---------- Network stats ----------
  $("nBtn").addEventListener("click", async () => {
    const out = $("nOut");
    out.innerHTML = '<p class="hint">Fetching…</p>';
    try {
      const [block, witnesses] = await Promise.all([
        fetch(`${TRONGRID}/wallet/getnowblock`, { method: "POST" }).then((r) => r.json()),
        fetch(`${TRONGRID}/wallet/listwitnesses`, { method: "POST" }).then((r) => r.json()),
      ]);
      const blockNumber = block.block_header.raw_data.number;
      const timestamp = new Date(block.block_header.raw_data.timestamp).toLocaleString();
      const witnessCount = (witnesses.witnesses || []).length;
      out.innerHTML = `<dl class="kv">
        <dt>Block height</dt><dd>${blockNumber.toLocaleString("en-US")}</dd>
        <dt>Block time</dt><dd>${escapeHtml(timestamp)}</dd>
        <dt>Witnesses</dt><dd>${witnessCount}</dd>
      </dl>`;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.message || String(err))}</p>`;
    }
  });

  // ---------- QR address generator ----------
  $("qBtn").addEventListener("click", async () => {
    const addr = $("qAddr").value.trim();
    const amt = $("qAmt").value.trim();
    const out = $("qOut");
    if (!TronWeb.isAddress(addr)) {
      out.innerHTML = '<p class="err">Enter a valid Tron address.</p>';
      return;
    }
    const uri = amt ? `tron:${addr}?amount=${encodeURIComponent(amt)}` : addr;
    out.innerHTML = '<canvas id="qCanvas"></canvas><p class="hint"></p>';
    try {
      await QRCode.toCanvas($("qCanvas"), uri, { width: 220 });
      out.querySelector("p.hint").textContent = uri;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.message || String(err))}</p>`;
    }
  });
})();
