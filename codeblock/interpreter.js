class Interpreter
{
    constructor () {
        this.blocks = document.getElementById('blocks-container').querySelectorAll('[class*="canvas-block"]');
        this.variables = new Map();
    }

    runAlgotithm() {
        this.blocks.forEach(block => {

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
                    }
                    break;
                case 'assignment':
                    try {
                        this.defineVariable(select.value, input.value);
                        logToConsole(`Переменной ${select.value} присвоено значение ${this.variables.get(select.value).value}`);
                    }
                    catch (error) {
                        this.handleDefineError(error, block);
                    }
                    break;
            }
        })
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
            throw new SyntaxError('Недопустимое имя переменной');
        }

        for (const char of name) {
            if (!(/[a-zA-Zа-яА-ЯёЁ0-9_]/.test(char))) {
                throw new SyntaxError('Недопустимое имя переменной');
            }
        }

        if (this.variables.has(name)) {
            throw new ReferenceError('Переменная \'${name}\'уже объявлена');
        }

        return true;
    }

    handleDeclarationError (error, block) {
        switch (error.name) {
            case 'SyntaxError':
                break;
            case 'ReferenceError':
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
        switch (error.name) {
            case 'ArithmeticError':
                break;
            case 'SyntaxError':
                switch (error.message) {
                    case 'Непарная скобка':
                        break;
                    case 'Недостаточно операндов':
                        break;
                    case 'Недопустимое имя переменной':
                        break;
                    case 'Недопустимый символ':
                        break;
                }
                break;
            case 'ReferenceError':
                break;
        }
    }
}
