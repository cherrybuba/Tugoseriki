class ConnectionPoint {
    constructor(type, parentBlock) {
        this.type = type;
        this.parentBlock = parentBlock;
        this.connectedTo = null;
        this.element = this.createConnectionPoint();
    }

    createConnectionPoint() {
        const point = document.createElement('div');
        point.className = `connection-point connection-${this.type}`;
        point.dataset.type = this.type;
        point.dataset.parent = this.parentBlock.element.dataset.blockId;
        
        point.addEventListener('mouseenter', () => this.highlight());
        point.addEventListener('mouseleave', () => this.unhighlight());
        
        return point;
    }

    highlight() {
        if (!this.connectedTo) {
            this.element.classList.add('connection-point-active');
        }
    }

    unhighlight() {
        this.element.classList.remove('connection-point-active');
    }

    getPosition() {
        const rect = this.element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }
}

class Block {
    constructor(element, blocksContainer, workspace, onLog, onLogAlg) {
        this.element = element;
        this.blocksContainer = blocksContainer;
        this.workspace = workspace;
        this.onLog = onLog;
        this.onLogAlg = onLogAlg;
        
        this.isMoving = false;
        this.offset = { x: 0, y: 0 };
        this.startMousePosition = { x: 0, y: 0 };
        this.startElementPosition = { x: 0, y: 0 };
        
        this.allAttached = [];
        this.parent = null;
        this.nestedParent = null;
        
        this.connectionPoints = {
            top: null,
            bottom: null
        };
        this.snapThreshold = 30;
        this.currentScale = 1;
        
        this.moveBlock = this.moveBlock.bind(this);
        this.stopBlockMove = this.stopBlockMove.bind(this);
        this.checkConnection = this.checkConnection.bind(this);
        this.updateScale = this.updateScale.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        
        this.element.classList.add('canvas-block');
        this.element.style.position = 'absolute';
        this.element.style.opacity = '1';
        this.element.style.willChange = 'left, top';
        this.element.removeAttribute('id');

        const blockId = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.element.dataset.blockId = blockId;

        const blockType = this.element.dataset.type;
        if (blockType === 'variable') {
            this.addVariableNameInput();
        } else if (blockType === 'assignment') {
            this.addVariableValueInput();
        } else if (blockType === 'if' || blockType === 'while'){
            this.addConditionInput();
            this.addNestedContainer();
            this.nestedBlocks = [];
            if (blockType === 'if') {
                this.addElseButton();
            }
        } else if (blockType === 'print'){
            this.addPrint();
        } else if (blockType === 'array'){
            this.addArrayInput();
        } else if (blockType === 'assignmentArray'){
            this.addArrayAssignmentInput();
        }

        this.createConnectionPoints();
        this.addMovement();
        this.setupScaleListener();
        
        this.element.blockInstance = this;
    }

    setupScaleListener() {
        document.addEventListener('scaleChanged', this.updateScale);
    }

    updateScale() {
        if (typeof window.scale !== 'undefined') {
            this.currentScale = window.scale;
        }
    }

    createConnectionPoints() {
        const topPoint = new ConnectionPoint('top', this);
        this.connectionPoints.top = topPoint;
        this.element.prepend(topPoint.element);

        const bottomPoint = new ConnectionPoint('bottom', this);
        this.connectionPoints.bottom = bottomPoint;
        this.element.appendChild(bottomPoint.element);
    }

    setPosition(x, y) {
        if (!this.parent) {
            this.element.style.visibility = 'hidden';
            this.blocksContainer.appendChild(this.element);
        }

        const blockWidth = this.element.offsetWidth;
        const blockHeight = this.element.offsetHeight;

        const scaledX = x - blockWidth / 2;
        const scaledY = y - blockHeight / 2;
        
        this.element.style.left = scaledX + 'px';
        this.element.style.top = scaledY + 'px';
        this.element.style.visibility = 'visible';
    }

    addArrayInput() {
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Имя массива';
        nameInput.dataset.field = 'arrayName';
        nameInput.className = 'array-name-input';

        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.placeholder = 'Размер';
        sizeInput.dataset.field = 'arraySize';
        sizeInput.className = 'array-size-input';
        sizeInput.min = '1';
        sizeInput.value = '';

        inputsGroup.appendChild(nameInput);
        inputsGroup.appendChild(sizeInput);
        this.element.appendChild(inputsGroup);

        nameInput.addEventListener('input', () => {
            this.element.dataset.arrayName = nameInput.value.trim();
        });

        sizeInput.addEventListener('input', () => {
            this.element.dataset.arraySize = sizeInput.value;
        });

        nameInput.addEventListener('mousedown', (e) => e.stopPropagation());
        nameInput.addEventListener('click', (e) => e.stopPropagation());
        sizeInput.addEventListener('mousedown', (e) => e.stopPropagation());
        sizeInput.addEventListener('click', (e) => e.stopPropagation());
    }

    addArrayAssignmentInput() {
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const select = document.createElement('select');
        select.className = 'array-selector';
        select.dataset.field = 'arraySelector';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите массив';
        select.appendChild(defaultOption);

        const indexInput = document.createElement('input');
        indexInput.type = 'text';
        indexInput.placeholder = 'i';
        indexInput.dataset.field = 'arrayIndex';
        indexInput.className = 'array-index-input';
        indexInput.inputMode = 'numeric';
        indexInput.pattern = '[0-9]*';
        indexInput.disabled = true;
        indexInput.style.width = '50px';
        indexInput.style.textAlign = 'center';

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = 'Значение';
        valueInput.dataset.field = 'arrayValue';
        valueInput.className = 'array-value-input';
        valueInput.disabled = true;
        valueInput.style.flex = '1';

        const rowContainer = document.createElement('div');
        rowContainer.style.display = 'flex';
        rowContainer.style.gap = '4px';
        rowContainer.style.alignItems = 'center';

        rowContainer.appendChild(indexInput);
        rowContainer.appendChild(valueInput);

        inputsGroup.appendChild(select);
        inputsGroup.appendChild(rowContainer);
        this.element.appendChild(inputsGroup);

        const populateArraySelect = (select, defaultOption) => {
            const currentValue = select.value;
            select.innerHTML = '';
            select.appendChild(defaultOption);

            const arrayBlocks = this.blocksContainer.querySelectorAll('.canvas-block[data-type="array"]');
            arrayBlocks.forEach(arrayBlock => {
                const arrayName = arrayBlock.dataset.arrayName || '';
                const arraySize = arrayBlock.dataset.arraySize || '0';
                if (arrayName && arrayName.trim() !== '') {
                    const option = document.createElement('option');
                    option.value = arrayName;
                    option.textContent = `${arrayName} [${arraySize}]`;
                    select.appendChild(option);
                }
            });

            if (currentValue) select.value = currentValue;
        };

        select.addEventListener('click', (e) => {
            e.stopPropagation();
            populateArraySelect(select, defaultOption);
        });

        select.addEventListener('change', () => {
            const selectedArray = select.value;
            if (selectedArray) {
                this.element.dataset.selectedArray = selectedArray;
                indexInput.disabled = false;
                valueInput.disabled = false;
            } else {
                indexInput.disabled = true;
                valueInput.disabled = true;
                indexInput.value = '';
                valueInput.value = '';
                this.element.removeAttribute('data-selected-array');
                this.element.removeAttribute('data-array-index');
                this.element.removeAttribute('data-array-value');
            }
        });

        indexInput.addEventListener('input', (e) => {
            if (this.element.dataset.selectedArray) {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                this.element.dataset.arrayIndex = e.target.value;
            }
        });

        valueInput.addEventListener('input', () => {
            if (this.element.dataset.selectedArray) {
                this.element.dataset.arrayValue = valueInput.value;
            }
        });

        [select, indexInput, valueInput].forEach(el => {
            el.addEventListener('mousedown', (e) => e.stopPropagation());
            el.addEventListener('click', (e) => e.stopPropagation());
        });
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

    addElseButton() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.margin = '8px 0';
        buttonContainer.style.textAlign = 'center';
        
        const elseButton = document.createElement('button');
        elseButton.textContent = '+ else';
        elseButton.style.padding = '4px 12px';
        elseButton.style.backgroundColor = 'rgba(255, 107, 107, 0.2)';
        elseButton.style.border = '1px solid #ff6b6b';
        elseButton.style.borderRadius = '4px';
        elseButton.style.color = '#ff6b6b';
        elseButton.style.cursor = 'pointer';
        elseButton.style.fontSize = '12px';
        elseButton.style.fontWeight = 'bold';
        
        elseButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addElseContainer();
            elseButton.style.display = 'none';
        });
        
        buttonContainer.appendChild(elseButton);
        this.element.appendChild(buttonContainer);
    }

    addElseContainer() {
        const elseBlocksContainer = document.createElement('div');
        elseBlocksContainer.className = 'else-blocks-container';
        elseBlocksContainer.dataset.parentId = this.element.dataset.blockId;

        const elseHeader = document.createElement('div');
        elseHeader.style.display = 'flex';
        elseHeader.style.justifyContent = 'space-between';
        elseHeader.style.alignItems = 'center';
        elseHeader.style.marginBottom = '4px';
        elseHeader.style.padding = '2px 4px';

        const elseLabel = document.createElement('span');
        elseLabel.textContent = 'иначе';
        elseLabel.style.color = '#ff6b6b';
        elseLabel.style.fontWeight = 'bold';
        elseLabel.style.fontSize = '12px';

        const removeElseBtn = document.createElement('button');
        removeElseBtn.textContent = '×';
        removeElseBtn.style.padding = '0 6px';
        removeElseBtn.style.backgroundColor = 'transparent';
        removeElseBtn.style.border = 'none';
        removeElseBtn.style.color = '#ff6b6b';
        removeElseBtn.style.cursor = 'pointer';
        removeElseBtn.style.fontSize = '16px';
        removeElseBtn.style.fontWeight = 'bold';
        
        removeElseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeElseContainer();
        });

        elseHeader.appendChild(elseLabel);
        elseHeader.appendChild(removeElseBtn);
        elseBlocksContainer.appendChild(elseHeader);

        const elsePlaceholder = document.createElement('div');
        elsePlaceholder.className = 'else-placeholder';
        elsePlaceholder.textContent = '⟳ Перетащите блоки сюда';
        elsePlaceholder.style.padding = '8px';
        elsePlaceholder.style.fontSize = '12px';
        elsePlaceholder.style.color = 'rgba(255, 107, 107, 0.5)';
        elsePlaceholder.style.textAlign = 'center';
        elseBlocksContainer.appendChild(elsePlaceholder);

        this.element.appendChild(elseBlocksContainer);

        this.elseBlocks = [];
        this.elseBlocksContainer = elseBlocksContainer;

        let rootBlock = this;
        while (rootBlock.parent) {
            rootBlock = rootBlock.parent;
        }
        rootBlock.updateAllAttachedPositions();

        elseBlocksContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (DragDropManager.draggedBlock && DragDropManager.draggedBlock.blockInstance) {
                const draggedInstance = DragDropManager.draggedBlock.blockInstance;
                
                if (draggedInstance !== this && !this.isAncestorOf(draggedInstance)) {
                    elseBlocksContainer.classList.add('drag-over');
                }
            }
        });

        elseBlocksContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            elseBlocksContainer.classList.remove('drag-over');
        });

        elseBlocksContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            elseBlocksContainer.classList.remove('drag-over');

            const draggedBlock = DragDropManager.draggedBlock;
            if (!draggedBlock || !draggedBlock.blockInstance) return;

            if (this.isAncestorOf(draggedBlock.blockInstance)) {
                if (this.onLog) this.onLog('Нельзя перетащить родительский блок в дочерний');
                return;
            }

            this.handleDropInElseContainer(draggedBlock, elseBlocksContainer);
        });
    }

    removeElseContainer() {
        if (this.elseBlocks && this.elseBlocks.length > 0) {
            const blocksCopy = [...this.elseBlocks];
            for (const block of blocksCopy) {
                block.delete();
            }
        }
        
        const elseContainer = this.element.querySelector('.else-container');
        if (elseContainer) {
            elseContainer.remove();
        }
        
        this.elseBlocks = null;
        this.elseContainer = null;
        this.elseBlocksContainer = null;
        
        const elseButton = this.element.querySelector('button');
        if (elseButton) {
            elseButton.style.display = 'block';
        }
        
        let rootBlock = this;
        while (rootBlock.parent) {
            rootBlock = rootBlock.parent;
        }
        rootBlock.updateAllAttachedPositions();
    }

    handleDropInElseContainer(draggedElement, container) {
        const block = draggedElement.blockInstance;
        
        if (block.element.parentElement === container) return;
        
        const oldNestedParent = block.nestedParent;
        const oldParentBlock = block.parent;
        
        const blocksToMove = this.getAllBlocksInChain(block);
        
        for (const blockToMove of blocksToMove) {
            blockToMove.detachFromAll();
        }
        
        let success = true;
        for (const blockToMove of blocksToMove) {
            if (!this.addBlockToElse(blockToMove, container)) {
                success = false;
                break;
            }
        }
        
        if (success) {
            if (this.onLog) this.onLog('Блоки перемещены в else');
            
            if (oldNestedParent) {
                let rootBlock = oldNestedParent;
                while (rootBlock.parent) {
                    rootBlock = rootBlock.parent;
                }
                rootBlock.updateAllAttachedPositions();
            }
            if (oldParentBlock) {
                let rootBlock = oldParentBlock;
                while (rootBlock.parent) {
                    rootBlock = rootBlock.parent;
                }
                rootBlock.updateAllAttachedPositions();
            }
        }
    }

    addBlockToElse(block, container) {
        if (!block || !container) return false;
        
        block.element.style.position = 'relative';
        block.element.style.left = '';
        block.element.style.top = '';
        block.element.style.margin = '4px 0';
        block.element.style.width = 'calc(100% - 8px)';
        block.element.style.transform = 'none';
        
        const placeholder = container.querySelector('.else-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        container.appendChild(block.element);
        
        block.nestedParent = this;
        
        if (!this.elseBlocks) {
            this.elseBlocks = [];
        }
        this.elseBlocks.push(block);
        
        let rootBlock = this;
        while (rootBlock.parent) {
            rootBlock = rootBlock.parent;
        }
        rootBlock.updateAllAttachedPositions();
        
        return true;
    }

    removeBlockFromElse(block) {
        if (!block || !this.elseBlocks) return false;
        
        const index = this.elseBlocks.indexOf(block);
        if (index !== -1) {
            this.elseBlocks.splice(index, 1);
        }
        
        if (this.elseBlocks.length === 0 && this.elseBlocksContainer) {
            if (!this.elseBlocksContainer.querySelector('.else-placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'else-placeholder';
                placeholder.textContent = '⟳ Перетащите блоки сюда';
                this.elseBlocksContainer.appendChild(placeholder);
            }
        }
        
        block.nestedParent = null;
        
        let rootBlock = this;
        while (rootBlock.parent) {
            rootBlock = rootBlock.parent;
        }
        rootBlock.updateAllAttachedPositions();
        
        return true;
    }

    addNestedContainer() {
        const container = document.createElement('div');
        container.className = 'nested-container';
        container.dataset.parentId = this.element.dataset.blockId;

        const placeholder = document.createElement('div');
        placeholder.className = 'nested-placeholder';
        placeholder.textContent = '⟳ Перетащите блоки сюда';
        container.appendChild(placeholder);
        
        this.element.appendChild(container);

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (DragDropManager.draggedBlock && DragDropManager.draggedBlock.blockInstance) {
                const draggedInstance = DragDropManager.draggedBlock.blockInstance;
                
                if (draggedInstance !== this && !this.isAncestorOf(draggedInstance)) {
                    container.classList.add('drag-over');
                }
            }
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

            const draggedBlock = DragDropManager.draggedBlock;
            if (!draggedBlock || !draggedBlock.blockInstance) return;

            if (this.isAncestorOf(draggedBlock.blockInstance)) {
                if (this.onLog) this.onLog('Нельзя перетащить родительский блок в дочерний');
                return;
            }

            this.handleDropInContainer(e, draggedBlock, container);
        });
    }

    handleDropInContainer(e, draggedElement, container) {
        const block = draggedElement.blockInstance;
        
        if (block.element.parentElement === container) return;
        
        const oldNestedParent = block.nestedParent;
        const oldParentBlock = block.parent;
        
        const blocksToMove = this.getAllBlocksInChain(block);
        
        for (const blockToMove of blocksToMove) {
            blockToMove.detachFromAll();
        }
        
        let success = true;
        for (const blockToMove of blocksToMove) {
            if (!this.addBlockToNested(blockToMove, container)) {
                success = false;
                break;
            }
        }
        
        if (success) {
            if (this.onLog) this.onLog('Блоки перемещены в контейнер');
            
            if (oldNestedParent) {
                let rootBlock = oldNestedParent;
                while (rootBlock.parent) {
                    rootBlock = rootBlock.parent;
                }
                rootBlock.updateAllAttachedPositions();
            }
            if (oldParentBlock) {
                let rootBlock = oldParentBlock;
                while (rootBlock.parent) {
                    rootBlock = rootBlock.parent;
                }
                rootBlock.updateAllAttachedPositions();
            }
        } else {
            for (const blockToMove of blocksToMove) {
                if (oldNestedParent) {
                    oldNestedParent.addBlockToNested(blockToMove, oldNestedParent.element.querySelector('.nested-container'));
                } else {
                    this.blocksContainer.appendChild(blockToMove.element);
                }
            }
        }
    }

    getAllBlocksInChain(block) {
        const blocks = [block];
        
        const addAttachedBlocks = (b) => {
            for (const attached of b.allAttached) {
                blocks.push(attached);
                addAttachedBlocks(attached);
            }
        };
        
        addAttachedBlocks(block);
        return blocks;
    }

    addBlockToNested(block, container) {
        if (!block || !container) return false;
        
        block.element.style.position = 'relative';
        block.element.style.left = '';
        block.element.style.top = '';
        block.element.style.margin = '4px 0';
        block.element.style.width = 'calc(100% - 8px)';
        block.element.style.transform = 'none';
        
        const placeholder = container.querySelector('.nested-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        container.appendChild(block.element);
        
        block.nestedParent = this;
        
        if (!this.nestedBlocks) {
            this.nestedBlocks = [];
        }
        this.nestedBlocks.push(block);
        
        let rootBlock = this;
        while (rootBlock.parent) {
            rootBlock = rootBlock.parent;
        }
        rootBlock.updateAllAttachedPositions();
        
        return true;
    }

    removeBlockFromNested(block) {
        if (!block || !this.nestedBlocks) return false;
        
        const index = this.nestedBlocks.indexOf(block);
        if (index !== -1) {
            this.nestedBlocks.splice(index, 1);
        }
        
        if (this.nestedBlocks.length === 0) {
            const container = this.element.querySelector('.nested-container');
            if (container && !container.querySelector('.nested-placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'nested-placeholder';
                placeholder.textContent = '⟳ Перетащите блоки сюда';
                container.appendChild(placeholder);
            }
        }
        
        block.nestedParent = null;
        
        return true;
    }

    createNestedBlock(sourceElement, container) {
        const newBlockElement = sourceElement.cloneNode(true);
        
        const nestedBlock = new Block(
            newBlockElement,
            container,
            this.workspace,
            this.onLog,
            this.onLogAlg
        );

        this.addBlockToNested(nestedBlock, container);

        let rootBlock = this;
        while (rootBlock.parent) {
            rootBlock = rootBlock.parent;
        }
        rootBlock.updateAllAttachedPositions();

        if (this.onLog) this.onLog('Блок добавлен в контейнер');
        
        return nestedBlock;
    }

    addPrint(){
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Вывод';
        nameInput.dataset.field = 'print';
        nameInput.className = 'print-output';

        inputsGroup.appendChild(nameInput);
        this.element.appendChild(inputsGroup);

        nameInput.addEventListener('input', () => {
            this.element.dataset.print = nameInput.value.trim();
        });
    }

    detachFromAll() {
        if (this.parent) {
            this.detachFromParent();
        }
        
        if (this.nestedParent) {
            if (this.nestedParent.nestedBlocks && this.nestedParent.nestedBlocks.includes(this)) {
                this.nestedParent.removeBlockFromNested(this);
            } else if (this.nestedParent.elseBlocks && this.nestedParent.elseBlocks.includes(this)) {
                this.nestedParent.removeBlockFromElse(this);
            }
        }
        
        if (this.allAttached.length > 0) {
            const attachedCopy = [...this.allAttached];
            for (const attached of attachedCopy) {
                attached.detachFromParent();
            }
        }
    }

    addMovement() {
        this.element.setAttribute('draggable', 'true');
        
        this.element.addEventListener('dragstart', this.handleDragStart);
        this.element.addEventListener('dragend', this.handleDragEnd);
        
        this.element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || 
                e.target.classList.contains('connection-point') ||
                e.target.classList.contains('block-delete-btn') ||
                e.target.classList.contains('nested-container') ||
                e.target.classList.contains('nested-placeholder') ||
                e.target.classList.contains('else-container') ||
                e.target.classList.contains('else-blocks-container') ||
                e.target.classList.contains('else-placeholder') ||
                e.target.tagName === 'BUTTON') return;

            if (this.isMoving) return;

            e.preventDefault();
            e.stopPropagation();

            const oldNestedParent = this.nestedParent;
            const oldParent = this.parent;

            const workspaceRect = this.workspace.getBoundingClientRect();
            this.startMousePosition = {
                x: (e.clientX - workspaceRect.left) / this.currentScale,
                y: (e.clientY - workspaceRect.top) / this.currentScale
            };
            
            const currentLeft = parseFloat(this.element.style.left) || 0;
            const currentTop = parseFloat(this.element.style.top) || 0;
            
            this.startElementPosition = {
                x: currentLeft,
                y: currentTop
            };

            if (this.nestedParent) {
                const rect = this.element.getBoundingClientRect();
                const globalX = (rect.left - workspaceRect.left) / this.currentScale;
                const globalY = (rect.top - workspaceRect.top) / this.currentScale;
                
                const blocksToMove = this.getAllBlocksInChain(this);
                
                for (const block of blocksToMove) {
                    if (block.nestedParent) {
                        if (block.nestedParent.nestedBlocks && block.nestedParent.nestedBlocks.includes(block)) {
                            block.nestedParent.removeBlockFromNested(block);
                        } else if (block.nestedParent.elseBlocks && block.nestedParent.elseBlocks.includes(block)) {
                            block.nestedParent.removeBlockFromElse(block);
                        }
                    }
                }
                
                for (const block of blocksToMove) {
                    this.blocksContainer.appendChild(block.element);
                    block.element.style.position = 'absolute';
                    block.element.style.margin = '0';
                    block.element.style.width = '';
                }
                
                this.element.style.left = globalX + 'px';
                this.element.style.top = globalY + 'px';
                
                this.startElementPosition = {
                    x: globalX,
                    y: globalY
                };
                
                if (oldNestedParent) {
                    let rootBlock = oldNestedParent;
                    while (rootBlock.parent) {
                        rootBlock = rootBlock.parent;
                    }
                    rootBlock.updateAllAttachedPositions();
                }
            }

            if (this.parent) {
                const blocksToMove = this.getAllBlocksInChain(this);
                
                for (const block of blocksToMove) {
                    if (block.parent) {
                        block.detachFromParent();
                    }
                }
                
                if (oldParent) {
                    let rootBlock = oldParent;
                    while (rootBlock.parent) {
                        rootBlock = rootBlock.parent;
                    }
                    rootBlock.updateAllAttachedPositions();
                }
            }

            this.isMoving = true;
            
            document.removeEventListener('mousemove', this.moveBlock);
            document.removeEventListener('mouseup', this.stopBlockMove);

            this.element.style.zIndex = '1000';
            this.element.style.cursor = 'grabbing';
            this.element.style.transition = 'none';
            this.element.style.opacity = '0.9';
            this.element.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)';

            document.addEventListener('mousemove', this.moveBlock);
            document.addEventListener('mouseup', this.stopBlockMove, { capture: true });
        });
    }

    handleDragStart(e) {
        const blocksToMove = this.getAllBlocksInChain(this);
        
        DragDropManager.draggedBlock = this.element;
        DragDropManager.draggedBlock.blockInstance = this;
        DragDropManager.draggedBlocks = blocksToMove;
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.element.dataset.blockId);
        
        setTimeout(() => {
            for (const block of blocksToMove) {
                block.element.style.opacity = '0.5';
            }
        }, 0);
    }

    handleDragEnd(e) {
        const blocksToMove = DragDropManager.draggedBlocks || [this];
        
        for (const block of blocksToMove) {
            block.element.style.opacity = '1';
        }
        
        DragDropManager.draggedBlock = null;
        DragDropManager.draggedBlocks = null;
    }

    moveBlock(e) {
        if (!this.isMoving || !this.workspace) return;

        e.preventDefault();

        this.updateScale();

        const workspaceRect = this.workspace.getBoundingClientRect();
        
        const currentMouseX = (e.clientX - workspaceRect.left) / this.currentScale;
        const currentMouseY = (e.clientY - workspaceRect.top) / this.currentScale;
        
        const deltaX = currentMouseX - this.startMousePosition.x;
        const deltaY = currentMouseY - this.startMousePosition.y;
        
        let newX = this.startElementPosition.x + deltaX;
        let newY = this.startElementPosition.y + deltaY;

        this.element.style.left = newX + 'px';
        this.element.style.top = newY + 'px';

        this.updateAllAttachedPositions();

        this.checkConnection();

        const workspaceWidth = workspaceRect.width / this.currentScale;
        const workspaceHeight = workspaceRect.height / this.currentScale;
        const blockWidth = this.element.offsetWidth;
        const blockHeight = this.element.offsetHeight;

        const isOutside = (
            newX < -50 || 
            newX > workspaceWidth - blockWidth + 50 ||
            newY < -50 || 
            newY > workspaceHeight - blockHeight + 50
        );

        if (isOutside) {
            this.element.style.opacity = '0.5';
            this.element.style.filter = 'blur(0.5px)';
            this.element.style.border = '2px dashed #ff4757';
            this.isOutsideWorkspace = true;
        } else {
            this.element.style.opacity = '0.9';
            this.element.style.filter = 'none';
            this.element.style.border = '';
            this.isOutsideWorkspace = false;
        }
    }

    stopBlockMove(e) {
        if (!this.isMoving) return;

        e.preventDefault();

        this.element.style.zIndex = '10';
        this.element.style.cursor = 'grab';
        this.element.style.transition = '';
        this.element.style.boxShadow = '';

        const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
        const nestedContainer = elementsUnderCursor.find(el => el.classList.contains('nested-container'));
        const elseContainer = elementsUnderCursor.find(el => el.classList.contains('else-blocks-container'));
        
        if (nestedContainer && !this.isOutsideWorkspace) {
            const parentBlock = nestedContainer.closest('.canvas-block').blockInstance;
            if (parentBlock && parentBlock !== this && !this.isAncestorOf(parentBlock)) {
                const blocksToMove = this.getAllBlocksInChain(this);
                
                for (const block of blocksToMove) {
                    parentBlock.addBlockToNested(block, nestedContainer);
                }
                
                this.element.style.left = '';
                this.element.style.top = '';
                
                let rootBlock = this;
                while (rootBlock.parent) {
                    rootBlock = rootBlock.parent;
                }
                rootBlock.updateAllAttachedPositions();
                
                this.removeAllHighlights();
                document.removeEventListener('mousemove', this.moveBlock);
                document.removeEventListener('mouseup', this.stopBlockMove, { capture: true });
                this.isMoving = false;
                return;
            }
        }
        
        if (elseContainer && !this.isOutsideWorkspace) {
            const parentBlock = elseContainer.closest('.canvas-block').blockInstance;
            if (parentBlock && parentBlock !== this && !this.isAncestorOf(parentBlock)) {
                const blocksToMove = this.getAllBlocksInChain(this);
                
                for (const block of blocksToMove) {
                    parentBlock.addBlockToElse(block, elseContainer);
                }
                
                this.element.style.left = '';
                this.element.style.top = '';
                
                let rootBlock = this;
                while (rootBlock.parent) {
                    rootBlock = rootBlock.parent;
                }
                rootBlock.updateAllAttachedPositions();
                
                this.removeAllHighlights();
                document.removeEventListener('mousemove', this.moveBlock);
                document.removeEventListener('mouseup', this.stopBlockMove, { capture: true });
                this.isMoving = false;
                return;
            }
        }

        if (this.isOutsideWorkspace) {
            this.delete();
        } else {
            const connected = this.tryConnectToParent();
            
            if (!connected) {
                let rootBlock = this;
                while (rootBlock.parent) {
                    rootBlock = rootBlock.parent;
                }
                rootBlock.updateAllAttachedPositions();
            }
        }

        this.removeAllHighlights();
        this.element.style.opacity = '1';

        document.removeEventListener('mousemove', this.moveBlock);
        document.removeEventListener('mouseup', this.stopBlockMove, { capture: true });

        this.isMoving = false;
        this.isOutsideWorkspace = false;
    }

    checkConnection() {
        if (this.nestedParent) return;

        const potentialParents = Array.from(this.blocksContainer.children)
            .map(el => el.blockInstance)
            .filter(block => {
                return block && 
                       block !== this && 
                       block !== this.parent &&
                       !this.isDescendantOf(block) &&
                       !block.nestedParent &&
                       block.connectionPoints && 
                       block.connectionPoints.bottom;
            });

        const currentRect = this.element.getBoundingClientRect();
        let nearestBlock = null;
        let minDistance = this.snapThreshold;

        for (const block of potentialParents) {
            if (!block.connectionPoints.bottom) continue;
            
            const bottomPoint = block.connectionPoints.bottom.getPosition();
            const topPoint = { 
                x: currentRect.left + currentRect.width / 2, 
                y: currentRect.top 
            };
            
            const distance = Math.hypot(bottomPoint.x - topPoint.x, bottomPoint.y - topPoint.y);
            const horizontalDiff = Math.abs(bottomPoint.x - topPoint.x);
            
            if (distance < minDistance && horizontalDiff < 30) {
                minDistance = distance;
                nearestBlock = block;
            }
        }

        this.removeAllHighlights();
        
        if (nearestBlock) {
            if (nearestBlock.connectionPoints.bottom) {
                nearestBlock.connectionPoints.bottom.element.classList.add('connection-highlight');
            }
            if (this.connectionPoints.top) {
                this.connectionPoints.top.element.classList.add('connection-highlight');
            }
        }
    }

    tryConnectToParent() {
        if (this.nestedParent) return false;

        const potentialParents = Array.from(this.blocksContainer.children)
            .map(el => el.blockInstance)
            .filter(block => {
                return block && 
                       block !== this && 
                       block !== this.parent &&
                       !this.isDescendantOf(block) &&
                       !block.nestedParent &&
                       block.connectionPoints && 
                       block.connectionPoints.bottom;
            });

        const currentRect = this.element.getBoundingClientRect();
        let bestMatch = null;
        let minDistance = this.snapThreshold;

        for (const block of potentialParents) {
            if (!block.connectionPoints.bottom) continue;
            
            const bottomPoint = block.connectionPoints.bottom.getPosition();
            const topPoint = { 
                x: currentRect.left + currentRect.width / 2, 
                y: currentRect.top 
            };
            
            const distance = Math.hypot(bottomPoint.x - topPoint.x, bottomPoint.y - topPoint.y);
            const horizontalDiff = Math.abs(bottomPoint.x - topPoint.x);
            
            if (distance < minDistance && horizontalDiff < 20) {
                minDistance = distance;
                bestMatch = block;
            }
        }

        if (bestMatch) {
            this.attachToParent(bestMatch);
            return true;
        }

        return false;
    }

    attachToParent(parentBlock) {
        if (this.parent) {
            this.detachFromParent();
        }

        parentBlock.allAttached.push(this);
        
        this.parent = parentBlock;

        const parentLeft = parseFloat(parentBlock.element.style.left) || 0;
        const parentTop = parseFloat(parentBlock.element.style.top) || 0;
        const parentHeight = parentBlock.element.offsetHeight;
        
        this.element.style.left = parentLeft + 'px';
        this.element.style.top = (parentTop + parentHeight) + 'px';

        this.updateAllAttachedPositions();

        if (this.connectionPoints.top) {
            this.connectionPoints.top.element.style.display = 'none';
        }
        
        if (parentBlock.connectionPoints.bottom) {
            parentBlock.connectionPoints.bottom.element.style.display = 'none';
        }

        if (this.onLog) this.onLog(`Блок присоединен к родителю`);
    }

    detachFromParent() {
        if (this.parent) {
            const index = this.parent.allAttached.indexOf(this);
            if (index !== -1) {
                this.parent.allAttached.splice(index, 1);
            }
            
            if (this.connectionPoints.top) {
                this.connectionPoints.top.element.style.display = 'block';
            }
            
            if (this.parent.connectionPoints.bottom) {
                this.parent.connectionPoints.bottom.element.style.display = 'block';
            }

            const rect = this.element.getBoundingClientRect();
            const workspaceRect = this.workspace.getBoundingClientRect();
            
            const globalX = (rect.left - workspaceRect.left) / this.currentScale;
            const globalY = (rect.top - workspaceRect.top) / this.currentScale;
            
            this.blocksContainer.appendChild(this.element);
            this.element.style.left = globalX + 'px';
            this.element.style.top = globalY + 'px';
            
            this.parent = null;
        }
    }

    updateAllAttachedPositions() {
        if (this.allAttached.length === 0) return;
        
        const sortedAttached = [...this.allAttached].sort((a, b) => {
            const aTop = parseFloat(a.element.style.top) || 0;
            const bTop = parseFloat(b.element.style.top) || 0;
            return aTop - bTop;
        });
        
        let currentY = parseFloat(this.element.style.top) + this.element.offsetHeight;
        
        for (const attached of sortedAttached) {
            attached.element.style.left = this.element.style.left;
            attached.element.style.top = currentY + 'px';
            
            if (attached.allAttached.length > 0) {
                attached.updateAllAttachedPositions();
            }
            
            currentY += attached.element.offsetHeight;
        }
    }

    isDescendantOf(block) {
        let current = this.parent;
        while (current) {
            if (current === block) return true;
            current = current.parent;
        }
        return false;
    }

    isAncestorOf(block) {
        if (!block) return false;
        
        if (this.nestedBlocks) {
            for (const nested of this.nestedBlocks) {
                if (nested === block) return true;
                if (nested.isAncestorOf(block)) return true;
            }
        }
        
        if (this.elseBlocks) {
            for (const elseBlock of this.elseBlocks) {
                if (elseBlock === block) return true;
                if (elseBlock.isAncestorOf(block)) return true;
            }
        }
        
        for (const attached of this.allAttached) {
            if (attached === block) return true;
            if (attached.isAncestorOf(block)) return true;
        }
        
        return false;
    }

    removeAllHighlights() {
        this.blocksContainer.querySelectorAll('.connection-highlight').forEach(el => {
            el.classList.remove('connection-highlight');
        });
    }

    delete() {
        const parentBlock = this.parent;
        const nestedParentBlock = this.nestedParent;
        
        if (this.nestedBlocks) {
            const nestedCopy = [...this.nestedBlocks];
            for (const nestedBlock of nestedCopy) {
                nestedBlock.delete();
            }
            this.nestedBlocks = [];
        }
        
        if (this.elseBlocks) {
            const elseCopy = [...this.elseBlocks];
            for (const elseBlock of elseCopy) {
                elseBlock.delete();
            }
            this.elseBlocks = [];
        }

        const attachedCopy = [...this.allAttached];
        
        for (const attached of attachedCopy) {
            attached.delete();
        }
        
        if (this.parent) {
            const index = this.parent.allAttached.indexOf(this);
            if (index !== -1) {
                this.parent.allAttached.splice(index, 1);
            }
            
            if (this.parent.connectionPoints.bottom && this.parent.allAttached.length === 0) {
                this.parent.connectionPoints.bottom.element.style.display = 'block';
            }
        }
        
        if (this.nestedParent) {
            if (this.nestedParent.nestedBlocks && this.nestedParent.nestedBlocks.includes(this)) {
                this.nestedParent.removeBlockFromNested(this);
            } else if (this.nestedParent.elseBlocks && this.nestedParent.elseBlocks.includes(this)) {
                this.nestedParent.removeBlockFromElse(this);
            }
        }
        
        this.element.remove();
        
        if (parentBlock) {
            let rootBlock = parentBlock;
            while (rootBlock.parent) {
                rootBlock = rootBlock.parent;
            }
            rootBlock.updateAllAttachedPositions();
        } else if (nestedParentBlock) {
            let rootBlock = nestedParentBlock;
            while (rootBlock.parent) {
                rootBlock = rootBlock.parent;
            }
            rootBlock.updateAllAttachedPositions();
        }
        
        if (this.onLog) this.onLog('Блок удален');
    }

    checkDeletion() {
        if (!this.workspace) return false;

        this.updateScale();

        const workspaceRect = this.workspace.getBoundingClientRect();
        const blockRect = this.element.getBoundingClientRect();

        const buffer = 50 * this.currentScale;

        const isOutside = (
            blockRect.right < workspaceRect.left - buffer ||
            blockRect.left > workspaceRect.right + buffer ||
            blockRect.bottom < workspaceRect.top - buffer ||
            blockRect.top > workspaceRect.bottom + buffer
        );

        if (isOutside) {
            this.delete();
            return true;
        }
        return false;
    }

    getNestedBlocks() {
        return this.nestedBlocks || [];
    }
    
    getElseBlocks() {
        return this.elseBlocks || [];
    }
}

class DragDropManager {
    static draggedBlock = null;
    static draggedBlocks = null;

    constructor(workspace, blocksContainer, onLog, onLogAlg) {
        this.workspace = workspace;
        this.blocksContainer = blocksContainer;
        this.onLog = onLog;
        this.onLogAlg = onLogAlg;
        
        this.currentScale = 1;
        this.lastHighlightedContainer = null;
        this.lastHighlightedElseContainer = null;

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

        document.addEventListener('dragover', this.globalDragOver.bind(this));
        
        this.setupScaleListener();
    }

    setupScaleListener() {
        document.addEventListener('scaleChanged', () => {
            if (typeof window.scale !== 'undefined') {
                this.currentScale = window.scale;
            }
        });
    }

    globalDragOver(e) {
        const container = e.target.closest('.nested-container');
        const elseContainer = e.target.closest('.else-blocks-container');
        
        if (this.lastHighlightedContainer && this.lastHighlightedContainer !== container) {
            this.lastHighlightedContainer.classList.remove('drag-over');
            this.lastHighlightedContainer = null;
        }
        
        if (this.lastHighlightedElseContainer && this.lastHighlightedElseContainer !== elseContainer) {
            this.lastHighlightedElseContainer.classList.remove('drag-over');
            this.lastHighlightedElseContainer = null;
        }
        
        if (container && DragDropManager.draggedBlock) {
            const parentBlock = container.closest('.canvas-block').blockInstance;
            
            if (parentBlock) {
                let canHighlight = true;
                
                if (DragDropManager.draggedBlock.blockInstance) {
                    const draggedInstance = DragDropManager.draggedBlock.blockInstance;
                    if (parentBlock.isAncestorOf(draggedInstance) || parentBlock === draggedInstance) {
                        canHighlight = false;
                    }
                }
                
                if (canHighlight) {
                    container.classList.add('drag-over');
                    this.lastHighlightedContainer = container;
                }
            }
        }
        
        if (elseContainer && DragDropManager.draggedBlock) {
            const parentBlock = elseContainer.closest('.canvas-block').blockInstance;
            
            if (parentBlock) {
                let canHighlight = true;
                
                if (DragDropManager.draggedBlock.blockInstance) {
                    const draggedInstance = DragDropManager.draggedBlock.blockInstance;
                    if (parentBlock.isAncestorOf(draggedInstance) || parentBlock === draggedInstance) {
                        canHighlight = false;
                    }
                }
                
                if (canHighlight) {
                    elseContainer.classList.add('drag-over');
                    this.lastHighlightedElseContainer = elseContainer;
                }
            }
        }
    }

    dragStart = (e) => {
        const block = e.currentTarget;
        DragDropManager.draggedBlock = block;
        
        if (block.blockInstance) {
            DragDropManager.draggedBlock.blockInstance = block.blockInstance;
        }
        
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/html', block.outerHTML);
        e.dataTransfer.setData('type', block.dataset.type || 'default');
        e.dataTransfer.setData('blockId', block.blockInstance ? block.blockInstance.element.dataset.blockId : 'new_' + Date.now());
        
        setTimeout(() => block.style.opacity = '0.5', 0);
    };

    dragEnd = (e) => {
        document.querySelectorAll('.nested-container, .else-blocks-container').forEach(container => {
            container.classList.remove('drag-over');
        });
        
        e.currentTarget.style.opacity = '1';
        DragDropManager.draggedBlock = null;
        DragDropManager.draggedBlocks = null;
        this.lastHighlightedContainer = null;
        this.lastHighlightedElseContainer = null;
    };

    dragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    drop = (e) => {
        e.preventDefault();
        
        document.querySelectorAll('.nested-container, .else-blocks-container').forEach(container => {
            container.classList.remove('drag-over');
        });
        
        const targetContainer = e.target.closest('.nested-container');
        const targetElseContainer = e.target.closest('.else-blocks-container');
        if (targetContainer || targetElseContainer) {
            return;
        }
        
        if (!DragDropManager.draggedBlock || !this.workspace) return;

        if (typeof window.scale !== 'undefined') {
            this.currentScale = window.scale;
        }

        const workspaceRect = this.workspace.getBoundingClientRect();
        
        const mouseX = (e.clientX - workspaceRect.left) / this.currentScale;
        const mouseY = (e.clientY - workspaceRect.top) / this.currentScale;

        const newBlockElement = DragDropManager.draggedBlock.cloneNode(true);
        
        newBlockElement.removeAttribute('draggable');
        newBlockElement.classList.remove('draggable-item');
        
        const block = new Block(newBlockElement, this.blocksContainer, this.workspace, this.onLog, this.onLogAlg);
        block.currentScale = this.currentScale;
        block.setPosition(mouseX, mouseY);

        if (this.onLog) this.onLog('Добавлен новый блок');
    };
}

document.addEventListener('zoomChanged', (e) => {
    if (e.detail && e.detail.scale) {
        window.scale = e.detail.scale;
        document.dispatchEvent(new CustomEvent('scaleChanged'));
    }
});