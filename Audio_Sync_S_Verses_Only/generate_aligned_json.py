import json
import os
from typing import Dict, Any, List
from multiprocessing import Pool, cpu_count
from functools import partial
from mutagen.mp3 import MP3
import re

# Define character weights for Devanagari script
# This is an approximation. Adjust weights for more accuracy.
# Based on linguistic principles where independent vowels and consonants have a 'unit' time,
# and attached vowels and half-consonants have fractions.
DEVANAGARI_WEIGHTS = {
    # Independent vowels
    'अ': 1.0, 'आ': 1.5, 'इ': 1.0, 'ई': 1.5, 'उ': 1.0, 'ऊ': 1.5,
    'ऋ': 1.0, 'ॠ': 1.5, 'ऌ': 1.0, 'ॡ': 1.5, 'ए': 1.5, 'ऐ': 2.0,
    'ओ': 1.5, 'औ': 2.0,
    # Consonants
    'क': 1.0, 'ख': 1.0, 'ग': 1.0, 'घ': 1.0, 'ङ': 1.0,
    'च': 1.0, 'छ': 1.0, 'ज': 1.0, 'झ': 1.0, 'ञ': 1.0,
    'ट': 1.0, 'ठ': 1.0, 'ड': 1.0, 'ढ': 1.0, 'ण': 1.0,
    'त': 1.0, 'थ': 1.0, 'द': 1.0, 'ध': 1.0, 'न': 1.0,
    'प': 1.0, 'फ': 1.0, 'ब': 1.0, 'भ': 1.0, 'म': 1.0,
    'य': 1.0, 'र': 1.0, 'ल': 1.0, 'व': 1.0, 'श': 1.0,
    'ष': 1.0, 'स': 1.0, 'ह': 1.0,
    # Vowel signs (matras)
    'ा': 0.5, 'ि': 0.5, 'ी': 1.0, 'ु': 0.5, 'ू': 1.0,
    'ृ': 0.5, 'ॄ': 1.0, 'ॢ': 0.5, 'ॣ': 1.0, 'े': 1.0,
    'ै': 1.5, 'ो': 1.0, 'ौ': 1.5,
    # Other marks
    'ं': 0.5, 'ः': 0.5, 'ँ': 0.5,
    # Virama (indicates half-consonant)
    '्': -0.5, # Subtract weight for half-consonant
    # Punctuation and others (adjust as needed)
    '।': 0.5, '॥': 0.5, ' ': 0.0,
}

def calculate_word_weight(word: str) -> float:
    """Calculates the pronunciation weight of a Devanagari word."""
    total_weight = 0.0
    for char in word:
        total_weight += DEVANAGARI_WEIGHTS.get(char, 0.0)
    # Give a small base weight to account for the consonant itself
    if re.search(r'[\u0905-\u0939]', word): # Check for any base Devanagari character
        total_weight += 0.5
    return max(0.1, total_weight) # Ensure weight is always positive

def process_single_recitation_weighted_time(i: int, output_dir: str):
    """
    Processes a single file, distributing time based on weighted word length.
    Each original line is a separate verse.
    """
    file_number = str(i).zfill(3)
    text_filename = f"Narayaneeyam_D{file_number}.txt"
    audio_filename = f"Narayaneeyam_D{file_number}.mp3"
    
    if not os.path.exists(text_filename) or not os.path.exists(audio_filename):
        print(f"Warning: {text_filename} or {audio_filename} not found. Skipping.")
        return None

    try:
        print(f"Processing {audio_filename} and {text_filename}...")
        
        audio = MP3(audio_filename)
        total_duration = audio.info.length
        
        with open(text_filename, "r", encoding="utf-8") as f:
            original_lines = [line.strip() for line in f.read().strip().splitlines() if line.strip()]

        verses = []
        
        total_weight_all_verses = 0.0
        weighted_lines = []
        for original_line in original_lines:
            verse_text = original_line
            verse_words = verse_text.split()
            
            line_total_weight = 0.0
            line_words_with_weight = []
            for word_text in verse_words:
                weight = calculate_word_weight(word_text)
                line_total_weight += weight
                line_words_with_weight.append({"weight": weight, "text": word_text})
            
            weighted_lines.append({"total_weight": line_total_weight, "words": line_words_with_weight})
            total_weight_all_verses += line_total_weight
        
        current_time = 0.0
        if total_weight_all_verses == 0:
            total_weight_all_verses = 1 # Avoid division by zero
        
        for idx, line_data in enumerate(weighted_lines):
            line_duration = (line_data['total_weight'] / total_weight_all_verses) * total_duration
            
            verse_words_with_time = []
            if line_data['total_weight'] > 0:
                time_per_unit_weight = line_duration / line_data['total_weight']
            else:
                time_per_unit_weight = 0.0

            word_time = current_time
            for word_data in line_data['words']:
                verse_words_with_time.append({"time": round(word_time, 2), "text": word_data['text']})
                word_time += word_data['weight'] * time_per_unit_weight

            verses.append({
                "verse_number": f"{idx//2 + 1}{'a' if idx%2==0 else 'b'}",
                "time": round(current_time, 2),
                "text": original_lines[idx],
                "words": verse_words_with_time
            })
            current_time += line_duration
        
        recitation = {
            "id": f"D{file_number}",
            "title": f"Narayaneeyam - Chapter {i}",
            "audio": audio_filename,
            "verses": verses
        }

        temp_output_path = os.path.join(output_dir, f"temp_{file_number}.json")
        with open(temp_output_path, "w", encoding="utf-8") as f:
            json.dump(recitation, f, indent=4, ensure_ascii=False)

        return recitation

    except Exception as e:
        print(f"Error processing {file_number}: {e}")
        return None

# Function to combine all temp JSON files into a single master JSON
def combine_json_files(temp_dir: str, final_output_file: str):
    """Combines all temp JSON files into a single master JSON."""
    recitations_list = []
    temp_files = sorted(os.listdir(temp_dir))
    
    for filename in temp_files:
        if filename.startswith("temp_") and filename.endswith(".json"):
            filepath = os.path.join(temp_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                recitations_list.append(data)
            os.remove(filepath)
            
    with open(final_output_file, "w", encoding="utf-8") as f:
        json.dump(recitations_list, f, indent=4, ensure_ascii=False)
    
    print(f"\nMaster JSON file '{final_output_file}' created successfully.")
    os.rmdir(temp_dir)

# Main function for parallel processing
def main_parallel(num_files: int):
    """Main function for parallel processing."""
    temp_dir = "temp_json_files_weighted_time"
    if os.path.exists(temp_dir):
        for file in os.listdir(temp_dir):
            os.remove(os.path.join(temp_dir, file))
    else:
        os.makedirs(temp_dir)
        
    final_output_file = "recitations_master_weighted_timed.json"

    num_processes = cpu_count()
    print(f"Starting parallel processing with {num_processes} cores for {num_files} files...")
    
    with Pool(processes=num_processes) as pool:
        func = partial(process_single_recitation_weighted_time, output_dir=temp_dir)
        pool.map(func, range(1, num_files + 1))
        
    combine_json_files(temp_dir, final_output_file)

if __name__ == "__main__":
    main_parallel(num_files=100)
