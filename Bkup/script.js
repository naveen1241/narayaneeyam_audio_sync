document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const repeatCountDisplay = document.getElementById('repeat-count');
    const volumeSlider = document.getElementById('volume-slider');
    const speedSlider = document.getElementById('speed-slider');
    const speedDisplay = document.getElementById('speed-display');
    const title = document.getElementById('title');
    const syncText = document.getElementById('sync-text');

    let currentDashaka = 1;
    let repeatMode = 1;
    let repeatCounter = 0;
    let isPlaying = false;

    // Load data for a specific dashakam
    async function loadDashaka(dashakaNumber) {
        if (dashakaNumber < 1 || dashakaNumber > 100) return;

        currentDashaka = dashakaNumber;
        title.textContent = `Narayaneeyam - Dashakam ${currentDashaka}`;

        const textFile = `Audio_Sync/dashaka_${currentDashaka}.text`;
        const mp3File = `Audio_Sync/Narayaneeyam_D${String(currentDashaka).padStart(3, '0')}.mp3`;
        
        // Fetch and process the text file
        const textResponse = await fetch(textFile);
        const textContent = await textResponse.text();
        syncText.innerHTML = formatText(textContent);
        
        audioPlayer.src = mp3File;
        audioPlayer.load();

        // Check if sync data exists for the current dashaka
        if (syncData[currentDashaka]) {
            startSync();
        } else {
            console.warn(`No sync data found for Dashakam ${currentDashaka}.`);
        }
    }

    // Format text with spans for highlighting
    function formatText(textContent) {
        let formattedHtml = '';
        const lines = textContent.split('\n');
        let inEnglishSection = false;

        lines.forEach(line => {
            if (line.startsWith('(')) {
                inEnglishSection = true;
            } else if (line.trim() === '') {
                inEnglishSection = false;
            }

            if (!inEnglishSection) {
                const words = line.split(' ');
                words.forEach(word => {
                    if (word.trim() !== '') {
                        formattedHtml += `<span class="sanskrit-word">${word}</span> `;
                    }
                });
                formattedHtml += '<br>';
            } else {
                formattedHtml += `<p class="meaning">${line}</p>`;
            }
        });
        return formattedHtml;
    }
    
    // Play/Pause functionality
    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playPauseBtn.classList.add('active');
            isPlaying = true;
        } else {
            audioPlayer.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            playPauseBtn.classList.remove('active');
            isPlaying = false;
        }
    });

    // Next/Previous functionality
    nextBtn.addEventListener('click', () => loadDashaka(currentDashaka + 1));
    prevBtn.addEventListener('click', () => loadDashaka(currentDashaka - 1));

    // Repeat functionality
    repeatBtn.addEventListener('click', () => {
        repeatMode = (repeatMode % 3) + 1;
        repeatCountDisplay.textContent = `x${repeatMode}`;
        repeatBtn.classList.toggle('active', repeatMode > 1);
    });

    // Volume control
    volumeSlider.addEventListener('input', () => {
        audioPlayer.volume = volumeSlider.value;
    });

    // Speed control
    speedSlider.addEventListener('input', () => {
        audioPlayer.playbackRate = speedSlider.value;
        speedDisplay.textContent = `${speedSlider.value}x`;
    });

    // Handle text highlighting
    let currentSegmentIndex = 0;
    function startSync() {
        const segments = syncData[currentDashaka];
        if (!segments) return;

        currentSegmentIndex = 0;
        audioPlayer.ontimeupdate = () => {
            if (currentSegmentIndex < segments.length) {
                const segment = segments[currentSegmentIndex];
                if (audioPlayer.currentTime >= segment.start && audioPlayer.currentTime <= segment.end) {
                    highlightWord(segment.wordIndex);
                } else if (audioPlayer.currentTime > segment.end) {
                    unhighlightWord(segment.wordIndex);
                    currentSegmentIndex++;
                }
            }
        };

        audioPlayer.onended = () => {
            repeatCounter++;
            if (repeatCounter < repeatMode) {
                audioPlayer.currentTime = 0;
                audioPlayer.play();
            } else {
                repeatCounter = 0;
                loadDashaka(currentDashaka + 1);
            }
        };
    }

    function highlightWord(wordIndex) {
        const words = document.querySelectorAll('#sync-text .sanskrit-word');
        if (words[wordIndex]) {
            words[wordIndex].classList.add('highlight');
        }
    }

    function unhighlightWord(wordIndex) {
        const words = document.querySelectorAll('#sync-text .sanskrit-word');
        if (words[wordIndex]) {
            words[wordIndex].classList.remove('highlight');
        }
    }

    // Initial load
    loadDashaka(1);
});
