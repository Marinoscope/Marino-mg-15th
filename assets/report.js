import { CONFIG, formatJPDate, uuidv4, apiPostReport } from "./utils.js";

const roundSel = document.getElementById("round");
const slotGrid = document.getElementById("slotGrid");
const submitBtn = document.getElementById("submit");
const msg = document.getElementById("msg");

const tsContainer = document.getElementById("ts");
const resetZeroBtn = document.getElementById("resetZero");
const confirmWidget = document.getElementById("confirmWidget");
const confirmContent = document.getElementById("confirmContent");

let widgetId = null;

function renderRound() {
  roundSel.innerHTML = CONFIG.ROUNDS.map(r => `<option value="${r}">${r}</option>`).join("");
}

function makeSlotCard(date, slot) {
  const id = `${date}_S${slot}`;
  return `
    <div class="bg-white/60 p-4 rounded-2xl border border-gray-100 flex flex-col gap-3 relative shadow-sm">
      <div class="flex justify-between items-center border-b border-gray-100 pb-2">
        <div class="font-bold text-soft-brown">${formatJPDate(date)} <span class="text-sakura-dark">第${slot}部</span></div>
        <div class="text-xs text-gray-400 font-mono">${date}</div>
      </div>
      
      <div class="flex items-center gap-4">
        <label class="flex-1">
          <div class="text-xs text-gray-500 font-bold mb-1">応募口数（0以上）</div>
          <input id="cnt_${id}" type="number" min="0" value="0" inputmode="numeric" pattern="[0-9]*" class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sakura-dark/50 focus:border-sakura-dark transition-all text-center font-bold text-xl text-teal-900 bg-white shadow-inner">
        </label>
        
        <label class="flex flex-col items-center justify-center gap-1 cursor-pointer group mt-4">
          <input id="rej_${id}" type="checkbox" class="w-5 h-5 accent-sakura-dark cursor-pointer rounded">
          <span class="text-xs font-bold text-gray-500 group-hover:text-sakura-dark transition-colors">落選あり</span>
        </label>
      </div>

      <div class="grid grid-cols-4 gap-2 mt-1">
        <button type="button" onclick="adjSlot('${id}', -3)" class="py-1.5 rounded-lg bg-gray-50 text-gray-500 font-bold text-sm border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-sm">-3</button>
        <button type="button" onclick="adjSlot('${id}', -1)" class="py-1.5 rounded-lg bg-gray-50 text-gray-500 font-bold text-sm border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-sm">-1</button>
        <button type="button" onclick="adjSlot('${id}', 1)" class="py-1.5 rounded-lg bg-sakura-pink/20 text-sakura-dark font-bold text-sm border border-sakura-dark/30 hover:bg-sakura-pink/40 active:bg-sakura-pink transition-colors shadow-sm">+1</button>
        <button type="button" onclick="adjSlot('${id}', 3)" class="py-1.5 rounded-lg bg-sakura-pink/20 text-sakura-dark font-bold text-sm border border-sakura-dark/30 hover:bg-sakura-pink/40 active:bg-sakura-pink transition-colors shadow-sm">+3</button>
      </div>
    </div>
  `;
}

window.adjSlot = function(id, val) {
  const input = document.getElementById(`cnt_${id}`);
  if (input) {
    let current = parseInt(input.value) || 0;
    current += val;
    if (current < 0) current = 0;
    input.value = current;
    input.dispatchEvent(new Event('input'));
  }
};

function renderSlots() {
  const html = [];
  for (const date of CONFIG.DATES) {
    for (const slot of CONFIG.SLOTS) {
      html.push(makeSlotCard(date, slot));
    }
  }
  slotGrid.innerHTML = html.join("");

  // イベントリスナーを付与してウィジェットを更新
  const inputs = slotGrid.querySelectorAll('input[type="number"], input[type="checkbox"]');
  inputs.forEach(input => {
    input.addEventListener('input', updateConfirmWidget);
    input.addEventListener('change', updateConfirmWidget);
  });
}

function updateConfirmWidget() {
  try {
    const records = collectRecords();
    const applied = records.filter(r => r.appliedCount > 0);
    const rejected = records.filter(r => r.hasRejection);

    let totalCount = 0;
    applied.forEach(r => totalCount += r.appliedCount);

    if (totalCount === 0 && rejected.length === 0) {
      confirmWidget.style.display = "none";
      return;
    }

    let html = `<strong>総応募数：${totalCount}口</strong><br><br>`;
    
    if (applied.length > 0) {
      html += `【応募入力あり】<br>`;
      applied.forEach(r => {
        html += `・${formatJPDate(r.date)} 第${r.slot}部: ${r.appliedCount}口<br>`;
      });
      html += `<br>`;
    }

    if (rejected.length > 0) {
      html += `【落選報告あり】<br>`;
      rejected.forEach(r => {
        html += `・${formatJPDate(r.date)} 第${r.slot}部<br>`;
      });
    }

    confirmContent.innerHTML = html;
    confirmWidget.style.display = "block";
  } catch(e) {
    // バリデーションエラー時はウィジェットを隠すかエラー表示
    confirmWidget.style.display = "none";
  }
}

function setMsg(type, text) {
  const isError = type === 'error';
  const isSuccess = type === 'success';
  const color = isError ? 'red-500' : (isSuccess ? 'teal-600' : 'sakura-dark');
  const bgIcon = isError ? 'bg-red-100' : (isSuccess ? 'bg-pearl-green' : 'bg-sakura-pink');
  
  const iconSvg = isError 
    ? `<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    : `<svg class="w-5 h-5 text-${isSuccess ? 'teal-700' : 'sakura-dark'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

  msg.innerHTML = `
    <div class="bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-sm border border-${color}/30 flex items-center gap-3 animate-fade-in mt-4">
      <div class="w-8 h-8 shrink-0 rounded-full ${bgIcon} flex items-center justify-center">
        ${iconSvg}
      </div>
      <div class="text-sm font-bold text-gray-700 leading-tight">
        ${text}
      </div>
    </div>
  `;
}

function collectRecords() {
  const records = [];
  for (const date of CONFIG.DATES) {
    for (const slot of CONFIG.SLOTS) {
      const id = `${date}_S${slot}`;
      const cntEl = document.getElementById(`cnt_${id}`);
      const rejEl = document.getElementById(`rej_${id}`);

      const appliedCount = Number(cntEl.value);
      if (!Number.isFinite(appliedCount) || appliedCount < 0) {
        throw new Error(`${formatJPDate(date)} 第${slot}部：応募口数が不正です`);
      }

      records.push({
        date,
        slot,
        appliedCount: Math.floor(appliedCount),
        hasRejection: !!rejEl.checked,
      });
    }
  }
  return records;
}

// Turnstile を「確実に」描画する
async function initTurnstile() {
  setMsg("notice", "Turnstile準備中…");

  // window.turnstile が来るまで待つ（async/defer対策）
  for (let i = 0; i < 100; i++) {
    if (window.turnstile && typeof window.turnstile.render === "function") break;
    await new Promise(r => setTimeout(r, 50));
  }
  if (!window.turnstile) {
    setMsg("error", "Turnstileの読み込みに失敗しました。ページを再読み込みしてください。");
    return;
  }

  // 既に描画済みなら一旦クリア
  tsContainer.innerHTML = "";

  widgetId = window.turnstile.render(tsContainer, {
    sitekey: CONFIG.TURNSTILE_SITEKEY,
  });

  setMsg("success", "準備OK。入力して送信できます。");
}

async function onSubmit() {
  submitBtn.disabled = true;
  setMsg("notice", "送信中…");

  try {
    if (widgetId === null || !window.turnstile) {
      throw new Error("Turnstileが未準備です。ページを再読み込みしてください。");
    }

    const token = window.turnstile.getResponse(widgetId);
    if (!token) {
      throw new Error("Turnstileが未完了です（チェックしてください）");
    }

    const payload = {
      submissionId: uuidv4(),
      round: roundSel.value,
      turnstileToken: token,
      userAgent: navigator.userAgent,
      records: collectRecords(),
    };

    await apiPostReport(payload);

    // 次の送信に備えてリセット
    window.turnstile.reset(widgetId);

    setMsg("success", "送信しました！ありがとうございます。ダッシュボードで反映を確認できます。");
  } catch (err) {
    setMsg("error", `送信に失敗：${err.message || err}`);
  } finally {
    submitBtn.disabled = false;
  }
}

renderRound();
renderSlots();
updateConfirmWidget();

submitBtn.addEventListener("click", onSubmit);
resetZeroBtn.addEventListener("click", () => {
  if(!confirm("本当に入力したすべての枠の応募口数を0に戻しますか？")) return;
  const inputs = slotGrid.querySelectorAll('input[type="number"]');
  inputs.forEach(input => input.value = 0);
  const checks = slotGrid.querySelectorAll('input[type="checkbox"]');
  checks.forEach(check => check.checked = false);
  updateConfirmWidget();
});
initTurnstile();
