import os


def load_documents(folder_path: str = "data") -> list:
    documents = []

    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"Data folder '{folder_path}' not found.")

    for filename in sorted(os.listdir(folder_path)):
        if not filename.endswith(".md"):
            continue

        topic = filename.replace(".md", "")
        filepath = os.path.join(folder_path, filename)

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()

            if not content:
                print(f"  WARNING: {filename} is empty — skipping.")
                continue

            documents.append({"topic": topic, "content": content})
            print(f"  Loaded: {filename} ({len(content)} chars)")

        except UnicodeDecodeError:
            print(f"  WARNING: {filename} has encoding issues — skipping.")
        except Exception as e:
            print(f"  WARNING: Could not load {filename}: {e} — skipping.")

    return documents