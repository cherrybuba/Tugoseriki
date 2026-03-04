class Interpreter
{
    constructor () {
        this.blocks = document.getElementById('blocks-container').querySelectorAll(':scope > [class*="canvas-block"]');
        this.variables = new Map();
    }

    runAlgorithm(blocks) {
        let variablesScope = [];
        this.clearErrorHighlight();
        for (const block of blocks) {
            const blockType = block.dataset.type;
            const input = block.querySelector('input');
            const select = block.querySelector('select');

            switch (blockType) {
                case 'variable':
                    try {
                        this.createVariables(input.value, variablesScope);
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
                case 'if':
                    try {
                        this.executeIfStatement(input.value, block.querySelector('[class*="nested-container"]'));
                    }
                    catch (error) {
                        return;
                    }
                    break;
                case 'while':
                    try {
                        this.executeWhileLoop(input.value, block.querySelector('[class*="nested-container"]'));
                    }
                    catch (error) {
                        return;
                    }
                    break;
            }
        }
        for (const name of variablesScope) {
            this.variables.delete(name);
        }
    }

    createVariables (names, variablesScope) {
        const varNames = names.replace(/\s+/g, '').split(',');
        varNames.forEach(name => {
            if (this.isValidName(name)) {
                this.variables.set(name, {type: 'number', value: 0});
                variablesScope.push(name);
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

    executeIfStatement (condition, innerBlock) {
        if (RPN.calculate(this.variables, condition)) {
            logToConsole('Условие ' + condition + ' истинно');
            this.runAlgorithm(innerBlock.querySelectorAll(':scope > [class*="canvas-block"]'));
            return;
        }
        logToConsole('Условие ' + condition + ' ложно');
    }

    executeWhileLoop (condition, innerBlock) {
        let count = 0;
        while (RPN.calculate(this.variables, condition)) {
            this.runAlgorithm(innerBlock.querySelectorAll(':scope > [class*="canvas-block"]'));
           ++count;
        }
        logToConsole('Цикл while выполнился ' + count + ' раз');
    }
}
