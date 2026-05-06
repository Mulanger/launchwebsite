import rawQnaItems from '../../qna_sample.json';
import { seoImage, siteName, siteOrigin } from './seo.js';

export const QNA_LAST_MODIFIED = '2026-05-06T00:00:00.000Z';

export const qnaCategoryDefinitions = [
  { id: 'getting-started', label: 'Getting started', pill: 'Basics', tone: 'basic' },
  { id: 'mechanics', label: 'Mechanics', pill: 'Mechanics', tone: 'mechanics' },
  { id: 'legal-tax', label: 'Legal & tax', pill: 'Legal', tone: 'legal' },
  { id: 'whales-data', label: 'Whales & data', pill: 'Whales', tone: 'whales' },
  { id: 'comparisons', label: 'Comparisons', pill: 'Compare', tone: 'compare' },
  { id: 'markets-odds', label: 'Markets & odds', pill: 'Markets', tone: 'markets' },
];

const categoryMap = new Map(qnaCategoryDefinitions.map((category) => [category.id, category]));
const sourcePattern = /https?:\/\/[^\s)]+/gi;
const questionTokenStopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'be',
  'can',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'polymarket',
  'polymarkets',
  'should',
  'the',
  'to',
  'use',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
  'you',
]);

const properCaseReplacements = [
  ['polymarkets', 'Polymarkets'],
  ['polymarket', 'Polymarket'],
  ['polywhale', 'Polywhale'],
  ['kalshi', 'Kalshi'],
  ['manifold', 'Manifold'],
  ['predictit', 'PredictIt'],
  ['usdc', 'USDC'],
  ['us', 'US'],
  ['usa', 'USA'],
  ['uk', 'UK'],
  ['eu', 'EU'],
  ['vpn', 'VPN'],
  ['api', 'API'],
  ['clob', 'CLOB'],
  ['ipo', 'IPO'],
  ['irs', 'IRS'],
  ['cftc', 'CFTC'],
  ['nyse', 'NYSE'],
  ['nyc', 'NYC'],
  ['ai', 'AI'],
  ['uma', 'UMA'],
  ['yes', 'YES'],
  ['no', 'NO'],
  ['polygon', 'Polygon'],
  ['satoshi', 'Satoshi'],
  ['super bowl', 'Super Bowl'],
  ['fed', 'Fed'],
  ['house', 'House'],
  ['senate', 'Senate'],
  ['gta', 'GTA'],
];

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function slugifyQuestion(question) {
  return normalizeWhitespace(question)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isPolymarketQuestion(question) {
  return /\bpoly[\s.-]*markets?\b|\bpolymarkets?\b/i.test(question);
}

function humanizeQuestion(question) {
  let text = normalizeWhitespace(question).replace(/\s*\.\s*/g, ' ');

  for (const [from, to] of properCaseReplacements) {
    text = text.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
  }

  text = text.charAt(0).toUpperCase() + text.slice(1);

  if (!/[?!]$/.test(text)) {
    text += '?';
  }

  return text;
}

function extractSourceUrls(answer) {
  return Array.from(String(answer || '').matchAll(sourcePattern))
    .map((match) => match[0].replace(/[.,;:]+$/g, ''))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function stripSourceSuffix(answer) {
  const text = normalizeWhitespace(answer);
  const sourceIndex = text.search(/\bSources?:\s+https?:\/\//i);

  if (sourceIndex > -1 && sourceIndex > text.length - 700) {
    return text.slice(0, sourceIndex).trim();
  }

  return text;
}

function splitSentences(text) {
  return (
    normalizeWhitespace(text).match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map((sentence) => sentence.trim()) || []
  );
}

function wordCount(text) {
  return normalizeWhitespace(text).split(/\s+/).filter(Boolean).length;
}

function buildAnswerParts(answerText) {
  const sentences = splitSentences(answerText);
  const lead = [];
  let leadWords = 0;

  for (const sentence of sentences) {
    const nextWords = wordCount(sentence);
    if (lead.length > 0 && leadWords + nextWords > 90) break;

    lead.push(sentence);
    leadWords += nextWords;

    if (leadWords >= 55 || lead.length >= 2) break;
  }

  if (!lead.length && answerText) {
    lead.push(answerText);
  }

  const leadText = normalizeWhitespace(lead.join(' '));
  const remaining = sentences.slice(lead.length);
  const paragraphs = [];

  for (let index = 0; index < remaining.length; index += 3) {
    const paragraph = normalizeWhitespace(remaining.slice(index, index + 3).join(' '));
    if (paragraph) paragraphs.push(paragraph);
  }

  return {
    lead: leadText,
    paragraphs,
  };
}

function truncateText(text, maxLength = 155) {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}...`;
}

function categorizeQuestion(question) {
  const q = normalizeWhitespace(question).toLowerCase();

  if (/\b(kalshi|manifold|predictit|sportsbook|alternatives?|competitors?|same|vs)\b/.test(q)) {
    return 'comparisons';
  }

  if (
    /\b(legal|illegal|tax|taxed|taxable|winnings|wins|gains|regulated|regulation|securities|banned|ban|blocked|available|allowed|countries|states|jurisdiction|california|canada|ontario|uk|germany|australia|india|texas|florida|new york|south africa|jamaica|europe|us|usa|vpn)\b/.test(q)
  ) {
    return 'legal-tax';
  }

  if (/\b(whale|whales|wallet|trader|trades public|bets public|volume|holders|copy|bots?|manipulated|accurate|predictions)\b/.test(q)) {
    return 'whales-data';
  }

  if (
    /\b(who will|who wins|which party|what will|when will|where will|super bowl|president|senate|house|fed chair|pope|satoshi|war|shutdown|giannis|stranger things|midterms|mayor|2028|2026)\b/.test(q)
  ) {
    return 'markets-odds';
  }

  if (
    /\b(fees?|payouts?|pay out|deposit|withdraw|odds|prices|shares|contracts?|resolvers?|outcome|chain|blockchain|currency|crypto|network|coin|clob|server|servers|rewards|works|work|betting|make money|earn money)\b/.test(q)
  ) {
    return 'mechanics';
  }

  return 'getting-started';
}

function tokensForQuestion(question) {
  return normalizeWhitespace(question)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !questionTokenStopWords.has(token));
}

function normalizeQnaItem(item, index) {
  const rawQuestion = normalizeWhitespace(item.question);
  const answer = normalizeWhitespace(item.answer);

  if (!rawQuestion || !answer || !isPolymarketQuestion(rawQuestion)) {
    return null;
  }

  const slug = slugifyQuestion(rawQuestion);
  const answerText = stripSourceSuffix(answer);
  const sourceUrls = extractSourceUrls(answer);
  const answerParts = buildAnswerParts(answerText);
  const categoryId = categorizeQuestion(rawQuestion);

  return {
    index,
    rawQuestion,
    question: humanizeQuestion(rawQuestion),
    slug,
    path: qnaPathForSlug(slug),
    categoryId,
    category: categoryMap.get(categoryId) || categoryMap.get('getting-started'),
    answerText,
    answerLead: answerParts.lead,
    answerParagraphs: answerParts.paragraphs,
    excerpt: truncateText(answerText, 180),
    description: truncateText(answerText, 155),
    sourceUrls,
    tokens: tokensForQuestion(rawQuestion),
  };
}

const seenSlugs = new Set();

export const qnaItems = rawQnaItems
  .map(normalizeQnaItem)
  .filter(Boolean)
  .filter((item) => {
    if (seenSlugs.has(item.slug)) return false;
    seenSlugs.add(item.slug);
    return true;
  });

const qnaBySlug = new Map(qnaItems.map((item) => [item.slug, item]));

export function qnaPathForSlug(slug) {
  return `/qa/${slug}`;
}

export function getQnaBySlug(slug) {
  return qnaBySlug.get(slugifyQuestion(slug));
}

export function getQnaGroups(items = qnaItems) {
  return qnaCategoryDefinitions
    .map((category) => ({
      ...category,
      items: items.filter((item) => item.categoryId === category.id),
    }))
    .filter((group) => group.items.length > 0);
}

export function searchQnaItems(query, limit = 60) {
  const normalized = normalizeWhitespace(query).toLowerCase();
  if (!normalized) return [];

  const queryTokens = tokensForQuestion(normalized);

  return qnaItems
    .map((item) => {
      const question = item.rawQuestion.toLowerCase();
      const answer = item.answerText.toLowerCase();
      let score = question.includes(normalized) ? 100 : 0;

      for (const token of queryTokens) {
        if (question.includes(token)) score += 12;
        if (answer.includes(token)) score += 2;
      }

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.item.index - right.item.index)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function getFeaturedQnaItems() {
  const preferredSlugs = [
    'is-polymarket-legal',
    'how-does-polymarket-work',
    'can-i-use-polymarket-in-the-us',
    'are-polymarket-winnings-taxed',
    'are-polymarket-and-kalshi-the-same',
    'how-do-polymarket-odds-work',
    'are-polymarket-trades-public',
    'should-i-trust-polymarket',
  ];

  const preferred = preferredSlugs.map((slug) => getQnaBySlug(slug)).filter(Boolean);
  const fallback = qnaItems.filter((item) => !preferredSlugs.includes(item.slug)).slice(0, 8 - preferred.length);

  return [...preferred, ...fallback].slice(0, 8);
}

export function getRelatedQnaItems(currentItem, limit = 6) {
  if (!currentItem) return [];

  const currentTokens = new Set(currentItem.tokens);
  const currentPrefix = currentItem.rawQuestion.split(/\s+/)[0]?.toLowerCase();

  return qnaItems
    .filter((item) => item.slug !== currentItem.slug)
    .map((item) => {
      let score = item.categoryId === currentItem.categoryId ? 20 : 0;
      if (item.rawQuestion.split(/\s+/)[0]?.toLowerCase() === currentPrefix) score += 4;

      for (const token of item.tokens) {
        if (currentTokens.has(token)) score += 3;
      }

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.item.index - right.item.index)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function sourceLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function shouldShowInformationalNote(item) {
  return item?.categoryId === 'legal-tax' || /\b(tax|legal|regulated|securities|vpn|banned)\b/i.test(item?.rawQuestion || '');
}

export function buildQnaHubStructuredData() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Polymarket Q&A Hub',
      url: `${siteOrigin}/qa`,
      description:
        'Plain-English answers to high-intent questions about Polymarket, prediction markets, market mechanics, legality, taxes, whale trades, and odds.',
      isPartOf: {
        '@type': 'WebSite',
        name: siteName,
        url: siteOrigin,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Polymarket questions',
      itemListElement: qnaItems.slice(0, 100).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.question,
        url: `${siteOrigin}${item.path}`,
      })),
    },
    buildQnaBreadcrumbStructuredData(),
  ];
}

export function buildQnaFaqStructuredData(item) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answerText,
        },
      },
    ],
  };
}

export function buildQnaArticleStructuredData(item) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.question,
    description: item.description,
    image: seoImage,
    datePublished: QNA_LAST_MODIFIED,
    dateModified: QNA_LAST_MODIFIED,
    mainEntityOfPage: `${siteOrigin}${item.path}`,
    author: {
      '@type': 'Organization',
      name: siteName,
      url: siteOrigin,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: siteOrigin,
      logo: {
        '@type': 'ImageObject',
        url: seoImage,
      },
    },
    about: ['Polymarket', 'Prediction markets', item.category.label],
  };
}

export function buildQnaBreadcrumbStructuredData(item) {
  const elements = [
    {
      '@type': 'ListItem',
      position: 1,
      name: siteName,
      item: siteOrigin,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Q&A',
      item: `${siteOrigin}/qa`,
    },
  ];

  if (item) {
    elements.push({
      '@type': 'ListItem',
      position: 3,
      name: item.question,
      item: `${siteOrigin}${item.path}`,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: elements,
  };
}
