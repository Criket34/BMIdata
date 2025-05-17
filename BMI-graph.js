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

// ユーザーIDの取得（main.htmlからクエリで受け取る）
const params = new URLSearchParams(window.location.search);
const userId = params.get("user");

if (!userId) {
  alert("ユーザー情報が見つかりません。");
}

// データ取得
const dbRef = firebase.database().ref(`users/${userId}/history`);
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

  // データ整形
  Object.values(data).forEach(entry => {
    dates.push(entry.date || "日付なし");
    bmiValues.push(entry.bmi);
    weights.push(entry.weight);
    heights.push(entry.height);
  });

  // グラフ描画
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
});