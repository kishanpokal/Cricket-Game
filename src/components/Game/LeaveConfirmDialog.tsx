import { useState } from 'react';

interface LeaveConfirmDialogProps {
  onConfirm: () => void;
  label?: string;
}

export default function LeaveConfirmDialog({ onConfirm, label = 'Retire / Leave' }: LeaveConfirmDialogProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);

  const handleLeaveClick = () => {
    setShowDialog(true);
    setConfirmStep(1);
  };

  const handleFirstConfirm = () => {
    setConfirmStep(2);
  };

  const handleFinalConfirm = () => {
    setShowDialog(false);
    setConfirmStep(0);
    onConfirm();
  };

  const handleCancel = () => {
    setShowDialog(false);
    setConfirmStep(0);
  };

  return (
    <>
      <button
        onClick={handleLeaveClick}
        className="px-3.5 py-1.5 bg-[#2a1215] hover:bg-[#3d181c] text-[#ff2a36] rounded-xl text-xs font-bold uppercase tracking-wider transition border border-[#ff2a36]/30 cursor-pointer shadow-sm"
      >
        {label}
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-[#f5efe6]/10 text-center animate-[scale-in_0.25s_ease-out]">
            {confirmStep === 1 && (
              <>
                <div className="text-5xl mb-3">⚠️</div>
                <h2 className="font-display text-4xl font-bold text-[#f5efe6] uppercase leading-none mb-2">
                  FORFEIT MATCH?
                </h2>
                <p className="text-[#c8bead] text-xs leading-relaxed mb-6">
                  Leaving the match awards victory to your opponent by default. Your rating may be impacted.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 bg-[#16271c] hover:bg-[#1e3827] rounded-xl font-display text-xl uppercase tracking-wider font-bold text-[#f5efe6] transition cursor-pointer border border-[#f5efe6]/10"
                  >
                    Stay on Pitch
                  </button>
                  <button
                    onClick={handleFirstConfirm}
                    className="flex-1 py-3 bg-[#d9222a] hover:bg-[#ff2a36] rounded-xl font-display text-xl uppercase tracking-wider font-bold text-white transition cursor-pointer shadow-lg"
                  >
                    Leave
                  </button>
                </div>
              </>
            )}

            {confirmStep === 2 && (
              <>
                <div className="text-5xl mb-3">🚪</div>
                <h2 className="font-display text-4xl font-bold text-[#ff2a36] uppercase leading-none mb-2">
                  FINAL CONFIRMATION
                </h2>
                <p className="text-[#c8bead] text-xs leading-relaxed mb-6">
                  Are you certain? This will immediately register a forfeit defeat on your profile.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 bg-gradient-to-r from-[#1b4d2e] to-[#24623e] hover:from-[#24623e] hover:to-[#2e7d4c] rounded-xl font-display text-xl uppercase tracking-wider font-bold text-white transition cursor-pointer border border-[#4ade80]/30 shadow-md"
                  >
                    Keep Playing
                  </button>
                  <button
                    onClick={handleFinalConfirm}
                    className="flex-1 py-3 bg-[#9e121b] hover:bg-[#d9222a] rounded-xl font-display text-xl uppercase tracking-wider font-bold text-white transition cursor-pointer shadow-md"
                  >
                    Forfeit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
