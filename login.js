// Cookie操作関数
function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  }
  
  function getCookie(name) {
    const match = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return match ? decodeURIComponent(match[1]) : null;
  }
  
  // ユーザー登録
  document.getElementById('register-btn').addEventListener('click', function () {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
  
    if (!username || !password) {
      document.getElementById('message').textContent = 'ユーザー名とパスワードを入力してください。';
      return;
    }
  
    if (getCookie('user_' + username)) {
      document.getElementById('message').textContent = 'このユーザー名は既に存在します。';
      return;
    }
  
    setCookie('user_' + username, password, 30);
    setCookie('currentUser', username, 7);
  
    alert('登録が完了しました！ログインします。');
    window.location.href = 'main.html';
  });
  
  // ログイン
  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
  
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
  
    const storedPassword = getCookie('user_' + username);
  
    if (!storedPassword) {
      document.getElementById('message').textContent = 'ユーザーが見つかりません。先に登録してください。';
      return;
    }
  
    if (storedPassword === password) {
      setCookie('currentUser', username, 7);
      window.location.href = 'main.html';
    } else {
      document.getElementById('message').textContent = 'パスワードが正しくありません。';
    }
  });