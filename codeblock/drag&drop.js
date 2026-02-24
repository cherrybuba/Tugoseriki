class Block {
    constructor(element, blocksContainer, workspace, onLog, onLogAlg) {
        this.element = element;
        this.blocksContainer = blocksContainer;
        this.workspace = workspace;
        this.onLog = onLog;
        this.onLogAlg = onLogAlg;
        
        this.isMoving = false;
        this.offset = { x: 0, y: 0 };
        
        this.moveBlock = this.moveBlock.bind(this);
        this.stopBlockMove = this.stopBlockMove.bind(this);
        
        this.element.classList.add('canvas-block');
        this.element.style.position = 'absolute';
        this.element.style.opacity = '1';
        this.element.removeAttribute('id');

        const blockId = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.element.dataset.blockId = blockId;

        const blockType = this.element.dataset.type;
        if (blockType === 'variable') {
            this.addVariableNameInput();
        } else if (blockType === 'assignment') {
            this.addVariableValueInput();
        }

        this.addMovement();
    }

    setPosition(x, y) {
        this.element.style.visibility = 'hidden';
        this.blocksContainer.appendChild(this.element);

        const blockWidth = this.element.offsetWidth;
        const blockHeight = this.element.offsetHeight;

        this.element.style.left = (x - blockWidth / 2) + 'px';
        this.element.style.top = (y - blockHeight / 2) + 'px';
        this.element.style.visibility = 'visible';
    }

    addVariableNameInput() {
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Имя переменной';
        nameInput.dataset.field = 'varName';
        nameInput.className = 'var-name-input';

        inputsGroup.appendChild(nameInput);
        this.element.appendChild(inputsGroup);

        nameInput.addEventListener('input', () => {
            this.element.dataset.varName = nameInput.value.trim();
        });
    }

    addVariableValueInput() {
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
        valueInput.type = 'text';
        valueInput.placeholder = 'Новое значение';
        valueInput.dataset.field = 'varValue';
        valueInput.className = 'var-value-input';
        valueInput.disabled = true;

        inputsGroup.appendChild(select);
        inputsGroup.appendChild(valueInput);
        this.element.appendChild(inputsGroup);

        const populateVariableSelect = (select, defaultOption) => {
            const currentValue = select.value;
            select.innerHTML = '';
            select.appendChild(defaultOption);

            const variableBlocks = this.blocksContainer.querySelectorAll('.canvas-block[data-type="variable"]');
            variableBlocks.forEach(varBlock => {
                const varNames = (varBlock.dataset.varName || '').replace(/\s+/g, '').split(',');
                for (const name of varNames) {
                    if (name && name.trim() !== '') {
                        const option = document.createElement('option');
                        option.value = name;
                        option.textContent = name;
                        select.appendChild(option);
                    }
                }
            });

            if (currentValue) {
                select.value = currentValue;
            }
        };

        select.addEventListener('click', (e) => {
            e.stopPropagation();
            populateVariableSelect(select, defaultOption);
        });

        select.addEventListener('change', () => {
            const selectedVar = select.value;
            if (selectedVar) {
                valueInput.disabled = false;
                valueInput.placeholder = 'Значение для ' + selectedVar;
                this.element.dataset.selectedVar = selectedVar;
            } else {
                valueInput.disabled = true;
                valueInput.value = '';
                valueInput.placeholder = 'Новое значение';
                this.element.removeAttribute('data-selected-var');
            }
        });

        valueInput.addEventListener('input', () => {
            const selectedVar = this.element.dataset.selectedVar;
            if (selectedVar) {
                this.element.dataset.newValue = valueInput.value;
            }
        });

        select.addEventListener('mousedown', (e) => e.stopPropagation());
        select.addEventListener('click', (e) => e.stopPropagation());
        valueInput.addEventListener('mousedown', (e) => e.stopPropagation());
        valueInput.addEventListener('click', (e) => e.stopPropagation());
    }

    addMovement() {
        this.element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (this.isMoving) return;

            this.isMoving = true;
            
            document.removeEventListener('mousemove', this.moveBlock);
            document.removeEventListener('mouseup', this.stopBlockMove);

            const rect = this.element.getBoundingClientRect();
            this.offset.x = e.clientX - rect.left;
            this.offset.y = e.clientY - rect.top;

            this.element.style.zIndex = '1000';
            this.element.style.opacity = '1';

            document.addEventListener('mousemove', this.moveBlock);
            document.addEventListener('mouseup', this.stopBlockMove, { capture: true });
            
            e.preventDefault();
        });
    }

    moveBlock(e) {
        if (!this.isMoving || !this.workspace) return;

        const workspaceRect = this.workspace.getBoundingClientRect();
        const x = e.clientX - workspaceRect.left - this.offset.x;
        const y = e.clientY - workspaceRect.top - this.offset.y;

        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';

        if (x < 0 || x > workspaceRect.width - this.element.offsetWidth ||
            y < 0 || y > workspaceRect.height - this.element.offsetHeight) {
            this.element.style.opacity = '0.5';
            this.element.style.transform = 'scale(0.9)';
        } else {
            this.element.style.opacity = '0.8';
            this.element.style.transform = 'scale(1)';
        }
    }

    stopBlockMove(e) {
        if (!this.isMoving) return;

        this.checkDeletion();

        this.element.style.zIndex = '10';
        this.element.style.opacity = '1';
        this.element.style.transform = 'scale(1)';

        document.removeEventListener('mousemove', this.moveBlock);
        document.removeEventListener('mouseup', this.stopBlockMove, { capture: true });

        this.isMoving = false;
    }

    checkDeletion() {
        if (!this.workspace) return false;

        const workspaceRect = this.workspace.getBoundingClientRect();
        const blockRect = this.element.getBoundingClientRect();

        const isOutside = (
            blockRect.right < workspaceRect.left ||
            blockRect.left > workspaceRect.right ||
            blockRect.bottom < workspaceRect.top ||
            blockRect.top > workspaceRect.bottom
        );

        if (isOutside) {
            this.element.remove();
            if (this.onLog) this.onLog('Блок удалён');
            return true;
        }
        return false;
    }
}

class DragDropManager {
    constructor(workspace, blocksContainer, onLog, onLogAlg) {
        this.workspace = workspace;
        this.blocksContainer = blocksContainer;
        this.onLog = onLog;
        this.onLogAlg = onLogAlg;
        
        this.draggedBlock = null;

        document.querySelectorAll('.draggable-item').forEach(block => {
            block.addEventListener('dragstart', this.dragStart);
            block.addEventListener('dragend', this.dragEnd);
        });

        if (this.workspace) {
            this.workspace.addEventListener('dragover', this.dragOver);
            this.workspace.addEventListener('drop', this.drop);
            this.workspace.addEventListener('dragenter', (e) => e.preventDefault());
            this.workspace.addEventListener('dragleave', (e) => e.preventDefault());
        }
    }

    dragStart = (e) => {
        this.draggedBlock = e.currentTarget;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/html', this.draggedBlock.outerHTML);
        e.dataTransfer.setData('type', this.draggedBlock.dataset.type || 'default');
        setTimeout(() => this.draggedBlock.style.opacity = '0.5', 0);
    };

    dragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        this.draggedBlock = null;
    };

    dragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    drop = (e) => {
        e.preventDefault();
        if (!this.draggedBlock || !this.workspace) return;

        const workspaceRect = this.workspace.getBoundingClientRect();
        const x = e.clientX - workspaceRect.left;
        const y = e.clientY - workspaceRect.top;

        const newBlockElement = this.draggedBlock.cloneNode(true);
        const block = new Block(newBlockElement, this.blocksContainer, this.workspace, this.onLog);
        block.setPosition(x, y);

        if (this.onLog) this.onLog('Добавлен новый блок');
    };
}