import { redirect } from 'next/navigation'

export default function MeinBereichPage({ params }: { params: { slug: string } }) {
  redirect(`/${params.slug}/konto`)
}
