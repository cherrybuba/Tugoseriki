class ArithmeticError extends Error
{
    constructor(message) {
        super(message);
        this.name = 'ArithmeticError';
    }
}
