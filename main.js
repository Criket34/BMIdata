// ＷＥＢに入力された情報を読み込む（取得する）
var height = document.getElementById('height-input'); // 身長
var weight = document.getElementById('weight-input'); // 体重

var button = document.getElementById('button-submit'); // 計測ボタン
var resetButton = document.getElementById('button-reset'); // リセットボタン

var output = document.getElementById('bmi-output'); // BMI表示場所
var message = document.getElementById('message'); // エラーメッセージや分類表示

// 半角数字・小数点チェック用（全角数字は変換後に処理）
function isNumericInput(value) {
  return /^[0-9.]+$/.test(value);
}

// 全角数字で入力された数字を半角数字に変換する
// ここでBMI計算の要素として扱えるように変換
function toHalfWidth(str) {
  return str.replace(/[０-９．。]/g, function (s) {
    if (s === '．' || s === '。') { // 全角の句点（．）と（。）を半角ピリオド（.）に変換
      return '.';
    }
    return String.fromCharCode(s.charCodeAt(0) - 65248); // 数字と句点（．）を半角（0～9と.）に変換
  });
}

// BMI計算関数
var calcBmi = function () {
  // 全角数字を半角に変換
  // 上で変換されている物を計算式の中に読み込む
  var h_value = toHalfWidth(height.value.trim());
  var w_value = toHalfWidth(weight.value.trim());

  // 入力が数値でない場合はエラー表示
  // 入力欄の下に表示される
  if (!isNumericInput(h_value) || !isNumericInput(w_value)) {
    output.innerHTML = ''; // 計算結果エリアをクリア
    message.innerHTML = '<span class="text-danger">※ 数値のみを入力してください（例: 170, 65.5）</span>';
    return;
  }

  // 身長（ｃｍ）をｍに変換
  var h = parseFloat(h_value) / 100;
  var w = parseFloat(w_value);

  // BMI計算と四捨五入
  var bmi = w / (h * h);
  bmi = Math.round(bmi * 10) / 10;

  // 結果表示
  output.innerHTML = bmi;

  // BMI分類の分類
  //参考：日本肥満学会の判定基準
  let category = '';
  if (bmi < 18.5) {
    category = 'やせ型';
  } else if (bmi < 25) {
    category = '普通体重';
  } else if (bmi < 30) {
    category = '肥満（1度）';
  } else if (bmi < 35) {
    category = '肥満（2度）';
  } else if (bmi < 40) {
    category = '肥満（3度）';
  } else {
    category = '肥満（4度）';
  }

  message.innerHTML = '<span class="text-success">あなたは「' + category + '」です。</span>';
}

// リセット関数
var resetForm = function () {
  height.value = '';
  weight.value = '';
  output.innerHTML = ''; // 計算結果を消す
  message.innerHTML = ''; // メッセージを消す
}

// イベント登録
button.addEventListener('click', calcBmi);
resetButton.addEventListener('click', resetForm);

// ▼ スマホ用テンキー機能 ▼

// 入力対象を追跡
var focusedInput = null;
height.addEventListener('focus', function () {
  focusedInput = height;
});
weight.addEventListener('focus', function () {
  focusedInput = weight;
});

// テンキーのボタン動作
var keypadButtons = document.querySelectorAll('.keypad-btn');
keypadButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    if (!focusedInput) return;

    const val = btn.textContent;

    if (val === '⌫') {
      focusedInput.value = focusedInput.value.slice(0, -1); // バックスペース動作
    } else {
      focusedInput.value += val; // ボタンを押すと入力欄に値が追加
    }
  });
})