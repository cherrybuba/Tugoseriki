function saveProject() {
    const blocksData = [];
    
    const elements = document.querySelectorAll('#zoom-layer > .canvas-block');
    
    elements.forEach(el => {
        let type = 'unknown';
        
        const dataType = el.getAttribute('data-type');
        if (dataType) {
            type = dataType;
        } else {
            if (el.classList.contains('var-block')) type = 'variable';
            if (el.classList.contains('logic-block')) type = 'if';
            if (el.classList.contains('loop-block')) type = 'while';
            if (el.classList.contains('print-block')) type = 'print';
        }

        const inputs = Array.from(el.querySelectorAll('input, select')).map(i => i.value);

        blocksData.push({
            type: type,
            left: el.style.left,
            top: el.style.top,
            values: inputs
        });
    });

    const jsonString = JSON.stringify(blocksData, null, 2);
    
    
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = "my_algorithm.json";
    document.body.appendChild(link);
    
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("Проект успешно сохранен!");
}

function loadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => { 
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        
        reader.onload = readerEvent => {
            try {
                const content = readerEvent.target.result;
                const blocksData = JSON.parse(content);
                
                const oldBlocks = document.querySelectorAll('#zoom-layer > .canvas-block');
                oldBlocks.forEach(b => b.remove());
                
                blocksData.forEach(data => {
                    const x = parseFloat(data.left);
                    const y = parseFloat(data.top);
                    
                    createBlock(data.type, x, y);
                });
                
                console.log("Проект загружен из файла!");
                
            } catch (err) {
                alert("Ошибка при чтении файла! Возможно, он поврежден.");
                console.error(err);
            }
        }
    }
    
    input.click();
}