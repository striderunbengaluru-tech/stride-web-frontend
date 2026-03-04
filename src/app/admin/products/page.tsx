import { adminClient } from '@/lib/supabase/admin'
import { deleteProductAction } from '@/lib/actions/admin'

export const metadata = { title: 'Products — Admin' }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-white/10 text-white/60',
  PUBLISHED: 'bg-stride-yellow-accent/20 text-stride-yellow-accent',
  ARCHIVED: 'bg-white/5 text-white/30',
}

export default async function AdminProductsPage() {
  const { data: allProducts } = await adminClient
    .from('products')
    .select('id, name, slug, price_paise, stock, status')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className='flex items-center justify-between mb-8'>
        <h1 className='text-3xl font-bold text-white'>Products</h1>
        <a
          href='/admin/products/new'
          className='bg-stride-yellow-accent text-stride-dark font-semibold px-5 py-2.5 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11 flex items-center'
        >
          + New Product
        </a>
      </div>

      {!allProducts || allProducts.length === 0 ? (
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-12 text-center'>
          <p className='text-white/40'>No products yet. Create your first product.</p>
        </div>
      ) : (
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-white/10'>
                <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Name</th>
                <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Price</th>
                <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Stock</th>
                <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Status</th>
                <th className='px-6 py-4' />
              </tr>
            </thead>
            <tbody>
              {allProducts.map((product) => (
                <tr key={product.id} className='border-b border-white/5 hover:bg-white/5 transition-colors'>
                  <td className='px-6 py-4'>
                    <p className='text-white font-medium line-clamp-1'>{product.name}</p>
                    <p className='text-white/40 text-xs mt-0.5'>{product.slug}</p>
                  </td>
                  <td className='px-6 py-4 text-white/60'>₹{product.price_paise / 100}</td>
                  <td className='px-6 py-4 text-white/60'>{product.stock}</td>
                  <td className='px-6 py-4'>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${STATUS_STYLES[product.status] ?? 'bg-white/10 text-white/60'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className='px-6 py-4'>
                    <div className='flex gap-3 justify-end'>
                      <a href={`/admin/products/${product.id}/edit`} className='text-stride-yellow-accent hover:underline text-xs'>
                        Edit
                      </a>
                      <form action={deleteProductAction.bind(null, product.id)}>
                        <button type='submit' className='text-red-400 hover:underline text-xs'>
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
