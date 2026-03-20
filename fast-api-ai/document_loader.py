import os

def load_documents(folder_path="data"):
    documents = []

    for filename in os.listdir(folder_path):
        if filename.endswith(".md"):
            topic = filename.replace(".md", "")
            filepath = os.path.join(folder_path, filename)

            with open(filepath, "r", encoding="utf-8") as file:
                content = file.read()

            documents.append({
                "topic": topic,
                "content": content
            })

    return documents