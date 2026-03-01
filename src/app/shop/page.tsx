export default function ShopPage() {
  return (
    <main className='min-h-screen pt-24'>
      <section className='container mx-auto px-6 py-16'>
        <h1 className='text-5xl font-bold mb-3'>Shop</h1>
        <p className='text-copy-white/60 text-lg mb-12'>
          Stride gear, apparel, and accessories.
        </p>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className='bg-copy-white/10 backdrop-blur-md rounded-xl border border-copy-white/15 overflow-hidden hover:border-stride-yellow-accent/50 transition-colors'
            >
              <div className='bg-copy-white/10 h-48 flex items-center justify-center'>
                <span className='text-copy-white/40 text-sm'>Product Image</span>
              </div>
              <div className='p-4'>
                <h2 className='text-copy-white font-semibold mb-1 line-clamp-1'>Product Name</h2>
                <p className='text-stride-yellow-accent font-bold'>₹999</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
