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
    for (let i = 1; i <= 100; i++) {
        const option = document.createElement('option');
        const chapterNumber = String(i).padStart(3, '0');
        option.value = chapterNumber;
        option.textContent = `Chapter ${i}`;
        chapterSelect.appendChild(option);
    }

    // --- Part 2: Dynamic text and audio loading ---
    async function loadChapterContent(chapterNumber) {
        const chapterPadded = String(chapterNumber).padStart(3, '0');
        const audioPath = `Audio_Sync_S_Verses_Only/Narayaneeyam_D${chapterPadded}.mp3`;
        audioPlayer.src = audioPath;
        audioPlayer.load();

        try {
            const textResponse = await fetch('narayaneeyam_text.html');
            if (!textResponse.ok) {
                throw new Error(`HTTP error! status: ${textResponse.status}`);
            }
            const textHtml = await textResponse.text();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textHtml;

            const chapterTitleToSearch = `Narayaneeyam D${chapterPadded}`;
            
            let foundChapter = false;
            let chapterContent = [];

            const h2Elements = tempDiv.querySelectorAll('h2[data-chapter]');
            for (const h2 of h2Elements) {
                if (h2.dataset.chapter.trim() === chapterTitleToSearch.trim()) {
                    foundChapter = true;
                    chapterContent.push(h2.outerHTML);
                    
                    let nextSibling = h2.nextElementSibling;
                    while (nextSibling && nextSibling.tagName !== 'H2') {
                        chapterContent.push(nextSibling.outerHTML);
                        nextSibling = nextSibling.nextElementSibling;
                    }
                    break;
                }
            }
            
            if (chapterContent.length === 0) {
                console.warn(`[Parse] No content found for chapter ${chapterNumber}. Check chapter title matching.`);
            }

            textContainer.innerHTML = chapterContent.join('');
            currentChapterText = textContainer.querySelectorAll('p[data-start]');
            
        } catch (error) {
            console.error('[Error] An error occurred during loading chapter content:', error);
            textContainer.innerHTML = `<p style="color:red;">Error loading text: ${error.message}</p>`;
            currentChapterText = [];
        }
        
        if (isPlaying) {
            audioPlayer.addEventListener('canplay', function playOnLoad() {
                audioPlayer.play();
                audioPlayer.removeEventListener('canplay', playOnLoad);
            });
        }
    }

    // --- Part 3: Event Listeners and Logic ---
    chapterSelect.addEventListener('change', (e) => {
        loadChapterContent(e.target.value);
    });

    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseBtn.textContent = 'Pause';
            isPlaying = true;
        } else {
            audioPlayer.pause();
            playPauseBtn.textContent = 'Play';
            isPlaying = false;
        }
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
        if (!currentChapterText || currentChapterText.length === 0) {
            return;
        }
        
        let foundCue = false;
        for (const p of currentChapterText) {
            const startTime = parseTime(p.dataset.start);
            const endTime = parseTime(p.dataset.end);
            
            if (currentTime >= startTime && currentTime < endTime) {
                if (currentCueElement !== p) {
                    if (currentCueElement) {
                        currentCueElement.classList.remove('highlight');
                    }
                    p.classList.add('highlight');
                    currentCueElement = p;
                    currentSubsectionCue = p;
                }
                foundCue = true;
                break;
            }
        }
        
        if (!foundCue && currentCueElement) {
             currentCueElement.classList.remove('highlight');
             currentCueElement = null;
        }
        
        if (isRepeatingSubsection && currentSubsectionCue) {
            const endTime = parseTime(currentSubsectionCue.dataset.end);
            if (currentTime >= endTime) {
                audioPlayer.currentTime = parseTime(currentSubsectionCue.dataset.start);
            }
        }
    });

    audioPlayer.addEventListener('seeked', () => {
        audioPlayer.dispatchEvent(new Event('timeupdate'));
    });
    
    repeatChapterBtn.addEventListener('click', () => {
        isRepeatingChapter = !isRepeatingChapter;
        repeatChapterBtn.classList.toggle('active', isRepeatingChapter);
    });

    audioPlayer.addEventListener('ended', () => {
        if (isRepeatingChapter) {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            let currentChapterNum = parseInt(chapterSelect.value, 10);
            if (currentChapterNum < 100) {
                const nextChapterNum = currentChapterNum + 1;
                const newChapterPadded = String(nextChapterNum).padStart(3, '0');
                
                chapterSelect.value = newChapterPadded;
                chapterSelect.dispatchEvent(new Event('change'));

                isPlaying = true;
                playPauseBtn.textContent = 'Pause';
            } else {
                isPlaying = false;
                playPauseBtn.textContent = 'Play';
                if (currentCueElement) {
                    currentCueElement.classList.remove('highlight');
                    currentCueElement = null;
                }
            }
        }
    });

    repeatSubsectionBtn.addEventListener('click', () => {
        isRepeatingSubsection = !isRepeatingSubsection;
        repeatSubsectionBtn.classList.toggle('active', isRepeatingSubsection);
    });
    
    // --- Helper function to convert time string to seconds ---
    function parseTime(timeStr) {
        if (!timeStr) return 0;
        
        const parts = timeStr.split(/[:.]/);
        let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;

        if (parts.length === 4) { // HH:MM:SS.mmm
            hours = parseInt(parts[0], 10) || 0;
            minutes = parseInt(parts[1], 10) || 0;
            seconds = parseInt(parts[2], 10) || 0;
            milliseconds = parseInt(parts[3], 10) || 0;
        } else if (parts.length === 3) { // MM:SS.mmm or HH:MM:SS
            const hasMillis = timeStr.includes('.');
            if (hasMillis) { // MM:SS.mmm
                minutes = parseInt(parts[0], 10) || 0;
                seconds = parseInt(parts[1], 10) || 0;
                milliseconds = parseInt(parts[2], 10) || 0;
            } else { // HH:MM:SS
                hours = parseInt(parts[0], 10) || 0;
                minutes = parseInt(parts[1], 10) || 0;
                seconds = parseInt(parts[2], 10) || 0;
            }
        } else if (parts.length === 2) { // MM:SS
            minutes = parseInt(parts[0], 10) || 0;
            seconds = parseInt(parts[1], 10) || 0;
        } else if (parts.length === 1) { // SS or SSS
            seconds = parseFloat(parts[0]) || 0;
        }

        return hours * 3600 + minutes * 60 + seconds + (milliseconds / 1000);
    }
    
    // Initial load
    loadChapterContent(chapterSelect.value);
});
