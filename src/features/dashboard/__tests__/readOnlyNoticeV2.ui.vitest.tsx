import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadOnlyNoticeV2 } from '../components/editor/ReadOnlyNoticeV2';

describe('ReadOnlyNoticeV2', () => {
  it('rendert Team-Hinweis und ruft Kopieren-Callback auf', async () => {
    const user = userEvent.setup();
    const handleCopy = vi.fn();

    render(<ReadOnlyNoticeV2 teamName="Nord Vertrieb" onSaveAsPersonalCopy={handleCopy} />);

    expect(screen.getByTestId('readonly-notice-banner')).toBeInTheDocument();
    expect(screen.getByText(/Nord Vertrieb/)).toBeInTheDocument();

    const copyBtn = screen.getByTestId('copy-as-personal-button');
    await user.click(copyBtn);
    expect(handleCopy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('readonly-copy-error')).not.toBeInTheDocument();
  });

  it('zeigt copyError an, wenn Kopieren fehlschlägt', () => {
    render(
      <ReadOnlyNoticeV2
        teamName={null}
        onSaveAsPersonalCopy={vi.fn()}
        copyError="Maximale Anzahl von 20 persönlichen Dashboards erreicht."
      />,
    );

    const errorEl = screen.getByTestId('readonly-copy-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent('Maximale Anzahl von 20 persönlichen Dashboards erreicht.');
  });

  it('deaktiviert den Kopier-Button und zeigt Ladehinweis während isCopying', () => {
    render(
      <ReadOnlyNoticeV2 teamName="Nord Vertrieb" onSaveAsPersonalCopy={vi.fn()} isCopying={true} />,
    );

    const copyBtn = screen.getByTestId('copy-as-personal-button');
    expect(copyBtn).toBeDisabled();
    expect(copyBtn).toHaveTextContent('Wird kopiert…');
  });
});
