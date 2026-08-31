import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';

export const useLocalization = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LanguageProvider');
  }
  return context;
};
