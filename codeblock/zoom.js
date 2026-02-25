let scale = 1;

function zoomIn() {
    scale += 0.1;
    applyZoom();
}

function zoomOut() {
    if (scale > 0.5) scale -= 0.1;
    applyZoom();
}

function applyZoom() {
    const zoomLayer = document.getElementById('zoom-layer');
    zoomLayer.style.transform = `scale(${scale})`;
    document.getElementById('zoom-level').innerText = Math.round(scale * 100) + '%';
}
