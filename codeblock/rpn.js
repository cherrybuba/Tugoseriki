class RPN
{
    static precedence = {
        '+': 2,
        '-': 2,
        '*': 3,
        '/': 3,
        '%': 3,
        '^': 5,
        'u-': 4,
        '>': 1,
        '<': 1,
        '>=': 1,
        '>=': 1,
        '!=': 1,
        '==': 1
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
        '==': 'left'
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
            if (this.isNumber(token) || this.isVariable(token)) {
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
                stack.push(variables.get(token).value);
            } else if (this.isNumber(token)) {
                stack.push(parseInt(token));
            } else if (token === 'u-') {
                const a = stack.pop();
                if (a === undefined)
                {
                    throw new SyntaxError('Недостаточно операндов');
                }
                stack.push(-a);
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
                    bufferType = 'variable'
                } else if (this.isComparisonSymbol(char)) {
                    bufferType = 'compare';
                }
            }
            if (this.isDigit(char)) {
                if (bufferType === 'compare') {
                    if (this.isComparisonOperator(buffer)) {
                        tokens.push(buffer);
                        buffer = char;
                        bufferType = 'number';
                    } else {
                        throw new SyntaxError('Недопустимый оператор сравнения - ' + buffer);
                    }
                } else buffer += char;
            } else if (this.isVariableSymbol(char)) {
                if (bufferType === 'compare') {
                    if (this.isComparisonOperator(buffer)) {
                        tokens.push(buffer);
                        buffer = char;
                        bufferType = 'variable';
                    } else {
                        throw new SyntaxError('Недопустимый оператор сравнения - ' + buffer);
                    }
                } else if (bufferType === 'number') {
                    throw new SyntaxError('Недопустимое имя переменной - ' + buffer + char);
                } else buffer += char;
            } else if (this.isComparisonSymbol(char)) {
                if (bufferType === 'number' || bufferType === 'variable') {
                    tokens.push(buffer);
                    buffer = char;
                    bufferType = 'compare';
                } else buffer += char;
            } else {
                if (buffer) {
                    if (bufferType === 'compare' && !this.isComparisonOperator(buffer)) {
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

    static isComparisonSymbol (char) {
        return ['>', '<', '=', '!'].includes(char);
    }

    static isComparisonOperator (token) {
        return ['>', '<', '>=', '<=', '!=', '=='].includes(token);
    }

    static isOperator(token) {
        return ['+', '-', '*', '/', '%', '^', 'u-', '>', '<', '>=', '<=', '!=', '=='].includes(token);
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

