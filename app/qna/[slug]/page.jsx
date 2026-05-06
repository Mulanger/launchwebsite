import { permanentRedirect } from 'next/navigation';

export default async function QnaAliasQuestionPage({ params }) {
  const { slug } = await params;
  permanentRedirect(`/qa/${slug}`);
}
