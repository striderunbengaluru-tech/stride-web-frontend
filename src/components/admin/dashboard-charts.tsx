'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

type WeeklyData = { week: string; registrations: number }
type EventCheckInData = { name: string; confirmed: number; checkedIn: number }
type StatusData = { name: string; value: number }

type Props = {
  weeklyRegistrations: WeeklyData[]
  eventCheckIns: EventCheckInData[]
  eventStatusBreakdown: StatusData[]
}

const YELLOW = '#E1D03F'
const PURPLE = '#4B2862'
const GREEN = '#4ade80'
const WHITE_30 = 'rgba(255,255,255,0.3)'
const WHITE_10 = 'rgba(255,255,255,0.1)'

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: YELLOW,
  DRAFT: 'rgba(255,255,255,0.25)',
  CANCELLED: 'rgba(239,68,68,0.6)',
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='bg-white/5 border border-white/10 rounded-2xl p-5'>
      <p className='text-white/50 text-sm font-medium mb-4'>{title}</p>
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

export function DashboardCharts({ weeklyRegistrations, eventCheckIns, eventStatusBreakdown }: Props) {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8'>

      {/* Weekly registrations */}
      <ChartCard title='Registrations — last 8 weeks'>
        {weeklyRegistrations.length === 0 ? (
          <div className='h-40 flex items-center justify-center'>
            <p className='text-white/20 text-sm'>No data yet</p>
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

      {/* Event check-in rates */}
      <ChartCard title='Check-in rate by event'>
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

      {/* Event status breakdown */}
      <ChartCard title='Event status breakdown'>
        {eventStatusBreakdown.every(d => d.value === 0) ? (
          <div className='h-40 flex items-center justify-center'>
            <p className='text-white/20 text-sm'>No events yet</p>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={180}>
            <PieChart>
              <Pie
                data={eventStatusBreakdown}
                cx='50%'
                cy='50%'
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey='value'
              >
                {eventStatusBreakdown.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.name] ?? WHITE_30} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className='text-white/60 text-xs'>{value}</span>}
                iconType='circle'
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

    </div>
  )
}
