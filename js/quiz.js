// js/quiz.js (完全・最終安定版 - 全ての不具合修正を統合)

// クイズ画面のHTMLテンプレート
const QUIZ_HTML = `
<section id="quiz-view" class="view">
    <div id="quiz-header">
        <h2 id="quiz-title">クイズモード</h2>
        <div id="grading-mode-select">
            <label>採点モード:</label>
            <input type="radio" id="mode-immediate" name="gradingMode" value="immediate" checked> 
            <label for="mode-immediate">都度採点</label>
            <input type="radio" id="mode-final" name="gradingMode" value="final"> 
            <label for="mode-final">最終採点</label>
        </div>
        
        <p id="question-nav">問題: <span id="current-q-index">0</span> / <span id="total-q-count">0</span></p>
    </div>
    
    <div id="timer-container">
        <label for="time-limit-select">制限時間 (合計秒):</label>
        <select id="time-limit-select">
            <option value="0">制限なし</option>
            <option value="180">3分 (180秒)</option>
            <option value="600">10分 (600秒)</option>
            <option value="1800" selected>30分 (1800秒)</option>
            <option value="3600">60分 (3600秒)</option>
        </select>
        <input type="number" id="custom-time-limit" placeholder="カスタム秒数 (1〜9000)" min="1" max="9000">
        
        <div id="time-display" class="hidden">
            <div id="time-bar-track">
                <div id="time-bar"></div>
            </div>
            <span id="time-display-text">0分00秒</span>
        </div>
    </div>
    
    <div id="question-count-container">
        <label for="question-count-input">出題数:</label>
        <input type="number" id="question-count-input" placeholder="全問 (最大XX問)" min="1" value="">
    </div>
    
    <div id="question-pre-start">
        <button id="start-quiz-set-btn">クイズ開始</button>
        <p>タイマーと問題数の設定を確認し、「クイズ開始」を押してください。タイマーは**この問題セットの全て**を通してカウントされます。</p>
    </div>
    
    <div id="quiz-container" class="hidden">
        <h3 id="question-id"></h3>
        <p class="subject-tag"></p>
        <div id="question-text-area">
            </div>
        
        <form id="choices-container">
            </form>

        <div id="result-area" class="hidden">
            <p id="result-message"></p>
            <p id="correct-answer"></p>
            <div id="explanation-area">
                <h4>全選択肢の解説</h4>
                <div id="full-explanation-list">
                    </div>
            </div>
        </div>

        <div class="controls">
            <button id="check-answer-btn">解答を確認</button>
            <button id="next-question-btn" class="hidden">次の問題へ</button>
            <button id="end-quiz-btn" class="hidden">終了して結果を見る</button>
        </div>
    </div>
    
    <div id="results-view" class="hidden">
        <h3>採点結果</h3>
        <p>正解数: <span id="final-score">0</span> / <span id="final-total">0</span></p>
        
        <div id="detailed-results">
            <h4>詳細な結果と解説 (不正解/未解答)</h4>
            </div>
        
        <button onclick="router.showView('home')">ホームへ戻る</button>
    </div>
</section>
`;

// グローバル変数
let currentQuestionsSet = [];
let currentQuestionIndex = 0;
let gradingMode = 'immediate'; // 'immediate' or 'final'
let userAnswers = [];
let score = 0;

// タイマー関連の新しい変数
let initialTimeLimit = 1800; // クイズ開始時に設定される合計時間
let timeRemaining = 0;      // 現在の残り時間 (グローバルで状態を保持)
let timerInterval = null;
let quizStarted = false; // クイズがスタートボタンで開始されたかを示すフラグ


/**
 * 合計秒数を「M分SS秒」形式に変換するヘルパー関数
 * @param {number} totalSeconds
 * @returns {string} フォーマットされた時間文字列
 */
function formatTime(totalSeconds) {
    if (totalSeconds <= 0) {
        return "0分00秒";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    // 秒数を2桁でゼロ埋めする
    const paddedSeconds = String(seconds).padStart(2, '0');
    return `${minutes}分${paddedSeconds}秒`;
}


/**
 * DOM要素を一括で取得するヘルパー関数
 * @returns {object}
 */
function initQuizDom() {
    return {
        quizView: document.getElementById('quiz-view'),
        quizTitle: document.getElementById('quiz-title'),
        quizContainer: document.getElementById('quiz-container'),
        resultsView: document.getElementById('results-view'),
        qId: document.getElementById('question-id'),
        subjectTag: document.querySelector('#quiz-container .subject-tag'),
        qTextArea: document.getElementById('question-text-area'),
        choicesContainer: document.getElementById('choices-container'),
        currentQIndex: document.getElementById('current-q-index'),
        totalQCount: document.getElementById('total-q-count'),
        resultArea: document.getElementById('result-area'),
        resultMsg: document.getElementById('result-message'),
        correctAns: document.getElementById('correct-answer'),
        fullExplanationList: document.getElementById('full-explanation-list'), 
        checkBtn: document.getElementById('check-answer-btn'),
        nextBtn: document.getElementById('next-question-btn'),
        endBtn: document.getElementById('end-quiz-btn'),
        
        // タイマー関連のDOM要素
        timeLimitSelect: document.getElementById('time-limit-select'),
        customTimeLimitInput: document.getElementById('custom-time-limit'),
        timeDisplay: document.getElementById('time-display'),
        timeBar: document.getElementById('time-bar'), // バー自体
        timeDisplayText: document.getElementById('time-display-text'), 
        
        // 問題開始ボタン関連
        questionPreStart: document.getElementById('question-pre-start'),
        startQuizSetBtn: document.getElementById('start-quiz-set-btn'),

        // 問題数入力要素
        questionCountInput: document.getElementById('question-count-input'),

        // 最終結果関連
        finalScore: document.getElementById('final-score'),
        finalTotal: document.getElementById('final-total'),
        detailedResults: document.getElementById('detailed-results')
    };
}


/**
 * 配列をシャッフルする (Fisher-Yates)
 * @param {Array} array
 * @returns {Array} シャッフルされた配列
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


/**
 * クイズ開始処理 (初回のみ)
 * @param {string} mode '科目A', '科目B', 'ALL', 'RANDOM', 'R7'
 */
function startQuiz(mode) {
    if (typeof QUESTIONS === 'undefined') return;

    const dom = initQuizDom();
    
    let fullQuestionPool = [];

    // 問題セットの準備 (R6/R7フィルタリングロジック)
    if (mode === 'ALL') {
        fullQuestionPool = QUESTIONS;
        dom.quizTitle.textContent = "全科目クイズモード";
    } else if (mode === 'RANDOM') {
        // ランダムモード: 全問題をシャッフルした配列を生成
        fullQuestionPool = shuffleArray([...QUESTIONS]); 
        dom.quizTitle.textContent = "ランダムクイズモード";
    } else if (mode === 'R7') { 
        // 令和7年問題に限定 (IDが 'R7_' で始まる)
        fullQuestionPool = QUESTIONS.filter(q => q.id && q.id.startsWith('R7_'));
        dom.quizTitle.textContent = "令和7年 公開問題モード"; 
    } else if (mode === '科目A' || mode === '科目B') { 
        // 科目AまたはB かつ 令和6年問題に限定 (IDが 'R7_' で始まらない)
        fullQuestionPool = QUESTIONS.filter(q => q.subject === mode && (!q.id || !q.id.startsWith('R7_')));
        dom.quizTitle.textContent = `${mode} (令和6年) クイズモード`; 
    } else {
        // デフォルト/その他の科目名
        fullQuestionPool = QUESTIONS.filter(q => q.subject === mode);
        dom.quizTitle.textContent = `${mode} クイズモード`; 
    }
    
    // 問題数が0ならエラー
    if (fullQuestionPool.length === 0) {
        alert("選択されたモードの問題が見つかりませんでした。");
        // routerオブジェクトが存在することを前提とする
        if (typeof router !== 'undefined') router.showView('home');
        return;
    }
    
    // currentQuestionsSet は、ここではまだ fullQuestionPool を参照する
    currentQuestionsSet = fullQuestionPool; 

    // 問題数入力の最大値を設定し、デフォルト値をセット
    const maxQuestions = currentQuestionsSet.length;
    if (dom.questionCountInput) {
        dom.questionCountInput.placeholder = `全問 (最大${maxQuestions}問)`;
        dom.questionCountInput.max = maxQuestions;
        
        // 問題数設定を許可するモードを定義 (ALL, RANDOM, R7)
        const allowCountSetting = (mode === 'ALL' || mode === 'RANDOM' || mode === 'R7');
        
        // デフォルト値を設定 (設定可能なら20問か全問、不可なら全問)
        const defaultCount = allowCountSetting ? Math.min(20, maxQuestions) : maxQuestions;
        dom.questionCountInput.value = defaultCount;
        
        // 入力欄の有効/無効を制御
        dom.questionCountInput.disabled = !allowCountSetting;
    }
    
    // 初期化
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuestionsSet.length).fill(null); 
    score = 0;
    quizStarted = false; 
    stopTimer(); 

    // 初期設定の時間を取得
    initialTimeLimit = parseInt(dom.timeLimitSelect ? dom.timeLimitSelect.value : 1800, 10);
    timeRemaining = 0;
    dom.totalQCount.textContent = currentQuestionsSet.length; 
    
    // 採点モードの初期設定とイベントリスナー
    const immediateModeRadio = document.getElementById('mode-immediate');
    const finalModeRadio = document.getElementById('mode-final');
    if (immediateModeRadio) immediateModeRadio.onchange = () => setGradingMode('immediate');
    if (finalModeRadio) finalModeRadio.onchange = () => setGradingMode('final');
    gradingMode = immediateModeRadio && immediateModeRadio.checked ? 'immediate' : 'final';
    setGradingMode(gradingMode); 
    
    // 制限時間選択のイベントリスナー
    if (dom.timeLimitSelect) {
        dom.timeLimitSelect.onchange = (e) => {
            if (!quizStarted) {
                dom.customTimeLimitInput.value = '';
                initialTimeLimit = parseInt(e.target.value, 10);
            }
        };
        dom.customTimeLimitInput.oninput = (e) => {
             if (!quizStarted) {
                dom.timeLimitSelect.value = '0';
                const value = parseInt(e.target.value, 10);
                initialTimeLimit = (value > 0) ? Math.min(value, 9000) : 0; 
            }
        };
    }
    
    // ボタンのイベントリスナーを設定
    if (dom.checkBtn) dom.checkBtn.onclick = checkAnswer;
    if (dom.nextBtn) dom.nextBtn.onclick = loadNextQuestion;
    if (dom.endBtn) dom.endBtn.onclick = showFinalResults;
    
    // クイズ開始ボタンのイベントリスナー
    if (dom.startQuizSetBtn) {
        dom.startQuizSetBtn.onclick = startQuizSetTimer;
    }
    
    // 最初の問題の読み込み (問題開始前の状態)
    loadQuestion(dom, true); 
}


/**
 * 採点モードの切り替え
 * @param {string} mode 'immediate' or 'final'
 */
function setGradingMode(mode) {
    gradingMode = mode;
    const dom = initQuizDom();
    
    if (gradingMode === 'final') {
        dom.checkBtn.textContent = (currentQuestionIndex < currentQuestionsSet.length - 1) ? "次の問題へ" : "終了して結果を見る";
        
        if(quizStarted && dom.questionPreStart.classList.contains('hidden')) {
            dom.checkBtn.classList.remove('hidden');
        } else {
            dom.checkBtn.classList.add('hidden');
        }

        dom.nextBtn.classList.add('hidden');
        dom.endBtn.classList.remove('hidden');
        dom.resultArea.classList.add('hidden');
    } 
    else {
        dom.checkBtn.textContent = "解答を確認";
        dom.endBtn.classList.add('hidden');
        dom.nextBtn.classList.add('hidden');
        
        if (quizStarted && dom.resultArea.classList.contains('hidden')) {
            dom.checkBtn.classList.remove('hidden');
        } else {
            dom.checkBtn.classList.add('hidden');
        }
    }
}


/**
 * 問題の表示を処理する
 * @param {object} dom DOM要素
 * @param {boolean} isInitialLoad 問題セットの最初の1問目かどうか (クイズ開始前かどうか)
 */
function loadQuestion(dom, isInitialLoad = false) {
    if (currentQuestionIndex >= currentQuestionsSet.length) {
        showFinalResults();
        return;
    }

    const q = currentQuestionsSet[currentQuestionIndex];
    
    // 画面の初期状態を設定
    dom.quizContainer.classList.remove('hidden'); 
    dom.resultsView.classList.add('hidden');
    dom.resultArea.classList.add('hidden');
    dom.nextBtn.classList.add('hidden');
    dom.endBtn.classList.add('hidden');
    
    // 問題文共通の表示設定
    dom.currentQIndex.textContent = currentQuestionIndex + 1;
    dom.qId.textContent = q.id;
    dom.subjectTag.textContent = `[${q.subject}]`;
    
    
    if (isInitialLoad && !quizStarted) {
        // クイズスタート前の設定画面表示モード
        dom.questionPreStart.classList.remove('hidden');
        dom.quizContainer.classList.add('hidden'); 
        dom.timeDisplay.classList.add('hidden');
        
        dom.timeLimitSelect.disabled = false;
        dom.customTimeLimitInput.disabled = false;
        
    } else {
        // クイズ開始後の問題読み込みモード (画面切り替えと問題表示)
        dom.questionPreStart.classList.add('hidden'); // 設定画面を隠す
        dom.quizContainer.classList.remove('hidden'); // クイズ画面を表示
        
        // タイマー表示の更新
        if (initialTimeLimit > 0) {
            dom.timeDisplay.classList.remove('hidden');
            dom.timeDisplayText.textContent = formatTime(timeRemaining);
            const progressPercentage = (timeRemaining / initialTimeLimit) * 100;
            dom.timeBar.style.width = `${progressPercentage}%`;
        } else {
            dom.timeDisplay.classList.add('hidden');
        }

        // クイズ開始後は、すべての設定項目を無効化
        dom.timeLimitSelect.disabled = true;
        dom.customTimeLimitInput.disabled = true;
        if (dom.questionCountInput) {
            dom.questionCountInput.disabled = true;
        }
        
        // 問題文を表示
        dom.qTextArea.innerHTML = q.question.replace(/\n/g, '<br>');
        
        // 選択肢の生成
        dom.choicesContainer.innerHTML = '';
        
        let choicesToIterate = q.choices || {}; 
        
        // R7問題（IDが 'R7_' で始まり、choicesオブジェクトが空）の場合、プレースホルダを強制生成
        const isR7WithoutChoices = (q.id && q.id.startsWith('R7_') && Object.keys(q.choices || {}).length === 0);

        if (isR7WithoutChoices) {
            choicesToIterate = {
                "ア": "（問題文に記載）",
                "イ": "（問題文に記載）",
                "ウ": "（問題文に記載）",
                "エ": "（問題文に記載）"
            };
        }
        
        for (const [key, value] of Object.entries(choicesToIterate)) {
            const label = document.createElement('label');
            label.innerHTML = `<input type="radio" name="answer" value="${key}"> <span>${key}：${value}</span>`;
            dom.choicesContainer.appendChild(label);
        }

        // 最終採点モードで過去に回答があれば復元
        if (gradingMode === 'final' && userAnswers[currentQuestionIndex] && userAnswers[currentQuestionIndex] !== 'UNANSWERED') {
            const radio = document.querySelector(`input[value="${userAnswers[currentQuestionIndex]}"]`);
            if (radio) {
                radio.checked = true;
            }
        } else {
            // 選択肢の無効化を解除し、スタイルをリセット
            dom.choicesContainer.querySelectorAll('input').forEach(input => input.disabled = false);
            dom.choicesContainer.querySelectorAll('label').forEach(label => {
                label.style.backgroundColor = '';
                label.style.border = '';
            });
        }
    }
    
    setGradingMode(gradingMode);

    if (typeof MathJax !== 'undefined') {
        MathJax.typeset();
    }
}

/**
 * クイズ開始ボタンを押した時の処理。
 * タイマーを設定し、開始フラグを立てて、1問目を表示する。
 */
function startQuizSetTimer() {
    const dom = initQuizDom();
    
    // 1. 問題数の設定 (currentQuestionsSetをここでスライスし、確定させる)
    const maxQuestions = currentQuestionsSet.length;
    
    let requestedCount = maxQuestions;
    if (dom.questionCountInput && !dom.questionCountInput.disabled) {
        requestedCount = parseInt(dom.questionCountInput.value, 10);
    }
    
    // 有効な問題数を計算
    const finalCount = (requestedCount > 0 && requestedCount <= maxQuestions) ? requestedCount : maxQuestions;
    
    // currentQuestionsSetをスライスして、実際に使用する問題セットを確定
    currentQuestionsSet = currentQuestionsSet.slice(0, finalCount);
    
    if (currentQuestionsSet.length === 0) {
        alert("出題する問題が見つかりませんでした。");
        if (typeof router !== 'undefined') router.showView('home'); 
        return;
    }

    // 状態をリセット/更新
    currentQuestionIndex = 0;
    // 確定した問題数に合わせてuserAnswersのサイズを再設定
    userAnswers = new Array(currentQuestionsSet.length).fill(null);
    score = 0;
    dom.totalQCount.textContent = currentQuestionsSet.length; // 確定した出題数を表示
    
    // 2. タイマーの設定
    const customTime = parseInt(dom.customTimeLimitInput.value, 10);
    if (customTime > 0) {
        initialTimeLimit = customTime;
    } 
    
    timeRemaining = initialTimeLimit;
    
    quizStarted = true; // クイズ開始フラグをON
    
    // グローバルタイマーを開始
    startGlobalTimer(dom); 
    
    // loadQuestionを再実行し、問題開始後の状態に切り替える (isInitialLoad = false)
    loadQuestion(dom, false); 
}


/**
 * タイマーを停止する
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * 問題セット全体のグローバルタイマーを開始する
 * @param {object} dom DOM要素
 */
function startGlobalTimer(dom) {
    stopTimer(); 

    if (initialTimeLimit <= 0 || !dom.timeDisplay) {
        if (dom.timeDisplay) {
            dom.timeDisplay.classList.add('hidden');
        }
        return;
    }
    
    dom.timeDisplay.classList.remove('hidden'); 
    
    // 初回描画
    dom.timeDisplayText.textContent = formatTime(timeRemaining);
    
    const initialProgressPercentage = 100;
    dom.timeBar.style.width = `${initialProgressPercentage}%`;
    dom.timeBar.style.backgroundColor = '#28a745';

    timerInterval = setInterval(() => {
        if (timeRemaining <= 0) {
            stopTimer();
            handleTimeUp(); 
            return;
        }
        
        timeRemaining--; 

        dom.timeDisplayText.textContent = formatTime(timeRemaining);
        
        // プログレスバーの更新
        const progressPercentage = (timeRemaining / initialTimeLimit) * 100;
        dom.timeBar.style.width = `${progressPercentage}%`;
        
        // 警告色への変更
        if (timeRemaining <= initialTimeLimit * 0.2 && timeRemaining > 0) {
            dom.timeBar.style.backgroundColor = '#ffc107';
        } else if (timeRemaining <= initialTimeLimit * 0.1 && timeRemaining > 0) {
            dom.timeBar.style.backgroundColor = '#dc3545';
        } else if (timeRemaining === 0) {
             dom.timeBar.style.backgroundColor = '#dc3545';
        } else {
            dom.timeBar.style.backgroundColor = '#28a745';
        }
        
    }, 1000);
}

/**
 * タイムオーバー時の処理
 */
function handleTimeUp() {
    stopTimer(); 
    const dom = initQuizDom();
    
    if (currentQuestionIndex < currentQuestionsSet.length) {
        userAnswers[currentQuestionIndex] = 'UNANSWERED';
    }
    
    alert('時間切れです。採点結果を表示します。');
    
    dom.choicesContainer.querySelectorAll('input').forEach(input => input.disabled = true);
    dom.checkBtn.classList.add('hidden');
    dom.nextBtn.classList.add('hidden');
    dom.endBtn.classList.add('hidden');
    
    showFinalResults();
}


/**
 * 解答の確認と結果表示
 */
function checkAnswer() {
    const dom = initQuizDom();
    const q = currentQuestionsSet[currentQuestionIndex];
    const selectedChoice = document.querySelector('input[name="answer"]:checked');

    if (!selectedChoice) {
        alert('選択肢を選んでください。');
        return;
    }

    const userAnswer = selectedChoice.value;
    userAnswers[currentQuestionIndex] = userAnswer;
    const isCorrect = (userAnswer === q.answer);

    if (gradingMode === 'final') {
        loadNextQuestion();
        return;
    }

    // 都度採点モード
    if (isCorrect) {
        score++;
    }

    dom.resultArea.classList.remove('hidden');
    dom.checkBtn.classList.add('hidden');

    if (isCorrect) {
        dom.resultMsg.textContent = '正解です！ 🎉';
        dom.resultMsg.style.color = '#28a745';
    } else {
        dom.resultMsg.textContent = '不正解です... 😥';
        dom.resultMsg.style.color = '#dc3545';
    }
    
    dom.correctAns.textContent = `正解: ${q.answer}`;
    dom.correctAns.style.color = '#28a745';

    // 全選択肢解説の表示
    let explanationHTML = '';
    if (q.choiceExplanations) {
        for (const [key, explanation] of Object.entries(q.choiceExplanations)) {
            const isCorrectChoice = (key === q.answer);
            const tagColor = isCorrectChoice ? 'style="color: #28a745; font-weight: bold;"' : 'style="color: #333; font-weight: bold;"';
            
            explanationHTML += `
                <p>
                    <span ${tagColor}>【${key}】</span>: ${explanation.replace(/\n/g, '<br>')}
                </p>
            `;
        }
    } else {
        explanationHTML = '<p>この問題には選択肢ごとの解説データがありません。</p>';
    }
    dom.fullExplanationList.innerHTML = explanationHTML;


    // 選択肢のスタイル変更
    const choices = dom.choicesContainer.querySelectorAll('input[name="answer"]');
    choices.forEach(input => {
        const label = input.closest('label');
        input.disabled = true;
        
        if (input.value === q.answer) {
            label.style.backgroundColor = '#e2f0d9'; 
            label.style.border = '1px solid #28a745';
        } else if (input.checked && !isCorrect) {
            label.style.backgroundColor = '#ffe6e6'; 
            label.style.border = '1px solid #dc3545';
        }
    });
    
    if (typeof MathJax !== 'undefined') {
        MathJax.typeset();
    }

    // 最終問題でなければ「次の問題へ」ボタンを表示
    if (currentQuestionIndex < currentQuestionsSet.length - 1) {
        dom.nextBtn.textContent = "次の問題へ";
        dom.nextBtn.onclick = loadNextQuestion;
        dom.nextBtn.classList.remove('hidden');
    } else {
        // 最終問題なら結果表示ボタンに変更
        dom.nextBtn.textContent = "終了して結果を見る";
        dom.nextBtn.onclick = showFinalResults;
        dom.nextBtn.classList.remove('hidden');
    }
}

/**
 * 次の問題の読み込み
 */
function loadNextQuestion() {
    currentQuestionIndex++;
    loadQuestion(initQuizDom(), false); 
}


/**
 * 最終結果の表示
 */
function showFinalResults() {
    stopTimer(); 
    
    const dom = initQuizDom();
    let finalScore = 0;
    let detailedResultsHTML = '';

    // 採点と結果リストの生成
    currentQuestionsSet.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = (userAnswer && userAnswer !== 'UNANSWERED' && userAnswer === q.answer);
        
        if (isCorrect) {
             finalScore++;
        } else {
            // 不正解または未解答の場合、詳細リストに追加
            const resultStatus = (userAnswer === 'UNANSWERED' || !userAnswer) ? '未解答' : '不正解';
            const userAnswerDisplay = (userAnswer === 'UNANSWERED' || !userAnswer) 
                                      ? '未解答' 
                                      : `あなたの解答: ${userAnswer}`;
            
            const questionSnippet = q.question.split('\n')[0].substring(0, 50) + '...';

            detailedResultsHTML += `
                <div class="result-item incorrect">
                    <h5>[${q.subject}] 問${index + 1} (${q.id}) - ${resultStatus}</h5>
                    <p class="question-snippet">**問題概要**: ${questionSnippet}</p>
                    <p class="user-answer-summary">**${userAnswerDisplay}**</p>
                    <p class="correct-answer-summary">**正解**: ${q.answer}</p>
                    <div class="explanation-detail">
                        <h6>全ての選択肢の解説</h6>
            `;
            
            // 全選択肢解説の挿入
            if (q.choiceExplanations) {
                for (const [key, explanation] of Object.entries(q.choiceExplanations)) {
                    const isCorrectChoice = (key === q.answer);
                    const tagStyle = isCorrectChoice ? 'style="color: #28a745; font-weight: bold;"' : 'style="font-weight: bold;"';
                    
                    detailedResultsHTML += `
                        <p class="explanation-entry">
                            <span ${tagStyle}>【${key}】</span>: ${explanation.replace(/\n/g, '<br>')}
                        </p>
                    `;
                }
            } else {
                detailedResultsHTML += '<p>この問題には選択肢ごとの解説データがありません。</p>';
            }

            detailedResultsHTML += `
                    </div>
                </div>
            `;
        }
    });
    
    score = finalScore;
    
    // クイズ全体の状態をリセット
    quizStarted = false;
    timeRemaining = 0;

    dom.quizContainer.classList.add('hidden');
    dom.resultsView.classList.remove('hidden');
    
    dom.finalScore.textContent = score;
    dom.finalTotal.textContent = currentQuestionsSet.length;
    
    // 詳細結果の挿入
    if (detailedResultsHTML === '') {
        dom.detailedResults.innerHTML = '<p class="all-correct-message">🎉 全問正解です！素晴らしい！ 🎉</p>';
    } else {
        dom.detailedResults.innerHTML = `
            <h4>詳細な結果と解説 (不正解/未解答)</h4>
            ${detailedResultsHTML}
        `;
    }

    if (typeof MathJax !== 'undefined') {
        MathJax.typeset();
    }
}
