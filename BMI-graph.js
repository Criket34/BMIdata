// Firebase構成
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  projectId: "bmi-app-a99f3",
  storageBucket: "bmi-app-a99f3.appspot.com",
  messagingSenderId: "168322055498",
  appId: "1:168322055498:web:YOUR_APP_ID_HERE",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// 開発者向けログ：ファイル読み込み確認
console.log("BMI-graph.js 読み込み成功");

// ユーザー認証確認
auth.onAuthStateChanged(user => {
  if (user) {
    const userId = user.uid;
    console.log("ログイン中のユーザーUID:", userId);

    const dbRef = database.ref(`users/${userId}/history`);
    dbRef.once("value").then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        alert("データが存在しません。");
        return;
      }

      const dates = [];
      const bmiValues = [];
      const weights = [];
      const heights = [];

      Object.values(data).forEach(entry => {
        dates.push(entry.date || "日付なし");
        bmiValues.push(entry.bmi);
        weights.push(entry.weight);
        heights.push(entry.height);
      });

      const ctx = document.getElementById('bmiChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            label: 'BMI値の推移',
            data: bmiValues,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                afterLabel: function (context) {
                  const index = context.dataIndex;
                  return `体重: ${weights[index]}kg, 身長: ${heights[index]}cm`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'BMI'
              }
            },
            x: {
              title: {
                display: true,
                text: '日付'
              }
            }
          }
        }
      });

    }).catch(error => {
      console.error("データ取得エラー:", error);
      alert("データの取得に失敗しました。");
    });

  } else {
    alert("ログインしていません。ログインページに戻ります。");
    console.log("ユーザー未ログイン");
    window.location.href = "index.html"; // ログインページへリダイレクト
  }
});