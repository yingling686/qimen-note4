(function () {
  "use strict";

  const STEMS = ["", "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const BRANCHES = ["", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const PALACES = ["", "坎一", "坤二", "震三", "巽四", "中五", "乾六", "兑七", "艮八", "离九"];
  const GODS = ["", "值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];
  const STARS = ["", "天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
  const DOORS = ["", "休门", "死门", "伤门", "杜门", "死门", "开门", "惊门", "生门", "景门"];
  const GROWTH = ["", "长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];
  const STAR_STRENGTH = ["", "囚", "废", "相", "旺", "休"];
  const STEM_STRENGTH = ["", "死", "相", "旺", "休", "囚"];
  const BOARD_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const METHOD_NAMES = ["拆补", "置闰"];
  const NOTE_KNOWLEDGE = window.QM_NOTE_KNOWLEDGE || {};
  const IS_NATIVE_APP = Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
  const SERVER_BASE_URL = "https://041y776797.uicp.fun/";
  const apiBaseUrl = IS_NATIVE_APP
    ? SERVER_BASE_URL
    : (location.protocol === "file:" ? "http://192.168.110.2:8087/" : location.href);
  const API_URL = new URL(IS_NATIVE_APP ? "api/qimen_mobile_api.php" : "api/qimen_api.php", apiBaseUrl).href;
  const HISTORY_DELETE_URL = new URL("api/qimen_history_delete.php", apiBaseUrl).href;
  const ACCOUNT_API_URL = new URL("api/qimen_account_api.php", apiBaseUrl).href;
  const AUTH_TOKEN_KEY = "qimenAuthToken";
  const AUTH_USER_KEY = "qimenAuthUser";
  let aiResultMarkdown = "";

  const state = {
    date: "",
    time: "",
    method: 0,
    hourMode: "clock",
    randomHourId: 1,
    calendar: null,
    panel: null,
    selectedPalace: 4,
    analysisOpen: false,
    authMode: "login",
    authToken: "",
    user: null,
    subjects: []
  };

  const el = {
    gregorian: document.getElementById("gregorianText"),
    pillars: document.getElementById("pillars"),
    scene: document.getElementById("sceneText"),
    turtle: document.getElementById("turtleText"),
    method: document.getElementById("methodText"),
    board: document.getElementById("qimenBoard"),
    badge: document.getElementById("selectedBadge"),
    analysisTitle: document.getElementById("analysisTitle"),
    summary: document.getElementById("palaceSummary"),
    reactions: document.getElementById("reactionList"),
    analysisSection: document.getElementById("analysisSection"),
    dialog: document.getElementById("settingsDialog"),
    form: document.getElementById("settingsForm"),
    dateInput: document.getElementById("dateInput"),
    timeInput: document.getElementById("timeInput"),
    methodInput: document.getElementById("methodInput"),
    randomPanel: document.getElementById("randomHourPanel"),
    randomHourInput: document.getElementById("randomHourInput"),
    error: document.getElementById("formError"),
    aiButton: document.getElementById("aiInterpretBtn"),
    aiDialog: document.getElementById("aiDialog"),
    aiForm: document.getElementById("aiForm"),
    aiSubjectSelectLabel: document.getElementById("aiSubjectSelectLabel"),
    aiSubjectSelect: document.getElementById("aiSubjectSelect"),
    aiSubjectName: document.getElementById("aiSubjectName"),
    aiBirthDate: document.getElementById("aiBirthDate"),
    aiLifeStem: document.getElementById("aiLifeStem"),
    useMyBirthdayLabel: document.getElementById("useMyBirthdayLabel"),
    useMyBirthday: document.getElementById("useMyBirthday"),
    useMyBirthdayText: document.getElementById("useMyBirthdayText"),
    saveSubjectLabel: document.getElementById("saveSubjectLabel"),
    saveSubject: document.getElementById("saveSubject"),
    aiQuestion: document.getElementById("aiQuestion"),
    aiStatus: document.getElementById("aiStatus"),
    aiSubmit: document.getElementById("aiSubmitBtn"),
    aiResultPanel: document.getElementById("aiResultPanel"),
    aiResult: document.getElementById("aiResult"),
    aiResultMeta: document.getElementById("aiResultMeta"),
    loginBtn: document.getElementById("loginBtn"),
    registerBtn: document.getElementById("registerBtn"),
    historyBtn: document.getElementById("historyBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    authDialog: document.getElementById("authDialog"),
    authForm: document.getElementById("authForm"),
    authTitle: document.getElementById("authTitle"),
    authUsername: document.getElementById("authUsername"),
    authPassword: document.getElementById("authPassword"),
    authConfirmLabel: document.getElementById("authConfirmLabel"),
    authConfirmPassword: document.getElementById("authConfirmPassword"),
    authStatus: document.getElementById("authStatus"),
    authSubmit: document.getElementById("authSubmitBtn"),
    authSwitch: document.getElementById("authSwitchBtn"),
    historyDialog: document.getElementById("historyDialog"),
    historyStatus: document.getElementById("historyStatus"),
    historyList: document.getElementById("historyList"),
    myGuestPanel: document.getElementById("myGuestPanel"),
    myAccountPanel: document.getElementById("myAccountPanel"),
    profileView: document.getElementById("profileView"),
    profileDisplayUsername: document.getElementById("profileDisplayUsername"),
    profileDisplayBirthDate: document.getElementById("profileDisplayBirthDate"),
    profileEditBtn: document.getElementById("profileEditBtn"),
    profileCancelBtn: document.getElementById("profileCancelBtn"),
    profileForm: document.getElementById("profileForm"),
    profileUsername: document.getElementById("profileUsername"),
    profileBirthDate: document.getElementById("profileBirthDate"),
    profileStatus: document.getElementById("profileStatus"),
    savedSubjectsList: document.getElementById("savedSubjectsList"),
    widgetInstallSection: document.getElementById("widgetInstallSection"),
    pinWidgetBtn: document.getElementById("pinWidgetBtn"),
    pinWidgetStatus: document.getElementById("pinWidgetStatus"),
    profileDisplayAiAccess: document.getElementById("profileDisplayAiAccess"),
    chartNoteSection: document.getElementById("chartNoteSection"),
    chartNoteInput: document.getElementById("chartNoteInput"),
    chartNoteStatus: document.getElementById("chartNoteStatus"),
    saveChartNoteBtn: document.getElementById("saveChartNoteBtn"),
    noteListStatus: document.getElementById("noteListStatus"),
    noteList: document.getElementById("noteList"),
    adminAccessSection: document.getElementById("adminAccessSection"),
    adminAccessStatus: document.getElementById("adminAccessStatus"),
    adminUserList: document.getElementById("adminUserList"),
    savedReadingSection: document.getElementById("savedReadingSection"),
    savedRecordType: document.getElementById("savedRecordType"),
    savedReadingTime: document.getElementById("savedReadingTime"),
    savedReadingQuestion: document.getElementById("savedReadingQuestion"),
    savedReadingAnswer: document.getElementById("savedReadingAnswer")
  };

  const reactionMap = new Map((window.QM_REACTIONS || []).slice(1).map(item => [item[0], item]));

  function pad(value) { return String(value).padStart(2, "0"); }

  function toInputValues(date) {
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
    };
  }

  function dateString() {
    return `${state.date.replace(/-/g, "/")} ${state.time}:00`;
  }

  function ganzhi(item) {
    return `${STEMS[item.HS]}${BRANCHES[item.EB]}`;
  }

  function hourOptions() {
    return Array.from({ length: 60 }, (_, index) => {
      const id = index + 1;
      const hs = id % 10 || 10;
      const eb = id % 12 || 12;
      return `<option value="${id}">${pad(id)} · ${STEMS[hs]}${BRANCHES[eb]}</option>`;
    }).join("");
  }

  function stemClass(id) {
    if (id === 1) return "";
    if (id === 2) return "stem-wood";
    if (id <= 4) return "stem-fire";
    if (id <= 6) return "stem-earth";
    if (id <= 8) return "stem-metal";
    return "stem-water";
  }

  function stemHtml(id, markable) {
    if (!id) return "";
    const classes = ["stem-mark", stemClass(id)];
    const dayStem = normalizeJia(state.panel[0].HS_day);
    const hourStem = normalizeJia(state.panel[0].HS_hour);
    if (markable && id === dayStem) classes.push("is-day");
    if (markable && dayStem !== hourStem && id === hourStem) classes.push("is-hour");
    return `<span class="${classes.join(" ")}">${STEMS[id]}</span>`;
  }

  function normalizeJia(id) { return id === 1 ? 5 : id; }

  function birthLifeInfo() {
    const value = el.aiBirthDate.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (year < 1926 || year > 2099) return null;
    const datePrefix = `${year}/${pad(month)}/${pad(day)}`;
    const midday = new SCC(`${datePrefix} 12:00:00`);
    const startOfDay = new SCC(`${datePrefix} 00:00:00`);
    const endOfDay = new SCC(`${datePrefix} 23:59:59`);
    const yearStemId = midday.YMDH.year.HS;
    const yearBranchId = midday.YMDH.year.EB;
    const boundaryDay = startOfDay.YMDH.year.id !== endOfDay.YMDH.year.id;
    const chartStemId = yearStemId === 1 && state.panel ? state.panel[0].HS_ace : yearStemId;
    return {
      name: el.aiSubjectName.value.trim(),
      birthDate: value,
      solarTermYear: midday.year_scc,
      yearPillar: `${STEMS[yearStemId]}${BRANCHES[yearBranchId]}`,
      lifeStem: STEMS[yearStemId],
      lifeStemId: yearStemId,
      chartRepresentative: STEMS[chartStemId],
      boundaryDay,
      calculationRule: "以出生地当地日期的立春交节为干支年界；仅有日期时按当日12:00换算"
    };
  }

  function renderBirthLifeInfo() {
    const info = birthLifeInfo();
    if (!info) {
      el.aiLifeStem.textContent = "选择生日后自动换算";
      el.aiLifeStem.classList.remove("is-warning");
      return null;
    }
    const chartText = info.lifeStem === "甲" ? ` · 当前盘遁于${info.chartRepresentative}` : "";
    const warning = info.boundaryDay ? " · 立春交节日，需出生时刻校正" : "";
    el.aiLifeStem.textContent = `${info.yearPillar}年 · 年命${info.lifeStem}${chartText}${warning}`;
    el.aiLifeStem.classList.toggle("is-warning", info.boundaryDay);
    return info;
  }

  function relationText(value) {
    return ["", "受克", "受生", "比合", "生泄", "克耗"][value] || "—";
  }

  function infoValue(label, value, tone) {
    if (!value) return "";
    const toneClass = tone ? ` info-value--${tone}` : "";
    return `<span class="info-value${toneClass}"><small>${label}</small>${value}</span>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function markdownInline(value) {
    const codeSpans = [];
    let html = escapeHtml(value).replace(/`([^`\n]+)`/g, (_, code) => {
      const index = codeSpans.push(`<code>${code}</code>`) - 1;
      return `\u0000CODE${index}\u0000`;
    });
    html = html
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    return html.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => codeSpans[Number(index)] || "");
  }

  function markdownCells(line) {
    let value = line.trim();
    if (value.startsWith("|")) value = value.slice(1);
    if (value.endsWith("|")) value = value.slice(0, -1);
    return value.split("|").map(cell => cell.trim());
  }

  function isMarkdownTableSeparator(line) {
    const cells = markdownCells(line);
    return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index += 1; continue; }

      const fence = line.match(/^\s*```([^\s`]*)\s*$/);
      if (fence) {
        const code = [];
        index += 1;
        while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++]);
        if (index < lines.length) index += 1;
        const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : "";
        output.push(`<pre><code${language}>${escapeHtml(code.join("\n"))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        output.push(`<h${level}>${markdownInline(heading[2])}</h${level}>`);
        index += 1;
        continue;
      }
      if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        output.push("<hr>");
        index += 1;
        continue;
      }

      if (index + 1 < lines.length && line.includes("|") && isMarkdownTableSeparator(lines[index + 1])) {
        const headers = markdownCells(line);
        index += 2;
        const rows = [];
        while (index < lines.length && lines[index].trim() && lines[index].includes("|")) rows.push(markdownCells(lines[index++]));
        output.push(`<div class="markdown-table-wrap"><table><thead><tr>${headers.map(cell => `<th>${markdownInline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, cellIndex) => `<td>${markdownInline(row[cellIndex] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        const quote = [];
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
        output.push(`<blockquote>${quote.map(markdownInline).join("<br>")}</blockquote>`);
        continue;
      }

      const listMatch = line.match(/^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/);
      if (listMatch) {
        const ordered = Boolean(listMatch[2]);
        const items = [];
        while (index < lines.length) {
          const item = lines[index].match(/^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/);
          if (!item || Boolean(item[2]) !== ordered) break;
          items.push(item[3]);
          index += 1;
        }
        const tag = ordered ? "ol" : "ul";
        output.push(`<${tag}>${items.map(item => `<li>${markdownInline(item)}</li>`).join("")}</${tag}>`);
        continue;
      }

      const paragraph = [line];
      index += 1;
      while (index < lines.length && lines[index].trim()
        && !/^\s*```/.test(lines[index])
        && !/^(#{1,6})\s+/.test(lines[index])
        && !/^\s*(?:[-+*]|\d+\.)\s+/.test(lines[index])
        && !/^\s*>\s?/.test(lines[index])) paragraph.push(lines[index++]);
      output.push(`<p>${paragraph.map(markdownInline).join("<br>")}</p>`);
    }
    return output.join("");
  }

  function renderMarkdownInto(element, markdown) {
    element.innerHTML = renderMarkdown(markdown);
  }

  function symbolMeaning(group, id, symbol) {
    const entry = NOTE_KNOWLEDGE[group] && NOTE_KNOWLEDGE[group][String(id)];
    if (!entry || !Array.isArray(entry.sections) || !entry.sections.length) return "";
    const headline = entry.sections.find(section => /^(核心|基本|基础)含义/.test(section[0])) || entry.sections[0];
    return `<details class="symbol-notes">
      <summary><span>含义</span><b>${escapeHtml(headline[1])}</b><i>展开</i></summary>
      <dl>${entry.sections.map(section => `<div><dt>${escapeHtml(section[0])}</dt><dd>${escapeHtml(section[1])}</dd></div>`).join("")}</dl>
      <p class="notes-source">《奇门笔记（同学整理）》· ${escapeHtml(symbol)}</p>
    </details>`;
  }

  function infoRow(category, symbol, values, symbolClass, meaning) {
    return `<div class="info-row">
      <div class="info-symbol"><small>${category}</small><strong class="${symbolClass || ""}">${symbol}</strong></div>
      <div class="info-values">${values.filter(Boolean).join("")}${meaning || ""}</div>
    </div>`;
  }

  function stemDetails(obj) {
    const growth = Array.isArray(obj.grow) ? obj.grow.filter(Boolean).map(id => GROWTH[id]).join(" / ") : "";
    return [
      infoValue("宫", growth),
      obj.hurt ? infoValue("宫", "刑", "alert") : "",
      obj.tomb_pal ? infoValue("宫", "墓", "alert") : "",
      infoValue("月", STEM_STRENGTH[obj.mon]),
      obj.tomb_mon ? infoValue("月", "墓", "alert") : ""
    ];
  }

  function palaceInformation(id, p) {
    const rows = [
      infoRow("宫位", PALACES[id], [
        p.pal.vacancy ? infoValue("时旬", "空亡", "mark") : "",
        p.pal.horse ? infoValue("时支", "驿马", "mark") : ""
      ], "", symbolMeaning("palaces", id, PALACES[id])),
      infoRow("八神", GODS[p.god.id], [
        infoValue("宫", relationText(p.god.pal)),
        p.god.tomb_pal ? infoValue("宫", "墓", "alert") : "",
        p.god.tomb_mon ? infoValue("月", "墓", "alert") : ""
      ], "", symbolMeaning("gods", p.god.id, GODS[p.god.id])),
      infoRow("九星", STARS[p.star.id], [
        infoValue("月", STAR_STRENGTH[p.star.mon]),
        p.star.tomb_mon ? infoValue("月", "墓", "alert") : "",
        infoValue("宫", STAR_STRENGTH[p.star.pal]),
        p.star.tomb_pal ? infoValue("宫", "墓", "alert") : "",
        infoValue("门", relationText(p.star.door))
      ], "", symbolMeaning("stars", p.star.id, STARS[p.star.id])),
      infoRow("天盘干", stemHtml(p.guest.id, true), stemDetails(p.guest), "", symbolMeaning("stems", p.guest.id, STEMS[p.guest.id])),
      p.guest_ex.id ? infoRow("天盘寄干", stemHtml(p.guest_ex.id, true), stemDetails(p.guest_ex), "", symbolMeaning("stems", p.guest_ex.id, STEMS[p.guest_ex.id])) : "",
      infoRow("八门", DOORS[p.door.id], [
        infoValue("宫", relationText(p.door.pal)),
        p.door.tomb_pal ? infoValue("宫", "墓", "alert") : "",
        p.door.tomb_mon ? infoValue("月", "墓", "alert") : ""
      ], "", symbolMeaning("doors", p.door.id, DOORS[p.door.id])),
      infoRow("地盘干", stemHtml(p.host.id, false), stemDetails(p.host), "", symbolMeaning("stems", p.host.id, STEMS[p.host.id])),
      p.host_ex.id ? infoRow("地盘寄干", stemHtml(p.host_ex.id, false), stemDetails(p.host_ex), "", symbolMeaning("stems", p.host_ex.id, STEMS[p.host_ex.id])) : ""
    ];
    return rows.filter(Boolean).join("");
  }

  function turtleText(ymdh) {
    const dayStem = [0, 10, 9, 7, 8, 7, 10, 9, 7, 8, 7];
    const dayBranch = [0, 7, 10, 8, 8, 10, 7, 7, 10, 9, 9, 10, 7];
    const hourStem = [0, 9, 8, 7, 6, 5, 9, 8, 7, 6, 5];
    const hourBranch = [0, 9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4];
    const acupoints = ["", "申脉", "照海", "外关", "临泣", "男照海·女内关", "公孙", "后溪", "内关", "列缺"];
    const sum = dayStem[ymdh.day.HS] + dayBranch[ymdh.day.EB] + hourStem[ymdh.hour.HS] + hourBranch[ymdh.hour.EB];
    const divisor = ymdh.day.HS % 2 === 1 ? 9 : 6;
    const value = sum % divisor || divisor;
    return `灵龟${value} · ${acupoints[value]}`;
  }

  function palaceCell(id) {
    const p = state.panel[id];
    if (id === 5) {
      return `<div class="palace-cell palace-cell--center" role="gridcell">
        <div class="palace-core">
          <strong>${PALACES[id]}</strong>
          符 · ${STARS[state.panel[0].star]}<br>
          使 · ${DOORS[state.panel[0].door]}<br>
          甲遁${stemHtml(state.panel[0].HS_ace, false)}
        </div>
      </div>`;
    }

    const guestEx = p.guest_ex.id ? stemHtml(p.guest_ex.id, true) : "";
    const hostEx = p.host_ex.id ? stemHtml(p.host_ex.id, false) : "";
    const tags = [p.pal.vacancy ? "空" : "", p.pal.horse ? "马" : ""].filter(Boolean);
    const selected = state.analysisOpen && state.selectedPalace === id;
    return `<button class="palace-cell${selected ? " is-selected" : ""}" type="button" role="gridcell" data-palace="${id}" aria-pressed="${selected}">
      <div class="palace-content">
        <div class="palace-god">${GODS[p.god.id]}</div>
        <div class="palace-line">${STARS[p.star.id]} ${stemHtml(p.guest.id, true)}${guestEx}</div>
        <div class="palace-line">${DOORS[p.door.id]} <strong>${stemHtml(p.host.id, false)}${hostEx}</strong></div>
        <div class="palace-meta">${tags.map(tag => `<span>${tag}</span>`).join("")}</div>
      </div>
      <span class="palace-number">${PALACES[id]}</span>
    </button>`;
  }

  function renderHeader() {
    const ymdh = state.calendar.YMDH;
    const [year, month, day] = state.date.split("-").map(Number);
    const [hour, minute] = state.time.split(":");
    el.gregorian.textContent = `${year}年${month}月${day}日 ${hour}:${minute}`;
    el.pillars.innerHTML = [
      ["年", ymdh.year], ["月", ymdh.month], ["日", ymdh.day], ["时", ymdh.hour]
    ].map(([label, value]) => `<div class="pillar"><span class="pillar__label">${label}柱</span><span class="pillar__value">${ganzhi(value)}</span></div>`).join("");
    const scene = state.panel[0].scene;
    el.scene.textContent = `${scene.gender ? "阳遁" : "阴遁"}${scene.sn}局${scene.note ? ` · ${scene.note}` : ""}`;
    el.turtle.textContent = turtleText(ymdh);
    el.method.textContent = `${METHOD_NAMES[state.method]}${state.hourMode === "random" ? ` · 抽时${ganzhi(ymdh.hour)}` : ""}`;
  }

  function renderBoard() {
    el.board.innerHTML = BOARD_ORDER.map(palaceCell).join("");
  }

  function reactionFor(guest, host, label) {
    if (!guest || !host || guest === 1 || host === 1) return null;
    const key = `${pad(guest)}${pad(host)}`;
    const row = reactionMap.get(key);
    if (!row) return null;
    const supplement = NOTE_KNOWLEDGE.reactions && NOTE_KNOWLEDGE.reactions[key];
    return {
      label,
      pair: `${STEMS[guest]} + ${STEMS[host]}`,
      pairHtml: `${stemHtml(guest, false)} + ${stemHtml(host, false)}`,
      name: row[1],
      note: row[2],
      noteName: supplement ? supplement.name : "",
      noteDetail: supplement ? supplement.detail : ""
    };
  }

  function selectedReactions(p) {
    return [
      reactionFor(p.guest.id, p.host.id, "天盘 × 地盘"),
      p.guest_ex.id ? reactionFor(p.guest_ex.id, p.host.id, "天盘寄干 × 地盘") : null,
      p.host_ex.id ? reactionFor(p.guest.id, p.host_ex.id, "天盘 × 地盘寄干") : null,
      p.guest_ex.id && p.host_ex.id ? reactionFor(p.guest_ex.id, p.host_ex.id, "天盘寄干 × 地盘寄干") : null
    ].filter(Boolean);
  }

  function noteReference(group, id) {
    const entry = NOTE_KNOWLEDGE[group] && NOTE_KNOWLEDGE[group][String(id)];
    if (!entry) return null;
    return {
      name: entry.name,
      title: entry.title,
      items: entry.sections.map(section => ({ label: section[0], text: section[1] }))
    };
  }

  function stemSnapshot(obj) {
    if (!obj || !obj.id) return null;
    return {
      id: obj.id,
      symbol: STEMS[obj.id],
      growth: Array.isArray(obj.grow) ? obj.grow.filter(Boolean).map(id => GROWTH[id]) : [],
      monthStrength: STEM_STRENGTH[obj.mon] || "—",
      palacePunishment: Boolean(obj.hurt),
      palaceTomb: Boolean(obj.tomb_pal),
      monthTomb: Boolean(obj.tomb_mon)
    };
  }

  function palaceSnapshot(id) {
    const p = state.panel[id];
    const dayStem = normalizeJia(state.panel[0].HS_day);
    const hourStem = normalizeJia(state.panel[0].HS_hour);
    const skyStems = [p.guest.id, p.guest_ex.id].filter(Boolean);
    return {
      id,
      palace: PALACES[id],
      vacancy: Boolean(p.pal.vacancy),
      horse: Boolean(p.pal.horse),
      markers: {
        dayStemOnSky: skyStems.includes(dayStem),
        hourStemOnSky: skyStems.includes(hourStem),
        chiefStarHere: p.star.id === state.panel[0].star,
        chiefDoorHere: p.door.id === state.panel[0].door
      },
      god: {
        id: p.god.id,
        name: GODS[p.god.id],
        palaceRelation: relationText(p.god.pal),
        palaceTomb: Boolean(p.god.tomb_pal),
        monthTomb: Boolean(p.god.tomb_mon)
      },
      star: {
        id: p.star.id,
        name: STARS[p.star.id],
        monthStrength: STAR_STRENGTH[p.star.mon] || "—",
        palaceStrength: STAR_STRENGTH[p.star.pal] || "—",
        doorRelation: relationText(p.star.door),
        palaceTomb: Boolean(p.star.tomb_pal),
        monthTomb: Boolean(p.star.tomb_mon)
      },
      door: {
        id: p.door.id,
        name: DOORS[p.door.id],
        palaceRelation: relationText(p.door.pal),
        palaceTomb: Boolean(p.door.tomb_pal),
        monthTomb: Boolean(p.door.tomb_mon)
      },
      skyStem: stemSnapshot(p.guest),
      skyExtraStem: stemSnapshot(p.guest_ex),
      earthStem: stemSnapshot(p.host),
      earthExtraStem: stemSnapshot(p.host_ex),
      reactions: selectedReactions(p).map(row => ({
        position: row.label,
        pair: row.pair,
        originalName: row.name,
        originalExplanation: row.note,
        noteName: row.noteName || "",
        noteExplanation: row.noteDetail || ""
      }))
    };
  }

  function patternSnapshot() {
    const opposite = { 1: 9, 2: 8, 3: 7, 4: 6, 6: 4, 7: 3, 8: 2, 9: 1 };
    const ids = BOARD_ORDER.filter(id => id !== 5);
    const starFuYin = ids.every(id => state.panel[id].star.id === id);
    const doorFuYin = ids.every(id => state.panel[id].door.id === id);
    const starFanYin = ids.every(id => state.panel[id].star.id === opposite[id]);
    const doorFanYin = ids.every(id => state.panel[id].door.id === opposite[id]);
    return {
      starFuYin,
      doorFuYin,
      fullFuYin: starFuYin && doorFuYin,
      starFanYin,
      doorFanYin
    };
  }

  function knowledgeSnapshot(palaces) {
    const idsFor = (group, getter) => [...new Set(palaces.map(getter).flat().filter(Boolean))]
      .map(id => noteReference(group, id))
      .filter(Boolean);
    return {
      palaces: idsFor("palaces", palace => palace.id),
      gods: idsFor("gods", palace => palace.god.id),
      stars: idsFor("stars", palace => palace.star.id),
      doors: idsFor("doors", palace => palace.door.id),
      stems: idsFor("stems", palace => [
        palace.skyStem?.id,
        palace.skyExtraStem?.id,
        palace.earthStem?.id,
        palace.earthExtraStem?.id
      ])
    };
  }

  function buildAiChartData(question) {
    const ymdh = state.calendar.YMDH;
    const palaces = BOARD_ORDER.filter(id => id !== 5).map(palaceSnapshot);
    const dayStem = normalizeJia(state.panel[0].HS_day);
    const hourStem = normalizeJia(state.panel[0].HS_hour);
    const subject = birthLifeInfo();
    return {
      question,
      subject,
      generatedAt: new Date().toISOString(),
      calendar: {
        gregorian: `${state.date} ${state.time}`,
        pillars: {
          year: ganzhi(ymdh.year),
          month: ganzhi(ymdh.month),
          day: ganzhi(ymdh.day),
          hour: ganzhi(ymdh.hour)
        },
        dayStem: STEMS[state.panel[0].HS_day],
        dayHiddenAs: STEMS[dayStem],
        hourStem: STEMS[state.panel[0].HS_hour],
        hourHiddenAs: STEMS[hourStem]
      },
      setup: {
        method: METHOD_NAMES[state.method],
        hourMode: state.hourMode === "random" ? "抽六十甲子" : "钟表时间",
        dun: state.panel[0].scene.gender ? "阳遁" : "阴遁",
        ju: state.panel[0].scene.sn,
        note: state.panel[0].scene.note || "",
        chiefStar: STARS[state.panel[0].star],
        chiefDoor: DOORS[state.panel[0].door],
        hiddenJiaStem: STEMS[state.panel[0].HS_ace],
        patterns: patternSnapshot()
      },
      palaces,
      explanationsFromCurrentPage: knowledgeSnapshot(palaces),
      dataRules: {
        skyStemFirst: "十干克应按天盘干＋地盘干读取，寄干组合已在各宫reactions中单列",
        strengthLabels: "九星月令/落宫使用囚废相旺休；天干月令使用死相旺休囚",
        sourcePriority: "originalExplanation为原程序；noteExplanation为同学笔记补充，两者均须保留"
      }
    };
  }

  function currentChartConfig() {
    return {
      date: state.date,
      time: state.time,
      method: state.method,
      hourMode: state.hourMode,
      randomHourId: state.randomHourId
    };
  }

  async function apiRequest(action, payload) {
    const headers = { "Content-Type": "application/json" };
    if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...(payload || {}) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      if (response.status === 401 && action !== "login") clearAuth();
      throw new Error(data.error || `服务返回 ${response.status}`);
    }
    return data.data;
  }

  async function accountApiRequest(action, payload) {
    const response = await fetch(ACCOUNT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.authToken}`
      },
      body: JSON.stringify({ action, ...(payload || {}) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      if (response.status === 401) clearAuth();
      throw new Error(data.error || `服务返回 ${response.status}`);
    }
    return data.data;
  }

  async function refreshAccessStatus() {
    if (!state.authToken) return null;
    const access = await accountApiRequest("access_status");
    const user = { ...(state.user || {}), ...access };
    persistAuth(state.authToken, user);
    return user;
  }

  async function deleteHistoryRecord(id) {
    const response = await fetch(HISTORY_DELETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.authToken}`
      },
      body: JSON.stringify({ id })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      if (response.status === 401) clearAuth();
      throw new Error(data.error || `服务返回 ${response.status}`);
    }
    return data.data;
  }

  function persistAuth(token, user) {
    state.authToken = token || "";
    state.user = user || null;
    try {
      if (state.authToken) {
        localStorage.setItem(AUTH_TOKEN_KEY, state.authToken);
        if (state.user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(state.user));
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch (error) { /* 无本地存储时账号仅在当前页面有效 */ }
    renderAuthState();
  }

  function clearAuth() { persistAuth("", null); }

  function subjectOptionsHtml() {
    return '<option value="">新建求测主体</option>' + state.subjects.map(item =>
      `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(item.birthDate)}</option>`
    ).join("");
  }

  function renderSubjectControls() {
    const loggedIn = Boolean(state.user && state.authToken);
    el.aiSubjectSelectLabel.hidden = !loggedIn;
    el.saveSubjectLabel.hidden = !loggedIn;
    el.useMyBirthdayLabel.hidden = !loggedIn;
    el.useMyBirthday.disabled = !(loggedIn && state.user.birthDate);
    el.useMyBirthdayText.textContent = loggedIn && state.user.birthDate
      ? "使用我的生日（默认）"
      : "使用我的生日（请先在“我的”中设置）";
    el.aiSubjectSelect.innerHTML = subjectOptionsHtml();
    if (!loggedIn) {
      el.useMyBirthday.checked = false;
      el.aiBirthDate.disabled = false;
    }
  }

  async function loadSubjects() {
    if (!state.user) {
      state.subjects = [];
      renderSubjectControls();
      return [];
    }
    state.subjects = await apiRequest("subject_list");
    renderSubjectControls();
    return state.subjects;
  }

  function renderAuthState() {
    const loggedIn = Boolean(state.user && state.authToken);
    el.loginBtn.hidden = loggedIn;
    el.registerBtn.hidden = loggedIn;
    el.historyBtn.hidden = !loggedIn;
    el.logoutBtn.hidden = !loggedIn;
    el.historyBtn.textContent = loggedIn ? `${state.user.username} · 我的` : "我的";
    el.chartNoteSection.hidden = !loggedIn;
    el.aiButton.classList.toggle("is-locked", !loggedIn || !state.user?.aiEnabled);
    el.aiButton.title = loggedIn && state.user?.aiEnabled ? "打开AI辅助解读" : "需登录并由管理员开通AI权限";
    el.widgetInstallSection.hidden = !IS_NATIVE_APP;
    renderSubjectControls();
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    const registering = mode === "register";
    el.authTitle.textContent = registering ? "注册" : "登录";
    el.authSubmit.textContent = registering ? "创建账号" : "登录";
    el.authSwitch.textContent = registering ? "已有账号？返回登录" : "没有账号？注册";
    el.authConfirmLabel.hidden = !registering;
    el.authConfirmPassword.required = registering;
    el.authPassword.autocomplete = registering ? "new-password" : "current-password";
    el.authStatus.textContent = "";
  }

  function openAuthDialog(mode) {
    setAuthMode(mode);
    el.authPassword.value = "";
    el.authConfirmPassword.value = "";
    if (typeof el.authDialog.showModal === "function") el.authDialog.showModal();
    else el.authDialog.setAttribute("open", "");
    setTimeout(() => el.authUsername.focus(), 0);
  }

  function closeAuthDialog() {
    if (typeof el.authDialog.close === "function") el.authDialog.close();
    else el.authDialog.removeAttribute("open");
  }

  function closeHistoryDialog() {
    if (typeof el.historyDialog.close === "function") el.historyDialog.close();
    else el.historyDialog.removeAttribute("open");
  }

  function setAiStatus(message, isError) {
    el.aiStatus.textContent = message;
    el.aiStatus.classList.toggle("is-error", Boolean(isError));
  }

  async function openAiDialog() {
    if (!state.user || !state.authToken) {
      openAuthDialog("login");
      return;
    }
    try { await refreshAccessStatus(); } catch (error) {
      setAiStatus(error.message || "无法核验AI权限。", true);
      return;
    }
    if (!state.user.aiEnabled) {
      await openHistoryDialog();
      el.historyStatus.textContent = "AI解读权限尚未开通，请联系管理员为当前账号开通。";
      el.historyStatus.classList.add("is-error");
      return;
    }
    setAiStatus("", false);
    el.aiResultPanel.hidden = true;
    aiResultMarkdown = "";
    el.aiResult.innerHTML = "";
    if (typeof el.aiDialog.showModal === "function") el.aiDialog.showModal();
    else el.aiDialog.setAttribute("open", "");
    if (state.user) {
      if (state.user.birthDate) {
        el.useMyBirthday.checked = true;
        el.aiBirthDate.value = state.user.birthDate;
        el.aiBirthDate.disabled = true;
        if (!el.aiSubjectName.value.trim()) el.aiSubjectName.value = state.user.username;
        renderBirthLifeInfo();
      } else {
        el.useMyBirthday.checked = false;
        el.aiBirthDate.disabled = false;
      }
      try { await loadSubjects(); } catch (error) { setAiStatus("常用主体读取失败，不影响本次解读。", true); }
    }
    setTimeout(() => el.aiQuestion.focus(), 0);
  }

  function closeAiDialog() {
    if (typeof el.aiDialog.close === "function") el.aiDialog.close();
    else el.aiDialog.removeAttribute("open");
  }

  async function requestAiInterpretation(question, onDelta, onStatus) {
    const chartData = buildAiChartData(question);
    const headers = { "Content-Type": "application/json" };
    if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "interpret",
        systemPrompt: window.QM_AI_GUIDE || "",
        chartData,
        chartConfig: currentChartConfig()
      })
    });
    const contentType = response.headers?.get?.("Content-Type") || "application/json";
    if (!response.ok || !contentType.includes("text/event-stream")) {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `服务返回 ${response.status}`);
      if (data.data?.text && onDelta) onDelta(data.data.text);
      return data.data;
    }
    if (!response.body?.getReader) throw new Error("当前浏览器不支持流式解读，请升级浏览器。" );

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let text = "";
    let finished = null;

    function consumeEvent(block) {
      let eventName = "message";
      const dataLines = [];
      block.split(/\r?\n/).forEach(line => {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      });
      if (!dataLines.length) return;
      const data = JSON.parse(dataLines.join("\n"));
      if (eventName === "delta" && data.text) {
        text += data.text;
        if (onDelta) onDelta(data.text);
      } else if (eventName === "status" && data.message) {
        if (onStatus) onStatus(data.message);
      } else if (eventName === "done") {
        finished = { ...data, text: typeof data.text === "string" ? data.text : text };
      } else if (eventName === "error") {
        const error = new Error(data.error || "AI解读失败。" );
        error.isServerError = true;
        throw error;
      }
    }

    try {
      while (true) {
        let packet;
        try {
          packet = await reader.read();
        } catch (error) {
          throw new Error(text
            ? "网络连接中断，已保留当前生成内容；请稍后在“我的”查看是否已保存，避免重复提交。"
            : "网络连接中断，问题内容已保留，请重新提交。" );
        }
        const { value, done } = packet;
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        let boundary;
        while ((boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
          const block = buffer.slice(0, boundary);
          const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)[0];
          buffer = buffer.slice(boundary + separator.length);
          if (block.trim()) consumeEvent(block);
          // done is the application-level completion signal; do not wait for a
          // proxy to close its connection or mistake a subsequent reset for failure.
          if (finished) return finished;
        }
        if (done) break;
      }
    } finally {
      reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    if (buffer.trim()) consumeEvent(buffer);
    if (!finished) throw new Error("AI流式连接提前结束，请重试。" );
    return finished;
  }

  function historyItemHtml(item) {
    return `<div class="history-item-row" data-history-row="${item.id}">
      <button class="history-item" type="button" data-history-id="${item.id}">
        <strong>${escapeHtml(item.question)}</strong>
        <span>${escapeHtml(item.preview || "")}</span>
        <small>${item.subjectName ? `${escapeHtml(item.subjectName)} · ${escapeHtml(item.subjectBirthDate || "")} · ` : ""}${escapeHtml(item.chartTime || "")} · 保存于 ${escapeHtml(item.createdAt || "")}</small>
      </button>
      <button class="history-delete-btn" type="button" data-delete-history-id="${item.id}" aria-label="删除解读：${escapeHtml(item.question)}">删除</button>
    </div>`;
  }

  function noteItemHtml(item) {
    return `<div class="history-item-row" data-note-row="${item.id}">
      <button class="history-item" type="button" data-note-id="${item.id}">
        <strong>${escapeHtml(item.preview || "解局笔记")}</strong>
        <small>${escapeHtml(item.chartTime || "")} · 保存于 ${escapeHtml(item.updatedAt || "")}</small>
      </button>
      <button class="history-delete-btn" type="button" data-delete-note-id="${item.id}" aria-label="删除这条解局笔记">删除</button>
    </div>`;
  }

  function adminUserHtml(item) {
    const fixed = Boolean(item.isAdmin);
    return `<div class="admin-user-row" data-admin-user-row="${item.id}">
      <div><strong>${escapeHtml(item.username)}</strong><span>${escapeHtml(item.birthDate || "生日未设置")}</span></div>
      <span class="admin-access-state ${item.aiEnabled ? "is-enabled" : ""}">${item.aiEnabled ? "AI已开通" : "AI未开通"}</span>
      <button class="secondary-btn" type="button" data-admin-user-id="${item.id}" data-enabled="${item.aiEnabled ? "1" : "0"}" ${fixed ? "disabled" : ""}>${fixed ? "管理员" : (item.aiEnabled ? "关闭权限" : "开通权限")}</button>
    </div>`;
  }

  function savedSubjectsHtml(items) {
    return items.length ? items.map(item => `<button class="saved-subject-item" type="button" data-subject-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.birthDate)}</span></button>`).join("")
      : '<p class="history-empty">暂无常用主体。AI解读时勾选“保存为常用主体”即可添加。</p>';
  }

  function renderProfile(editing) {
    const hasSavedBirthday = Boolean(state.user && state.user.birthDate);
    const showForm = Boolean(editing || !hasSavedBirthday);
    el.profileView.hidden = showForm;
    el.profileForm.hidden = !showForm;
    if (!state.user) return;
    el.profileDisplayUsername.textContent = state.user.username;
    el.profileDisplayBirthDate.textContent = state.user.birthDate ? state.user.birthDate.replace(/-/g, "/") : "尚未设置";
    el.profileDisplayAiAccess.textContent = state.user.aiEnabled ? "已开通" : "未开通";
    el.profileUsername.value = state.user.username;
    el.profileBirthDate.value = state.user.birthDate || "";
    el.profileStatus.textContent = "";
    el.profileStatus.classList.remove("is-error");
  }

  async function openHistoryDialog() {
    if (typeof el.historyDialog.showModal === "function") el.historyDialog.showModal();
    else el.historyDialog.setAttribute("open", "");
    const loggedIn = Boolean(state.user && state.authToken);
    el.myGuestPanel.hidden = loggedIn;
    el.myAccountPanel.hidden = !loggedIn;
    if (!loggedIn) return;
    renderProfile(false);
    el.historyList.innerHTML = "";
    el.noteList.innerHTML = "";
    el.adminUserList.innerHTML = "";
    el.adminAccessSection.hidden = !state.user.isAdmin;
    el.historyStatus.classList.remove("is-error");
    el.noteListStatus.classList.remove("is-error");
    el.adminAccessStatus.classList.remove("is-error");
    el.historyStatus.textContent = "正在读取个人资料与记录……";
    el.noteListStatus.textContent = "正在读取解局笔记……";
    el.adminAccessStatus.textContent = state.user.isAdmin ? "正在读取用户权限……" : "";
    try {
      const requests = [loadSubjects(), apiRequest("history_list"), accountApiRequest("note_list")];
      if (state.user.isAdmin) requests.push(accountApiRequest("admin_user_list"));
      const [subjects, records, notes, users = []] = await Promise.all(requests);
      el.savedSubjectsList.innerHTML = savedSubjectsHtml(subjects);
      el.historyStatus.textContent = records.length ? `共 ${records.length} 条，点击可打开当时排盘。` : "";
      el.historyList.innerHTML = records.length
        ? records.map(historyItemHtml).join("")
        : '<p class="history-empty">暂无记录。登录后完成一次 AI 解读，就会自动保存在这里。</p>';
      el.noteListStatus.textContent = notes.length ? `共 ${notes.length} 条，点击可恢复盘面和笔记。` : "";
      el.noteList.innerHTML = notes.length
        ? notes.map(noteItemHtml).join("")
        : '<p class="history-empty">暂无解局笔记。在盘面下方填写并保存后会显示在这里。</p>';
      if (state.user.isAdmin) {
        el.adminAccessStatus.textContent = `共 ${users.length} 个账号。权限变更立即在服务器生效。`;
        el.adminUserList.innerHTML = users.map(adminUserHtml).join("");
      }
    } catch (error) {
      el.historyStatus.textContent = error.message || "读取记录失败。";
      el.historyStatus.classList.add("is-error");
      el.noteListStatus.textContent = error.message || "读取解局笔记失败。";
      el.noteListStatus.classList.add("is-error");
    }
  }

  async function openSavedReading(id) {
    el.historyStatus.textContent = "正在恢复当时排盘……";
    const record = await apiRequest("history_get", { id });
    const config = record.chartConfig || {};
    state.date = config.date;
    state.time = config.time;
    state.method = Number(config.method) || 0;
    state.hourMode = config.hourMode === "random" ? "random" : "clock";
    state.randomHourId = Number(config.randomHourId) || 1;
    if (!calculate()) throw new Error("历史排盘数据无法恢复。");
    el.savedRecordType.textContent = "AI解读记录";
    el.savedReadingTime.textContent = `${record.chartTime || `${state.date} ${state.time}`} · ${record.createdAt || ""}`;
    el.savedReadingQuestion.textContent = record.subjectName
      ? `${record.subjectName}（${record.subjectBirthDate || "生日未记录"}）：${record.question}`
      : record.question;
    renderMarkdownInto(el.savedReadingAnswer, record.answer);
    el.savedReadingSection.hidden = false;
    closeHistoryDialog();
    el.savedReadingSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function openSavedNote(id) {
    el.noteListStatus.textContent = "正在恢复当时盘面……";
    const record = await accountApiRequest("note_get", { id });
    const config = record.chartConfig || {};
    state.date = config.date;
    state.time = config.time;
    state.method = Number(config.method) || 0;
    state.hourMode = config.hourMode === "random" ? "random" : "clock";
    state.randomHourId = Number(config.randomHourId) || 1;
    if (!calculate()) throw new Error("笔记中的排盘数据无法恢复。");
    el.savedRecordType.textContent = "解局笔记";
    el.savedReadingTime.textContent = `${record.chartTime || `${state.date} ${state.time}`} · ${record.createdAt || ""}`;
    el.savedReadingQuestion.textContent = "当时盘面与解局笔记";
    renderMarkdownInto(el.savedReadingAnswer, record.note || "");
    el.chartNoteInput.value = record.note || "";
    el.savedReadingSection.hidden = false;
    closeHistoryDialog();
    el.savedReadingSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function restoreLogin() {
    let token = "";
    let cachedUser = null;
    try {
      token = localStorage.getItem(AUTH_TOKEN_KEY) || "";
      cachedUser = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
    } catch (error) {
      token = "";
      cachedUser = null;
    }
    if (!token) return renderAuthState();
    state.authToken = token;
    state.user = cachedUser && cachedUser.username ? cachedUser : null;
    renderAuthState();
    try {
      const user = await apiRequest("me");
      persistAuth(token, user);
      await refreshAccessStatus();
    } catch (error) {
      if (!state.authToken) clearAuth();
    }
  }

  function renderAnalysis() {
    el.analysisSection.hidden = !state.analysisOpen;
    el.analysisSection.setAttribute("aria-hidden", String(!state.analysisOpen));
    const id = state.selectedPalace;
    const p = state.panel[id];
    el.badge.textContent = state.analysisOpen ? `${PALACES[id]}宫` : "点击宫位";
    el.analysisTitle.textContent = `${PALACES[id]}宫 · 宫内信息`;
    el.summary.innerHTML = palaceInformation(id, p);
    const rows = selectedReactions(p);
    el.reactions.innerHTML = rows.length ? rows.map(row => `<article class="reaction-card">
      <div><span class="reaction-pair">${row.pairHtml}</span><span class="reaction-name">${row.name}</span></div>
      <p class="reaction-context">${row.label}</p>
      <div class="reaction-source reaction-source--original">
        <strong>原程序</strong>
        <p>${escapeHtml(row.note)}</p>
      </div>
      ${row.noteDetail ? `<div class="reaction-source reaction-source--notes">
        <strong>同学笔记补充${row.noteName && row.noteName !== row.name ? ` · ${escapeHtml(row.noteName)}` : ""}</strong>
        <p>${escapeHtml(row.noteDetail)}</p>
      </div>` : ""}
    </article>`).join("") : `<div class="empty-state">该宫没有可显示的十干克应组合。</div>`;
  }

  function render() {
    renderHeader();
    renderBoard();
    renderAnalysis();
  }

  function calculate() {
    el.error.textContent = "";
    try {
      const requestedHour = state.hourMode === "random" ? Number(state.randomHourId) : 0;
      state.calendar = new SCC(dateString(), requestedHour);
      state.panel = fn_panel(state.method, dateString(), state.calendar);
      if (!state.panel[state.selectedPalace] || state.selectedPalace === 5) state.selectedPalace = 4;
      state.analysisOpen = false;
      render();
      return true;
    } catch (error) {
      console.error(error);
      el.error.textContent = "该时间超出算法数据范围，请选择 1929-01-12 至 2099-10-26。";
      return false;
    }
  }

  function syncDialog() {
    el.dateInput.value = state.date;
    el.timeInput.value = state.time;
    el.methodInput.value = String(state.method);
    el.randomHourInput.value = String(state.randomHourId);
    document.querySelector(`input[name="hourMode"][value="${state.hourMode}"]`).checked = true;
    el.randomPanel.hidden = state.hourMode !== "random";
    el.error.textContent = "";
  }

  function openDialog() {
    syncDialog();
    if (typeof el.dialog.showModal === "function") el.dialog.showModal();
    else el.dialog.setAttribute("open", "");
  }

  function closeDialog() {
    if (typeof el.dialog.close === "function") el.dialog.close();
    else el.dialog.removeAttribute("open");
  }

  function setNow() {
    const values = toInputValues(new Date());
    state.date = values.date;
    state.time = values.time;
    state.hourMode = "clock";
    calculate();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  el.board.addEventListener("click", event => {
    const button = event.target.closest("[data-palace]");
    if (!button) return;
    const nextPalace = Number(button.dataset.palace);
    if (state.analysisOpen && state.selectedPalace === nextPalace) {
      state.analysisOpen = false;
    } else {
      state.selectedPalace = nextPalace;
      state.analysisOpen = true;
    }
    renderBoard();
    renderAnalysis();
    if (state.analysisOpen) el.analysisSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  el.aiButton.addEventListener("click", openAiDialog);
  el.loginBtn.addEventListener("click", () => openAuthDialog("login"));
  el.registerBtn.addEventListener("click", () => openAuthDialog("register"));
  el.historyBtn.addEventListener("click", openHistoryDialog);
  document.getElementById("myBtn").addEventListener("click", openHistoryDialog);
  el.pinWidgetBtn.addEventListener("click", async () => {
    el.pinWidgetStatus.classList.remove("is-error");
    const widgetPlugin = window.QimenWidgetPlugin || window.Capacitor?.Plugins?.QimenWidget;
    if (!widgetPlugin?.requestPin) {
      el.pinWidgetStatus.textContent = "当前版本不支持直接添加，请安装最新版后重试。";
      el.pinWidgetStatus.classList.add("is-error");
      return;
    }
    el.pinWidgetBtn.disabled = true;
    el.pinWidgetStatus.textContent = "正在请求系统显示桌面小组件……";
    try {
      const result = await widgetPlugin.requestPin();
      el.pinWidgetStatus.textContent = result.supported
        ? (result.requested ? "请在系统弹窗中确认添加。" : "系统未接受请求，请到桌面小组件列表中添加。")
        : "当前桌面不支持一键添加，请长按桌面后在小组件列表中查找“奇门时间表盘”。";
    } catch (error) {
      el.pinWidgetStatus.textContent = error.message || "请求添加失败，请从桌面小组件列表中添加。";
      el.pinWidgetStatus.classList.add("is-error");
    } finally {
      el.pinWidgetBtn.disabled = false;
    }
  });
  el.logoutBtn.addEventListener("click", async () => {
    try { await apiRequest("logout"); } catch (error) { /* 即使服务端失效也清除本机登录态 */ }
    clearAuth();
    state.subjects = [];
    el.savedReadingSection.hidden = true;
  });
  document.getElementById("openPickerBtn").addEventListener("click", openDialog);
  document.getElementById("pickTimeBtn").addEventListener("click", openDialog);
  document.getElementById("closeDialogBtn").addEventListener("click", closeDialog);
  document.getElementById("nowBtn").addEventListener("click", setNow);
  document.getElementById("scrollBoardBtn").addEventListener("click", () => el.board.scrollIntoView({ behavior: "smooth", block: "center" }));
  document.getElementById("randomizeBtn").addEventListener("click", () => {
    state.randomHourId = Math.ceil(Math.random() * 60);
    el.randomHourInput.value = String(state.randomHourId);
  });

  document.querySelectorAll('input[name="hourMode"]').forEach(input => {
    input.addEventListener("change", () => {
      el.randomPanel.hidden = input.value !== "random";
      if (input.value === "random" && !state.randomHourId) state.randomHourId = Math.ceil(Math.random() * 60);
    });
  });

  el.form.addEventListener("submit", event => {
    event.preventDefault();
    state.date = el.dateInput.value;
    state.time = el.timeInput.value;
    state.method = Number(el.methodInput.value);
    state.hourMode = document.querySelector('input[name="hourMode"]:checked').value;
    state.randomHourId = Number(el.randomHourInput.value);
    if (calculate()) {
      closeDialog();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  el.dialog.addEventListener("click", event => {
    if (event.target === el.dialog) closeDialog();
  });

  document.getElementById("closeAiDialogBtn").addEventListener("click", closeAiDialog);
  el.aiDialog.addEventListener("click", event => {
    if (event.target === el.aiDialog) closeAiDialog();
  });

  el.aiForm.addEventListener("submit", async event => {
    event.preventDefault();
    const subjectName = el.aiSubjectName.value.trim();
    const question = el.aiQuestion.value.trim();
    const subject = renderBirthLifeInfo();
    if (!subjectName) {
      setAiStatus("请先填写求测主体姓名。", true);
      el.aiSubjectName.focus();
      return;
    }
    if (!subject) {
      setAiStatus("请先选择主体出生日期，以换算年命天干。", true);
      el.aiBirthDate.focus();
      return;
    }
    if (!question) {
      setAiStatus("请先输入需要解读的具体问题。", true);
      return;
    }

    el.aiSubmit.disabled = true;
    el.aiSubmit.classList.add("ai-submit-loading");
    el.aiSubmit.textContent = "正在整理整盘并请求 MiniMax…";
    aiResultMarkdown = "";
    el.aiResult.innerHTML = "";
    el.aiResultPanel.hidden = false;
    el.aiResultMeta.textContent = "MiniMax · 正在生成";
    setAiStatus("已提交整盘，AI正在逐字生成……", false);
    try {
      if (state.user && el.saveSubject.checked) {
        await apiRequest("subject_save", { name: subjectName, birthDate: subject.birthDate });
        await loadSubjects();
      }
      const result = await requestAiInterpretation(
        question,
        delta => {
          aiResultMarkdown += delta;
          renderMarkdownInto(el.aiResult, aiResultMarkdown);
          el.aiResult.scrollTop = el.aiResult.scrollHeight;
        },
        message => { setAiStatus(message, false); }
      );
      aiResultMarkdown = result.text;
      renderMarkdownInto(el.aiResult, aiResultMarkdown);
      const usage = result.usage
        ? ` · 输入${result.usage.input_tokens || 0}/输出${result.usage.output_tokens || 0} tokens`
        : "";
      el.aiResultMeta.textContent = `${result.model || "MiniMax"}${usage}`;
      setAiStatus(result.saved
        ? "解读完成，已保存到你的账号记录。结果仅作传统文化学习参考。"
        : "解读完成。登录后生成的解读会自动保存。结果仅作传统文化学习参考。", false);
      el.aiResultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      el.aiResultMeta.textContent = aiResultMarkdown ? "MiniMax · 生成未完成（已保留内容）" : "MiniMax · 请求未完成";
      setAiStatus(error.message || "AI解读失败，请稍后重试。", true);
    } finally {
      el.aiSubmit.disabled = false;
      el.aiSubmit.classList.remove("ai-submit-loading");
      el.aiSubmit.textContent = "提交整盘解读";
    }
  });

  el.aiBirthDate.max = toInputValues(new Date()).date;
  el.aiBirthDate.addEventListener("change", renderBirthLifeInfo);
  el.aiSubjectSelect.addEventListener("change", () => {
    const selected = state.subjects.find(item => String(item.id) === el.aiSubjectSelect.value);
    if (!selected) return;
    el.aiSubjectName.value = selected.name;
    el.aiBirthDate.value = selected.birthDate;
    el.aiBirthDate.disabled = false;
    el.useMyBirthday.checked = false;
    renderBirthLifeInfo();
  });
  el.useMyBirthday.addEventListener("change", () => {
    if (el.useMyBirthday.checked && state.user?.birthDate) {
      el.aiBirthDate.value = state.user.birthDate;
      el.aiBirthDate.disabled = true;
      if (!el.aiSubjectName.value.trim()) el.aiSubjectName.value = state.user.username;
    } else {
      el.aiBirthDate.disabled = false;
    }
    renderBirthLifeInfo();
  });

  document.getElementById("copyAiResultBtn").addEventListener("click", async () => {
    if (!aiResultMarkdown) return;
    try {
      await navigator.clipboard.writeText(aiResultMarkdown);
      setAiStatus("解读结果已复制。", false);
    } catch (error) {
      setAiStatus("浏览器未允许自动复制，请手动选择结果文本。", true);
    }
  });

  document.getElementById("closeAuthDialogBtn").addEventListener("click", closeAuthDialog);
  el.authSwitch.addEventListener("click", () => setAuthMode(state.authMode === "login" ? "register" : "login"));
  el.authDialog.addEventListener("click", event => {
    if (event.target === el.authDialog) closeAuthDialog();
  });
  el.authForm.addEventListener("submit", async event => {
    event.preventDefault();
    const username = el.authUsername.value.trim();
    const password = el.authPassword.value;
    if (state.authMode === "register" && password !== el.authConfirmPassword.value) {
      el.authStatus.textContent = "两次输入的密码不一致。";
      return;
    }
    el.authSubmit.disabled = true;
    el.authStatus.textContent = state.authMode === "register" ? "正在创建账号……" : "正在登录……";
    try {
      const result = await apiRequest(state.authMode, { username, password });
      persistAuth(result.token, result.user);
      try { await refreshAccessStatus(); } catch (error) { /* 已登录，权限状态稍后可重试 */ }
      closeAuthDialog();
      setAiStatus(`已登录：${result.user.username}。${state.user?.aiEnabled ? "AI解读权限已开通。" : "AI解读需由管理员开通。"}`, false);
    } catch (error) {
      el.authStatus.textContent = error.message || "账号操作失败。";
    } finally {
      el.authSubmit.disabled = false;
    }
  });

  document.getElementById("closeHistoryDialogBtn").addEventListener("click", closeHistoryDialog);
  document.getElementById("myLoginBtn").addEventListener("click", () => { closeHistoryDialog(); openAuthDialog("login"); });
  document.getElementById("myRegisterBtn").addEventListener("click", () => { closeHistoryDialog(); openAuthDialog("register"); });
  el.profileBirthDate.max = toInputValues(new Date()).date;
  el.profileEditBtn.addEventListener("click", () => renderProfile(true));
  el.profileCancelBtn.addEventListener("click", () => renderProfile(false));
  el.profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    el.profileStatus.textContent = "正在保存……";
    try {
      const user = await apiRequest("profile_update", { birthDate: el.profileBirthDate.value });
      persistAuth(state.authToken, { ...state.user, ...user });
      try { await refreshAccessStatus(); } catch (error) { /* 保留刚保存的个人资料 */ }
      renderProfile(false);
    } catch (error) {
      el.profileStatus.textContent = error.message || "个人信息保存失败。";
      el.profileStatus.classList.add("is-error");
    }
  });
  el.savedSubjectsList.addEventListener("click", event => {
    const button = event.target.closest("[data-subject-id]");
    if (!button) return;
    const selected = state.subjects.find(item => String(item.id) === button.dataset.subjectId);
    if (!selected) return;
    closeHistoryDialog();
    openAiDialog();
    el.aiSubjectName.value = selected.name;
    el.aiBirthDate.value = selected.birthDate;
    el.aiBirthDate.disabled = false;
    el.useMyBirthday.checked = false;
    renderBirthLifeInfo();
  });
  el.historyDialog.addEventListener("click", event => {
    if (event.target === el.historyDialog) closeHistoryDialog();
  });
  el.historyList.addEventListener("click", async event => {
    const deleteButton = event.target.closest("[data-delete-history-id]");
    if (deleteButton) {
      const id = Number(deleteButton.dataset.deleteHistoryId);
      if (!window.confirm("确定删除这条 AI 解读记录吗？删除后无法恢复。")) return;
      deleteButton.disabled = true;
      el.historyStatus.textContent = "正在删除记录……";
      el.historyStatus.classList.remove("is-error");
      try {
        await deleteHistoryRecord(id);
        const row = el.historyList.querySelector(`[data-history-row="${id}"]`);
        if (row) row.remove();
        const remaining = el.historyList.querySelectorAll("[data-history-row]").length;
        el.historyStatus.textContent = remaining ? `共 ${remaining} 条，点击可打开当时排盘。` : "";
        if (!remaining) el.historyList.innerHTML = '<p class="history-empty">暂无记录。登录后完成一次 AI 解读，就会自动保存在这里。</p>';
      } catch (error) {
        deleteButton.disabled = false;
        el.historyStatus.textContent = error.message || "删除记录失败。";
        el.historyStatus.classList.add("is-error");
      }
      return;
    }
    const button = event.target.closest("[data-history-id]");
    if (!button) return;
    try {
      await openSavedReading(Number(button.dataset.historyId));
    } catch (error) {
      el.historyStatus.textContent = error.message || "打开记录失败。";
      el.historyStatus.classList.add("is-error");
    }
  });
  el.saveChartNoteBtn.addEventListener("click", async () => {
    const note = el.chartNoteInput.value.trim();
    el.chartNoteStatus.classList.remove("is-error");
    if (!state.user || !state.authToken) {
      el.chartNoteStatus.textContent = "请先登录后再保存。";
      el.chartNoteStatus.classList.add("is-error");
      openAuthDialog("login");
      return;
    }
    if (!note) {
      el.chartNoteStatus.textContent = "请先填写解局笔记。";
      el.chartNoteStatus.classList.add("is-error");
      el.chartNoteInput.focus();
      return;
    }
    el.saveChartNoteBtn.disabled = true;
    el.chartNoteStatus.textContent = "正在保存当前完整盘面与笔记……";
    try {
      const result = await accountApiRequest("note_save", {
        note,
        chartConfig: currentChartConfig(),
        chartSnapshot: buildAiChartData("")
      });
      el.chartNoteStatus.textContent = `已保存到服务器（${result.createdAt || "刚刚"}），可在“我的”中恢复。`;
    } catch (error) {
      el.chartNoteStatus.textContent = error.message || "保存解局笔记失败。";
      el.chartNoteStatus.classList.add("is-error");
    } finally {
      el.saveChartNoteBtn.disabled = false;
    }
  });
  el.noteList.addEventListener("click", async event => {
    const deleteButton = event.target.closest("[data-delete-note-id]");
    if (deleteButton) {
      const id = Number(deleteButton.dataset.deleteNoteId);
      if (!window.confirm("确定删除这条解局笔记吗？删除后无法恢复。")) return;
      deleteButton.disabled = true;
      el.noteListStatus.textContent = "正在删除笔记……";
      el.noteListStatus.classList.remove("is-error");
      try {
        await accountApiRequest("note_delete", { id });
        const row = el.noteList.querySelector(`[data-note-row="${id}"]`);
        if (row) row.remove();
        const remaining = el.noteList.querySelectorAll("[data-note-row]").length;
        el.noteListStatus.textContent = remaining ? `共 ${remaining} 条，点击可恢复盘面和笔记。` : "";
        if (!remaining) el.noteList.innerHTML = '<p class="history-empty">暂无解局笔记。在盘面下方填写并保存后会显示在这里。</p>';
      } catch (error) {
        deleteButton.disabled = false;
        el.noteListStatus.textContent = error.message || "删除解局笔记失败。";
        el.noteListStatus.classList.add("is-error");
      }
      return;
    }
    const button = event.target.closest("[data-note-id]");
    if (!button) return;
    try {
      await openSavedNote(Number(button.dataset.noteId));
    } catch (error) {
      el.noteListStatus.textContent = error.message || "打开解局笔记失败。";
      el.noteListStatus.classList.add("is-error");
    }
  });
  el.adminUserList.addEventListener("click", async event => {
    const button = event.target.closest("[data-admin-user-id]");
    if (!button || button.disabled) return;
    const userId = Number(button.dataset.adminUserId);
    const enabled = button.dataset.enabled !== "1";
    button.disabled = true;
    el.adminAccessStatus.textContent = enabled ? "正在开通AI权限……" : "正在关闭AI权限……";
    el.adminAccessStatus.classList.remove("is-error");
    try {
      await accountApiRequest("admin_ai_set", { userId, enabled });
      const users = await accountApiRequest("admin_user_list");
      el.adminUserList.innerHTML = users.map(adminUserHtml).join("");
      el.adminAccessStatus.textContent = `权限已${enabled ? "开通" : "关闭"}，用户下次操作时立即生效。`;
    } catch (error) {
      button.disabled = false;
      el.adminAccessStatus.textContent = error.message || "修改AI权限失败。";
      el.adminAccessStatus.classList.add("is-error");
    }
  });
  document.getElementById("closeSavedReadingBtn").addEventListener("click", () => {
    el.savedReadingSection.hidden = true;
  });

  el.randomHourInput.innerHTML = hourOptions();
  const initial = toInputValues(new Date());
  state.date = initial.date;
  state.time = initial.time;
  state.randomHourId = Math.ceil(Math.random() * 60);
  calculate();
  restoreLogin();
}());
