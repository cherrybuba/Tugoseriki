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
        
        this.allAttached = [];
        this.parent = null;
        
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
        } else if (blockType === 'if'){
            this.addIfConstruction();
        } else if (blockType === 'while'){
            this.addWhileConstruction();
        } else if (blockType === 'print'){
            this.addPrint();
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

    addIfConstruction(){
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Условие';
        nameInput.dataset.field = 'if';
        nameInput.className = 'if-input';

        inputsGroup.appendChild(nameInput);
        this.element.appendChild(inputsGroup);

        nameInput.addEventListener('input', () => {
            this.element.dataset.condition = nameInput.value.trim();
        });
    }

    addWhileConstruction(){
        const inputsGroup = document.createElement('div');
        inputsGroup.className = 'block-inputs-group';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Условие';
        nameInput.dataset.field = 'while';
        nameInput.className = 'while-input';

        inputsGroup.appendChild(nameInput);
        this.element.appendChild(inputsGroup);

        nameInput.addEventListener('input', () => {
            this.element.dataset.condition = nameInput.value.trim();
        });
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

    addMovement() {
        this.element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || 
                e.target.classList.contains('connection-point') ||
                e.target.classList.contains('block-delete-btn')) return;

            if (this.isMoving) return;

            if (this.parent) {
                this.detachFromParent();
            }

            this.isMoving = true;
            
            document.removeEventListener('mousemove', this.moveBlock);
            document.removeEventListener('mouseup', this.stopBlockMove);

            const rect = this.element.getBoundingClientRect();
            const workspaceRect = this.workspace.getBoundingClientRect();
            
            this.offset.x = (e.clientX - rect.left) / this.currentScale;
            this.offset.y = (e.clientY - rect.top) / this.currentScale;

            this.element.style.zIndex = '1000';
            this.element.style.cursor = 'grabbing';

            document.addEventListener('mousemove', this.moveBlock);
            document.addEventListener('mouseup', this.stopBlockMove, { capture: true });
            
            e.preventDefault();
        });
    }

    moveBlock(e) {
        if (!this.isMoving || !this.workspace) return;

        this.updateScale();

        const workspaceRect = this.workspace.getBoundingClientRect();
        
        const mouseX = (e.clientX - workspaceRect.left) / this.currentScale;
        const mouseY = (e.clientY - workspaceRect.top) / this.currentScale;
        
        const currentLeft = parseFloat(this.element.style.left) || 0;
        const currentTop = parseFloat(this.element.style.top) || 0;
        
        let x = mouseX - this.offset.x;
        let y = mouseY - this.offset.y;

        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';

        this.updateAllAttachedPositions();

        this.checkConnection();

        const workspaceWidth = workspaceRect.width / this.currentScale;
        const workspaceHeight = workspaceRect.height / this.currentScale;
        const blockWidth = this.element.offsetWidth;
        const blockHeight = this.element.offsetHeight;

        const blockLeft = parseFloat(this.element.style.left) || 0;
        const blockTop = parseFloat(this.element.style.top) || 0;
        
        const isOutside = (
            blockLeft < -50 || 
            blockLeft > workspaceWidth - blockWidth + 50 ||
            blockTop < -50 || 
            blockTop > workspaceHeight - blockHeight + 50
        );

        if (isOutside) {
            this.element.style.opacity = '0.5';
            this.element.style.filter = 'blur(0.5px)';
            this.element.style.border = '2px dashed #ff4757';
            this.isOutsideWorkspace = true;
        } else {
            this.element.style.opacity = '0.9';
            this.element.style.filter = 'none';
            this.isOutsideWorkspace = false;
        }
    }

    stopBlockMove(e) {
        if (!this.isMoving) return;

        if (this.isOutsideWorkspace) {
            this.delete();
            this.removeAllHighlights();
            document.removeEventListener('mousemove', this.moveBlock);
            document.removeEventListener('mouseup', this.stopBlockMove, { capture: true });
            this.isMoving = false;
            return;
        }

        const deleted = this.checkDeletion();
        
        if (!deleted) {
            const connected = this.tryConnectToParent();
        }

        this.removeAllHighlights();

        this.element.style.zIndex = '10';
        this.element.style.opacity = '1';
        this.element.style.filter = 'none';
        this.element.style.cursor = 'grab';

        document.removeEventListener('mousemove', this.moveBlock);
        document.removeEventListener('mouseup', this.stopBlockMove, { capture: true });

        this.isMoving = false;
        this.isOutsideWorkspace = false;
    }

    checkConnection() {
        const potentialParents = Array.from(this.blocksContainer.children)
            .map(el => el.blockInstance)
            .filter(block => {
                return block && 
                       block !== this && 
                       block !== this.parent &&
                       !this.isDescendantOf(block) &&
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
        const potentialParents = Array.from(this.blocksContainer.children)
            .map(el => el.blockInstance)
            .filter(block => {
                return block && 
                       block !== this && 
                       block !== this.parent &&
                       !this.isDescendantOf(block) &&
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
            currentY += attached.element.offsetHeight;
            
            attached.updateAllAttachedPositions();
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

    removeAllHighlights() {
        this.blocksContainer.querySelectorAll('.connection-highlight').forEach(el => {
            el.classList.remove('connection-highlight');
        });
    }

    delete() {
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
        
        this.element.remove();
        
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

        this.setupScaleListener();
    }

    setupScaleListener() {
        document.addEventListener('scaleChanged', () => {
            if (typeof window.scale !== 'undefined') {
                this.currentScale = window.scale;
            }
        });
    }

    dragStart = (e) => {
        this.draggedBlock = e.currentTarget;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/html', this.draggedBlock.outerHTML);
        e.dataTransfer.setData('type', this.draggedBlock.dataset.type || 'default');
        e.dataTransfer.setData('blockId', 'new_' + Date.now());
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

        if (typeof window.scale !== 'undefined') {
            this.currentScale = window.scale;
        }

        const workspaceRect = this.workspace.getBoundingClientRect();
        
        const mouseX = (e.clientX - workspaceRect.left) / this.currentScale;
        const mouseY = (e.clientY - workspaceRect.top) / this.currentScale;

        const newBlockElement = this.draggedBlock.cloneNode(true);
        
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