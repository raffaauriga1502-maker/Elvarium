
import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';

type ImportStatus = 'idle' | 'loading' | 'finalizing' | 'success' | 'error';

interface ImportModalProps {
  onConfirm: (setStatus: (status: ImportStatus) => void) => Promise<void>;
  onDismiss: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onConfirm, onDismiss }) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useI18n();

  const handleConfirm = async () => {
    setStatus('loading');
    try {
      // We pass the setStatus function so the parent can trigger the 'finalizing' state
      await onConfirm(setStatus);
      setStatus('success');
      // The reload will be handled in the parent component after success.
    } catch (error: any) {
      setErrorMessage(error.message || t('importModal.errorBody'));
      setStatus('error');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center p-8">
            <svg className="animate-spin h-12 w-12 text-accent mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-semibold text-text-primary animate-pulse">{t('importModal.loading')}</p>
          </div>
        );
      case 'finalizing':
        return (
          <div className="text-center p-8">
            <svg className="animate-spin h-12 w-12 text-emerald-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-semibold text-text-primary animate-pulse">Finalizing Data...</p>
            <p className="text-sm text-text-secondary mt-2">Writing to secure storage. Please wait.</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-accent mb-4 font-display">{t('importModal.successTitle')}</h3>
            <p className="text-text-primary mb-6">{t('importModal.successBody')}</p>
          </div>
        );
      case 'error':
        return (
          <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-red-400 mb-4 font-display">{t('importModal.errorTitle')}</h3>
            <p className="text-text-primary mb-6">{errorMessage}</p>
            <button
              onClick={onDismiss}
              className="w-full bg-secondary hover:bg-slate-600 text-text-primary font-bold py-3 px-4 rounded-md transition-colors"
            >
              OK
            </button>
          </div>
        );
      case 'idle':
      default:
        return (
          <>
            <div className="p-8 text-center">
              <h3 className="text-2xl font-bold text-accent mb-4 font-display">{t('importModal.title')}</h3>
              <p className="text-text-primary mb-8">
                {t('importModal.body')}
                <br />
                <strong className="text-amber-400">{t('importModal.warning')}</strong>
              </p>
            </div>
            <div className="bg-primary/50 px-8 py-4 flex flex-col sm:flex-row-reverse gap-3">
              <button
                onClick={handleConfirm}
                className="w-full sm:w-auto sm:ml-2 bg-accent hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-md transition-colors"
              >
                {t('importModal.loadButton')}
              </button>
              <button
                onClick={onDismiss}
                className="w-full sm:w-auto bg-secondary hover:bg-slate-600 text-text-primary font-bold py-3 px-6 rounded-md transition-colors"
              >
                {t('importModal.dismissButton')}
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-crystalline rounded-xl shadow-2xl overflow-hidden border border-secondary/50 w-full max-w-lg animate-fade-in">
        {renderContent()}
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ImportModal;
