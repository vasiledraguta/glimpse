import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
	undefined,
);

export const ThemeProvider = ({
	children,
	defaultTheme = 'system',
	storageKey = 'glimpse-theme',
}: ThemeProviderProps) => {
	const [theme, setThemeState] = useState<Theme>(defaultTheme);

	useEffect(() => {
		const stored = localStorage.getItem(storageKey);
		if (stored === 'dark' || stored === 'light' || stored === 'system') {
			setThemeState(stored);
		}
	}, [storageKey]);

	useEffect(() => {
		const root = window.document.documentElement;

		root.classList.remove('light', 'dark');

		if (theme === 'system') {
			const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
				.matches
				? 'dark'
				: 'light';

			root.classList.add(systemTheme);
			return;
		}

		root.classList.add(theme);
	}, [theme]);

	const setTheme = (newTheme: Theme) => {
		localStorage.setItem(storageKey, newTheme);
		setThemeState(newTheme);
	};

	const value = {
		theme,
		setTheme,
	};

	return (
		<ThemeProviderContext.Provider value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined)
		throw new Error('useTheme must be used within a ThemeProvider');

	return context;
};
