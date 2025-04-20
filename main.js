// URLからユーザー名取得
const urlParams = new URLSearchParams(window.location.search);
const currentUser = urlParams.get("user");

if (!currentUser) {
  alert("ログインしていません。ログイン画面に戻ります。");
  window.location.href = "login.html"; // ログインしていなければリダイレクト
}

document.getElementById("user-label").textContent += `（${currentUser}）`;

const height = document.getElementById("height-input");
const weight = document.getElementById("weight-input");
const submitBtn = document.getElementById("button-submit");
const resetBtn = document.getElementById("button-reset");
const output = document.getElementById("bmi-output");
const message = document.getElementById("message");
const historyList = document.getElementById("bmi-history");

function isNumericInput(value) {
  return /^[0-9.]+$/.test(value);
}

function toHalfWidth(str) {
  return str.replace(/[０-９．。]/g, function (s) {
    if (s === '．' || s === '。') return '.';
    return String.fromCharCode(s.charCodeAt(0) - 65248);
  });
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/";
}

function getCookie(name) {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [k, v] = cookie.split('=');
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

function updateHistoryUI(history) {
  historyList.innerHTML = "";
  history.forEach(entry => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = `${entry.date} - BMI: ${entry.bmi}`;
    historyList.appendChild(li);
  });
}

function calcBmi() {
  const h = parseFloat(toHalfWidth(height.value.trim())) / 100;
  const w = parseFloat(toHalfWidth(weight.value.trim()));

  if (!isNumericInput(h) || !isNumericInput(w)) {
    output.textContent = "";
    message.innerHTML = '<span class="text-danger">※ 数値のみを入力してください（例: 170, 65.5）</span>';
    return;
  }

  const bmi = Math.round((w / (h * h)) * 10) / 10;
  output.textContent = bmi;

  let category = "";
  if (bmi < 18.5) category = "やせ型";
  else if (bmi < 25) category = "普通体重";
  else if (bmi < 30) category = "肥満（1度）";
  else if (bmi < 35) category = "肥満（2度）";
  else if (bmi < 40) category = "肥満（3度）";
  else category = "肥満（4度）";

  message.innerHTML = `<span class="text-success">あなたは「${category}」です。</span>`;

  // 履歴保存
  const historyKey = `bmi_history_${currentUser}`;
  const history = JSON.parse(getCookie(historyKey) || "[]");
  history.unshift({ date: new Date().toLocaleDateString(), bmi });
  if (history.length > 30) history.pop(); // 30件まで
  setCookie(historyKey, JSON.stringify(history), 30);
  updateHistoryUI(history);
}

function resetForm() {
  height.value = "";
  weight.value = "";
  output.textContent = "";
  message.textContent = "";
}

submitBtn.addEventListener("click", calcBmi);
resetBtn.addEventListener("click", resetForm);

// ページ読み込み時に履歴表示
(function init() {
  const history = JSON.parse(getCookie(`bmi_history_${currentUser}`) || "[]");
  updateHistoryUI(history);
})();