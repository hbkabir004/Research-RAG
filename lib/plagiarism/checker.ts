import { PlagiarismResult, PlagiarismMatch } from '@/types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3);
}

function getNgrams(tokens: string[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

function findMatchingExcerpts(text: string, sourceText: string, minLength: number = 6): string[] {
  const textTokens = tokenize(text);
  const sourceTokens = tokenize(sourceText);

  const matches: string[] = [];
  let i = 0;

  while (i < textTokens.length) {
    let longestMatch = 0;
    let matchStart = -1;

    for (let j = 0; j <= sourceTokens.length - minLength; j++) {
      let matchLen = 0;
      while (
        i + matchLen < textTokens.length &&
        j + matchLen < sourceTokens.length &&
        textTokens[i + matchLen] === sourceTokens[j + matchLen]
      ) {
        matchLen++;
      }

      if (matchLen >= minLength && matchLen > longestMatch) {
        longestMatch = matchLen;
        matchStart = j;
      }
    }

    if (longestMatch >= minLength) {
      const matchedText = sourceTokens.slice(matchStart, matchStart + longestMatch).join(' ');
      matches.push(matchedText);
      i += longestMatch;
    } else {
      i++;
    }
  }

  return matches;
}

function generateRephrasesuggestion(matchedText: string): string {
  const suggestions = [
    `Consider paraphrasing this passage: restructure the sentence and replace key terms with synonyms.`,
    `Rephrase by changing the sentence structure and using different vocabulary to express the same idea.`,
    `Rewrite in your own voice: describe the concept without referencing the original phrasing.`,
    `Use active/passive voice transformation and substitute domain-specific synonyms.`,
  ];
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

export async function checkPlagiarism(
  generatedText: string,
  knowledgeBaseChunks: Array<{ documentName: string; content: string }>
): Promise<PlagiarismResult> {
  if (knowledgeBaseChunks.length === 0) {
    return {
      score: 0,
      matches: [],
      suggestions: ['No knowledge base documents to compare against.'],
    };
  }

  const genTokens = tokenize(generatedText);
  const gen4grams = getNgrams(genTokens, 4);
  const gen6grams = getNgrams(genTokens, 6);

  const matches: PlagiarismMatch[] = [];
  let maxSimilarity = 0;

  for (const source of knowledgeBaseChunks) {
    const srcTokens = tokenize(source.content);
    const src4grams = getNgrams(srcTokens, 4);
    const src6grams = getNgrams(srcTokens, 6);

    const sim4 = jaccardSimilarity(gen4grams, src4grams);
    const sim6 = jaccardSimilarity(gen6grams, src6grams);
    const similarity = (sim4 * 0.4 + sim6 * 0.6) * 100;

    if (similarity > 15) {
      const excerpts = findMatchingExcerpts(generatedText, source.content);
      const topExcerpt = excerpts.sort((a, b) => b.length - a.length)[0];

      if (topExcerpt && topExcerpt.length > 20) {
        matches.push({
          source: source.documentName,
          matchedText: topExcerpt,
          similarityScore: Math.min(similarity, 95),
          suggestion: generateRephrasesuggestion(topExcerpt),
        });

        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
  }

  // Sort by similarity score
  matches.sort((a, b) => b.similarityScore - a.similarityScore);

  // Overall score is weighted max similarity
  const overallScore = matches.length > 0
    ? Math.min(maxSimilarity * 0.8 + (matches.length * 2), 95)
    : 0;

  const suggestions: string[] = [];

  if (overallScore > 30) {
    suggestions.push('High similarity detected. Significantly rephrase the flagged sections.');
    suggestions.push('Consider restructuring the argument flow and using different connecting phrases.');
    suggestions.push('Replace direct terminology borrowing with conceptual paraphrasing.');
  } else if (overallScore > 15) {
    suggestions.push('Moderate similarity to source materials. Consider rephrasing highlighted sections.');
    suggestions.push('Vary your sentence structure and vocabulary in the matched areas.');
  } else if (overallScore > 5) {
    suggestions.push('Low similarity detected. Your writing is mostly original.');
    suggestions.push('Minor refinements to a few phrases may further improve originality.');
  } else {
    suggestions.push('Excellent! Your writing appears highly original with minimal similarity to source materials.');
  }

  return {
    score: Math.round(overallScore),
    matches: matches.slice(0, 5), // top 5 matches
    suggestions,
  };
}
