import { ProductForm } from '@/components/admin/product-form'
import { createProductAction } from '@/lib/actions/admin'

export const metadata = { title: 'New Product — Admin' }

export default function NewProductPage() {
  return (
    <div className='max-w-2xl'>
      <h1 className='text-3xl font-bold text-white mb-8'>New Product</h1>
      <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-8'>
        <ProductForm action={createProductAction} submitLabel='Create Product' />
      </div>
    </div>
  )
}
