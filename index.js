document.getElementById('register-btn').addEventListener('click', function () {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert('メールアドレスとパスワードを入力してください。');
    return;
  }

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert('ユーザー登録が完了しました。ログインしてください。');
    })
    .catch((error) => {
      alert('登録エラー: ' + error.message);
    });
});

document.getElementById('login-btn').addEventListener('click', function () {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      window.location.href = `main.html?user=${encodeURIComponent(user.uid)}`;
    })
    .catch((error) => {
      alert('ログインエラー: ' + error.message);
    });
});