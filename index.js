function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// ユーザー登録
document.getElementById('registerBtn').addEventListener('click', () => {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  if (!user || !pass) {
    alert('ユーザー名とパスワードを入力してください');
    return;
  }

  const existingUsers = JSON.parse(getCookie('users') || '{}');
  if (existingUsers[user]) {
    alert('このユーザー名は既に使用されています');
    return;
  }

  existingUsers[user] = pass;
  setCookie('users', JSON.stringify(existingUsers), 30);
  alert('ユーザー登録が完了しました。ログインしてください。');
});

// ログイン処理
document.getElementById('loginBtn').addEventListener('click', () => {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  const existingUsers = JSON.parse(getCookie('users') || '{}');

  if (existingUsers[user] && existingUsers[user] === pass) {
    setCookie('loggedInUser', user, 1); // ログイン中ユーザーを保存
    window.location.href = 'main.html'; // ✅ ログイン成功 → main.htmlへ
  } else {
    alert('ユーザー名またはパスワードが正しくありません');
  }
});