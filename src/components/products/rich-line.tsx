/**
 * Product copy is pasted in by the owner and sometimes carries Markdown bold (**like this**).
 * Show those parts in bold instead of printing the asterisks.
 */
export function RichLine({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, idx) =>
        idx % 2 === 1 ? (
          <strong key={idx} className="font-semibold text-white">{part}</strong>
        ) : (
          part.replace(/\*\*/g, '')
        )
      )}
    </>
  );
}
