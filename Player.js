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
    console.log(`[Load] Starting to load content for chapter ${chapterNumber}...`);

    // Set audio source
    const chapterPadded = String(chapterNumber).padStart(3, '0');
    const audioPath = `Audio_Sync_S_Verses_Only/Narayaneeyam_D${chapterPadded}.mp3`;
    audioPlayer.src = audioPath;
    audioPlayer.load();
    console.log(`[Load] Audio path set to: ${audioPath}`);

    try {
        // Fetch the HTML text file
        console.log('[Fetch] Attempting to fetch narayaneeyam_text.html...');
        const textResponse = await fetch('narayaneeyam_text.html');
        if (!textResponse.ok) {
            throw new Error(`HTTP error! status: ${textResponse.status}`);
        }
        const textHtml = await textResponse.text();
        console.log(`[Fetch] Fetched text content. Size: ${textHtml.length} bytes.`);
        
        // Use a temporary element to safely parse the fetched HTML string
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = textHtml;

        // Extract the relevant chapter text using the data-chapter attribute
        const chapterTitleToSearch = `Narayaneeyam D${chapterPadded}`;
        console.log(`[Parse] Searching for chapter with data-chapter="${chapterTitleToSearch}"...`);
        
        let foundChapter = false;
        let chapterContent = [];

        // Find the correct chapter's <h2> tag
        const h2Elements = tempDiv.querySelectorAll('h2[data-chapter]');
        for (const h2 of h2Elements) {
            if (h2.dataset.chapter.trim() === chapterTitleToSearch.trim()) {
                foundChapter = true;
                chapterContent.push(h2.outerHTML);
                
                // Collect all subsequent siblings until the next h2
                let nextSibling = h2.nextElementSibling;
                while (nextSibling && nextSibling.tagName !== 'H2') {
                    chapterContent.push(nextSibling.outerHTML);
                    nextSibling = nextSibling.nextElementSibling;
                }
                break; // Stop after finding and processing the correct chapter
            }
        }
        
        if (chapterContent.length === 0) {
            console.warn(`[Parse] No content found for chapter ${chapterNumber}. Check chapter title matching.`);
        }

        textContainer.innerHTML = chapterContent.join('');
        currentChapterText = textContainer.querySelectorAll('p[data-start]');
        
        console.log(`[Parse] Found ${currentChapterText.length} text cues for chapter ${chapterNumber}.`);

    } catch (error) {
        console.error('[Error] An error occurred during loading chapter content:', error);
        textContainer.innerHTML = `<p style="color:red;">Error loading text: ${error.message}</p>`;
        currentChapterText = []; // Ensure it's always an iterable
    }
    
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
