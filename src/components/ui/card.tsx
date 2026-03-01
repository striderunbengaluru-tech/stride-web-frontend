import { type HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-copy-white/10 backdrop-blur-md border border-copy-white/15 rounded-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
