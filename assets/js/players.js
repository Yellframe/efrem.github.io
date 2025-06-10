document.querySelectorAll('.play-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        const audio = btn.parentElement.querySelector('audio');
        if (audio.paused) {
            audio.play();
            btn.textContent = '❚❚';
        } else {
            audio.pause();
            btn.textContent = '▶';
        }
    });
});