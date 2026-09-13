"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ColorTheme = 'vibrant' | 'classic';

interface AppearanceContextType {
    colorTheme: ColorTheme;
    setColorTheme: (theme: ColorTheme) => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
    const [colorTheme, setColorThemeState] = useState<ColorTheme>('vibrant');

    useEffect(() => {
        const savedTheme = localStorage.getItem('colorTheme') as ColorTheme;
        if (savedTheme && (savedTheme === 'vibrant' || savedTheme === 'classic')) {
            setColorThemeState(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }, []);

    const setColorTheme = useCallback((theme: ColorTheme) => {
        setColorThemeState(theme);
        localStorage.setItem('colorTheme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, []);

    return (
        <AppearanceContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </AppearanceContext.Provider>
    );
}

export function useAppearance() {
    const context = useContext(AppearanceContext);
    if (context === undefined) {
        throw new Error('useAppearance must be used within an AppearanceProvider');
    }
    return context;
}
