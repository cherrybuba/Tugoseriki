class ControlsManager {
    constructor() {
        this.output = document.getElementById('output');
        this.clearBtn = document.getElementById('clear-btn');
        this.runBtn = document.getElementById('run-btn');
        this.clearConsoleBtn = document.getElementById('clear-console-btn');
        this.workspace = document.querySelector('.workspace');
        this.blocksContainer = document.getElementById('blocks-container');
        this.outputAlg = document.getElementById('output-alg');
        this.clearConsoleBtnAlg = document.getElementById('clear-console-btn-alg');

        this.dragDropManager = null;

        if (this.workspace && this.blocksContainer) {
            this.dragDropManager = new DragDropManager(this.workspace, this.blocksContainer, this.logToConsole.bind(this), this.logToConsoleAlgorithm.bind(this));
        }

        this.setupClearBtn();
        this.setupRunBtn();
        this.setupClearConsoleBtn();
    }

    clearConsole() {
        if (this.output) {
            this.output.innerHTML = '<div class="log-line system">> Готов!</div>';
        }
    }

    logToConsole(message, type = 'info') {
        if (!this.output) return;
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = `> ${message}`;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    logToConsoleAlgorithm(message, type = 'info') {
        if (!this.outputAlg) return;
        const line = document.createElement('div'); 
        line.className = `log-line ${type}-alg`;
        line.textContent = `> ${message}`;
        this.outputAlg.appendChild(line);
        this.outputAlg.scrollTop = this.outputAlg.scrollHeight;
    }

    setupClearBtn() {
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                this.clearConsole();
                if (this.blocksContainer) {
                    this.blocksContainer.innerHTML = '';
                }
                this.logToConsole('Рабочая область очищена');
            });
        }
    }

    setupRunBtn() {
        if (this.runBtn) {
            this.runBtn.addEventListener('click', () => {
                this.clearConsole();
                if (typeof Interpreter !== 'undefined') {
                    const interpreter = new Interpreter((msg, type) => this.logToConsoleAlgorithm(msg, type));
                    interpreter.runAlgorithm();

                    const event = new CustomEvent('programRun', { 
                        detail: interpreter.variables 
                    });
                    document.dispatchEvent(event);
                } else {
                    this.logToConsole('Ошибка: Интерпретатор не найден', 'error');
                }
            });
        }
    }

    setupClearConsoleBtn() {
        if (this.clearConsoleBtn) {
            this.clearConsoleBtn.addEventListener('click', () => {
                if (this.output) {
                    this.clearConsole();
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new ControlsManager();
});