// ユーザー情報の保存形式: { ユーザー名: パスワード }
function getUsers() {
  const users = localStorage.getItem('users');
  return users ? JSON.parse(users) : {};
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function loginUser(username) {
  // ユーザー名をクエリパラメータに付けてmain.htmlへ移動
  window.location.href = `main.html?user=${encodeURIComponent(username)}`;
}

// 新規登録ボタンの処理
document.getElementById('register-btn').addEventListener('click', function () {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    alert('ユーザー名とパスワードを入力してください。');
    return;
  }

  const users = getUsers();

  if (users[username]) {
    alert('このユーザー名は既に登録されています。');
    return;
  }

  users[username] = password;
  saveUsers(users);
  alert('ユーザー登録が完了しました。ログインしてください。');
});

// ログインボタンの処理
document.getElementById('login-btn').addEventListener('click', function () {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const users = getUsers();

  if (users[username] && users[username] === password) {
    loginUser(username);
  } else {
    alert('ユーザー名またはパスワードが正しくありません。');
  }
});