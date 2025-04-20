// ユーザー名の取得（URLのクエリパラメータから）
function getUsernameFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('user');
}

// Cookieを取得する関数
function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Cookieに保存する関数
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/`;
}

// BMIを計算する関数
function calculateBMI(height, weight) {
  if (height <= 0 || weight <= 0) return null;
  const bmi = weight / ((height / 100) ** 2);
  return Math.round(bmi * 10) / 10;
}

// BMI結果に応じた分類
function classifyBMI(bmi) {
  if (bmi < 18.5) return "低体重";
  if (bmi < 25) return "普通体重";
  if (bmi < 30) return "肥満（1度）";
  if (bmi < 35) return "肥満（2度）";
  if (bmi < 40) return "肥満（3度）";
  return "肥満（4度）";
}

// 履歴の表示
function displayHistory(username) {
  const historyKey = `bmi_history_${username}`;
  const historyData = getCookie(historyKey);
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';

  if (historyData) {
    const history = JSON.parse(historyData);
    history.forEach(entry => {
      const li = document.createElement('li');
      li.textContent = `${entry.date}: BMI ${entry.bmi}`;
      historyList.appendChild(li);
    });
  }
}

// イベントリスナー登録
document.getElementById('bmi-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const username = getUsernameFromQuery();
  if (!username) {
    alert("ユーザーが特定できません。ログインし直してください。");
    window.location.href = "index.html";
    return;
  }

  const height = parseFloat(document.getElementById('height').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const bmi = calculateBMI(height, weight);

  if (!bmi) {
    alert('正しい数値を入力してください。');
    return;
  }

  const category = classifyBMI(bmi);
  document.getElementById('result').textContent = `あなたのBMIは ${bmi}（${category}）です。`;

  const today = new Date();
  const entry = {
    date: `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`,
    bmi: bmi
  };

  const historyKey = `bmi_history_${username}`;
  let history = [];

  const existing = getCookie(historyKey);
  if (existing) {
    history = JSON.parse(existing);
  }

  history.unshift(entry); // 先頭に追加
  if (history.length > 30) {
    history = history.slice(0, 30); // 最大30件に制限
  }

  setCookie(historyKey, JSON.stringify(history), 30);
  displayHistory(username);
});

// 初期化処理
window.addEventListener('DOMContentLoaded', () => {
  const username = getUsernameFromQuery();
  if (!username) {
    alert("ユーザーが特定できません。ログインし直してください。");
    window.location.href = "index.html";
    return;
  }

  displayHistory(username);
});