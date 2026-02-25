let scale = 1;
const ZOOM_SPEED = 0.1;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

const zoomLayer = document.getElementById('zoom-layer');
const workspaceContainer = document.getElementById('workspace-container');
const zoomLabel = document.getElementById('zoom-level');

function zoomIn() {
    if (scale < MAX_SCALE) {
        scale += ZOOM_SPEED;
        updateZoom();
    }
}

function zoomOut() {
    if (scale > MIN_SCALE) {
        scale -= ZOOM_SPEED;
        updateZoom();
    }
}

function updateZoom() {
    scale = Math.round(scale * 10) / 10;
    zoomLayer.style.transform = `scale(${scale})`;
    if (zoomLabel) {
        zoomLabel.innerText = Math.round(scale * 100) + '%';
    }
}

document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        if (e.target.closest('#workspace-container')) {
            e.preventDefault();
            if (e.deltaY < 0) {
                if (typeof zoomIn === 'function') {
                    zoomIn();
                } else {
                     if (scale < 3.0) scale += 0.1;
                     updateZoom();
                }
            } else {
                if (typeof zoomOut === 'function') {
                    zoomOut();
                } else {
                     if (scale > 0.5) scale -= 0.1;
                     updateZoom();
                }
            }
        }
    }
}, { passive: false });


function getScaledDropCoordinates(event) {
    const rect = zoomLayer.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale
    };
}

function applyScaledDrag(element, deltaX, deltaY) {
    const newLeft = element.offsetLeft - (deltaX / scale);
    const newTop = element.offsetTop - (deltaY / scale);
    element.style.left = newLeft + "px";
    element.style.top = newTop + "px";
}
