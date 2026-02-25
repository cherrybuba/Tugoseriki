if (typeof scale === 'undefined') {
    var scale = 1; 
}

const workspaceArea = document.getElementById('canvas');

workspaceArea.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();

        if (e.deltaY < 0) {
            if (scale < 3.0) scale += 0.1;
        } else {
            if (scale > 0.5) scale -= 0.1;
        }

        scale = Math.round(scale * 10) / 10;

        const zoomLayer = document.getElementById('zoom-layer');
        if (zoomLayer) {
            zoomLayer.style.transform = `scale(${scale})`;
            zoomLayer.style.transformOrigin = "0 0";
        }

        const zoomLabel = document.getElementById('zoom-level');
        if (zoomLabel) {
            zoomLabel.innerText = Math.round(scale * 100) + '%';
        }
    }
}, { passive: false });
