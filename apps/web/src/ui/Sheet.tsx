import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import type { ReactElement, ReactNode } from 'react';
import { SQUIRCLE } from './tokens.js';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps): ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[6px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] w-full max-w-[520px] overflow-y-auto border border-white/10 bg-[rgba(28,30,38,0.85)] p-5 backdrop-blur-[28px]"
                style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px', cornerShape: `superellipse(${SQUIRCLE})`, paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' } as React.CSSProperties}
              >
                <div aria-hidden className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/20" />
                <Dialog.Title className="m-0 mb-3.5 text-[20px] font-bold">{title}</Dialog.Title>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
