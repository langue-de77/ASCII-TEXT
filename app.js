const input = document.getElementById("input");
const output = document.getElementById("output");
const modeSelect = document.querySelectorAll("input[name='mode']");
const backgroundChar = document.getElementById("background_char");
const foregroundChar = document.getElementById("foreground_char");

const button = document.getElementById("convert-btn");
button.addEventListener("click", () => {
  const newChars = [backgroundChar.value, foregroundChar.value];
  if (newChars[0] && newChars[1]) setChars(newChars);
  updateOutput();
});

async function updateOutput() {
  const asciiText = await textToAscii(input.value);
  const mode = document.querySelector("input[name='mode']:checked").value;
  output.value = generateOutput(asciiText, mode);
}

let usedChars = ["0", "1"];
const cache = {};

// 使用する文字を設定する（例： ['■', '□'] など）
// 変更時はキャッシュをクリアして再読み込みされるようにする
function setChars(newChars) {
  usedChars = newChars;
  Object.keys(cache).forEach((key) => delete cache[key]);
}

// 指定した文字（char）に対応する .at ファイルを fetch で取得し，
// キャッシュに保存して返す
// 同じ文字は2回目以降キャッシュから返されるため，通信が発生しない
async function loadData(char) {
  if (!(char in cache)) {
    const response = await fetch(`./data/${char}.at`);
    const content = await response.text();
    cache[char] = content.split("\n").map((line) =>
      line
        .trim()
        // ファイル内の '0','1' を usedChars の文字に置換
        .replace(/0/g, usedChars[0])
        .replace(/1/g, usedChars[1])
        .split(" "),
    );
  }
  return cache[char];
}

// 入力テキストをASCIIテキストの2次元配列に変換する
// result[行][列] に各文字のASCIIテキストデータが入る
async function textToAscii(text) {
  const lines = text.split("\n");
  const maxLength = Math.max(...lines.map((line) => line.length));

  // 全セルを null で初期化した2次元配列を作成
  const result = lines.map(() => Array.from({ length: maxLength }, () => null));

  // まず全セルをスペースで埋める
  for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < maxLength; j++) {
      result[i][j] = await loadData("space");
    }
  }

  // 各文字のASCIIテキストデータを対応するセルに上書き
  for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < lines[i].length; j++) {
      // スペースは 'space' というファイル名で管理
      const char = lines[i][j] === " " ? "space" : lines[i][j];
      result[i][j] = await loadData(char);
    }
  }

  return result;
}

// ASCIIテキストの2次元配列を textarea に渡せる文字列に変換する
// mode = 'h'（横書き）または 'v'（縦書き）
function generateOutput(asciiText, mode = "h") {
  let text = [];

  if (mode === "h") {
    // 横書き：行ごとに各文字を横に並べる
    for (let i = 0; i < asciiText.length; i++) {
      text.push([]);
      for (let j = 0; j < asciiText[i].length; j++) {
        const char = asciiText[i][j];
        for (let k = 0; k < char.length; k++) {
          // 各行の先頭文字のとき，出力行を初期化
          if (j === 0) text[i].push("");
          text[i][k] += char[k][0];
        }
      }
    }
  } else if (mode === "v") {
    // 縦書き：下の行から順に，列ごとに文字を縦に並べる
    for (let i = asciiText.length - 1; i >= 0; i--) {
      for (let j = 0; j < asciiText[i].length; j++) {
        // 最初のループ（最下行）のとき，列ごとの配列を初期化
        if (i === asciiText.length - 1) text.push([]);
        const char = asciiText[i][j];
        for (let k = 0; k < char.length; k++) {
          if (i === asciiText.length - 1) text[j].push("");
          text[j][k] += char[k][0];
        }
      }
    }
  }

  // 各行を改行で結合して1つの文字列にして返す
  return text.map((line) => line.join("\n")).join("\n");
}
