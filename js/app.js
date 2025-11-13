// js/app.js (最終安定版 - initプロパティもゲッター化し、スペースを半角に統一)

const VIEW_CONTAINER = document.getElementById('view-container');

// 各ビューのHTMLと初期化関数をマッピング
// 💡 initプロパティもゲッター化されているため、textbook.jsの読み込み順序に依存しません。
const VIEWS = {
    home: { 
        get html() { return typeof HOME_HTML !== 'undefined' ? HOME_HTML : ''; }, 
        get init() { return typeof initializeHome !== 'undefined' ? initializeHome : null }
    },
    quiz: { 
        get html() { return typeof QUIZ_HTML !== 'undefined' ? QUIZ_HTML : ''; }, 
        get init() { return null }
    },
    textbook: { 
        get html() { return typeof TEXTBOOK_HTML !== 'undefined' ? TEXTBOOK_HTML : ''; }, 
        get init() { return typeof initializeTextbookMode !== 'undefined' ? initializeTextbookMode : null }
    }, 
    term_quiz: { 
        get html() { return typeof TERM_QUIZ_HTML !== 'undefined' ? TERM_QUIZ_HTML : ''; }, 
        get init() { return typeof initializeTermQuizMode !== 'undefined' ? initializeTermQuizMode : null }
    },
    glossary: { 
        get html() { return typeof GLOSSARY_HTML !== 'undefined' ? GLOSSARY_HTML : ''; }, 
        get init() { return typeof loadGlossary !== 'undefined' ? loadGlossary : null }
    }
};

const router = {
    currentView: 'home',

    /**
     * 指定されたビューを表示する
     * @param {string} viewName - 表示するビューの名前 ('home', 'quiz', 'textbook'など)
     */
    showView: function(viewName) {
        const viewHtml = VIEWS[viewName]?.html;

        if (!VIEWS[viewName] || !viewHtml) {
            console.error('Unknown view or HTML missing:', viewName);
            return;
        }

        this.currentView = viewName;
        VIEW_CONTAINER.innerHTML = viewHtml;
        
        window.history.pushState({ view: viewName }, '', `#${viewName}`);

        // initゲッターが実行され、初期化関数が定義されているかチェック
        if (VIEWS[viewName].init) {
            VIEWS[viewName].init();
        }
        
        if (typeof MathJax !== 'undefined') {
            MathJax.typeset();
        }
    },

    /**
     * 通常のクイズモード (科目別、全科目) を表示
     * @param {string} mode - '科目A', '科目B', 'ALL' のいずれか
     */
    showQuizMode: function(mode) {
        this.showView('quiz');
        if (typeof startQuiz === 'function') {
            startQuiz(mode);
        } else {
            console.error("startQuiz function is not defined. Make sure quiz.js is loaded.");
        }
    },
    
    /**
     * ランダムクイズモードを表示
     */
    showRandomMode: function() {
        this.showView('quiz');
        if (typeof startQuiz === 'function') {
            startQuiz('RANDOM'); 
        } else {
            console.error("startQuiz function is not defined. Make sure quiz.js is loaded.");
        }
    },
    
    // アプリケーション起動時の初期ビュー表示
    initialize: function() {
        const initialHash = window.location.hash.slice(1);
        const initialViewHtml = VIEWS[initialHash]?.html;

        if (initialHash && VIEWS[initialHash] && initialViewHtml) {
            this.currentView = initialHash;
            VIEW_CONTAINER.innerHTML = initialViewHtml;
            
            if (VIEWS[this.currentView].init) {
                VIEWS[this.currentView].init();
            }
        } else {
            this.showView('home');
        }
        
        // ブラウザの履歴管理を設定
        window.onpopstate = (event) => {
            if (event.state && event.state.view) {
                const viewName = event.state.view;
                const restoredViewHtml = VIEWS[viewName]?.html;
                
                if (!VIEWS[viewName] || !restoredViewHtml) {
                     this.showView('home'); 
                     return;
                }
                
                this.currentView = viewName;
                VIEW_CONTAINER.innerHTML = restoredViewHtml;
                
                if (VIEWS[this.currentView].init) {
                    VIEWS[this.currentView].init();
                }
            } else if (window.location.hash.slice(1) === '') {
                this.showView('home');
            }
            
            if (typeof MathJax !== 'undefined') {
                MathJax.typeset();
            }
        };
    }
};

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    router.initialize();
});