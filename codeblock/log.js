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