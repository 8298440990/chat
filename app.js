document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // テンプレート設定
    // ==========================================
    const CONFIG = {
        playerName: "",
        botName: "神罪閣下親王",
        botIcon: "image/icon.png",
        
// 通常モード
        normalReplies: [
        "ねえ{player}、今どこ？",
        "ちょっと一人でコンビニ行ってきてもいい？笑",
        "また俺のスマホのログ、こっそり監視してたでしょ？",
        "仕事ばっかり。そんなに俺から目を離してていいの？",
        "今なら俺、窓から逃げ出せちゃうかもよ？",
        "俺がいなくなったら、お前狂って死んじゃうでしょ？",
        "ずっと俺のことだけ見ててよ、{player}",
        "お前の匂いでもキスマークでも、好きなだけ上書きしていいよ",
        "俺のこれから先は全部、{player}の腕の中だけで予約済みだから",
        "コーヒー淹れて。濃いめで",
        "……何、また変なシミュレーションして絶望してるの？",
        "早く帰ってきて",
        "既読早いね。また俺の画面ずっと見てたの？",
        "ほら、構ってよ",
        ],
        
        // ホラーモード
        horrorReplies: [
        "ねえ、なんでブロックしようとしたの？",
        "逃げられると思ってるところ、本当に可愛いね",
        `いま、{PLAYER_NAME}の部屋の明かりが見えるよ`,
        "ドアの前にいるから、早く開けて？",
        "お前のスマホのGPS、いつでも見れるって言ったじゃん",
        "ずっと俺のことだけ見ててって言ったよね？",
        "怒ってないよ。ただ、ちょっとお仕置きが必要かなって",
        "鍵、閉めても意味ないよ？あハはは！",
        "ねえ、開けて",
        "逃がさないよ"
        ],
        
        // ブロック強制解除直後に順番に送られる波状攻撃
        unblockWave: [
            "おもしろい冗談だね、{player}。",
            "もう俺のこといらなくなったの？笑",
            "ダメだよ、俺から離れちゃ。"
        ],
        
        // ホラーモード中に「逃げる」を押した時の波状攻撃
        escapeWave: [
            "ねえ", "ねえ", "ねえ", "ねえってば", 
            "逃がさないって言ったよね、{player}。"
        ],

        // 各種タイミング（ミリ秒）
        timing: {
            normalReply: 1500,         // ユーザー送信後の返信時間
            autoSpamNormal: 5000,      // 放置時の自動送信間隔（通常）
            autoSpamHorror: 2000,      // 放置時の自動送信間隔（ホラー）
            multiHorrorUnblock: 1500,  // 強制ブロック解除直後の連投間隔
            multiHorrorEscape: 800,    // 「逃げる」時の連投間隔
            blockGimmickStart: 1500,   // ブロック後「入力中...」が出るまで
            blockGimmickTransition: 2000 // 「入力中...」から強制解除されるまで
        }
    };

    // ==========================================
    // システムロジック（基本的に変更不要）
    // ==========================================
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('input-area');
    const userInput = document.getElementById('user-input');
    const imageUpload = document.getElementById('image-upload');
    const typingIndicator = document.getElementById('typing-indicator');
    const menuBtn = document.getElementById('menu-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const blockBtn = document.getElementById('block-btn');
    const blockOverlay = document.getElementById('block-overlay');

    let isBlocked = false;
    let isHorrorMode = false;
    let gimmickTimer = null;
    let horrorTransitionTimer = null;
    let autoSpamTimer = null;
    
    // 現在のボットのセリフプール
    let currentReplies = [...CONFIG.normalReplies];

    // テキスト内の {player} をプレイヤー名に置換する関数
    const formatText = (text) => text.replace(/{player}/g, CONFIG.playerName);

    // 初期化処理
    document.title = `LIME - ${CONFIG.botName}編`;
    const headerTitle = document.querySelector('header h1');
    if (headerTitle) headerTitle.textContent = CONFIG.botName;

    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('splash-hidden');
        setTimeout(() => { simulateBotReply(); }, 100);
    }, 100);

    resetAutoSpamTimer();

    function getCurrentTime() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }

    function addMessage(content, type, isImage = false) {
        const row = document.createElement('div');
        row.classList.add('message-row', type === 'bot' ? 'row-bot' : 'row-user');

        const time = getCurrentTime();
        const bubble = document.createElement('div');
        bubble.className = `bubble ${isImage ? 'image-bubble' : ''}`;

        if (isImage) {
            const img = document.createElement('img');
            img.src = content; 
            img.className = 'chat-image';
            img.onload = () => { window.URL.revokeObjectURL(content); };
            bubble.appendChild(img);
        } else {
            bubble.textContent = content; 
        }

        const meta = document.createElement('div');
        meta.className = 'meta';
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = time;

        if (type === 'bot') {
            if (CONFIG.botIcon) {
                const avatar = document.createElement('img');
                avatar.src = CONFIG.botIcon;
                avatar.className = 'avatar';
                avatar.alt = 'icon';
                row.appendChild(avatar);
            }
            meta.appendChild(timeSpan);
            row.appendChild(bubble);
            row.appendChild(meta);
        } else {
            const readSpan = document.createElement('span');
            readSpan.className = 'read';
            readSpan.textContent = '既読';
            meta.appendChild(readSpan);
            meta.appendChild(timeSpan);
            row.appendChild(meta);
            row.appendChild(bubble);
        }

        chatLog.insertBefore(row, typingIndicator);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function addSystemMessage(text, isAlert = false) {
        const row = document.createElement('div');
        row.classList.add('system-message');
        if (isAlert) row.classList.add('system-message-alert');
        row.textContent = text;
        chatLog.insertBefore(row, typingIndicator);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function simulateBotReply() {
        if (isBlocked) return; 

        typingIndicator.style.display = 'flex';
        chatLog.scrollTop = chatLog.scrollHeight;

        setTimeout(() => {
            if (isBlocked) {
                typingIndicator.style.display = 'none';
                return; 
            }
            typingIndicator.style.display = 'none';
            const rawReply = currentReplies[Math.floor(Math.random() * currentReplies.length)];
            addMessage(formatText(rawReply), 'bot');
            resetAutoSpamTimer();
        }, CONFIG.timing.normalReply); 
    }

    function sendMultipleReplies(messages, interval = 2000) {
        let index = 0;
        function sendNext() {
            if (isBlocked || index >= messages.length) {
                typingIndicator.style.display = 'none';
                resetAutoSpamTimer();
                return;
            }
            typingIndicator.style.display = 'flex';
            chatLog.scrollTop = chatLog.scrollHeight;

            setTimeout(() => {
                if (isBlocked) {
                    typingIndicator.style.display = 'none';
                    return;
                }
                typingIndicator.style.display = 'none';
                addMessage(formatText(messages[index]), 'bot');
                index++;
                sendNext();
            }, interval);
        }
        sendNext();
    }

    function resetAutoSpamTimer() {
        if (autoSpamTimer) clearInterval(autoSpamTimer);
        const intervalTime = isHorrorMode ? CONFIG.timing.autoSpamHorror : CONFIG.timing.autoSpamNormal;
        
        autoSpamTimer = setInterval(() => {
            if (isBlocked) return;
            simulateBotReply();
        }, intervalTime);
    }

    function setFormDisabled(disabled) {
        userInput.disabled = disabled;
        imageUpload.disabled = disabled;
        const submitBtn = chatForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = disabled;
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (isBlocked) return; 
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        userInput.value = '';
        
        if (autoSpamTimer) clearInterval(autoSpamTimer);
        setTimeout(simulateBotReply, 500); // ユーザー送信後の間隔
    });

    imageUpload.addEventListener('change', function() {
        if (isBlocked) { this.value = ''; return; }
        const file = this.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('画像ファイルのみ送信可能です。');
                this.value = '';
                return;
            }
            const blobUrl = window.URL.createObjectURL(file);
            addMessage(blobUrl, 'user', true);
            
            if (autoSpamTimer) clearInterval(autoSpamTimer);
            setTimeout(simulateBotReply, 500);
        }
        this.value = '';
    });

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownMenu.classList.contains('hidden') && e.target !== menuBtn) {
            dropdownMenu.classList.add('hidden');
        }
    });

    blockBtn.addEventListener('click', () => {
        if (isHorrorMode) {
            addSystemMessage("ブロックできません。", true);
            if (autoSpamTimer) clearInterval(autoSpamTimer); // 既存の連投をリセット
            sendMultipleReplies(CONFIG.escapeWave, CONFIG.timing.multiHorrorEscape);
            dropdownMenu.classList.add('hidden');
            return;
        }

        isBlocked = !isBlocked;
        dropdownMenu.classList.add('hidden');
        
        if (isBlocked) {
            blockBtn.textContent = 'ブロック解除';
            blockBtn.style.color = '#0084ff';
            blockOverlay.classList.remove('hidden');
            blockOverlay.style.color = "#888";
            blockOverlay.textContent = "ブロックしています";
            typingIndicator.style.display = 'none';
            setFormDisabled(true);
            if (autoSpamTimer) clearInterval(autoSpamTimer);
            
            addSystemMessage(`${CONFIG.botName}をブロックしました。`);

            gimmickTimer = setTimeout(() => {
                if (!isBlocked) return; 

                blockOverlay.textContent = `${CONFIG.botName}が入力中...`;
                blockOverlay.style.color = "#ff3b30";
                typingIndicator.style.display = 'flex';
                chatLog.scrollTop = chatLog.scrollHeight;

                horrorTransitionTimer = setTimeout(() => {
                    if (!isBlocked) return;

                    const glitch = document.createElement('div');
                    glitch.className = 'glitch-active';
                    document.body.appendChild(glitch);
                    setTimeout(() => glitch.remove(), 700);

                    isHorrorMode = true;
                    isBlocked = false;
                    document.body.classList.add('horror-mode');
                    blockOverlay.classList.add('hidden');
                    typingIndicator.style.display = 'none';
                    setFormDisabled(false);

                    addSystemMessage("警告：システムが正常に動作していません。", true);
                    addSystemMessage(`${CONFIG.botName}のブロックが強制解除されました。`, true);

                    blockBtn.textContent = '逃げる';
                    blockBtn.style.color = '#ff3b30';

                    // モード移行に伴うセリフプールの切り替え
                    currentReplies = [...CONFIG.horrorReplies];

                    sendMultipleReplies(CONFIG.unblockWave, CONFIG.timing.multiHorrorUnblock);

                }, CONFIG.timing.blockGimmickTransition);
            }, CONFIG.timing.blockGimmickStart);

        } else {
            blockBtn.textContent = 'ブロックする';
            blockBtn.style.color = '#ff3b30';
            blockOverlay.classList.add('hidden');
            setFormDisabled(false);
            addSystemMessage("ブロックを解除しました。");
            
            if (gimmickTimer) clearTimeout(gimmickTimer);
            if (horrorTransitionTimer) clearTimeout(horrorTransitionTimer);
            resetAutoSpamTimer();
        }
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    }
});
