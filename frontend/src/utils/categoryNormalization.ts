/**
 * Normalizes category strings from database records and constants
 * to deduplicate equivalent variants (e.g., "Science Fiction" and "Science Fiction (Sci-Fi)").
 */
export function normalizeCategory(category: string | undefined | null): string {
  if (!category) return 'General'
  const trimmed = category.trim()
  if (!trimmed) return 'General'
  const lower = trimmed.toLowerCase()

  if (lower.includes('science fiction') || lower === 'sci-fi') {
    return 'Science Fiction'
  }
  if (lower.includes('young adult') || lower === 'ya') {
    return 'Young Adult'
  }
  if (lower.includes('children') || lower.includes('child')) {
    return "Children's Literature"
  }
  if (lower.includes('christian')) {
    return 'Christian Fiction'
  }
  if (lower.includes('lgbtq') || lower.includes('gay') || lower.includes('lesbian')) {
    return 'LGBTQ+'
  }
  if (lower.includes('humor') || lower.includes('comedy')) {
    return 'Humor & Comedy'
  }
  if (lower.includes('self-help') || lower.includes('self help')) {
    return 'Self Help'
  }
  if (lower.includes('historical fiction')) {
    return 'Historical Fiction'
  }
  if (lower.includes('literary fiction')) {
    return 'Literary Fiction'
  }
  if (lower.includes('graphic novel')) {
    return 'Graphic Novels'
  }

  // Remove trailing parenthetical aliases like (Sci-Fi) or (YA) if any remain
  const cleaned = trimmed.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return cleaned || trimmed
}

/**
 * Checks whether a book matches a selected category, accounting for normalization and aliases.
 */
export function bookMatchesCategory(
  bookCategory: string | undefined | null,
  selectedCategory: string
): boolean {
  if (selectedCategory === 'All') return true
  if (!bookCategory) return false

  const rawCats = bookCategory.split(',').map((c) => c.trim()).filter(Boolean)
  const normSelected = normalizeCategory(selectedCategory).toLowerCase()

  return rawCats.some((c) => {
    const norm = normalizeCategory(c).toLowerCase()
    return norm === normSelected || c.toLowerCase().includes(normSelected)
  })
}

/**
 * Splits a comma-separated category string into an array of normalized distinct categories.
 */
export function extractCategories(categoryStr: string | undefined | null): string[] {
  if (!categoryStr) return ['General']
  const rawList = categoryStr
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)

  if (rawList.length === 0) return ['General']

  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of rawList) {
    const norm = normalizeCategory(raw)
    if (norm && !seen.has(norm.toLowerCase())) {
      seen.add(norm.toLowerCase())
      result.push(norm)
    }
  }

  return result.length > 0 ? result : ['General']
}
