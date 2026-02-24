class Interpreter
{
    constructor () {
        this.blocks = document.getElementById('blocks-container').querySelectorAll('[class*="canvas-block"]');
        this.variables = new Map();
    }

    runAlgotithm() {
        this.clearErrorHighlight();
        for (const block of this.blocks) {
            const blockType = block.dataset.type;
            const input = block.querySelector('input');
            const select = block.querySelector('select');

            switch (blockType) {
                case 'variable':
                    try {
                        this.createVariables(input.value);
                        logToConsole(`Объявлена переменная ${input.value}`)
                    }
                    catch (error) {
                        this.handleDeclarationError(error, block);
                        return;
                    }
                    break;
                case 'assignment':
                    try {
                        this.defineVariable(select.value, input.value);
                        logToConsole(`Переменной ${select.value} присвоено значение ${this.variables.get(select.value).value}`);
                    }
                    catch (error) {
                        this.handleDefineError(error, block);
                        return;
                    }
                    break;
            }
        }
    }

    createVariables (names) {
        const varNames = names.replace(/\s+/g, '').split(',');
        varNames.forEach(name => {
            if (this.isValidName(name)) {
                this.variables.set(name, {type: 'number', value: 0});
            }
        });
    }

    isValidName (name) {
        if (!(/[a-zA-Zа-яА-ЯёЁ_]/.test(name[0]))) {
            throw new SyntaxError(`Недопустимое имя переменной - ${name}`);
        }

        for (const char of name) {
            if (!(/[a-zA-Zа-яА-ЯёЁ0-9_]/.test(char))) {
                throw new SyntaxError(`Недопустимое имя переменной - ${name}`);
            }
        }

        if (this.variables.has(name)) {
            throw new ReferenceError(`Переменная ${name} уже объявлена`);
        }

        return true;
    }

    clearErrorHighlight() {
        document.querySelectorAll('.canvas-block.error-highlight').forEach(block => {
            block.classList.remove('error-highlight');
        });
    }

    highlightBlock(block) {
        if (block) {
            block.classList.add('error-highlight');
        }
    }

    handleDeclarationError (error, block) {
        this.highlightBlock(block);
        switch (error.name) {
            case 'SyntaxError':
                logToConsole(error.message);
                break;
            case 'ReferenceError':
                logToConsole(error.message);
                break;
        }
    }

    defineVariable (name, expression) {
        if (!expression) return;

        const variable = this.variables.get(name);
        const value = RPN.calculate(this.variables, expression);
        variable.value = value;
    }

    handleDefineError (error, block) {
        this.highlightBlock(block);
        switch (error.name) {
            case 'ArithmeticError':
                logToConsole(error.message);
                break;
            case 'SyntaxError':
                logToConsole(error.message);
                break;
            case 'ReferenceError':
                logToConsole(error.message);
                break;
        }
    }
}
