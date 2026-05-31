'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { TrendingUp, CheckCircle2, UsersRound, Cake } from 'lucide-react'

type WeeklyData = { week: string; registrations: number }
type EventCheckInData = { name: string; confirmed: number; checkedIn: number }
type GenderSlice = { label: string; key: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'; value: number }
type AgeSlice = { bucket: '18-24' | '25-34' | '35-44' | '45+'; count: number }

type Props = {
  weeklyRegistrations: WeeklyData[]
  eventCheckIns: EventCheckInData[]
  genderDistribution: GenderSlice[]
  ageDistribution: AgeSlice[]
}

const YELLOW = '#E1D03F'
const PURPLE = '#4B2862'
const GREEN = '#4ade80'
const WHITE_30 = 'rgba(255,255,255,0.3)'
const WHITE_10 = 'rgba(255,255,255,0.1)'

const GENDER_COLORS: Record<GenderSlice['key'], string> = {
  MALE:              '#38bdf8', // sky-400
  FEMALE:            '#f472b6', // pink-400
  OTHER:             '#c084fc', // purple-400
  PREFER_NOT_TO_SAY: 'rgba(255,255,255,0.30)',
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className='bg-white/5 border border-white/10 rounded-2xl p-5'>
      <div className='flex items-center gap-2 mb-4'>
        <span className='inline-flex w-7 h-7 rounded-lg bg-stride-yellow-accent/15 text-stride-yellow-accent items-center justify-center'>
          {icon}
        </span>
        <p className='text-white/65 text-sm font-medium'>{title}</p>
      </div>
      {children}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className='bg-[#2a1540] border border-white/20 rounded-xl px-3 py-2 text-xs shadow-xl'>
      {label && <p className='text-white/50 mb-1'>{label}</p>}
      {/* justification: recharts payload type is untyped */}
      {(payload as Array<{ name: string; value: number; color: string }>).map((p, i) => (
        <p key={i} style={{ color: p.color }} className='font-semibold'>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export function DashboardCharts({ weeklyRegistrations, eventCheckIns, genderDistribution, ageDistribution }: Props) {
  const genderTotal = genderDistribution.reduce((s, g) => s + g.value, 0)
  const ageTotal    = ageDistribution.reduce((s, a) => s + a.count, 0)

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-8'>

      {/* 1. Weekly registrations */}
      <ChartCard title='Registrations — last 8 weeks' icon={<TrendingUp size={14} />}>
        {weeklyRegistrations.every(w => w.registrations === 0) ? (
          <div className='h-40 flex items-center justify-center'>
            <p className='text-white/20 text-sm'>No registrations yet</p>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={180}>
            <BarChart data={weeklyRegistrations} barSize={20}>
              <XAxis
                dataKey='week'
                tick={{ fill: WHITE_30, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: WHITE_30, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: WHITE_10 }} />
              <Bar dataKey='registrations' fill={YELLOW} radius={[4, 4, 0, 0]} name='Registrations' />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 2. Event check-in rates */}
      <ChartCard title='Check-in rate by event' icon={<CheckCircle2 size={14} />}>
        {eventCheckIns.length === 0 ? (
          <div className='h-40 flex items-center justify-center'>
            <p className='text-white/20 text-sm'>No events yet</p>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={180}>
            <BarChart data={eventCheckIns} barSize={14} barGap={2}>
              <XAxis
                dataKey='name'
                tick={{ fill: WHITE_30, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                tickFormatter={v => (v as string).length > 10 ? (v as string).slice(0, 10) + '…' : v as string}
              />
              <YAxis
                tick={{ fill: WHITE_30, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: WHITE_10 }} />
              <Bar dataKey='confirmed' fill={PURPLE} stroke={WHITE_30} strokeWidth={1} radius={[3, 3, 0, 0]} name='Confirmed' />
              <Bar dataKey='checkedIn' fill={GREEN} radius={[3, 3, 0, 0]} name='Checked in' />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 3. Gender distribution of check-ins */}
      <ChartCard title='Check-ins by gender' icon={<UsersRound size={14} />}>
        {genderTotal === 0 ? (
          <div className='h-40 flex items-center justify-center'>
            <p className='text-white/20 text-sm'>No check-ins yet</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {genderDistribution.map(slice => {
              const pct = genderTotal > 0 ? Math.round((slice.value / genderTotal) * 100) : 0
              const color = GENDER_COLORS[slice.key]
              return (
                <div key={slice.key}>
                  <div className='flex items-center justify-between text-xs mb-1.5'>
                    <span className='text-white/70'>{slice.label}</span>
                    <span className='text-white/45 tabular-nums'>
                      <span className='text-white font-semibold'>{slice.value}</span>
                      {' '}<span className='text-white/35'>· {pct}%</span>
                    </span>
                  </div>
                  <div className='h-2 bg-white/8 rounded-full overflow-hidden'>
                    <div
                      className='h-full rounded-full transition-all duration-700'
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
            <p className='text-white/30 text-[10px] pt-1'>
              Counted per check-in · {genderTotal} total
            </p>
          </div>
        )}
      </ChartCard>

      {/* 4. Age group distribution */}
      <ChartCard title='Runners by age group' icon={<Cake size={14} />}>
        {ageTotal === 0 ? (
          <div className='h-40 flex items-center justify-center'>
            <p className='text-white/20 text-sm'>No age data yet</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width='100%' height={180}>
              <BarChart data={ageDistribution} barSize={32}>
                <XAxis
                  dataKey='bucket'
                  tick={{ fill: WHITE_30, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: WHITE_30, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: WHITE_10 }} />
                <Bar dataKey='count' radius={[4, 4, 0, 0]} name='Runners'>
                  {ageDistribution.map((_, i) => (
                    <Cell key={i} fill={YELLOW} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className='text-white/30 text-[10px] mt-1'>
              {ageTotal} runner{ageTotal !== 1 ? 's' : ''} with a date of birth on file
            </p>
          </>
        )}
      </ChartCard>

    </div>
  )
}
