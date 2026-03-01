/**
 * Renders text with **keyword** syntax highlighted in stride-yellow-accent.
 * Example: "Run in **style**" → "Run in <span class='text-stride-yellow-accent'>style</span>"
 */
export function HighlightedText({ text }: { text: string }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className='text-stride-yellow-accent'>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}
