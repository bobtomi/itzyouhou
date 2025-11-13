// js/term_quiz.js (用語定義クイズモードのロジック - 問題数カスタム入力対応版)

const TERM_QUIZ_HTML = `
<section id="term-quiz-view" class="view">
    <h2>🎯 用語定義クイズモード</h2>
    <p>問題の解説文から、対応する**用語**を選択肢の中から選びましょう。</p>
    
    <div id="term-quiz-config">
        <label for="term-q-count-input">問題数 (<span id="max-term-q-count">0</span>問まで):</label>
        <input type="number" id="term-q-count-input" min="1" value="10" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 80px;">
        
        <button id="start-term-quiz-btn" style="padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">クイズスタート！</button>
    </div>
    
    <div id="term-quiz-container" class="hidden" style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 5px; background-color: white;">
        <div id="term-q-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <p id="term-q-nav" style="font-weight: bold;">問題: <span id="current-term-q-index">0</span> / <span id="total-term-q-count">0</span></p>
        </div>
        
        <div id="term-question-area">
            <h4 style="color: #007bff;">解説文:</h4>
            <div id="term-question-text" style="padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; margin-bottom: 20px; line-height: 1.6;">ここに解説が表示されます。</div>
            
            <h4 style="margin-bottom: 10px;">選択肢 (対応する用語を選択):</h4>
            <div id="term-choices-container">
                </div>
            
            <div id="term-feedback-area" class="hidden" style="margin-top: 20px; padding: 15px; border-radius: 5px;">
                </div>
            <button id="next-term-q-btn" class="hidden" style="float: right; padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">次の問題 ➡️</button>
            <div style="clear: both;"></div>
        </div>
    </div>
    
    <div id="term-results-view" class="hidden" style="margin-top: 20px; padding: 20px; border: 1px solid #ccc; border-radius: 5px; background-color: white;">
        <h3>クイズ結果</h3>
        <p style="font-size: 1.2em;">スコア: <span id="final-term-score" style="font-weight: bold; color: #28a745;">0</span> / <span id="final-term-total" style="font-weight: bold;">0</span> 問正解</p>
        <div id="detailed-term-results" style="margin-top: 15px;">
            </div>
        <button onclick="router.showView('home')" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">ホームに戻る</button>
    </div>
</section>
`;

// グローバル変数
let termQuizSet = [];
let allTerms = [];
let currentTermQuestionIndex = 0;
let termQuizScore = 0;

/**
 * 配列をシャッフルするユーティリティ関数
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * 用語定義クイズモードの初期化
 */
function initializeTermQuizMode() {
    // QUESTIONS配列が読み込まれていることを前提とする
    if (typeof QUESTIONS === 'undefined') return;

    // 1. 全用語-解説ペアを抽出
    const allTermPairs = [];
    QUESTIONS.forEach(q => {
        if (q.glossary && q.glossary.length > 0) {
            q.glossary.forEach(item => {
                allTermPairs.push(item);
            });
        }
    });

    // Termのみのリストを生成 (誤答の選択肢用)
    allTerms = [...new Set(allTermPairs.map(item => item.term))];

    // ユニークな用語-解説ペアのリストを作成（同じ解説文を持つペアは1つにまとめる）
    const uniqueTermPairs = [];
    const seenExplanations = new Set();

    allTermPairs.forEach(pair => {
        if (!seenExplanations.has(pair.explanation)) {
            uniqueTermPairs.push(pair);
            seenExplanations.add(pair.explanation);
        }
    });
    
    // 2. 問題数入力の設定
    const maxQuestions = uniqueTermPairs.length;
    const qCountInput = document.getElementById('term-q-count-input');
    const maxCountSpan = document.getElementById('max-term-q-count');
    const startBtn = document.getElementById('start-term-quiz-btn');

    if (maxCountSpan) {
        maxCountSpan.textContent = maxQuestions; // 最大問題数を表示
    }
    
    if (qCountInput) {
        // 最大値を設定
        qCountInput.max = maxQuestions; 
        // デフォルト値を設定 (10問、または最大問題数)
        qCountInput.value = Math.min(10, maxQuestions); 

        // 最大問題数が0の場合、入力を無効化
        if (maxQuestions === 0) {
            qCountInput.disabled = true;
            startBtn.disabled = true;
        } else {
            qCountInput.disabled = false;
            startBtn.disabled = false;
        }
    }
    
    // 3. イベントリスナーの設定
    if (startBtn) {
        startBtn.onclick = () => {
            // 問題数入力欄から値を取得
            let numQuestions = parseInt(qCountInput.value, 10);
            
            // ★修正ロジック: 入力値の検証と調整
            const finalMax = maxQuestions > 0 ? maxQuestions : 1; // 0問の場合は1問として扱う（実際には0問ならボタン無効）
            
            if (isNaN(numQuestions) || numQuestions < 1) {
                numQuestions = 1;
            } else if (numQuestions > finalMax) {
                numQuestions = finalMax;
            }
            
            // ユニークな用語ペアをシャッフルして問題セットを作成
            shuffleArray(uniqueTermPairs);
            termQuizSet = uniqueTermPairs.slice(0, numQuestions);
            
            // 実際の出題数で入力欄の値を更新（不正な値が入力された場合もUIに反映）
            qCountInput.value = termQuizSet.length; 
            
            startTermQuiz();
        };
    }
    
    const nextBtn = document.getElementById('next-term-q-btn');
    if (nextBtn) {
        nextBtn.onclick = showNextTermQuestion;
    }

    // クイズコンテナを隠す
    document.getElementById('term-quiz-container')?.classList.add('hidden');
    document.getElementById('term-results-view')?.classList.add('hidden');
    document.getElementById('term-quiz-config')?.classList.remove('hidden');
}


/**
 * 用語クイズを開始
 */
function startTermQuiz() {
    currentTermQuestionIndex = 0;
    termQuizScore = 0;

    // 問題数が0の場合は開始しない（通常はボタンが非活性）
    if (termQuizSet.length === 0) {
        alert('出題できる用語データがありません。');
        return;
    }

    // ビューの切り替え
    document.getElementById('term-quiz-config')?.classList.add('hidden');
    document.getElementById('term-results-view')?.classList.add('hidden');
    document.getElementById('term-quiz-container')?.classList.remove('hidden');

    document.getElementById('total-term-q-count').textContent = termQuizSet.length;

    // 最初の問題を表示
    displayTermQuestion();
}

/**
 * 1問分の用語選択肢を生成する
 * @param {object} correctPair - 正解の用語と解説のペア
 * @returns {Array<string>} - シャッフルされた選択肢 (用語)
 */
function generateTermChoices(correctPair) {
    const correctTerm = correctPair.term;
    const choices = [correctTerm];

    // allTermsから正解以外のランダムな用語を3つ選択
    const incorrectTerms = allTerms.filter(term => term !== correctTerm);
    shuffleArray(incorrectTerms);
    
    // 誤答は最大3つまで追加
    for (let i = 0; i < 3 && i < incorrectTerms.length; i++) {
        choices.push(incorrectTerms[i]);
    }
    
    // 選択肢をシャッフル
    shuffleArray(choices);
    
    return choices;
}

/**
 * 現在の問題を表示
 */
function displayTermQuestion() {
    const qIndex = currentTermQuestionIndex;
    const currentPair = termQuizSet[qIndex];
    
    document.getElementById('current-term-q-index').textContent = qIndex + 1;
    
    // 問題文（解説文）の表示
    // MathJaxのレンダリングを考慮して、HTMLに挿入
    document.getElementById('term-question-text').innerHTML = currentPair.explanation.replace(/\n/g, '<br>');

    // 選択肢の生成
    const choicesContainer = document.getElementById('term-choices-container');
    choicesContainer.innerHTML = '';
    
    const choices = generateTermChoices(currentPair);

    choices.forEach(choice => {
        const button = document.createElement('button');
        button.className = 'quiz-choice-button'; // style.cssで定義された既存のクラスを利用
        button.textContent = choice;
        button.onclick = () => checkTermAnswer(choice, currentPair.term, choicesContainer, currentPair);
        choicesContainer.appendChild(button);
    });

    // 状態のリセット
    document.getElementById('term-feedback-area').classList.add('hidden');
    document.getElementById('term-feedback-area').innerHTML = '';
    document.getElementById('next-term-q-btn').classList.add('hidden');
    
    // 選択肢を有効にする
    Array.from(choicesContainer.querySelectorAll('button')).forEach(btn => btn.disabled = false);

    // MathJaxによる数式レンダリングを再実行
    if (typeof MathJax !== 'undefined') {
        MathJax.typeset();
    }
}

/**
 * 解答をチェックし、フィードバックを表示
 */
function checkTermAnswer(selectedTerm, correctTerm, choicesContainer, currentPair) {
    const isCorrect = selectedTerm === correctTerm;
    
    // すべての選択肢を無効にする
    Array.from(choicesContainer.querySelectorAll('button')).forEach(btn => btn.disabled = true);

    const feedbackArea = document.getElementById('term-feedback-area');
    feedbackArea.classList.remove('hidden');
    feedbackArea.innerHTML = '';
    
    let feedbackHTML = '';

    if (isCorrect) {
        termQuizScore++;
        feedbackHTML += '<p style="color: #28a745; font-weight: bold; font-size: 1.1em;">🎉 正解です！</p>';
        feedbackArea.style.backgroundColor = '#e2f0d9';
        feedbackArea.style.border = '1px solid #28a745';
    } else {
        feedbackHTML += `<p style="color: #dc3545; font-weight: bold; font-size: 1.1em;">❌ 不正解です。</p>`;
        feedbackHTML += `<p><strong>正解:</strong> ${correctTerm}</p>`;
        feedbackArea.style.backgroundColor = '#f8d7da';
        feedbackArea.style.border = '1px solid #dc3545';
    }

    // 選択肢に正誤のスタイルを適用
    Array.from(choicesContainer.querySelectorAll('button')).forEach(btn => {
        if (btn.textContent === correctTerm) {
            btn.style.backgroundColor = '#28a745';
            btn.style.color = 'white';
        } else if (btn.textContent === selectedTerm && !isCorrect) {
            btn.style.backgroundColor = '#dc3545';
            btn.style.color = 'white';
        }
    });

    // 問題の出典元を表示 (data.jsのQUESTIONS配列から元の問題IDを検索)
    const sourceQ = QUESTIONS.find(q => q.glossary && q.glossary.some(g => g.term === currentPair.term && g.explanation === currentPair.explanation));
    if (sourceQ) {
        feedbackHTML += `<p style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;">💡 <strong>出典元:</strong> [${sourceQ.subject}] ${sourceQ.id}`;
    } else {
         feedbackHTML += `<p style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;">💡 <strong>出典元:</strong> 用語集データから抽出</p>`;
    }
    
    feedbackArea.innerHTML = feedbackHTML;

    // 次へボタンを表示
    document.getElementById('next-term-q-btn').classList.remove('hidden');
}

/**
 * 次の問題を表示または結果を表示
 */
function showNextTermQuestion() {
    currentTermQuestionIndex++;
    
    if (currentTermQuestionIndex < termQuizSet.length) {
        displayTermQuestion();
    } else {
        showTermQuizResults();
    }
}

/**
 * クイズ結果を表示
 */
function showTermQuizResults() {
    const finalScoreEl = document.getElementById('final-term-score');
    const finalTotalEl = document.getElementById('final-term-total');
    const detailedResultsEl = document.getElementById('detailed-term-results');

    document.getElementById('term-quiz-container')?.classList.add('hidden');
    document.getElementById('term-results-view')?.classList.remove('hidden');

    finalScoreEl.textContent = termQuizScore;
    finalTotalEl.textContent = termQuizSet.length;

    let detailedResultsHTML = '';

    if (termQuizScore === termQuizSet.length) {
        detailedResultsHTML = '<p class="all-correct-message">🎉 全問正解です！素晴らしい！ 🎉</p>';
    } else {
        // 出題された用語一覧と解説を表示（簡略化された結果表示）
        detailedResultsHTML = '<h4>出題された用語一覧と解説</h4>';
        termQuizSet.forEach((pair, index) => {
            const sourceQ = QUESTIONS.find(q => q.glossary && q.glossary.some(g => g.term === pair.term && g.explanation === pair.explanation));
            const sourceInfo = sourceQ ? `[${sourceQ.subject}] ${sourceQ.id}` : '用語集データ';
            
            detailedResultsHTML += `
                <div class="result-item" style="border-bottom: 1px dashed #ccc; padding: 10px 0; margin-bottom: 10px;">
                    <h5 style="color: #007bff; margin-bottom: 5px;">問題 ${index + 1} の用語: <strong>${pair.term}</strong></h5>
                    <p style="margin-left: 10px; color: #555; font-style: italic;">(解説: ${pair.explanation.replace(/\n/g, '<br>').substring(0, 100)}...)</p>
                    <p style="font-size: 0.9em; color: #888;">出典: ${sourceInfo}</p>
                </div>
            `;
        });
    }

    detailedResultsEl.innerHTML = detailedResultsHTML;
}