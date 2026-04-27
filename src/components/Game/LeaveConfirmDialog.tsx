import { useState } from 'react';

interface LeaveConfirmDialogProps {
  onConfirm: () => void;
  label?: string;
}

export default function LeaveConfirmDialog({ onConfirm, label = 'Leave Match' }: LeaveConfirmDialogProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0); // 0 = hidden, 1 = first confirm, 2 = final confirm

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
        className="px-4 py-2 bg-red-900/60 hover:bg-red-800 text-red-300 rounded-lg text-sm font-semibold transition border border-red-700/50 cursor-pointer"
      >
        {label}
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-gray-700">
            {confirmStep === 1 && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold text-white mb-2">Leave Match?</h2>
                  <p className="text-gray-400">
                    If you leave, your opponent will win the match by forfeit. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white transition cursor-pointer"
                  >
                    Stay
                  </button>
                  <button
                    onClick={handleFirstConfirm}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white transition cursor-pointer"
                  >
                    Yes, Leave
                  </button>
                </div>
              </>
            )}

            {confirmStep === 2 && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🚪</div>
                  <h2 className="text-2xl font-bold text-red-400 mb-2">Are you sure?</h2>
                  <p className="text-gray-400">
                    This is your <span className="text-red-400 font-bold">final confirmation</span>. 
                    You will <span className="text-red-400 font-bold">forfeit</span> the match and it will count as a loss.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white transition cursor-pointer"
                  >
                    No, Keep Playing
                  </button>
                  <button
                    onClick={handleFinalConfirm}
                    className="flex-1 py-3 bg-red-700 hover:bg-red-600 rounded-xl font-bold text-white transition cursor-pointer"
                  >
                    Forfeit Match
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
