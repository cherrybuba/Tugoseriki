var scale = 1;          
const ZOOM_SPEED = 0.1; 
const MIN_SCALE = 0.2;  
const MAX_SCALE = 3.0;  

function updateZoomUI() {
    const zoomLayer = document.getElementById('zoom-layer');
    const zoomLabel = document.getElementById('zoom-level');

    scale = Math.round(scale * 10) / 10;

    if (zoomLayer) {
        zoomLayer.style.transform = `scale(${scale})`;
        zoomLayer.style.transformOrigin = "0 0";
    }

    if (zoomLabel) {
        zoomLabel.innerText = Math.round(scale * 100) + '%';
    }
}

function zoomIn() {
    if (scale < MAX_SCALE) {
        scale += ZOOM_SPEED;
        updateZoomUI();
    }
}

function zoomOut() {
    if (scale > MIN_SCALE) {
        scale -= ZOOM_SPEED;
        updateZoomUI();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    
    const workspaceContainer = document.getElementById('canvas');

    if (workspaceContainer) {
        workspaceContainer.addEventListener('wheel', function(e) {
            
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();

                if (e.deltaY < 0) {
                    zoomIn();
                } else {
                    zoomOut();
                }
            }
            
        }, { passive: false });
    } else {
        console.error("Ошибка: Не найден элемент #canvas");
    }
});
