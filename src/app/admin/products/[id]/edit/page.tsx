import { notFound } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { ProductForm } from '@/components/admin/product-form'
import { updateProductAction } from '@/lib/actions/admin'

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: 'Edit Product — Admin' }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params

  const { data: product } = await adminClient
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) notFound()

  const action = updateProductAction.bind(null, id)

  return (
    <div className='max-w-2xl'>
      <h1 className='text-3xl font-bold text-white mb-8'>Edit Product</h1>
      <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-8'>
        <ProductForm
          action={action}
          submitLabel='Save Changes'
          defaultValues={{
            name: product.name,
            description: product.description ?? undefined,
            pricePaise: product.price_paise,
            stock: product.stock,
            status: (product.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') ?? 'DRAFT',
            imageUrl: product.image_url ?? undefined,
          }}
        />
      </div>
    </div>
  )
}
