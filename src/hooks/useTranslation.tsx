import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../constants/translations';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  isRTL: boolean;
  ramadanMode: boolean;
  setRamadanMode: (val: boolean) => void;
  lowBandwidth: boolean;
  setLowBandwidth: (val: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ar'; // Default to Arabic
  });

  const [ramadanMode, setRamadanMode] = useState(() => {
    return localStorage.getItem('ramadanMode') === 'true';
  });

  const [lowBandwidth, setLowBandwidth] = useState(() => {
    return localStorage.getItem('lowBandwidth') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('ramadanMode', String(ramadanMode));
    if (ramadanMode) {
      document.body.classList.add('ramadan-theme');
    } else {
      document.body.classList.remove('ramadan-theme');
    }
  }, [ramadanMode]);

  useEffect(() => {
    localStorage.setItem('lowBandwidth', String(lowBandwidth));
    if (lowBandwidth) {
      document.body.classList.add('low-bandwidth');
    } else {
      document.body.classList.remove('low-bandwidth');
    }
  }, [lowBandwidth]);

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      isRTL, 
      ramadanMode, 
      setRamadanMode, 
      lowBandwidth, 
      setLowBandwidth 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
