const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const pauseBtn = document.getElementById("pauseBtn");
const homeScreen = document.getElementById("homeScreen");
const startBtn = document.getElementById("startBtn");

const coinText = document.getElementById("coinText");
const hiScoreText = document.getElementById("hiScoreText");
const buyFireRate = document.getElementById("buyFireRate");
const buySpeed = document.getElementById("buySpeed");
const resetBtn = document.getElementById("resetBtn");

// ゲームの基本サイズ設定
canvas.width = Math.min(window.innerWidth, 480);
canvas.height = window.innerHeight * 0.7;

let isPlaying = false;
let isPaused = false;
let score = 0;
let bullets = [];
let enemies = [];

// 背景の星屑データ初期化
let stars = [];
for (let i = 0; i < 40; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: 0.5 + Math.random() * 1.5
    });
}

// ストレージからバックアップデータを読み込み
let highScore = localStorage.getItem("shot_hi") ? parseInt(localStorage.getItem("shot_hi")) : 0;
let coins = localStorage.getItem("shot_coin") ? parseInt(localStorage.getItem("shot_coin")) : 0;
let fireLevel = localStorage.getItem("shot_lvl_fire") ? parseInt(localStorage.getItem("shot_lvl_fire")) : 1;
let speedLevel = localStorage.getItem("shot_lvl_speed") ? parseInt(localStorage.getItem("shot_lvl_speed")) : 1;

// プレイヤーオブジェクト（レベルに応じて性能変化）
const player = {
    x: canvas.width / 2,
    y: canvas.height - 40,
    size: 15,
    get speed() { return 4 + speedLevel * 1.5; },
    get fireInterval() { return Math.max(80, 200 - fireLevel * 25); }
};

// UI表示の更新処理
function updateUI() {
    coinText.textContent = `COIN: ${coins}`;
    hiScoreText.textContent = `HI-SCORE: ${highScore}`;
    buyFireRate.innerHTML = fireLevel >= 5 ? `連射Lv.MAX<br><span style="color:#888">MAX</span>` : `連射Lv.${fireLevel}<br><span style="color:#ffaa00">Cost: ${fireLevel * 50}</span>`;
    buySpeed.innerHTML = speedLevel >= 5 ? `移動Lv.MAX<br><span style="color:#888">MAX</span>` : `移動Lv.${speedLevel}<br><span style="color:#ffaa00">Cost: ${speedLevel * 40}</span>`;
}
updateUI();

// データをスマホのストレージにバックアップ
function saveData() {
    localStorage.setItem("shot_hi", highScore);
    localStorage.setItem("shot_coin", coins);
    localStorage.setItem("shot_lvl_fire", fireLevel);
    localStorage.setItem("shot_lvl_speed", speedLevel);
}

// スマホ用タッチ・スワイプ移動操作の管理
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
    if (!isPlaying || isPaused) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    if (!isPlaying || isPaused) return;
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    player.x += (touchX - touchStartX) * (player.speed * 0.2);
    player.y += (touchY - touchStartY) * (player.speed * 0.2);

    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

    touchStartX = touchX;
    touchStartY = touchY;
}, { passive: false });
// 一時停止ボタンの動作
pauseBtn.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "RESUME" : "PAUSE";
});

// ゲーム本編の開始処理
startBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    homeScreen.classList.add("hidden");
    pauseBtn.style.display = "block";
    
    score = 0;
    enemies = [];
    bullets = [];
    player.x = canvas.width / 2;
    player.y = canvas.height - 40;
    isPlaying = true;
    isPaused = false;
    
    resetShootTimer();
});

// ショップ機能：連射速度強化
buyFireRate.addEventListener("touchstart", (e) => {
    e.preventDefault();
    let cost = fireLevel * 50;
    if (coins >= cost && fireLevel < 5) {
        coins -= cost;
        fireLevel++;
        saveData();
        updateUI();
        if (isPlaying) resetShootTimer();
    }
});

// ショップ機能：移動速度強化
buySpeed.addEventListener("touchstart", (e) => {
    e.preventDefault();
    let cost = speedLevel * 40;
    if (coins >= cost && speedLevel < 5) {
        coins -= cost;
        speedLevel++;
        saveData();
        updateUI();
    }
});

// バックアップデータを全消去してリセット
resetBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (confirm("セーブデータを削除し、初期状態にリセットしますか？")) {
        localStorage.removeItem("shot_hi");
        localStorage.removeItem("shot_coin");
        localStorage.removeItem("shot_lvl_fire");
        localStorage.removeItem("shot_lvl_speed");
        location.reload();
    }
});

// 自動射撃タイマーの設定
let shootIntervalId;
function resetShootTimer() {
    clearInterval(shootIntervalId);
    shootIntervalId = setInterval(() => {
        if (!isPlaying || isPaused) return;
        bullets.push({ x: player.x, y: player.y - 10, size: 4 });
    }, player.fireInterval);
}

// 敵キャラクターの定期生成
setInterval(() => {
    if (!isPlaying || isPaused) return;
    enemies.push({ x: Math.random() * (canvas.width - 30) + 15, y: -20, size: 12, speed: 2 + Math.random() * 2 });
}, 600);

// ゲームの定期更新＆物理計算ループ
function update() {
    // 背景の星スクロール
    if (!isPaused) {
        stars.forEach((s) => {
            s.y += s.speed;
            if (s.y > canvas.height) {
                s.y = 0;
                s.x = Math.random() * canvas.width;
            }
        });
    }

    // ゲームプレイ中の計算
    if (isPlaying && !isPaused) {
        // 弾の移動
        bullets.forEach((b, index) => {
            b.y -= 7;
            if (b.y < 0) bullets.splice(index, 1);
        });

        // 敵の移動と当たり判定
        enemies.forEach((e, eIndex) => {
            e.y += e.speed;

            // 弾と敵のヒット判定
            bullets.forEach((b, bIndex) => {
                const dist = Math.hypot(b.x - e.x, b.y - e.y);
                if (dist < b.size + e.size) {
                    enemies.splice(eIndex, 1);
                    bullets.splice(bIndex, 1);
                    score += 10;
                }
            });

            // 自機と敵の衝突判定（ゲームオーバー）
            const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
            if (distToPlayer < player.size + e.size) {
                isPlaying = false; 
                pauseBtn.style.display = "none";
                
                coins += score; 
                let isNewRecord = false;
                if (score > highScore) {
                    highScore = score;
                    isNewRecord = true;
                }
                saveData();
                updateUI();

                alert(`ゲームオーバー！\nスコア: ${score}\n${score} コイン獲得！` + (isNewRecord ? "\n🎉ハイスコア更新！🎉" : ""));
                homeScreen.classList.remove("hidden");
            }

            if (e.y > canvas.height) enemies.splice(eIndex, 1);
        });
    }

    // --- 画面への描画処理 ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 星の描画
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });

    if (isPlaying) {
        // 自機（プレイヤー）
        ctx.fillStyle = "#00ffff";
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - player.size);
        ctx.lineTo(player.x - player.size, player.y + player.size);
        ctx.lineTo(player.x + player.size, player.y + player.size);
        ctx.fill();

        // 弾
        ctx.fillStyle = "#ffff00";
        bullets.forEach((b) => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 敵
        ctx.fillStyle = "#ff3333";
        enemies.forEach((e) => {
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // スコア
        ctx.fillStyle = "#fff";
        ctx.font = "18px Arial";
        ctx.fillText("SCORE: " + score, 20, 35);
    }

    // パウズ中の半透明オーバーレイ
    if (isPaused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "left";
    }

    requestAnimationFrame(update);
}

// ループの開始
update();
