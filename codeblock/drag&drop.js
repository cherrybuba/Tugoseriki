class Block {
    constructor(element, blocksContainer, workspace, onLog, onLogAlg) {
        this.element = element;
        this.blocksContainer = blocksContainer;
        this.workspace = workspace;
        this.onLog = onLog;
        this.onLogAlg = onLogAlg;

        this.isMoving = false;
        this.offset = { x: 0, y: 0 };

        this.currentScale = 1;
        
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
        } else if (blockType === 'if' || blockType === 'while') {
            this.addConditionInput();
            this.addNestedContainer();
        }

        this.addMovement();
        
        this.setupScaleListener();
    }

    setupScaleListener() {
        const updateScale = () => {
            if (typeof scale !== 'undefined') {
                this.currentScale = scale;
            }
        };
        
        document.addEventListener('mousemove', () => {
            if (typeof scale !== 'undefined') {
                this.currentScale = scale;
            }
        });
    }

    addConditionInput() {
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const conditionInput = document.createElement('input');
        conditionInput.type = 'text';
        conditionInput.placeholder = 'Условие (например: x > 5)';
        conditionInput.dataset.field = 'condition';
        conditionInput.className = 'condition-input';

        inputsGroup.appendChild(conditionInput);
        this.element.appendChild(inputsGroup);

        conditionInput.addEventListener('input', () => {
            this.element.dataset.condition = conditionInput.value.trim();
        });

        conditionInput.addEventListener('mousedown', (e) => e.stopPropagation());
        conditionInput.addEventListener('click', (e) => e.stopPropagation());
    }

    addNestedContainer() {
        const container = document.createElement('div');
        container.className = 'nested-container';
        container.dataset.parentId = this.element.dataset.blockId;

        const placeholder = document.createElement('div');
        placeholder.className = 'nested-placeholder';
        placeholder.textContent = 'Перетащите блоки сюда';
        container.appendChild(placeholder);

        this.element.appendChild(container);

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over');

            const draggedBlock = document.querySelector('.draggable-item[draggable="true"]:active');
            if (!draggedBlock) return;

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.createNestedBlock(draggedBlock, container, x, y);
        });
    }

    createNestedBlock(sourceElement, container, offsetX, offsetY) {
        const newBlockElement = sourceElement.cloneNode(true);
        const nestedBlock = new Block(
            newBlockElement,
            container,
            this.workspace,
            this.onLog,
            this.onLogAlg
        );

        newBlockElement.style.position = 'relative';
        newBlockElement.style.left = '0';
        newBlockElement.style.top = '0';
        newBlockElement.style.margin = '5px 0';
        newBlockElement.style.width = 'calc(100% - 20px)';

        const placeholder = container.querySelector('.nested-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        container.appendChild(newBlockElement);

        if (this.onLog) this.onLog('Блок добавлен в контейнер');
    }

    setPosition(x, y) {
        this.element.style.visibility = 'hidden';
        this.blocksContainer.appendChild(this.element);

        const blockWidth = this.element.offsetWidth;
        const blockHeight = this.element.offsetHeight;

        const scaledX = (x - blockWidth / 2) / this.currentScale;
        const scaledY = (y - blockHeight / 2) / this.currentScale;
        
        this.element.style.left = scaledX + 'px';
        this.element.style.top = scaledY + 'px';
        this.element.style.visibility = 'visible';
    }

    addMovement() {
        this.element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (this.isMoving) return;

            this.isMoving = true;
            
            if (typeof scale !== 'undefined') {
                this.currentScale = scale;
            }
            
            document.removeEventListener('mousemove', this.moveBlock);
            document.removeEventListener('mouseup', this.stopBlockMove);

            const rect = this.element.getBoundingClientRect();
            
            this.offset.x = (e.clientX - rect.left) / this.currentScale;
            this.offset.y = (e.clientY - rect.top) / this.currentScale;

            this.element.style.zIndex = '1000';
            this.element.style.opacity = '1';

            document.addEventListener('mousemove', this.moveBlock);
            document.addEventListener('mouseup', this.stopBlockMove, { capture: true });
            
            e.preventDefault();
        });
    }

    moveBlock(e) {
        if (!this.isMoving || !this.workspace) return;

        if (typeof scale !== 'undefined') {
            this.currentScale = scale;
        }

        const workspaceRect = this.workspace.getBoundingClientRect();
        
        const mouseX = e.clientX - workspaceRect.left;
        const mouseY = e.clientY - workspaceRect.top;
        
        const scaledX = mouseX / this.currentScale - this.offset.x;
        const scaledY = mouseY / this.currentScale - this.offset.y;

        this.element.style.left = scaledX + 'px';
        this.element.style.top = scaledY + 'px';

        const blockWidth = this.element.offsetWidth;
        const blockHeight = this.element.offsetHeight;
        
        const scaledWorkspaceWidth = workspaceRect.width / this.currentScale;
        const scaledWorkspaceHeight = workspaceRect.height / this.currentScale;

        if (scaledX < 0 || scaledX > scaledWorkspaceWidth - blockWidth ||
            scaledY < 0 || scaledY > scaledWorkspaceHeight - blockHeight) {
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

            const variableBlocks = document.getElementById('blocks-container').querySelectorAll('.canvas-block[data-type="variable"]');
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
        this.currentScale = 1;

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

        if (typeof scale !== 'undefined') {
            this.currentScale = scale;
        }

        const workspaceRect = this.workspace.getBoundingClientRect();
        
        const mouseX = e.clientX - workspaceRect.left;
        const mouseY = e.clientY - workspaceRect.top;
        
        const scaledX = mouseX / this.currentScale;
        const scaledY = mouseY / this.currentScale;

        const newBlockElement = this.draggedBlock.cloneNode(true);
        
        const block = new Block(newBlockElement, this.blocksContainer, this.workspace, this.onLog);
        block.currentScale = this.currentScale;
        block.setPosition(scaledX * this.currentScale, scaledY * this.currentScale);

        if (this.onLog) this.onLog('Добавлен новый блок');
    };
}
