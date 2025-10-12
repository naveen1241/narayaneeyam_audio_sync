import re
import os
import shutil

def cleanup_text_files_inplace(num_files=100):
    """
    Modifies text files in-place to fix misplaced verse numbers.
    This script will overwrite the original files.
    """
    # Pattern to find a newline followed by a verse number, like \n१॥
    verse_pattern = re.compile(r'\n(१॥|२॥|३॥|४॥|५॥|६॥|७॥|८॥|९॥|१०॥)\s*')
    
    # Iterate through all 100 files
    for i in range(1, num_files + 1):
        file_number = str(i).zfill(3)
        input_filename = f"Narayaneeyam_D{file_number}.txt"
        
        if not os.path.exists(input_filename):
            print(f"Warning: {input_filename} not found. Skipping.")
            continue
            
        print(f"Processing {input_filename}...")
        
        try:
            # Read the original content
            with open(input_filename, "r", encoding="utf-8") as f_in:
                content = f_in.read()
            
            # Perform the replacement
            cleaned_content = verse_pattern.sub(r' \1\n\n', content)
            
            # Overwrite the original file with the cleaned content
            with open(input_filename, "w", encoding="utf-8") as f_out:
                f_out.write(cleaned_content.strip()) # .strip() removes any trailing newlines
            
            print(f"File {input_filename} has been modified in-place.")
        
        except Exception as e:
            print(f"Error processing {input_filename}: {e}")

if __name__ == "__main__":
    # WARNING: THIS WILL OVERWRITE YOUR ORIGINAL FILES.
    # To test on just one file, use: cleanup_text_files_inplace(num_files=1)
    # Be sure to have a backup of your files before running this on all 100.
    cleanup_text_files_inplace(num_files=100)
