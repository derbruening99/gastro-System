import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { getMenuByRestaurant } from '@/lib/menu'
import type { MenuCategory } from '@/lib/types'
import CustomerPageShell from '../landing/customer-page-shell'

export default async function SpeisekartePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  const categories = await getMenuByRestaurant(tenant.id)

  return (
    <CustomerPageShell slug={slug} restaurantName={tenant.name}>
      <div className="site-page">
        <div className="site-page-inner">
          <p className="site-lead">Die aktuelle Speisekarte von {tenant.name}</p>
        {categories.length === 0 ? (
          <div className="site-page-empty">
            <p>Das Menü ist derzeit nicht verfügbar. Versuch es später noch einmal.</p>
          </div>
        ) : (
          <div className="menu-categories">
            {categories.map((category) => (
              <section key={category.id} className="menu-category">
                <h2>{category.name}</h2>
                <div className="menu-items">
                  {category.items.map((item) => (
                    <article key={item.id} className="menu-item-card">
                      <div>
                        <strong>{item.name}</strong>
                        {item.description ? <p>{item.description}</p> : null}
                      </div>
                      <div className="menu-item-price">{item.price.toFixed(2)} €</div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>    </CustomerPageShell>  )
}
