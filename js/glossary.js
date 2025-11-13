// js/glossary.js (修正版 - 問題文を削除し、問題番号とIDのみを表示)

const GLOSSARY_HTML = `
<section id="glossary-view" class="view">
    <h2>用語集</h2>
    <p>問題ごとに重要な用語と解説を確認できます。</p>
    <div id="glossary-list">
        </div>
</section>
`;

function loadGlossary() {
    // QUESTIONS配列が読み込まれていることを前提とする
    if (typeof QUESTIONS === 'undefined') return;

    const glossaryList = document.getElementById('glossary-list');
    if (!glossaryList) return; 
    
    glossaryList.innerHTML = '';
    
    // indexを取得し、問題番号「問〇」として使用
    QUESTIONS.forEach((q, index) => { 
        const item = document.createElement('div');
        item.className = 'glossary-item';
        
        // 問題文の冒頭を表示する処理を削除し、問題番号とIDのみを生成
        const title = document.createElement('h4');
        // 表示形式を「[科目] 問〇 (ID)」に変更
        title.textContent = `[${q.subject}] 問${index + 1} (${q.id})`; 
        item.appendChild(title);
        
        const dl = document.createElement('dl');
        dl.className = 'term-definition';
        
        if (q.glossary && q.glossary.length > 0) {
            q.glossary.forEach(g => {
                const dt = document.createElement('dt');
                dt.textContent = g.term;
                const dd = document.createElement('dd');
                dd.textContent = g.explanation;
                dl.appendChild(dt);
                dl.appendChild(dd);
            });
            item.appendChild(dl);
            glossaryList.appendChild(item);
        }
    });
}