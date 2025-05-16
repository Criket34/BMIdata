// Firebase v10 モジュール方式
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase構成
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  projectId: "bmi-app-a99f3",
  storageBucket: "bmi-app-a99f3.appspot.com",
  messagingSenderId: "168322055498",
  appId: "1:168322055498:web:YOUR_APP_ID_HERE" // ← 適宜更新
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 新規登録
document.getElementById("register-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("メールアドレスとパスワードを入力してください。");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("ユーザー登録が完了しました。ログインしてください。");
    })
    .catch((error) => {
      alert("登録エラー: " + error.message);
    });
});

// ログイン
document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("メールアドレスとパスワードを入力してください。");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;
      window.location.href = `main.html?uid=${encodeURIComponent(uid)}`;
    })
    .catch((error) => {
      alert("ログインエラー: " + error.message);
    });
});

// パスワード再設定
document.getElementById("reset-password-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("パスワード再設定用のメールアドレスを入力してください。");
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert("パスワード再設定メールを送信しました。メールをご確認ください。");
    })
    .catch((error) => {
      alert("再設定エラー: " + error.message);
    });
});