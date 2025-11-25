// js/home.js (完全版)

const HOME_HTML = `
<section id="home-view" class="view">
    <h2>ようこそ！</h2>
    <p>基本情報技術者試験 令和6年度と令和7年度の公開問題で学習しましょう。上部のメニューから学習モードを選択してください。</p>
    <div class="stats">
        <p>総問題数: <span id="total-q-count-home">0</span> 問</p>
        <p>科目A問題数: <span id="subject-a-count-home">0</span> 問</p>
        <p>科目B問題数: <span id="subject-b-count-home">0</span> 問</p>
    </div>
</section>
`;

// ホーム画面表示時の初期化処理
function initializeHome() {
    // QUESTIONS配列が読み込まれていることを前提とする
    if (typeof QUESTIONS === 'undefined') return;
    
    const totalQCountHome = document.getElementById('total-q-count-home');
    const subjectACountHome = document.getElementById('subject-a-count-home');
    const subjectBCountHome = document.getElementById('subject-b-count-home');

    const totalCount = QUESTIONS.length;
    const subjectACount = QUESTIONS.filter(q => q.subject === '科目A').length;
    const subjectBCount = QUESTIONS.filter(q => q.subject === '科目B').length;

    if (totalQCountHome) {
        totalQCountHome.textContent = totalCount;
    }
    if (subjectACountHome) {
        subjectACountHome.textContent = subjectACount;
    }
    if (subjectBCountHome) {
        subjectBCountHome.textContent = subjectBCount;
    }
}
