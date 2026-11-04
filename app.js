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
})();
