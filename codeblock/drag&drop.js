document.addEventListener('DOMContentLoaded', function() {
    const workspace = document.querySelector('.workspace');
    const blocksContainer = document.getElementById('blocks-container');
    const output = document.getElementById('output');
    const clearBtn = document.getElementById('clear-btn');
    const runBtn = document.getElementById('run-btn');
    const clearConsoleBtn = document.getElementById('clear-console-btn');

    let draggedBlock = null;
    let activeBlock = null;
    let offset = { x: 0, y: 0 };
    let blockToDelete = null;

    document.querySelectorAll('.draggable-item').forEach(block => {
        block.addEventListener('dragstart', dragStart);
        block.addEventListener('dragend', dragEnd);
    });

    if (workspace) {
        workspace.addEventListener('dragover', dragOver);
        workspace.addEventListener('drop', drop);
        workspace.addEventListener('dragenter', (e) => e.preventDefault());
        workspace.addEventListener('dragleave', (e) => e.preventDefault());
    }

    document.addEventListener('mouseup', globalMouseUp);

    function dragStart(e) {
        draggedBlock = this;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/html', this.outerHTML);
        e.dataTransfer.setData('type', this.dataset.type || 'default');

        setTimeout(() => this.style.opacity = '1', 0);
    }

    function dragEnd(e) {
        this.style.opacity = '1';
        draggedBlock = null;
    }

    function dragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    function drop(e) {
        e.preventDefault();

        if (!draggedBlock) return;

        const workspaceRect = workspace.getBoundingClientRect();
        const x = e.clientX - workspaceRect.left;
        const y = e.clientY - workspaceRect.top;

        if (x < 0 || x > workspaceRect.width || y < 0 || y > workspaceRect.height) {
            console.log('Блок сброшен за пределами workspace');
            return;
        }

        const newBlock = draggedBlock.cloneNode(true);
        newBlock.classList.add('canvas-block');
        newBlock.style.opacity = '1';
        newBlock.removeAttribute('id');

        const blockId = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        newBlock.dataset.blockId = blockId;
        const blockType = newBlock.dataset.type;

        if (blockType === 'variable') {
            addVariableNameInput(newBlock);
        }

        if (blockType === 'assignment') {
            addVariableValueInput(newBlock);
        }

        newBlock.style.position = 'absolute';
        newBlock.style.visibility = 'hidden';
        blocksContainer.appendChild(newBlock);

        const blockWidth = newBlock.offsetWidth;
        const blockHeight = newBlock.offsetHeight;

        newBlock.style.left = (x - blockWidth / 2) + 'px';
        newBlock.style.top = (y - blockHeight / 2) + 'px';
        newBlock.style.visibility = 'visible';

        addBlockMovement(newBlock);
    }

    function addVariableNameInput(block) {
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Имя переменной';
        nameInput.dataset.field = 'varName';
        nameInput.className = 'var-name-input';

        inputsGroup.appendChild(nameInput);
        block.appendChild(inputsGroup);

        nameInput.addEventListener('input', function() {
            block.dataset.varName = nameInput.value.trim();
        });
    }

    function addVariableValueInput(block) {
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const select = document.createElement('select');
        select.className = 'var-selector';
        select.dataset.field = 'varSelector';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите переменную';
        select.appendChild(defaultOption);

        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.placeholder = 'Новое значение';
        valueInput.dataset.field = 'varValue';
        valueInput.className = 'var-value-input';
        valueInput.disabled = true;

        inputsGroup.appendChild(select);
        inputsGroup.appendChild(valueInput);
        block.appendChild(inputsGroup);

        select.addEventListener('click', function() {
            const currentValue = select.value;

            select.innerHTML = '';
            select.appendChild(defaultOption);

            const variableBlocks = blocksContainer.querySelectorAll('.canvas-block[data-type="variable"]');

            variableBlocks.forEach(varBlock => {
                const varName = varBlock.dataset.varName;
                if (varName && varName.trim() !== '') {
                    const option = document.createElement('option');
                    option.value = varName;
                    option.textContent = varName;
                    select.appendChild(option);
                }
            });

            if (currentValue) {
                select.value = currentValue;
            }
        });

        select.addEventListener('change', function() {
            const selectedVar = select.value;

            if (selectedVar) {
                valueInput.disabled = false;
                valueInput.placeholder = 'Значение для ' + selectedVar;
                block.dataset.selectedVar = selectedVar;
            } else {
                valueInput.disabled = true;
                valueInput.value = '';
                valueInput.placeholder = 'Новое значение';
                block.removeAttribute('data-selected-var');
            }
        });

        valueInput.addEventListener('input', function() {
            const selectedVar = block.dataset.selectedVar;
            if (selectedVar) {
                block.dataset.newValue = valueInput.value;
            }
        });

        select.addEventListener('mousedown', (e) => e.stopPropagation());
        select.addEventListener('click', (e) => e.stopPropagation());
        valueInput.addEventListener('mousedown', (e) => e.stopPropagation());
        valueInput.addEventListener('click', (e) => e.stopPropagation());
    }

    function addBlockMovement(block) {
        block.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'INPUT') return;

            activeBlock = this;
            blockToDelete = this;

            const rect = this.getBoundingClientRect();
            offset.x = e.clientX - rect.left;
            offset.y = e.clientY - rect.top;

            this.style.zIndex = '1000';
            this.style.opacity = '1';

            document.addEventListener('mousemove', moveBlock);

            e.preventDefault();
        });
    }

    function moveBlock(e) {
        if (!activeBlock) return;

        const workspaceRect = workspace.getBoundingClientRect();
        const x = e.clientX - workspaceRect.left - offset.x;
        const y = e.clientY - workspaceRect.top - offset.y;

        activeBlock.style.left = x + 'px';
        activeBlock.style.top = y + 'px';

        if (x < 0 || x > workspaceRect.width - activeBlock.offsetWidth ||
            y < 0 || y > workspaceRect.height - activeBlock.offsetHeight) {
            activeBlock.style.opacity = '0.5';
            activeBlock.style.transform = 'scale(0.9)';
        } else {
            activeBlock.style.opacity = '0.8';
            activeBlock.style.transform = 'scale(1)';
        }
    }

    function stopBlockMove() {
        if (activeBlock) {
            activeBlock.style.zIndex = '10';
            activeBlock.style.opacity = '1';
            activeBlock.style.transform = 'scale(1)';
            activeBlock = null;
        }
        document.removeEventListener('mousemove', moveBlock);
    }

    function globalMouseUp(e) {
        if (!blockToDelete) return;

        const workspaceRect = workspace.getBoundingClientRect();
        const blockRect = blockToDelete.getBoundingClientRect();

        const isOutside = (
            blockRect.right < workspaceRect.left ||
            blockRect.left > workspaceRect.right ||
            blockRect.bottom < workspaceRect.top ||
            blockRect.top > workspaceRect.bottom
        );

        if (isOutside) {
            blockToDelete.remove();
            logToConsole('Блок удалён');
            console.log('Блок удалён за пределами workspace');
        }

        blockToDelete = null;
        stopBlockMove();
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (blocksContainer) {
                blocksContainer.innerHTML = '';
            }
            logToConsole('Рабочая область очищена');
        });
    }

    if (runBtn) {
        runBtn.addEventListener('click', function() {
            const interpreter = new Interpreter();
            interpreter.runAlgotithm();
            for (let [variable, info] of interpreter.variables) {
                console.log('Переменная:', variable, 'Значение:', info.value);
            }
            const event = new CustomEvent('programRun', { detail: interpreter.variables });
            document.dispatchEvent(event);
        });
    }

    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', function() {
            if (output) {
                output.innerHTML = '<div class="log-line system">> Готов!</div>';
            }
        });
    }

    function logToConsole(message) {
        if (output) {
            const line = document.createElement('div');
            line.className = 'log-line';
            line.textContent = '> ' + message;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
        } else {
            console.log('Console:', message);
        }
    }
});
