// js/textbook.js (教科書モードのロジック - 最終修正版: エラー回避強化)

let currentQuestionIndex = 0;
let textbookQuestions = []; // 全問題が格納される配列

const TEXTBOOK_HTML = `
<section id="textbook-view" class="view">
    <h2>📖 教科書モード (全問題)</h2>
    <p>問題とすぐに詳細な解説を確認できます。学習に役立てましょう。</p>
    
    <div id="textbook-controls" style="text-align: center; margin-bottom: 20px;">
        <button id="prev-question" disabled style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">⬅️ 前の問題</button>
        <span id="q-navigation" style="margin: 0 15px; font-weight: bold;">問題 <span id="current-q-num">1</span> / <span id="total-q-num">1</span></span>
        <button id="next-question" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">次の問題 ➡️</button>
    </div>

    <div id="question-details">
        </div>
</section>
`;

/**
 * 教科書モードの初期化
 */
function initializeTextbookMode() {
    const detailsContainer = document.getElementById('question-details');
    
    // 1. データ（QUESTIONS）の存在確認と早期リターン
    if (typeof QUESTIONS === 'undefined' || QUESTIONS.length === 0) {
        if (detailsContainer) {
            detailsContainer.innerHTML = '<p style="color: red;">エラー: 問題データ (data.js) が読み込まれていません。</p>';
        }
        return; 
    }

    // 2. 初期化
    textbookQuestions = [...QUESTIONS];
    currentQuestionIndex = 0;

    // 3. イベントリスナーの設定
    const prevBtn = document.getElementById('prev-question');
    const nextBtn = document.getElementById('next-question');

    // 💡 複数回設定されないようにロバストなチェックを追加
    if (prevBtn && !prevBtn.hasClickListener) {
        prevBtn.addEventListener('click', () => navigateQuestion(-1));
        prevBtn.hasClickListener = true;
    }
    if (nextBtn && !nextBtn.hasClickListener) {
        nextBtn.addEventListener('click', () => navigateQuestion(1));
        nextBtn.hasClickListener = true;
    }

    // 4. 最初の問題をレンダリング
    renderQuestion();
}

/**
 * 前後の問題へ移動します。
 * @param {number} direction - -1 (前へ) または 1 (次へ)
 */
function navigateQuestion(direction) {
    const newIndex = currentQuestionIndex + direction;
    
    if (newIndex >= 0 && newIndex < textbookQuestions.length) {
        currentQuestionIndex = newIndex;
        renderQuestion();
    }
}

/**
 * 現在の問題と解説をDOMにレンダリングします。
 */
function renderQuestion() {
    if (textbookQuestions.length === 0) return;
    
    const q = textbookQuestions[currentQuestionIndex];
    const detailsContainer = document.getElementById('question-details');
    
    if (!detailsContainer || !q) {
        // コンテナまたは問題データ自体が存在しない場合、エラーを表示
        if (detailsContainer) detailsContainer.innerHTML = '<p style="color: red;">問題データが破損しているため、表示できません。</p>';
        return;
    }
    
    // ナビゲーションの数字を更新
    document.getElementById('current-q-num').textContent = currentQuestionIndex + 1;
    document.getElementById('total-q-num').textContent = textbookQuestions.length;

    // 💡 堅牢性を高めるため、存在しないプロパティは空文字列を使用
    const questionText = q.question ? q.question.replace(/\n/g, '<br>') : '--- 問題文なし ---';
    const subjectText = q.subject || '科目不明';
    const answerText = q.answer || '解答なし';

    let html = `
        <div class="question-item" style="border: 1px solid #ddd; padding: 20px; margin-bottom: 20px; border-radius: 5px; background-color: #f9f9f9;">
            <h4 style="color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 5px;">
                [${subjectText}] 問題${currentQuestionIndex + 1} (${q.id || 'IDなし'})
            </h4>
            
            <div class="q-content" style="margin-top: 15px; margin-bottom: 20px;">
                ${questionText}
            </div>
            
            <h5 style="color: #28a745; margin-top: 20px;">正解: ${answerText}</h5>
            
            <h5 style="color: #6c757d; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">選択肢</h5>
            <dl class="choices-list" style="margin-top: 10px;">
    `;
    
    // 選択肢の表示
    if (q.choices) {
        for (const [key, value] of Object.entries(q.choices)) {
            const isAnswer = (key === q.answer) ? 'style="font-weight: bold; color: #28aa45;"' : '';
            html += `<dt ${isAnswer}>【${key}】</dt><dd>${value}</dd>`;
        }
    } else {
         html += '<p>選択肢データがありません。</p>';
    }
    
    html += `
            </dl>
            
            <h5 style="color: #dc3545; margin-top: 30px; border-bottom: 2px solid #dc3545; padding-bottom: 5px;">解説 (選択肢別)</h5>
            <div class="explanation-details" style="margin-top: 15px;">
                <dl class="choice-explanations">
    `;

    // 選択肢別解説の表示
    if (q.choiceExplanations) {
        for (const [key, explanation] of Object.entries(q.choiceExplanations)) {
            const isCorrect = (key === q.answer);
            const tagStyle = isCorrect ? 'style="color: #28a745; font-weight: bold;"' : 'style="font-weight: bold;"';
            
            const explanationText = explanation ? explanation.replace(/\n/g, '<br>') : '解説データなし';
            html += `
                <dt ${tagStyle}>【${key}】</dt>
                <dd style="margin-left: 20px; padding-bottom: 5px;">${explanationText}</dd>
            `;
        }
    } else {
        html += '<p>この問題には選択肢ごとの解説データがありません。</p>';
    }
    
    html += `
                </dl>
            </div>

            <h5 style="color: #007bff; margin-top: 30px; border-bottom: 2px solid #007bff; padding-bottom: 5px;">関連用語集</h5>
            <div class="glossary-details" style="margin-top: 15px;">
                <dl class="term-definition">
    `;

    // 用語集の表示
    if (q.glossary && q.glossary.length > 0) {
        q.glossary.forEach(item => {
            const termText = item.term || '用語なし';
            const explanationText = item.explanation ? item.explanation.replace(/\n/g, '<br>') : '解説なし';

            html += `
                <dt style="font-weight: bold; margin-top: 10px; color: #0056b3;">${termText}</dt>
                <dd style="margin-left: 20px; padding-bottom: 5px;">${explanationText}</dd>
            `;
        });
    } else {
        html += '<p>この問題に関連する用語データはありません。</p>';
    }

    html += `
                </dl>
            </div>
        </div>
    `;
    
    detailsContainer.innerHTML = html;
    
    updateControls();
    
    if (typeof MathJax !== 'undefined') {
        MathJax.typeset();
    }
}

/**
 * 前後の問題ボタンの状態を更新します。
 */
function updateControls() {
    const prevBtn = document.getElementById('prev-question');
    const nextBtn = document.getElementById('next-question');
    
    if (prevBtn) {
        prevBtn.disabled = (currentQuestionIndex === 0);
    }
    if (nextBtn) {
        nextBtn.disabled = (currentQuestionIndex === textbookQuestions.length - 1);
    }
}