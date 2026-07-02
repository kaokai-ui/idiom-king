import { useCallback, useState } from 'react';
import type { ChainMode } from '../types/game';

/**
 * Shared UI-chrome logic for the v1 and v2 chain screens: seed copy-to-clipboard
 * and the "hint pushes the board off-screen → hide the footer" compaction. The
 * screens' layouts/labels differ, but this behavior is identical.
 */
export function useChainScreenChrome(opts: {
  mode: ChainMode;
  currentSeed: number | null;
  hintVisible: boolean;
  onToggleHint: () => void;
}) {
  const { mode, currentSeed, hintVisible, onToggleHint } = opts;

  const [footerCompactedForHint, setFooterCompactedForHint] = useState(false);
  const [seedCopyState, setSeedCopyState] = useState<{ seed: number; status: 'copied' | 'error' } | null>(null);

  const handleBoardOverflowChange = useCallback((tooSmall: boolean) => {
    if (tooSmall && hintVisible && !footerCompactedForHint) {
      setFooterCompactedForHint(true);
    }
  }, [footerCompactedForHint, hintVisible]);

  const footerHidden = footerCompactedForHint;

  const handleToggleHint = useCallback(() => {
    if (hintVisible) {
      setFooterCompactedForHint(false);
    }
    onToggleHint();
  }, [hintVisible, onToggleHint]);

  const handleCopySeed = useCallback(async () => {
    if (mode !== 'random' || currentSeed === null) return;
    const seedText = String(currentSeed);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(seedText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = seedText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setSeedCopyState({ seed: currentSeed, status: 'copied' });
      window.setTimeout(() => setSeedCopyState((prev) => (
        prev?.seed === currentSeed ? null : prev
      )), 1200);
    } catch {
      setSeedCopyState({ seed: currentSeed, status: 'error' });
      window.setTimeout(() => setSeedCopyState((prev) => (
        prev?.seed === currentSeed ? null : prev
      )), 1200);
    }
  }, [currentSeed, mode]);

  const seedPillLabel = mode === 'random' && currentSeed !== null && seedCopyState?.seed === currentSeed
    ? (seedCopyState.status === 'copied' ? 'Copied' : 'Copy failed')
    : (currentSeed !== null ? `ID ${currentSeed}` : null);

  return {
    footerHidden,
    handleBoardOverflowChange,
    handleToggleHint,
    handleCopySeed,
    seedPillLabel,
  };
}
