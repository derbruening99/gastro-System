import { NextResponse, type NextRequest } from 'next/server'

// Bei Phone+Password Auth gibt es keinen Code-Exchange.
// Dieser Handler bleibt als Fallback für eventuelle OAuth-Flows in der Zukunft.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { origin } = new URL(request.url)
  // Einfach zu Mein Bereich weiterleiten — Session wurde bereits client-seitig gesetzt
  return NextResponse.redirect(`${origin}/${slug}/konto`)
}
