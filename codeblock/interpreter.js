class Interpreter
{
    constructor (onLog, onLogAlg) {
        this.blocks = document.getElementById('blocks-container').querySelectorAll(':scope > [class*="canvas-block"]');
        this.variables = new Map();
        this.onLog = onLog;
        this.onLogAlg = onLogAlg;
    }

    runAlgorithm(blocks) {
        if (!blocks || blocks.length === 0) {
            if (this.onLogAlg) this.onLogAlg('Нет блоков для выполнения');
            return;
        }
        let variablesScope = [];
        this.clearErrorHighlight();
        for (const block of blocks) {
            const blockType = block.dataset.type;
            const input = block.querySelectorAll('input');
            const select = block.querySelector('select');

            switch (blockType) {
                case 'variable':
                    try {
                        this.createVariables(input[0].value, variablesScope);
                        if (this.onLogAlg) this.onLogAlg(`Объявлена переменная ${input[0].value}`);
                    }
                    catch (error) {
                        this.handleDeclarationError(error, block);
                        return;
                    }
                    break;
                case 'array':
                    try {
                        this.createArray(input[0].value, input[1].value, variablesScope);
                        if (this.onLogAlg) this.onLogAlg(`Объявлен массив ${input[0].value} размером ${this.variables.get(input[0].value).value.length}`);
                    }
                    catch (error) {
                        this.handleDeclarationError(error, block);
                        return;
                    }
                    break;
                case 'assignment':
                    try {
                        this.defineVariable(select.value, input[0].value);
                        if (this.onLogAlg) this.onLogAlg(`Переменной ${select.value} присвоено значение ${this.variables.get(select.value).value}`);
                    }
                    catch (error) {
                        this.handleDefineError(error, block);
                        return;
                    }
                    break;
                case 'assignment array':
                    try {
                        this.defineArray(select.value, input[0].value, input[1].value);
                        if (this.onLogAlg) this.onLogAlg(`Массиву ${select.value} присвоено значение ${this.variables.get(select.value).value}`);
                    }
                    catch (error) {
                        this.handleDefineError(error, block);
                        return;
                    }
                    break;
                case 'if':
                    try {
                        this.executeIfStatement(input[0].value, block);
                    }
                    catch (error) {
                        this.handleConditionError(error, block);
                        return;
                    }
                    break;
                case 'while':
                    try {
                        this.executeWhileLoop(input[0].value, block.querySelector('[class*="nested-container"]'));
                    }
                    catch (error) {
                        this.handleConditionError(error, block);
                        return;
                    }
                    break;
                case 'print':
                    try {
                        const result = RPN.calculate(this.variables, input[0].value);
                        if (this.onLogAlg) this.onLogAlg(result);
                    }
                    catch (error) {
                        this.handlePrintError(error, block);
                        return;
                    }
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

    createArray(name, size, variablesScope) {
        if (!this.isValidName(name)) return;

        size = RPN.calculate(this.variables, size);

        if(size <= 0) throw new SyntaxError(`Недопустимый размер массива - ${size}`);

        this.variables.set(name, {type: 'array', value: new Array(Number(size)).fill(0)});
        variablesScope.push(name);
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
        if (this.onLogAlg) this.onLogAlg(error.message);
    }

    defineVariable (name, expression) {
        if (!expression) return;

        const variable = this.variables.get(name);
        const value = RPN.calculate(this.variables, expression);
        variable.value = value;
    }

    defineArray(name, index, expression) {
        if (!expression) return;
        const variable = this.variables.get(name);
        if (index === '') {
            const expressions = expression.replace(/\s+/g, '').split(',');
            for (let i = 0; i < Math.min(expressions.length, variable.value.length); i++) {
                variable.value[i] = RPN.calculate(this.variables, expressions[i]);
            }
        } else {
            index = RPN.calculate(this.variables, index);
            if (index >= 0 && index < variable.value.length) {
                variable.value[index] = RPN.calculate(this.variables, expression);
            } else {
                throw new ReferenceError(`Выход за предел массива - ${index}`);
            }
        }
    }

    handleDefineError (error, block) {
        this.highlightBlock(block);
        if (this.onLogAlg) this.onLogAlg(error.message);
    }

    executeIfStatement (condition, block) {
        const ifBlock = block.querySelector('[class*="nested-container"]');
        if (RPN.calculate(this.variables, condition)) {
            if (this.onLogAlg) this.onLogAlg('Условие ' + condition + ' истинно');
            this.runAlgorithm(ifBlock.querySelectorAll(':scope > [class*="canvas-block"]'));
            return;
        }
        if (this.onLogAlg) this.onLogAlg('Условие ' + condition + ' ложно');
        const elseBlock = block.querySelector('[class*="else-blocks-container"]');
        if (elseBlock) {
            this.runAlgorithm(elseBlock.querySelectorAll(':scope > [class*="canvas-block"]'));
        }
    }

    executeWhileLoop (condition, innerBlock) {
        let count = 0;
        while (RPN.calculate(this.variables, condition)) {
            this.runAlgorithm(innerBlock.querySelectorAll(':scope > [class*="canvas-block"]'));
           ++count;
        }
        if (this.onLogAlg) this.onLogAlg('Цикл while выполнился ' + count + ' раз');
    }

    handleConditionError(error, block) {
        this.highlightBlock(block);
        if (this.onLogAlg) this.onLogAlg(error.message);
    }

    handlePrintError(error, block) {
        this.highlightBlock(block);
        if (this.onLogAlg) this.onLogAlg(error.message);
    }
}
