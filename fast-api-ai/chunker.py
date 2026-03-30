import re


def chunk_by_sections(content: str, topic: str) -> list:
    """
    Split markdown content on ## headings.
    Each section = one complete concept + its code examples.
    Falls back to paragraph chunking if no ## headings found.
    """
    # Split on ## headings (keep the heading in the chunk)
    raw_sections = re.split(r'\n(?=## )', content.strip())

    chunks = []
    for section in raw_sections:
        section = section.strip()
        if not section:
            continue

        # Extract section title for metadata
        first_line = section.split('\n')[0]
        section_title = first_line.replace('## ', '').replace('# ', '').strip()

        # Skip very short sections (less than 30 chars of content)
        if len(section) < 30:
            continue

        has_code = '```' in section

        chunks.append({
            "topic": topic,
            "content": section,
            "section_title": section_title,
            "has_code": has_code
        })

    # Fallback: if no sections found, treat whole doc as one chunk
    if not chunks and content.strip():
        chunks.append({
            "topic": topic,
            "content": content.strip(),
            "section_title": topic,
            "has_code": '```' in content
        })

    return chunks


def create_chunks(documents: list) -> list:
    all_chunks = []

    for doc in documents:
        topic = doc["topic"]
        content = doc["content"]
        chunks = chunk_by_sections(content, topic)
        all_chunks.extend(chunks)

    return all_chunks