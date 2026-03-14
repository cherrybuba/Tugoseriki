async function startDebug() {
    const blocks = document.querySelectorAll('.canvas-block');
    const consoleDiv = document.getElementById('output');
    const algDiv = document.getElementById('output-alg');
    
    algDiv.innerHTML = '';
    consoleDiv.innerHTML += `<div class="log-line system">> Запуск отладки...</div>`;
    algDiv.innerHTML += `<div class="log-line system-alg">> Начало выполнения программы</div>`;

    for (let block of blocks) {
        block.classList.add('debug-active');
        
        block.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});

        const blockType = block.getAttribute('data-type');
        
        algDiv.innerHTML += `<div class="log-line system-alg">> Выполняется: ${getBlockName(blockType)}</div>`;

        await new Promise(r => setTimeout(r, 1000));
        
        switch(blockType) {
            case 'print':
                handlePrintBlock(block, consoleDiv, algDiv);
                break;
                
            case 'variable':
                handleVariableBlock(block, algDiv);
                break;
                
            case 'array':
                handleArrayBlock(block, algDiv);
                break;
                
            case 'assignment':
                handleAssignmentBlock(block, algDiv);
                break;
                
            case 'assignment array':
                handleArrayAssignmentBlock(block, algDiv);
                break;
                
            case 'if':
                handleIfBlock(block, algDiv);
                break;
                
            case 'while':
                handleWhileBlock(block, algDiv);
                break;
                
            default:
                algDiv.innerHTML += `<div class="log-line error-alg">! Неизвестный тип блока: ${blockType}</div>`;
        }

        block.classList.remove('debug-active');
    }
    
    consoleDiv.innerHTML += `<div class="log-line system">> Отладка завершена.</div>`;
    algDiv.innerHTML += `<div class="log-line system-alg">> Программа завершена</div>`;
}

function getBlockName(type) {
    const names = {
        'print': 'Вывод',
        'variable': 'Объявление переменной',
        'array': 'Объявление массива',
        'assignment': 'Присваивание (int)',
        'assignment array': 'Присваивание (array)',
        'if': 'Условный оператор IF',
        'while': 'Цикл While'
    };
    return names[type] || type;
}

function handlePrintBlock(block, consoleDiv, algDiv) {
    const input = block.querySelector('input');
    if (input) {
        const val = input.value;
        consoleDiv.innerHTML += `<div class="log-line success">> ${val || "Пусто"}</div>`;
        algDiv.innerHTML += `<div class="log-line success-alg">✓ Выведено: ${val || "Пусто"}</div>`;
    }
}

function handleVariableBlock(block, algDiv) {
    const inputs = block.querySelectorAll('input');
    if (inputs.length >= 2) {
        const varName = inputs[0].value || "unnamed";
        const varValue = inputs[1].value || "0";
        algDiv.innerHTML += `<div class="log-line success-alg">✓ Объявлена переменная: ${varName} = ${varValue}</div>`;
    }
}

function handleArrayBlock(block, algDiv) {
    const inputs = block.querySelectorAll('input');
    if (inputs.length >= 2) {
        const arrName = inputs[0].value || "unnamed";
        const arrSize = inputs[1].value || "0";
        algDiv.innerHTML += `<div class="log-line success-alg">✓ Объявлен массив: ${arrName}[${arrSize}]</div>`;
    }
}

function handleAssignmentBlock(block, algDiv) {
    const inputs = block.querySelectorAll('input');
    if (inputs.length >= 2) {
        const varName = inputs[0].value || "unnamed";
        const varValue = inputs[1].value || "0";
        algDiv.innerHTML += `<div class="log-line success-alg">✓ Присвоено значение: ${varName} = ${varValue}</div>`;
    }
}

function handleArrayAssignmentBlock(block, algDiv) {
    const inputs = block.querySelectorAll('input');
    if (inputs.length >= 3) {
        const arrName = inputs[0].value || "unnamed";
        const index = inputs[1].value || "0";
        const value = inputs[2].value || "0";
        algDiv.innerHTML += `<div class="log-line success-alg">✓ Присвоено значение: ${arrName}[${index}] = ${value}</div>`;
    }
}

function handleIfBlock(block, algDiv) {
    const selects = block.querySelectorAll('select');
    const inputs = block.querySelectorAll('input');
    
    if (selects.length >= 1 && inputs.length >= 2) {
        const leftVar = inputs[0].value || "0";
        const operator = selects[0].value || "==";
        const rightVar = inputs[1].value || "0";
        
        algDiv.innerHTML += `<div class="log-line info-alg">? Проверка условия: ${leftVar} ${operator} ${rightVar}</div>`;
        
        const condition = simulateCondition(leftVar, operator, rightVar);
        algDiv.innerHTML += `<div class="log-line ${condition ? 'success-alg' : 'error-alg'}">→ Результат: ${condition ? 'ИСТИНА' : 'ЛОЖЬ'}</div>`;
    }
}

function handleWhileBlock(block, algDiv) {
    const selects = block.querySelectorAll('select');
    const inputs = block.querySelectorAll('input');
    
    if (selects.length >= 1 && inputs.length >= 2) {
        const leftVar = inputs[0].value || "0";
        const operator = selects[0].value || "==";
        const rightVar = inputs[1].value || "0";
        
        algDiv.innerHTML += `<div class="log-line info-alg">⟲ Проверка условия цикла: ${leftVar} ${operator} ${rightVar}</div>`;
        
        algDiv.innerHTML += `<div class="log-line warning-alg">⟲ Выполнена итерация цикла</div>`;
    }
}

function simulateCondition(left, operator, right) {
    const leftNum = parseFloat(left);
    const rightNum = parseFloat(right);
    
    if (!isNaN(leftNum) && !isNaN(rightNum)) {
        switch(operator) {
            case '==': return leftNum == rightNum;
            case '!=': return leftNum != rightNum;
            case '<': return leftNum < rightNum;
            case '>': return leftNum > rightNum;
            case '<=': return leftNum <= rightNum;
            case '>=': return leftNum >= rightNum;
            default: return false;
        }
    }
    return false;
}

function clearAlgConsole() {
    const algDiv = document.getElementById('output-alg');
    if (algDiv) {
        algDiv.innerHTML = '<div class="log-line system-alg">> Пусто!</div>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const clearAlgBtn = document.getElementById('clear-console-btn-alg');
    if (clearAlgBtn) {
        clearAlgBtn.addEventListener('click', clearAlgConsole);
    }
});
