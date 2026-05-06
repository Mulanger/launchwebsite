import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '../../_components/JsonLd.jsx';
import {
  QaCategoryPill,
  QaRail,
  QaRelatedList,
  QaShell,
  QaSourceLinks,
} from '../../_components/QaLayout.jsx';
import { buildNextMetadata } from '../../../src/lib/next-metadata.js';
import {
  buildQnaArticleStructuredData,
  buildQnaBreadcrumbStructuredData,
  buildQnaFaqStructuredData,
  getQnaBySlug,
  getRelatedQnaItems,
  qnaItems,
  shouldShowInformationalNote,
} from '../../../src/lib/qna.js';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return qnaItems.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const item = getQnaBySlug(slug);

  if (!item) {
    return buildNextMetadata({
      title: 'Polymarket Question Not Found | Polywhale',
      description: 'This Polymarket Q&A page is not available.',
      path: '/qa',
      robots: 'noindex,follow',
    });
  }

  return buildNextMetadata({
    title: `${item.question} | Polywhale Q&A`,
    description: item.description,
    keywords: [
      item.rawQuestion,
      item.question,
      'Polymarket question',
      'Polymarket FAQ',
      item.category.label,
      'Polywhale Q&A',
    ].join(', '),
    path: item.path,
    robots: 'index,follow,max-image-preview:large',
  });
}

export default async function QaQuestionPage({ params }) {
  const { slug } = await params;
  const item = getQnaBySlug(slug);

  if (!item) {
    notFound();
  }

  const related = getRelatedQnaItems(item, 6);

  return (
    <QaShell rail={<QaRail currentCategory={item.category} related={related} />}>
      <JsonLd
        data={[
          buildQnaFaqStructuredData(item),
          buildQnaArticleStructuredData(item),
          buildQnaBreadcrumbStructuredData(item),
        ]}
      />
      <main className="feed-main qa-main qa-answer-main">
        <Link className="qa-back-button" href="/qa">
          Back to Q&A
        </Link>

        <nav className="qa-page-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Polywhale</Link>
          <span>/</span>
          <Link href="/qa">Q&A</Link>
          <span>/</span>
          <span>{item.category.label}</span>
        </nav>

        <article className="qa-article">
          <QaCategoryPill item={item} />
          <h1>{item.question}</h1>
          <p className="qa-answer-lead">{item.answerLead}</p>

          <div className="qa-answer-body">
            {item.answerParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {shouldShowInformationalNote(item) ? (
            <aside className="qa-note">
              This answer is informational, not legal, tax, or financial advice. Polymarket access, tax treatment, and
              regulatory status can change by country, state, and user circumstances.
            </aside>
          ) : null}

          <QaSourceLinks sources={item.sourceUrls} />

          <section className="qa-next-actions" aria-label="Continue on Polywhale">
            <Link href="/">
              <strong>Open the live whale feed</strong>
              <span>See the large Polymarket trades moving right now.</span>
            </Link>
            <Link href="/leaderboard">
              <strong>See top whale wallets</strong>
              <span>Rank traders by tracked volume and trade count.</span>
            </Link>
          </section>

          <QaRelatedList items={related} />
        </article>
      </main>
    </QaShell>
  );
}
