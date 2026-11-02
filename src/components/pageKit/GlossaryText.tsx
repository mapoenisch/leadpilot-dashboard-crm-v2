import { Fragment, type ReactNode } from 'react';
import { GLOSSARY, splitGlossaryTerms } from '@/config/glossary';

// Auftrag 117: Fachkürzel in Seitenkopf-Texten mit Erklärung (abbr/title) auszeichnen.
export function GlossaryText({ children }: { children: ReactNode }) {
  if (typeof children !== 'string') return <>{children}</>;
  return (
    <>
      {splitGlossaryTerms(children).map((part, index) =>
        part.term ? (
          <abbr key={index} title={GLOSSARY[part.term]}>
            {part.text}
          </abbr>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
