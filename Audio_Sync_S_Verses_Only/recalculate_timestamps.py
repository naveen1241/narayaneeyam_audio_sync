import json
import os
import argparse
from typing import Dict, Any, List

def redistribute_word_timestamps(verses: List[Dict[str, Any]]):
    """
    Recalculates word-level timestamps based on manually adjusted verse-level timestamps.
    """
    # Iterate through verses to calculate durations and redistribute word times
    for i in range(len(verses)):
        current_verse = verses[i]
        
        # Determine the duration of the current verse
        next_verse_start_time = None
        if i + 1 < len(verses):
            next_verse_start_time = verses[i+1].get('time')

        # Use the start time of the next verse as the end time, or a default duration
        # (e.g., 5 seconds) if it's the last verse.
        verse_start_time = current_verse.get('time', 0.0)
        
        if next_verse_start_time is not None:
            verse_duration = next_verse_start_time - verse_start_time
        else:
            # Fallback duration for the last verse
            verse_duration = 5.0

        # Now, redistribute the time equally among the words in the verse
        words = current_verse.get('words', [])
        num_words = len(words)
        if num_words > 0 and verse_duration > 0:
            time_per_word = verse_duration / num_words
            for j in range(num_words):
                words[j]['time'] = verse_start_time + (j * time_per_word)
        else:
            # Handle empty verses
            for word in words:
                word['time'] = verse_start_time

def main():
    """Main execution function for recalculating timestamps."""
    parser = argparse.ArgumentParser(description="Recalculate word-level timestamps from verse-level times.")
    parser.add_argument("json_file", help="Path to the JSON file with manual verse timestamps.")
    parser.add_argument("--output", help="Path for the output JSON file. Defaults to overwriting the input file.", default=None)
    args = parser.parse_args()

    try:
        with open(args.json_file, "r", encoding="utf-8") as f:
            recitations_data = json.load(f)

        if not isinstance(recitations_data, list):
            recitations_data = [recitations_data]

        for recitation in recitations_data:
            verses = recitation.get('verses')
            if verses:
                redistribute_word_timestamps(verses)

        output_file = args.output if args.output else args.json_file
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(recitations_data, f, indent=4, ensure_ascii=False)

        print(f"Successfully recalculated word timestamps. Output saved to '{output_file}'.")

    except (IOError, json.JSONDecodeError) as e:
        print(f"Error processing files: {e}")

if __name__ == "__main__":
    main()
