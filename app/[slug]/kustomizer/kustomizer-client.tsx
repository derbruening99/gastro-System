'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Restaurant } from '@/lib/types'

// ─── Data ─────────────────────────────────────────────────────────────────────

const BASE_PRICE = 10.90

type Option = { id: string; label: string; emoji?: string; extra?: number; tag?: string }

const STEPS: {
  id: string
  title: string
  subtitle: string
  emoji: string
  multi?: boolean
  maxSelect?: number
  required: boolean
  options: Option[]
}[] = [
  {
    id: 'basis',
    title: 'Deine Grundlage',
    subtitle: 'Wähle die Basis deiner Bowl',
    emoji: '🍚',
    required: true,
    options: [
      { id: 'basmati-reis',   label: 'Basmati Reis',         emoji: '🍚', tag: 'beliebt' },
      { id: 'blattsalat',     label: 'Frischer Blattsalat',  emoji: '🥗', tag: 'vegan' },
      { id: 'mixed-salad',    label: 'Mixed Salad',          emoji: '🥬', tag: 'vegan' },
      { id: 'baby-blatt',     label: 'Baby Blatt',           emoji: '🌿', tag: 'vegan' },
    ],
  },
  {
    id: 'protein',
    title: 'Deine Warmspeise',
    subtitle: 'Fleisch oder pflanzlich?',
    emoji: '🍖',
    required: true,
    options: [
      { id: 'creamy-chicken',   label: 'Creamy Chicken',        emoji: '🍗', tag: 'beliebt' },
      { id: 'curry-chicken',    label: 'Curry Chicken',         emoji: '🍛' },
      { id: 'teriyaki-chicken', label: 'Teriyaki Chicken',      emoji: '🍱' },
      { id: 'chicken-korma',    label: 'Chicken Korma',         emoji: '🫕' },
      { id: 'crispy-chicken',   label: 'Crispy Chicken',        emoji: '🍗' },
      { id: 'beef',             label: 'Rind / Beef',           emoji: '🥩' },
      { id: 'roastbeef',        label: 'Roastbeef Sesame',      emoji: '🥩' },
      { id: 'haehnchen',        label: 'Hähnchen',              emoji: '🍗' },
      { id: 'tofu',             label: 'Tofu',                  emoji: '🫘', tag: 'vegan' },
      { id: 'falafel',          label: 'Falafel',               emoji: '🧆', tag: 'vegan' },
      { id: 'vegan-chicken',    label: 'Vegan Chicken',         emoji: '🌱', tag: 'vegan' },
    ],
  },
  {
    id: 'zutaten',
    title: 'Deine Zutaten',
    subtitle: 'Wähle bis zu 5 Zutaten',
    emoji: '🥦',
    multi: true,
    maxSelect: 5,
    required: true,
    options: [
      { id: 'mais',          label: 'Mais',              emoji: '🌽' },
      { id: 'gurke',         label: 'Gurken',            emoji: '🥒' },
      { id: 'paprika',       label: 'Paprika',           emoji: '🫑' },
      { id: 'tomate',        label: 'Tomaten',           emoji: '🍅' },
      { id: 'rotkohl',       label: 'Rotkohl',           emoji: '🥬' },
      { id: 'granatapfel',   label: 'Granatapfel',       emoji: '💎', tag: 'superfood' },
      { id: 'avocado',       label: 'Avocado',           emoji: '🥑', tag: 'beliebt' },
      { id: 'edamame',       label: 'Edamame',           emoji: '🫛' },
      { id: 'mango',         label: 'Mango',             emoji: '🥭' },
      { id: 'zwiebeln',      label: 'Zwiebeln / Crispy Onion', emoji: '🧅' },
      { id: 'bohnen',        label: 'Kidney Bohnen',     emoji: '🫘' },
    ],
  },
  {
    id: 'sauce',
    title: 'Deine Sauce',
    subtitle: 'Das macht den Unterschied',
    emoji: '🫙',
    required: true,
    options: [
      { id: 'avocado-sesame',  label: 'Avocado Sesame',   emoji: '🥑', tag: 'beliebt' },
      { id: 'curry-mango',     label: 'Curry Mango',      emoji: '🥭' },
      { id: 'honey-senf',      label: 'Honey Senf',       emoji: '🍯' },
      { id: 'hot-sriracha',    label: 'Hot Sriracha',     emoji: '🌶️', tag: 'scharf' },
      { id: 'sriracha-mayo',   label: 'Sriracha Mayo',    emoji: '🌶️' },
      { id: 'sweet-chili',     label: 'Sweet Chili',      emoji: '🫙' },
      { id: 'soja-sauce',      label: 'Soja Sauce',       emoji: '🫚' },
      { id: 'red-sesame',      label: 'Red Sesame',       emoji: '🔴' },
      { id: 'erdnuss',         label: 'Erdnuss Sauce',    emoji: '🥜' },
      { id: 'roasted-sesame',  label: 'Roasted Sesame',   emoji: '⚪' },
      { id: 'bbq',             label: 'BBQ',              emoji: '🍖' },
      { id: 'hot-teriyaki',    label: 'Hot Teriyaki',     emoji: '🍱', tag: 'scharf' },
      { id: 'hummus',          label: 'Hummus',           emoji: '🤍', tag: 'vegan' },
      { id: 'cinnamon-plum',   label: 'Cinnamon Plum',   emoji: '🫐' },
    ],
  },
  {
    id: 'crunch',
    title: 'Dein Crunch',
    subtitle: 'Das gewisse Etwas obendrauf',
    emoji: '✨',
    required: false,
    multi: true,
    maxSelect: 3,
    options: [
      { id: 'erdnuesse',    label: 'Erdnüsse',       emoji: '🥜', tag: 'beliebt' },
      { id: 'roestzwiebeln',label: 'Röstzwiebeln',  emoji: '🧅' },
      { id: 'sesam',        label: 'Sesam',          emoji: '⚪' },
      { id: 'granatapfel',  label: 'Granatapfel',    emoji: '💎' },
    ],
  },
]

const UPSELL_OPTIONS: Option[] = [
  { id: 'extra-protein',  label: 'Extra Warmspeise', emoji: '🍗', extra: 2.50 },
  { id: 'extra-avocado',  label: 'Extra Avocado',    emoji: '🥑', extra: 1.50 },
  { id: 'extra-sauce',    label: 'Extra Sauce',       emoji: '🫙', extra: 0.50 },
  { id: 'fritz-cola',     label: 'Fritz Kola',        emoji: '🥤', extra: 3.00 },
  { id: 'fritz-limo',     label: 'Fritz Limo',        emoji: '🍋', extra: 3.00 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Selection = {
  basis:    string | null
  protein:  string | null
  zutaten:  string[]
  sauce:    string | null
  crunch:   string[]
  extras:   string[]
}

function calcPrice(sel: Selection): number {
  let price = BASE_PRICE
  if (sel.protein) {
    const opt = STEPS[1].options.find((o) => o.id === sel.protein)
    if (opt?.extra) price += opt.extra
  }
  sel.extras.forEach((id) => {
    const opt = UPSELL_OPTIONS.find((o) => o.id === id)
    if (opt?.extra) price += opt.extra
  })
  return Math.round(price * 100) / 100
}

function buildWaText(sel: Selection, slug: string, restaurantPhone: string | null): string | null {
  if (!restaurantPhone) return null
  const basisLabel    = STEPS[0].options.find((o) => o.id === sel.basis)?.label ?? '–'
  const proteinLabel  = STEPS[1].options.find((o) => o.id === sel.protein)?.label ?? '–'
  const sauceLabel    = STEPS[3].options.find((o) => o.id === sel.sauce)?.label ?? '–'
  const zutatenLabels = sel.zutaten.map((id) => STEPS[2].options.find((o) => o.id === id)?.label ?? id)
  const crunchLabels  = sel.crunch.map((id) => STEPS[4].options.find((o) => o.id === id)?.label ?? id)
  const extrasLabels  = sel.extras.map((id) => {
    const opt = UPSELL_OPTIONS.find((o) => o.id === id)
    return opt ? `${opt.label} (+${opt.extra!.toFixed(2).replace('.', ',')} €)` : id
  })
  const price = calcPrice(sel)

  const lines = [
    'Kustomizer Bowl — Odi\'s Bowl:',
    '',
    `📦 Basis:    ${basisLabel}`,
    `🍖 Warmspeise:  ${proteinLabel}`,
    `🥦 Zutaten:  ${zutatenLabels.join(', ') || '–'}`,
    `🫙 Sauce:    ${sauceLabel}`,
    `✨ Crunch:   ${crunchLabels.join(', ') || '–'}`,
    ...(extrasLabels.length ? [`➕ Extras:   ${extrasLabels.join(', ')}`] : []),
    '',
    `💶 Preis:    ${price.toFixed(2).replace('.', ',')} €`,
  ]
  const phone = restaurantPhone.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current + 1) / total) * 100)
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between text-xs font-semibold mb-1.5" style={{ color: '#6b7c72' }}>
        <span>Schritt {current + 1} von {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#d1fae5' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
        />
      </div>
    </div>
  )
}

function OptionChip({
  option,
  selected,
  onClick,
}: {
  option: Option
  selected: boolean
  onClick: () => void
}) {
  const marker = option.tag ? option.tag.slice(0, 2).toUpperCase() : option.label.slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl transition-all text-left w-full"
      style={{
        padding: '14px 16px',
        background: selected
          ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
          : '#fff',
        border: `1.5px solid ${selected ? '#22c55e' : '#d1fae5'}`,
        boxShadow: selected ? '0 2px 12px rgba(34,197,94,0.20)' : 'none',
        cursor: 'pointer',
      }}
    >
      <span className="flow-option-mark" aria-hidden>{marker}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm" style={{ color: '#0f1a12' }}>
          {option.label}
        </div>
        {option.tag && (
          <div className="text-xs font-semibold mt-0.5" style={{ color: '#16a34a' }}>
            {option.tag}
          </div>
        )}
      </div>
      {selected && (
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-xs flex-shrink-0"
          style={{ background: '#22c55e', fontSize: 13 }}
        >
          ✓
        </div>
      )}
      {!selected && option.extra && (
        <span className="text-xs font-bold flex-shrink-0" style={{ color: '#6b7c72' }}>
          +{option.extra.toFixed(2).replace('.', ',')} €
        </span>
      )}
    </button>
  )
}

function LivePrice({ price }: { price: number }) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-5 py-3 mb-4"
      style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}
    >
      <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
        Aktueller Preis
      </span>
      <span className="font-black text-white" style={{ fontSize: 22 }}>
        {price.toFixed(2).replace('.', ',')} €
      </span>
    </div>
  )
}

// ─── Summary Step ─────────────────────────────────────────────────────────────

function SummaryStep({
  sel,
  tenant,
  onEdit,
  onWa,
  onDirect,
}: {
  sel: Selection
  tenant: Restaurant
  onEdit: (step: number) => void
  onWa: () => void
  onDirect: () => void
}) {
  const price = calcPrice(sel)
  const waUrl = buildWaText(sel, tenant.slug, tenant.phone ?? null)

  const rows = [
    { label: 'Basis',     step: 0, value: STEPS[0].options.find((o) => o.id === sel.basis)?.label ?? '–', mark: '01' },
    { label: 'Warmspeise', step: 1, value: STEPS[1].options.find((o) => o.id === sel.protein)?.label ?? '–', mark: '02' },
    { label: 'Zutaten',   step: 2, value: sel.zutaten.map((id) => STEPS[2].options.find((o) => o.id === id)?.label ?? id).join(', ') || '–', mark: '03' },
    { label: 'Sauce',     step: 3, value: STEPS[3].options.find((o) => o.id === sel.sauce)?.label ?? '–', mark: '04' },
    { label: 'Crunch',    step: 4, value: sel.crunch.map((id) => STEPS[4].options.find((o) => o.id === id)?.label ?? id).join(', ') || '–', mark: '05' },
    ...(sel.extras.length ? [{
      label: 'Extras', step: -1,
      value: sel.extras.map((id) => UPSELL_OPTIONS.find((o) => o.id === id)?.label ?? id).join(', '),
      mark: '+',
    }] : []),
  ]

  return (
    <div>
      {/* Summary Card */}
      <div
        className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{ top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.22), transparent 70%)' }}
        />
        <span className="flow-card-mark" aria-hidden>BOWL</span>
        <h2 className="font-black text-white mb-1" style={{ fontSize: 20 }}>Deine Kustomizer Bowl</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
          Persönlich konfiguriert · Frisch für dich
        </p>
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
        >
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Gesamtpreis</span>
          <span className="font-black text-white" style={{ fontSize: 26 }}>
            {price.toFixed(2).replace('.', ',')} €
          </span>
        </div>
      </div>

      {/* Detail Rows */}
      <div
        className="rounded-2xl p-4 mb-4 space-y-3"
        style={{ background: '#fff', border: '1px solid #d1fae5' }}
      >
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3">
            <span className="flow-row-mark" aria-hidden>{r.mark}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#6b7c72' }}>
                {r.label}
              </div>
              <div className="text-sm font-semibold leading-snug" style={{ color: '#0f1a12', wordBreak: 'break-word' }}>
                {r.value}
              </div>
            </div>
            {r.step >= 0 && (
              <button
                onClick={() => onEdit(r.step)}
                className="text-xs font-semibold flex-shrink-0 px-2 py-1 rounded-lg transition-colors"
                style={{ color: '#16a34a', background: '#f0fdf4', border: 'none', cursor: 'pointer' }}
              >
                Ändern
              </button>
            )}
          </div>
        ))}
      </div>

      {/* CTAs */}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2.5 font-extrabold text-white rounded-2xl mb-3 transition-all hover:-translate-y-0.5"
          style={{
            padding: '18px', fontSize: 17,
            background: '#25D366',
            boxShadow: '0 6px 24px rgba(37,211,102,0.40)',
            textDecoration: 'none', display: 'flex',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
          Per WhatsApp bestellen
        </a>
      )}

      <button
        onClick={onDirect}
        className="w-full font-extrabold text-white rounded-2xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        style={{
          padding: '16px', fontSize: 16, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          boxShadow: '0 6px 28px rgba(34,197,94,0.40)',
          marginBottom: 12,
        }}
      >
        Direkt bestellen
      </button>

      <a
        href={`/${tenant.slug}/order`}
        className="w-full flex items-center justify-center font-semibold rounded-2xl transition-colors"
        style={{
          padding: '14px', fontSize: 14, border: '1.5px solid #d1fae5',
          color: '#3d5c47', background: 'transparent', textDecoration: 'none', display: 'flex',
        }}
      >
        Lieber aus der Speisekarte wählen
      </a>
    </div>
  )
}

// ─── Extras Step ──────────────────────────────────────────────────────────────

function ExtrasStep({
  sel,
  setSel,
  price,
}: {
  sel: Selection
  setSel: React.Dispatch<React.SetStateAction<Selection>>
  price: number
}) {
  const toggle = (id: string) =>
    setSel((prev) => ({
      ...prev,
      extras: prev.extras.includes(id) ? prev.extras.filter((x) => x !== id) : [...prev.extras, id],
    }))

  return (
    <div>
      <LivePrice price={price} />
      <p className="text-xs font-semibold mb-3" style={{ color: '#6b7c72' }}>Optional — alles abwählbar</p>
      <div className="space-y-2.5">
        {UPSELL_OPTIONS.map((opt) => (
          <OptionChip
            key={opt.id}
            option={opt}
            selected={sel.extras.includes(opt.id)}
            onClick={() => toggle(opt.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KustomizerClient({ tenant }: { tenant: Restaurant }) {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(0)
  const [showExtras, setShowExtras] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward')
  const [visible, setVisible] = useState(true)

  const [sel, setSel] = useState<Selection>({
    basis: null, protein: null, zutaten: [], sauce: null, crunch: [], extras: [],
  })

  const TOTAL_STEPS = STEPS.length // 5 config steps
  const price = calcPrice(sel)
  const step = STEPS[currentStep]

  function isStepComplete(idx: number): boolean {
    const s = STEPS[idx]
    if (!s.required) return true
    if (s.multi) {
      const arr = sel[s.id as keyof Selection] as string[]
      return arr.length > 0
    }
    return sel[s.id as keyof Selection] !== null
  }

  function canProceed(): boolean {
    return isStepComplete(currentStep)
  }

  function transition(fn: () => void, dir: 'forward' | 'back' = 'forward') {
    setAnimDir(dir)
    setVisible(false)
    setTimeout(() => {
      fn()
      setVisible(true)
    }, 180)
  }

  function goNext() {
    if (!canProceed()) {
      if (navigator.vibrate) navigator.vibrate([60, 30, 60])
      return
    }
    if (navigator.vibrate) navigator.vibrate(8)
    if (currentStep < TOTAL_STEPS - 1) {
      transition(() => setCurrentStep((s) => s + 1))
    } else {
      transition(() => setShowExtras(true))
    }
  }

  function goBack() {
    if (navigator.vibrate) navigator.vibrate(8)
    if (showSummary) {
      transition(() => setShowSummary(false), 'back')
    } else if (showExtras) {
      transition(() => setShowExtras(false), 'back')
    } else if (currentStep > 0) {
      transition(() => setCurrentStep((s) => s - 1), 'back')
    } else {
      router.push(`/${tenant.slug}`)
    }
  }

  function selectSingle(id: string) {
    setSel((prev) => ({ ...prev, [step.id]: id }))
    if (navigator.vibrate) navigator.vibrate(8)
    // Auto-advance after 300ms
    setTimeout(() => {
      if (!step.multi) {
        if (currentStep < TOTAL_STEPS - 1) {
          transition(() => setCurrentStep((s) => s + 1))
        } else {
          transition(() => setShowExtras(true))
        }
      }
    }, 280)
  }

  function toggleMulti(id: string) {
    const key = step.id as 'zutaten' | 'crunch'
    const max = step.maxSelect ?? 99
    setSel((prev) => {
      const arr = prev[key] as string[]
      if (arr.includes(id)) return { ...prev, [key]: arr.filter((x) => x !== id) }
      if (arr.length >= max) return prev // don't exceed max
      return { ...prev, [key]: [...arr, id] }
    })
    if (navigator.vibrate) navigator.vibrate(6)
  }

  function handleWa() {
    // WhatsApp URL already opens in _blank from the SummaryStep link
  }

  function handleDirect() {
    // Store bowl config in sessionStorage and navigate to bestellung checkout
    const config = {
      type: 'kustomizer',
      basis: STEPS[0].options.find((o) => o.id === sel.basis)?.label ?? '',
      protein: STEPS[1].options.find((o) => o.id === sel.protein)?.label ?? '',
      zutaten: sel.zutaten.map((id) => STEPS[2].options.find((o) => o.id === id)?.label ?? id),
      sauce: STEPS[3].options.find((o) => o.id === sel.sauce)?.label ?? '',
      crunch: sel.crunch.map((id) => STEPS[4].options.find((o) => o.id === id)?.label ?? id),
      extras: sel.extras.map((id) => UPSELL_OPTIONS.find((o) => o.id === id)?.label ?? id),
      price,
    }
    sessionStorage.setItem('odis_kustomizer', JSON.stringify(config))
    router.push(`/${tenant.slug}/bestellung`)
  }

  // Header title
  const headerTitle = showSummary
    ? 'Zusammenfassung'
    : showExtras
    ? 'Extras dazu?'
    : step.title

  // Translate anim to CSS
  const translateX = !visible
    ? animDir === 'forward' ? '20px' : '-20px'
    : '0px'
  const opacity = visible ? 1 : 0

  return (
    <div
      className="odis-flow-shell min-h-screen pb-10"
      style={{ background: '#f0fdf4', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header */}
      <header
        className="odis-flow-header sticky top-0 z-30 flex items-center gap-3 px-4 py-3.5"
        style={{ background: '#fff', borderBottom: '1px solid #d1fae5' }}
      >
        <button
          onClick={goBack}
          className="flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#f0fdf4', border: 'none', cursor: 'pointer',
            fontSize: 18, color: '#0f1a12',
          }}
          aria-label="Zurück"
        >
          ←
        </button>
        <h1 className="flex-1 font-extrabold" style={{ fontSize: 17, color: '#0f1a12' }}>
          {headerTitle}
        </h1>
        <div
          className="font-black px-3 py-1 rounded-full text-sm"
          style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#15803d' }}
        >
          {price.toFixed(2).replace('.', ',')} €
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5">

        {/* Progress */}
        {!showSummary && (
          <ProgressBar
            current={showExtras ? TOTAL_STEPS : currentStep}
            total={TOTAL_STEPS + 1}
          />
        )}

        {/* Animated Content */}
        <div
          style={{
            transform: `translateX(${translateX})`,
            opacity,
            transition: 'transform 0.18s ease, opacity 0.18s ease',
          }}
        >
          {/* Step Header */}
          {!showSummary && (
            <div className="odis-flow-step-head mb-5">
              <div className="flow-step-kicker">
                {showExtras ? 'EX' : `0${currentStep + 1}`}
              </div>
              <h2 className="font-black mb-1" style={{ fontSize: 20, color: '#0f1a12' }}>
                {showExtras ? 'Extras dazu?' : step.title}
              </h2>
              <p style={{ fontSize: 13, color: '#6b7c72' }}>
                {showExtras
                  ? 'Optional — wähle was du möchtest'
                  : step.subtitle}
                {step.multi && !showExtras && (
                  <span className="ml-2 font-semibold" style={{ color: '#16a34a' }}>
                    (max. {step.maxSelect})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Summary */}
          {showSummary && (
            <SummaryStep
              sel={sel}
              tenant={tenant}
              onEdit={(s) => {
                transition(() => {
                  setShowSummary(false)
                  setShowExtras(false)
                  setCurrentStep(s)
                }, 'back')
              }}
              onWa={handleWa}
              onDirect={handleDirect}
            />
          )}

          {/* Extras */}
          {!showSummary && showExtras && (
            <ExtrasStep sel={sel} setSel={setSel} price={price} />
          )}

          {/* Step Options */}
          {!showSummary && !showExtras && (
            <div className="space-y-2.5">
              {step.options.map((opt) => {
                const selected = step.multi
                  ? (sel[step.id as keyof Selection] as string[]).includes(opt.id)
                  : sel[step.id as keyof Selection] === opt.id

                return (
                  <OptionChip
                    key={opt.id}
                    option={opt}
                    selected={selected}
                    onClick={() => {
                      if (step.multi) toggleMulti(opt.id)
                      else selectSingle(opt.id)
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom Action */}
        {!showSummary && (
          <div className="mt-6">
            {showExtras ? (
              <button
                onClick={() => transition(() => setShowSummary(true))}
                className="w-full font-extrabold text-white rounded-2xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{
                  padding: '18px', fontSize: 18, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 6px 28px rgba(34,197,94,0.40)',
                }}
              >
                Zur Zusammenfassung
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="w-full font-extrabold text-white rounded-2xl transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed"
                style={{
                  padding: '18px', fontSize: 18, border: 'none', cursor: canProceed() ? 'pointer' : 'not-allowed',
                  background: canProceed()
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : '#d1fae5',
                  boxShadow: canProceed() ? '0 6px 28px rgba(34,197,94,0.40)' : 'none',
                  color: canProceed() ? '#fff' : '#6b7c72',
                  transition: 'all 0.2s',
                }}
              >
                {step.multi && !canProceed()
                  ? `Bitte mind. eine ${step.title.split(' ')[1] ?? 'Option'} wählen`
                  : currentStep < TOTAL_STEPS - 1
                  ? 'Weiter'
                  : 'Fast fertig'}
              </button>
            )}

            {/* Skip for non-required */}
            {!step.required && !showExtras && (
              <button
                onClick={() => transition(() => {
                  if (currentStep < TOTAL_STEPS - 1) setCurrentStep((s) => s + 1)
                  else setShowExtras(true)
                })}
                className="w-full font-semibold mt-2 transition-colors"
                style={{
                  padding: '12px', fontSize: 14, border: 'none', background: 'transparent',
                  color: '#6b7c72', cursor: 'pointer',
                }}
              >
                Überspringen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
