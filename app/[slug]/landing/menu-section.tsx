import Link from 'next/link'
import type { MenuCategory, MenuItem } from '@/lib/types'

// Produktfoto-Pool aus /public/products/ (Odi's Bowl Rheine)
const PHOTO_POOL = [
  '/products/IMG_4092.JPG',
  '/products/IMG_4089.JPG',
  '/products/IMG_4096.JPG',
  '/products/IMG_4094.JPG',
  '/products/IMG_4099.JPG',
  '/products/IMG_4095.JPG',
  '/products/IMG_4100.JPG',
  '/products/IMG_4088.JPG',
  '/products/IMG_4090.JPG',
  '/products/IMG_4097.JPG',
  '/products/IMG_4091.JPG',
  '/products/IMG_4093.JPG',
  '/products/IMG_4098.JPG',
  '/products/IMG_4101.JPG',
]

type Variant = 'featured' | 'vegan' | 'chicken'
type BadgeType = 'new' | 'vegan' | 'hit' | null

const DELAY_CLASSES = ['', 'd1', 'd2', 'd1', 'd2', 'd1'] as const

function getVariant(index: number): Variant {
  const variants: Variant[] = ['featured', 'vegan', 'chicken']
  return variants[index % 3]
}

// Deterministischer 32-bit Hash (FNV-1a-Light) — selber Input → selbes Foto.
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Foto-Auflösung mit klarer Priorität:
 *   1. item.image_url  →  in DB gepflegtes Foto (höchste Prio)
 *   2. Hash(item.id)   →  deterministisches Pool-Foto ohne Wiederholung im sichtbaren Landing-Set
 */
function resolvePhoto(item: MenuItem, fallbackPhoto: string): string {
  if (item.image_url && item.image_url.trim().length > 0) {
    return item.image_url
  }
  return fallbackPhoto
}

function assignFallbackPhotos(items: MenuItem[]): Map<string, string> {
  const used = new Set<string>()
  const photos = new Map<string, string>()

  items.forEach((item) => {
    let idx = hashString(item.id) % PHOTO_POOL.length
    let photo = PHOTO_POOL[idx]

    while (used.has(photo) && used.size < PHOTO_POOL.length) {
      idx = (idx + 1) % PHOTO_POOL.length
      photo = PHOTO_POOL[idx]
    }

    used.add(photo)
    photos.set(item.id, photo)
  })

  return photos
}

function getBadge(index: number, variant: Variant): BadgeType {
  if (index === 0) return 'hit'
  if (variant === 'vegan') return 'vegan'
  if (index % 4 === 2) return 'new'
  return null
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

type Props = {
  menu: MenuCategory[]
  slug: string
  accentColor: string
}

export function MenuSection({ menu, slug }: Props) {
  // Alle Items flach, max 6 für Landing Page
  const allItems = menu.flatMap((cat) => cat.items).slice(0, 6)
  const fallbackPhotos = assignFallbackPhotos(allItems)

  if (allItems.length === 0) return null

  return (
    <>
      {allItems.map((item, index) => {
        const variant = getVariant(index)
        const badge = getBadge(index, variant)
        const isWide = index === 0
        const delayClass = DELAY_CLASSES[index] ?? ''
        const fallbackPhoto = fallbackPhotos.get(item.id) ?? PHOTO_POOL[index % PHOTO_POOL.length]

        const cardClasses = [
          'product-card',
          'reveal',
          isWide ? 'wide' : '',
          delayClass,
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <Link
            key={item.id}
            className={cardClasses}
            href={`/${slug}/order`}
          >
            {/* ── Foto-Bereich ── */}
            <div className={`prod-visual prod-visu-${variant}`}>
              {/* Native <img> statt next/image — umgeht Vercel Image-Optimization
                  Bug, der dazu führte, dass Produktfotos als Emoji-Fallback
                  gerendert wurden. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvePhoto(item, fallbackPhoto)}
                alt={item.name}
                loading="lazy"
                decoding="async"
                className="prod-visual-img"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
              {badge && (
                <span className={`prod-badge badge-${badge}`}>
                  {badge === 'hit' && '🔥 Hit'}
                  {badge === 'vegan' && '🌱 Vegan'}
                  {badge === 'new' && 'Neu'}
                </span>
              )}
            </div>

            {/* ── Text-Bereich ── */}
            <div className="prod-body">
              <h4 className="prod-name">{item.name}</h4>
              {item.description && (
                <p className="prod-desc">{item.description}</p>
              )}
              <div className="prod-footer">
                <span className="prod-price">{formatPrice(Number(item.price))}</span>
                <span className="prod-btn">Bestellen →</span>
              </div>
            </div>
          </Link>
        )
      })}
    </>
  )
}
