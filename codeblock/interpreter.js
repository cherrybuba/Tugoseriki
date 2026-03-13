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
            const input = block.querySelectorAll('input');
            const select = block.querySelector('select');

            switch (blockType) {
                case 'variable':
                    try {
                        this.createVariables(input[0].value, variablesScope);
                        logToConsole(`Объявлена переменная ${input[0].value}`)
                    }
                    catch (error) {
                        this.handleDeclarationError(error, block);
                        return;
                    }
                    break;
                case 'array':
                    try {
                        this.createArray(input[0].value, input[1].value, variablesScope);
                        logToConsole(`Объявлен массив ${input[0].value} размером ${this.variables.get(input[0].value).value.length}`)
                    }
                    catch (error) {
                        this.handleDeclarationError(error, block);
                        return;
                    }
                    break;
                case 'assignment':
                    try {
                        this.defineVariable(select.value, input[0].value);
                        logToConsole(`Переменной ${select.value} присвоено значение ${this.variables.get(select.value).value}`);
                    }
                    catch (error) {
                        this.handleDefineError(error, block);
                        return;
                    }
                    break;
                case 'assignmentArray':
                    try {
                        this.defineArray(select.value, input[0].value, input[1].value);
                        logToConsole(`Массиву ${select.value} присвоено значение ${this.variables.get(select.value).value}`);
                    }
                    catch (error) {
                        this.handleDefineError(error, block);
                        return;
                    }
                    break;
                case 'if':
                    try {
                        this.executeIfStatement(input[0].value, block.querySelector('[class*="nested-container"]'));
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
                        logToConsole(RPN.calculate(this.variables, input[0].value));
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

    handleConditionError(error, block) {
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

    handlePrintError(error, block) {
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
