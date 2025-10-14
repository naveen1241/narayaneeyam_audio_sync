document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const chapterSelect = document.getElementById('chapter-select');
    const playPauseBtn = document.getElementById('play-pause');
    const repeatChapterBtn = document.getElementById('repeat-chapter');
    const repeatSubsectionBtn = document.getElementById('repeat-subsection');
    const speedSelect = document.getElementById('speed-select');
    const volumeSlider = document.getElementById('volume-slider');
    const textContainer = document.getElementById('text-container');

    let isPlaying = false;
    let isRepeatingChapter = false;
    let isRepeatingSubsection = false;
    let currentChapterText = null;
    let currentSubsectionCue = null;
    let currentCueElement = null;

    // --- Part 1: Initial setup ---
    // Populate the chapter select dropdown
    for (let i = 1; i <= 100; i++) {
        const option = document.createElement('option');
        const chapterNumber = String(i).padStart(3, '0');
        option.value = chapterNumber;
        option.textContent = `Chapter ${i}`;
        chapterSelect.appendChild(option);
    }

    // --- Part 2: Dynamic text and audio loading ---
    async function loadChapterContent(chapterNumber) {
        // Load the audio file
        audioPlayer.src = `Audio_Sync_S_Verses_Only/Narayaneeyam_D${chapterNumber}.mp3`;
        audioPlayer.load();

        // Load the HTML text and extract the specific chapter
        const textResponse = await fetch('narayaneeyam_text.html');
        const textHtml = await textResponse.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(textHtml, 'text/html');

        // Extract the relevant chapter text
        const chapterTitle = `Narayaneeyam_D${chapterNumber}.vtt`;
        let startFound = false;
        const chapterContent = [];

        for (const child of doc.body.children) {
            if (child.tagName === 'H2' && child.textContent.includes(chapterTitle)) {
                startFound = true;
            } else if (child.tagName === 'H2' && startFound) {
                break; // Stop when the next chapter starts
            }

            if (startFound) {
                chapterContent.push(child.outerHTML);
            }
        }
        
        textContainer.innerHTML = chapterContent.join('');
        currentChapterText = textContainer.querySelectorAll('p[data-start]');
        
        if (isPlaying) {
            audioPlayer.play();
        }
    }

    // --- Part 3: Event Listeners and Logic ---
    chapterSelect.addEventListener('change', (e) => {
        loadChapterContent(e.target.value);
    });

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            audioPlayer.pause();
            playPauseBtn.textContent = 'Play';
        } else {
            audioPlayer.play();
            playPauseBtn.textContent = 'Pause';
        }
        isPlaying = !isPlaying;
    });

    speedSelect.addEventListener('change', (e) => {
        audioPlayer.playbackRate = parseFloat(e.target.value);
    });

    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = parseFloat(e.target.value);
    });

    // Main synchronization logic
    audioPlayer.addEventListener('timeupdate', () => {
        const currentTime = audioPlayer.currentTime;
    
        // Check if currentChapterText is a valid iterable object
    if (!currentChapterText) {
        return; // Exit if the text content hasn't loaded yet
    }
        // Highlight current subsection
        let foundCue = false;
        for (const p of currentChapterText) {
            const startTime = parseTime(p.dataset.start);
            const endTime = parseTime(p.dataset.end);
            
            if (currentTime >= startTime && currentTime < endTime) {
                if (currentCueElement) {
                    currentCueElement.classList.remove('highlight');
                }
                p.classList.add('highlight');
                currentCueElement = p;
                currentSubsectionCue = p;
                foundCue = true;
                break;
            }
        }
        
        // Handle repeat subsection
        if (isRepeatingSubsection && currentSubsectionCue) {
            const endTime = parseTime(currentSubsectionCue.dataset.end);
            if (currentTime >= endTime) {
                audioPlayer.currentTime = parseTime(currentSubsectionCue.dataset.start);
            }
        }
    });
    
    // Repeat chapter
    repeatChapterBtn.addEventListener('click', () => {
        isRepeatingChapter = !isRepeatingChapter;
        repeatChapterBtn.classList.toggle('active', isRepeatingChapter);
    });

    audioPlayer.addEventListener('ended', () => {
        if (isRepeatingChapter) {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            isPlaying = false;
            playPauseBtn.textContent = 'Play';
        }
    });

    // Repeat subsection
    repeatSubsectionBtn.addEventListener('click', () => {
        isRepeatingSubsection = !isRepeatingSubsection;
        repeatSubsectionBtn.classList.toggle('active', isRepeatingSubsection);
    });
    
    // Helper function to convert time string to seconds
    function parseTime(timeStr) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Initial load
    loadChapterContent(chapterSelect.value);
});
