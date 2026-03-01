'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AccordionItem {
  id: string;
  number: string;
  question: string;
  answer: string;
}

interface InteractiveAccordionProps {
  items: AccordionItem[];
  defaultOpenId?: string;
}

export function InteractiveAccordion({ items, defaultOpenId }: InteractiveAccordionProps) {
  const [activeId, setActiveId] = useState<string | null>(defaultOpenId ?? items[0]?.id ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className='w-full'>
      <div className='space-y-0'>
        {items.map((item) => {
          const isActive = activeId === item.id;
          const isHovered = hoveredId === item.id;

          return (
            <div key={item.id}>
              <motion.button
                onClick={() => setActiveId(isActive ? null : item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className='w-full relative text-left cursor-pointer'
                initial={false}
                aria-expanded={isActive}
              >
                <div className='flex items-center gap-4 sm:gap-6 py-5 px-1'>

                  {/* ── Number chip with animated yellow circle ── */}
                  <div className='relative flex items-center justify-center w-10 h-10 shrink-0'>
                    <motion.div
                      className='absolute inset-0 rounded-full bg-stride-yellow-accent'
                      initial={false}
                      animate={{
                        scale: isActive ? 1 : isHovered ? 0.85 : 0,
                        opacity: isActive ? 1 : isHovered ? 0.15 : 0,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    />
                    <motion.span
                      className='relative z-10 text-sm font-medium tracking-wide font-roboto'
                      animate={{ color: isActive ? '#4B2862' : 'rgba(255,255,255,0.5)' }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.number}
                    </motion.span>
                  </div>

                  {/* ── Question title ── */}
                  <motion.span
                    className='text-base sm:text-lg font-medium tracking-tight font-libre flex-1'
                    animate={{
                      x: isActive || isHovered ? 4 : 0,
                      color: isActive || isHovered ? '#ffffff' : 'rgba(255,255,255,0.65)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    {item.question}
                  </motion.span>

                  {/* ── Plus / cross indicator ── */}
                  <motion.div
                    className='flex items-center justify-center w-8 h-8 shrink-0'
                    animate={{ rotate: isActive ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <motion.svg
                      width='16'
                      height='16'
                      viewBox='0 0 16 16'
                      fill='none'
                      animate={{ color: isActive ? '#E1D03F' : 'rgba(255,255,255,0.4)' }}
                      transition={{ duration: 0.2 }}
                    >
                      <path
                        d='M8 1V15M1 8H15'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                      />
                    </motion.svg>
                  </motion.div>
                </div>

                {/* Static divider */}
                <div className='absolute bottom-0 left-0 right-0 h-px bg-copy-white/15' />
                {/* Animated yellow underline */}
                <motion.div
                  className='absolute bottom-0 left-0 h-px bg-stride-yellow-accent origin-left'
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isActive ? 1 : isHovered ? 0.3 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </motion.button>

              {/* ── Answer ── */}
              <AnimatePresence mode='wait'>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: 'auto',
                      opacity: 1,
                      transition: {
                        height: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2, delay: 0.1 },
                      },
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                      transition: {
                        height: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.1 },
                      },
                    }}
                    className='overflow-hidden'
                  >
                    <motion.p
                      className='pl-14 sm:pl-16 pr-10 py-5 text-copy-white/60 leading-relaxed text-sm sm:text-base font-roboto'
                      initial={{ y: -8 }}
                      animate={{ y: 0 }}
                      exit={{ y: -8 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {item.answer}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
