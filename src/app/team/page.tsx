export default function TeamPage() {
  const team = [
    { role: 'Founder & Head Pacer', bio: 'Sets the pace, leads the pack.' },
    { role: 'Co-Founder', bio: 'Community builder and event organiser.' },
    { role: 'Training Lead', bio: 'Plans every group run and training block.' },
    { role: 'Social Media', bio: 'Captures every milestone on the road.' },
    { role: 'Events Coordinator', bio: 'Makes race day happen seamlessly.' },
    { role: 'Volunteer Lead', bio: 'Rallies the crew for every event.' },
  ];

  return (
    <main className='min-h-screen pt-24'>
      <section className='container mx-auto px-6 py-16'>
        <h1 className='text-5xl font-bold mb-3'>The Team</h1>
        <p className='text-copy-white/60 text-lg mb-12'>
          The people who make Stride run.
        </p>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'>
          {team.map((member, i) => (
            <div
              key={i}
              className='flex flex-col items-center text-center p-8 bg-copy-white/10 backdrop-blur-md rounded-xl border border-copy-white/15 hover:border-stride-yellow-accent/50 transition-colors'
            >
              <div className='w-24 h-24 rounded-full bg-copy-white/10 border border-copy-white/20 flex items-center justify-center mb-4'>
                <span className='text-stride-yellow-accent text-2xl font-bold'>
                  {String.fromCharCode(65 + i)}
                </span>
              </div>
              <h2 className='font-bold text-lg text-copy-white'>Team Member</h2>
              <p className='text-stride-yellow-accent text-sm font-semibold mt-1 mb-3 line-clamp-1'>
                {member.role}
              </p>
              <p className='text-copy-white/60 text-sm leading-relaxed'>{member.bio}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
