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

document.getElementById("register-btn").addEventListener("click", function () {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (!user || !pass) {
    document.getElementById("message").textContent = "ユーザー名とパスワードを入力してください。";
    return;
  }

  if (getCookie("user_" + user)) {
    document.getElementById("message").textContent = "このユーザー名は既に登録されています。";
    return;
  }

  setCookie("user_" + user, pass, 30);
  document.getElementById("message").textContent = "新規登録が完了しました。";
});

document.getElementById("login-btn").addEventListener("click", function () {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();
  const storedPass = getCookie("user_" + user);

  if (storedPass && storedPass === pass) {
    window.location.href = "main.html?user=" + encodeURIComponent(user);
  } else {
    document.getElementById("message").textContent = "ユーザー名またはパスワードが間違っています。";
  }
});