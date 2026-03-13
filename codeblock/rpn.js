class RPN
{
    static precedence = {
        '+': 3,
        '-': 3,
        '*': 4,
        '/': 4,
        '%': 4,
        '^': 6,
        'u-': 5,
        '>': 2,
        '<': 2,
        '>=': 2,
        '>=': 2,
        '!=': 2,
        '==': 2,
        '||': 0,
        '&&': 1,
        '!': 5
    };

    static associativity = {
        '+': 'left',
        '-': 'left',
        '*': 'left',
        '/': 'left',
        '%': 'left',
        '^': 'left',
        'u-': 'right',
        '>': 'left',
        '<': 'left',
        '>=': 'left',
        '>=': 'left',
        '!=': 'left',
        '==': 'left',
        '||': 'left',
        '&&': 'left',
        '!': 'right'
    };

    static shuntingYard(expr) {
        const output = [];
        const stack = [];
        const tokens = this.tokenize(expr);

        for (let i = 0; i < tokens.length; ++i) {
            let token = tokens[i];
            const prevToken = i > 0 ? tokens[i - 1] : null;

            if (this.isUnary(token, prevToken)) {
                token = 'u-';
            }
            if (this.isNumber(token) || this.isVariable(token) || /\[(.*)\]$/.test(token)) {
                output.push(token);
            } else if (this.isOperator(token)) {
                while (stack.length > 0 &&
                       this.shouldPopOperator(token, stack[stack.length - 1]))
                {
                    const popped = stack.pop();
                    output.push(popped);
                }
                stack.push(token);
            } else if (token === '(') {
                stack.push(token);
            } else if (token === ')') {
                while (stack.length > 0 && stack[stack.length - 1] !== '(') {
                    const popped = stack.pop();
                    output.push(popped);
                }

                if (stack.length === 0) {
                    throw new SyntaxError('Непарная скобка');
                }

                stack.pop();
            }
        }

        while (stack.length > 0) {
            const op = stack.pop();
            if (op !== '(') {
                output.push(op);
            } else throw new SyntaxError('Непарная скобка')
        }

        return output;
    }

    static calculate (variables, expr) {
        const tokens = this.shuntingYard(expr);
        const stack = [];
        for (let token of tokens) {
            if (this.isVariable(token)) {
                if (!variables.has(token)) throw new ReferenceError(`Переменная ${token} не объявленна`);
                if (variables.get(token).type === 'array')
                    throw new SyntaxError(`Массив ${token} не может использоваться в выражении (требуется обращение по индексу)`);
                stack.push(variables.get(token).value);
            } else if (/\[(.*)\]$/.test(token)) {
                const arrName = token.slice(0, token.indexOf('['));
                if (!variables.has(arrName)) throw new ReferenceError(`Переменная ${arrName} не объявленна`);
                if (variables.get(arrName).type === 'number') {
                    throw new SyntaxError(`${arrName} - численная переменная, обращение по индексу не возможно`);
                }
                let index = token.slice(token.indexOf('[') + 1, token.indexOf(']'));
                index = this.calculate(variables, index);
                if (index < 0 || index >= variables.get(arrName).value.length) {
                    throw new ReferenceError(`Индекс ${index} выходит за пределы массива ${arrName}`);
                }
                stack.push(variables.get(arrName).value[index]);
            } else if (this.isNumber(token)) {
                stack.push(parseInt(token));
            } else if (token === 'u-') {
                const a = stack.pop();
                if (a === undefined) {
                    throw new SyntaxError('Недостаточно операндов');
                }
                stack.push(-a);
            } else if (token === '!') {
                const a = stack.pop();
                if (a === undefined) {
                    throw new SyntaxError('Недостаточно операндов');
                }
                stack.push(Number(!a));
            } else if (this.isOperator(token)) {
                const b = stack.pop();
                const a = stack.pop();

                if (a === undefined || b === undefined) {
                    throw new SyntaxError('Недостаточно операндов');
                }

                switch (token) {
                    case '+': stack.push(a + b); break;
                    case '-': stack.push(a - b); break;
                    case '*': stack.push(a * b); break;
                    case '/':
                        if (b === 0) throw new ArithmeticError('Деление на ноль');
                        stack.push(parseInt(a / b));
                        break;
                    case '%':
                        if (b === 0) throw new ArithmeticError('Деление на ноль');
                        stack.push(a % b);
                        break;
                    case '^': stack.push(Math.pow(a, b)); break;
                    case '>':
                        stack.push(Number(a > b)); break;
                    case '<':
                        stack.push(Number(a < b)); break;
                    case '>=':
                        stack.push(Number(a >= b)); break;
                    case '<=':
                        stack.push(Number(a <= b)); break;
                    case '==':
                        stack.push(Number(a == b)); break;
                    case '!=':
                        stack.push(Number(a != b)); break;
                    case '||':
                        stack.push(Number(a || b)); break;
                    case '&&':
                        stack.push(Number(a && b)); break;
                }
            }
        }

        const result = stack.pop();

        return (result === undefined) ? 0 : result;
    }

    static isUnary(token, prevToken) {
        if (token === '-' && prevToken === null) return true;
        if (token === '-' && (this.isOperator(prevToken) || prevToken === '(')) return true;
        return false;
    }

    static shouldPopOperator(currentOp, stackOp) {
        if (this.precedence[stackOp] > this.precedence[currentOp] ||
            (this.precedence[stackOp] === this.precedence[currentOp] &&
            this.associativity[currentOp] === 'left')) {
            return true;
        }

        return false;
    }

    static tokenize(expr)
    {
        const tokens = [];
        let buffer = '';
        let bufferType;

        for (const char of expr) {
            if (char === ' ') continue;

            if (buffer.length === 0) {
                if (this.isDigit(char)) {
                    bufferType = 'number';
                } else if (this.isLetter(char)) {
                    bufferType = 'variable';
                } else if (this.isLogicSymbol(char)) {
                    bufferType = 'logic';
                }
            }
            if (bufferType === 'array' && char === ']') {
                buffer += char;
                tokens.push(buffer);
                buffer = '';
                bufferType = '';
            } else if (bufferType === 'array') {
                buffer += char;
            } else if (this.isDigit(char)) {
                if (bufferType === 'logic') {
                    if (this.isLogicOperator(buffer)) {
                        tokens.push(buffer);
                        buffer = char;
                        bufferType = 'number';
                    } else {
                        throw new SyntaxError('Недопустимый оператор сравнения - ' + buffer);
                    }
                } else buffer += char;
            } else if (this.isVariableSymbol(char)) {
                if (bufferType === 'logic') {
                    if (this.isLogicOperator(buffer)) {
                        tokens.push(buffer);
                        buffer = char;
                        bufferType = 'variable';
                    } else {
                        throw new SyntaxError('Недопустимый оператор сравнения - ' + buffer);
                    }
                } else if (bufferType === 'number') {
                    throw new SyntaxError('Недопустимое имя переменной - ' + buffer + char);
                } else buffer += char;
            } else if (this.isLogicSymbol(char)) {
                if (bufferType === 'number' || bufferType === 'variable') {
                    tokens.push(buffer);
                    buffer = char;
                    bufferType = 'logic';
                } else buffer += char;
            } else if (bufferType === 'variable' && char === '[') {
                bufferType = 'array';
                buffer += char;
            } else {
                if (buffer) {
                    if (bufferType === 'logic' && !this.isLogicOperator(buffer)) {
                        throw new SyntaxError('Недопустимый оператор сравнения - ' + buffer);
                    }
                    tokens.push(buffer);
                    buffer = '';
                }

                if (this.isArithmeticOperator(char) || char === '(' || char === ')') {
                    tokens.push(char);
                } else throw new SyntaxError('Недопустимый символ - ' + char);
            }
        }

        if (buffer) {
            tokens.push(buffer);
        }

        return tokens;
    }

    static isDigit (char) {
        return /[0-9]/.test(char);
    }

    static isLetter (char) {
        return /[a-zA-Zа-яА-ЯёЁ_]/.test(char);
    }

    static isArithmeticOperator (char) {
        return ['+', '-', '*', '/', '%', '^', 'u-'].includes(char);
    }

    static isLogicSymbol (char) {
        return ['>', '<', '=', '!', '|', '&'].includes(char);
    }

    static isLogicOperator (token) {
        return ['>', '<', '>=', '<=', '!=', '==', '||', '&&', '!'].includes(token);
    }

    static isOperator(token) {
        return ['+', '-', '*', '/', '%', '^', 'u-', '>', '<', '>=', '<=', '!=', '==', '&&', '||', '!'].includes(token);
    }

    static isVariableSymbol(char) {
        return /[a-zA-Zа-яА-ЯёЁ0-9_]/.test(char);
    }

    static isVariable(token) {
        if (!this.isLetter(token[0])) return false;

        for (const char of token) {
            if (!this.isVariableSymbol(char)) return false;
        }

        return true;
    }

    static isNumber(token) {
        return !isNaN(token);
    }
}
