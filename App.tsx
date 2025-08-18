import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AmortizationData, EMIDetails, TenureUnit, Prepayments } from './types';
import { calculateEMI, generateAmortizationSchedule } from './utils/calculator';

type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'AUD' | 'CAD' | 'CHF' | 'NZD';
const currencies: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'NZD'];

const App: React.FC = () => {
    const [loanAmount, setLoanAmount] = useState<string>('1000000');
    const [interestRate, setInterestRate] = useState<string>('8.5');
    const [tenure, setTenure] = useState<string>('20');
    const [tenureUnit, setTenureUnit] = useState<TenureUnit>('years');
    const [prepayments, setPrepayments] = useState<Prepayments>({});
    
    const [emiDetails, setEmiDetails] = useState<EMIDetails | null>(null);
    const [schedule, setSchedule] = useState<AmortizationData[]>([]);
    const [showSchedule, setShowSchedule] = useState<boolean>(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [currency, setCurrency] = useState<Currency>('INR');
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [isCalculating, setIsCalculating] = useState<boolean>(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const validateInputs = () => {
        const newErrors: {[key: string]: string} = {};
        const p = parseFloat(loanAmount) || 0;
        const r = parseFloat(interestRate) || 0;
        const t = parseFloat(tenure) || 0;

        if (p <= 0) newErrors.loanAmount = 'Loan amount must be greater than 0';
        if (p > 100000000) newErrors.loanAmount = 'Loan amount cannot exceed 100 million';
        if (r < 0) newErrors.interestRate = 'Interest rate cannot be negative';
        if (r > 50) newErrors.interestRate = 'Interest rate cannot exceed 50%';
        if (t <= 0) newErrors.tenure = 'Tenure must be greater than 0';
        if (tenureUnit === 'years' && t > 50) newErrors.tenure = 'Tenure cannot exceed 50 years';
        if (tenureUnit === 'months' && t > 600) newErrors.tenure = 'Tenure cannot exceed 600 months';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLoanAmountChange = (value: string) => {
        setLoanAmount(value);
        if (errors.loanAmount) {
            const newErrors = { ...errors };
            delete newErrors.loanAmount;
            setErrors(newErrors);
        }
    };

    const handleInterestRateChange = (value: string) => {
        setInterestRate(value);
        if (errors.interestRate) {
            const newErrors = { ...errors };
            delete newErrors.interestRate;
            setErrors(newErrors);
        }
    };

    const handleTenureChange = (value: string) => {
        setTenure(value);
        if (errors.tenure) {
            const newErrors = { ...errors };
            delete newErrors.tenure;
            setErrors(newErrors);
        }
    };

    const handleCalculate = useCallback(() => {
        if (!validateInputs()) {
            setEmiDetails(null);
            setSchedule([]);
            setIsCalculating(false);
            return;
        }

        setIsCalculating(true);
        
        try {
            const p = parseFloat(loanAmount) || 0;
            const r = parseFloat(interestRate) || 0;
            const t = parseFloat(tenure) || 0;

            // Input validation
            if (p <= 0 || t <= 0 || r < 0) {
                setEmiDetails(null);
                setSchedule([]);
                setIsCalculating(false);
                return;
            }

            // Ensure reasonable limits
            if (p > 100000000) { // 100 million limit
                setLoanAmount('100000000');
                setIsCalculating(false);
                return;
            }

            if (r > 50) { // 50% interest rate limit
                setInterestRate('50');
                setIsCalculating(false);
                return;
            }

            const n = tenureUnit === 'years' ? Math.round(t * 12) : Math.round(t);
            if (n <= 0 || n > 600) { // Max 50 years
                setIsCalculating(false);
                return;
            }

            const calculatedSchedule = generateAmortizationSchedule(p, r, n, prepayments);
            
            if (calculatedSchedule.length === 0) {
                setIsCalculating(false);
                return;
            }

            const totalPayment = calculatedSchedule.reduce((acc, curr) => acc + curr.totalPayment, 0);
            const totalInterest = calculatedSchedule.reduce((acc, curr) => acc + curr.interest, 0);
            const actualTenure = calculatedSchedule.length;
            
            setSchedule(calculatedSchedule);
            setEmiDetails({
                emi: calculateEMI(p, r, n),
                totalInterest,
                totalPayment,
                principal: p,
                actualTenure
            });
        } catch (error) {
            console.error('Calculation error:', error);
            setEmiDetails(null);
            setSchedule([]);
        } finally {
            setIsCalculating(false);
        }

    }, [loanAmount, interestRate, tenure, tenureUnit, prepayments]);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            handleCalculate();
        }, 500); // Increased debounce to 500ms to reduce frequent calculations

        return () => {
            clearTimeout(handler);
        };
    }, [handleCalculate]);


    const handlePrepaymentChange = (month: number, amount: string) => {
        const newAmount = parseFloat(amount);
        setPrepayments(prev => {
            const newPrepayments = { ...prev };
            if (!isNaN(newAmount) && newAmount > 0) {
                newPrepayments[month] = newAmount;
            } else {
                delete newPrepayments[month];
            }
            return newPrepayments;
        });
    };
    
    const currencyFormatter = useMemo(() => {
        const locales: Record<Currency, string> = {
            'INR': 'en-IN',
            'USD': 'en-US',
            'EUR': 'de-DE',
            'GBP': 'en-GB',
            'JPY': 'ja-JP',
            'CNY': 'zh-CN',
            'AUD': 'en-AU',
            'CAD': 'en-CA',
            'CHF': 'de-CH',
            'NZD': 'en-NZ',
        };
        return new Intl.NumberFormat(locales[currency], {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }, [currency]);

    const compactNumberFormatter = useMemo(() => {
        const locales: Record<Currency, string> = {
            'INR': 'en-IN',
            'USD': 'en-US',
            'EUR': 'de-DE',
            'GBP': 'en-GB',
            'JPY': 'ja-JP',
            'CNY': 'zh-CN',
            'AUD': 'en-AU',
            'CAD': 'en-CA',
            'CHF': 'de-CH',
            'NZD': 'en-NZ',
        };
        return new Intl.NumberFormat(locales[currency], {
            notation: 'compact',
            compactDisplay: 'short',
        });
    }, [currency]);

    const chartData = useMemo(() => {
        if (!schedule || schedule.length === 0) return [];
        // Limit chart data points to prevent performance issues
        const maxDataPoints = 240; // 20 years max for chart
        const dataToShow = schedule.length > maxDataPoints 
            ? schedule.filter((_, index) => index % Math.ceil(schedule.length / maxDataPoints) === 0)
            : schedule;
            
        return dataToShow.map(item => ({
            month: item.month,
            Principal: item.principal + item.prepayment,
            Interest: item.interest,
            'Closing Balance': item.closingBalance
        }));
    }, [schedule]);

    const loanAmountValue = parseFloat(loanAmount) || 0;
    const interestRateValue = parseFloat(interestRate) || 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-700 dark:text-gray-300 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <main className="max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <div className="relative">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 dark:from-emerald-400 dark:via-blue-400 dark:to-purple-500 px-4 mb-4 animate-pulse">
                            💰 EMI & Loan Visualizer
                        </h1>
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-600/20 dark:from-emerald-400/20 dark:via-blue-400/20 dark:to-purple-500/20 blur-xl -z-10 animate-pulse"></div>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-4 px-4 font-medium">📊 Visualize your loan journey with real-time calculations and smart insights</p>
                    <div className="flex justify-center mt-4">
                        <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                Real-time calculations
                            </div>
                            <div className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                                Interactive charts
                            </div>
                            <div className="flex items-center">
                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                                Smart insights
                            </div>
                        </div>
                    </div>
                    
                    {/* Enhanced mobile-friendly controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 px-4">
                        <div className="relative group">
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value as Currency)}
                                className="appearance-none cursor-pointer p-3 pr-12 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:shadow-lg transition-all duration-300 hover:shadow-md transform hover:scale-105 text-sm sm:text-base min-w-[140px] font-medium"
                                aria-label="Select currency"
                            >
                                {currencies.map(c => <option key={c} value={c}>💱 {c}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        <button
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-800 dark:hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-300 hover:shadow-lg transform hover:scale-105 text-sm sm:text-base font-medium min-w-[120px] justify-center"
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                    <span>🌙 Dark</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span>☀️ Light</span>
                                </>
                            )}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                    <div className="xl:col-span-1 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-4 sm:p-6 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                </svg>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">🎛️ Loan Controls</h2>
                        </div>
                        
                        <div className="space-y-6 sm:space-y-8">
                            <div className="relative group">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">💰</span>
                                    <label htmlFor="loanAmount" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                        Loan Amount ({currencyFormatter.resolvedOptions().currency})
                                    </label>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        id="loanAmount" 
                                        value={loanAmount} 
                                        onChange={e => handleLoanAmountChange(e.target.value)} 
                                        className={`w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 rounded-2xl focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-gray-900 dark:text-white text-sm sm:text-base font-semibold shadow-inner hover:shadow-lg ${
                                            errors.loanAmount ? 'border-red-500 dark:border-red-400 ring-red-500/30' : 'border-gray-300/50 dark:border-gray-600/50'
                                        }`}
                                        min="1"
                                        max="100000000"
                                        placeholder="Enter loan amount"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                        <span className="text-gray-400 text-sm font-medium">{currencyFormatter.resolvedOptions().currency}</span>
                                    </div>
                                </div>
                                {errors.loanAmount && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-red-500">❌</span>
                                        <p className="text-sm text-red-500 dark:text-red-400 font-medium">{errors.loanAmount}</p>
                                    </div>
                                )}
                                <input 
                                    type="range" 
                                    min="10000" 
                                    max="20000000" 
                                    step="10000" 
                                    value={loanAmountValue} 
                                    onChange={e => handleLoanAmountChange(e.target.value)} 
                                    className="w-full h-3 bg-gradient-to-r from-gray-200 via-emerald-200 to-gray-200 dark:from-gray-700 dark:via-emerald-700 dark:to-gray-700 rounded-full appearance-none cursor-pointer mt-4 slider-thumb"
                                    style={{background: `linear-gradient(to right, #10b981 0%, #10b981 ${(loanAmountValue/20000000)*100}%, #e5e7eb ${(loanAmountValue/20000000)*100}%, #e5e7eb 100%)`}}
                                />
                            </div>
                            
                            <div className="relative group">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">📈</span>
                                    <label htmlFor="interestRate" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                        Annual Interest Rate (%)
                                    </label>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        id="interestRate" 
                                        value={interestRate} 
                                        onChange={e => handleInterestRateChange(e.target.value)} 
                                        className={`w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 rounded-2xl focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-gray-900 dark:text-white text-sm sm:text-base font-semibold shadow-inner hover:shadow-lg ${
                                            errors.interestRate ? 'border-red-500 dark:border-red-400 ring-red-500/30' : 'border-gray-300/50 dark:border-gray-600/50'
                                        }`}
                                        min="0"
                                        max="50"
                                        placeholder="Enter interest rate"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                        <span className="text-gray-400 text-sm font-medium">%</span>
                                    </div>
                                </div>
                                {errors.interestRate && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-red-500">❌</span>
                                        <p className="text-sm text-red-500 dark:text-red-400 font-medium">{errors.interestRate}</p>
                                    </div>
                                )}
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="25" 
                                    step="0.1" 
                                    value={interestRateValue} 
                                    onChange={e => handleInterestRateChange(e.target.value)} 
                                    className="w-full h-3 bg-gradient-to-r from-gray-200 via-blue-200 to-gray-200 dark:from-gray-700 dark:via-blue-700 dark:to-gray-700 rounded-full appearance-none cursor-pointer mt-4"
                                    style={{background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(interestRateValue/25)*100}%, #e5e7eb ${(interestRateValue/25)*100}%, #e5e7eb 100%)`}}
                                />
                            </div>

                            <div className="relative group">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">⏰</span>
                                    <label htmlFor="tenure" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                        Loan Tenure
                                    </label>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        type="number" 
                                        id="tenure" 
                                        value={tenure} 
                                        onChange={e => handleTenureChange(e.target.value)} 
                                        className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 rounded-2xl sm:rounded-r-none focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-gray-900 dark:text-white text-sm sm:text-base font-semibold shadow-inner hover:shadow-lg ${
                                            errors.tenure ? 'border-red-500 dark:border-red-400 ring-red-500/30' : 'border-gray-300/50 dark:border-gray-600/50'
                                        }`}
                                        min="1"
                                        max={tenureUnit === 'years' ? "50" : "600"}
                                        placeholder="Enter tenure"
                                    />
                                    <div className="flex rounded-2xl sm:rounded-l-none overflow-hidden border-2 border-gray-300/50 dark:border-gray-600/50">
                                        <button 
                                            onClick={() => setTenureUnit('years')} 
                                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 transition-all duration-300 text-sm sm:text-base font-bold ${
                                                tenureUnit === 'years' 
                                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg transform scale-105' 
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-800'
                                            }`}
                                        >
                                            📅 Years
                                        </button>
                                        <button 
                                            onClick={() => setTenureUnit('months')} 
                                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 transition-all duration-300 text-sm sm:text-base font-bold ${
                                                tenureUnit === 'months' 
                                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg transform scale-105' 
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-800'
                                            }`}
                                        >
                                            🗓️ Months
                                        </button>
                                    </div>
                                </div>
                                {errors.tenure && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-red-500">❌</span>
                                        <p className="text-sm text-red-500 dark:text-red-400 font-medium">{errors.tenure}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-2 space-y-6 lg:space-y-8">
                        {isCalculating ? (
                            <div className="flex items-center justify-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 h-64">
                                <div className="text-center">
                                    <div className="relative mb-6">
                                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 dark:border-emerald-800 mx-auto"></div>
                                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-500 dark:border-emerald-400 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
                                        <span className="absolute inset-0 flex items-center justify-center text-2xl">🧮</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">✨ Calculating...</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Crunching numbers for your perfect loan plan</p>
                                </div>
                            </div>
                        ) : emiDetails ? (
                            <>
                                <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 p-4 sm:p-8 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center">
                                            <span className="text-2xl">💹</span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Loan Summary</h2>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 text-center">
                                        <div className="group p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                                            <div className="flex items-center justify-center mb-2">
                                                <span className="text-3xl mr-2">🏦</span>
                                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Monthly EMI</p>
                                            </div>
                                            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 break-all">{currencyFormatter.format(emiDetails.emi)}</p>
                                        </div>
                                        <div className="group p-4 sm:p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-2xl border border-red-200/50 dark:border-red-700/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                                            <div className="flex items-center justify-center mb-2">
                                                <span className="text-3xl mr-2">📊</span>
                                                <p className="text-sm font-bold text-red-700 dark:text-red-300">Total Interest</p>
                                            </div>
                                            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-red-600 dark:text-red-400 break-all">{currencyFormatter.format(emiDetails.totalInterest)}</p>
                                        </div>
                                        <div className="group p-4 sm:p-6 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-2xl border border-cyan-200/50 dark:border-cyan-700/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                                            <div className="flex items-center justify-center mb-2">
                                                <span className="text-3xl mr-2">💰</span>
                                                <p className="text-sm font-bold text-cyan-700 dark:text-cyan-300">Total Payment</p>
                                            </div>
                                            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-cyan-600 dark:text-cyan-400 break-all">{currencyFormatter.format(emiDetails.totalPayment)}</p>
                                        </div>
                                        {emiDetails.actualTenure && (
                                            <div className="group p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl border border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all duration-300 hover:scale-105 sm:col-span-2 xl:col-span-1">
                                                <div className="flex items-center justify-center mb-2">
                                                    <span className="text-3xl mr-2">⏱️</span>
                                                    <p className="text-sm font-bold text-green-700 dark:text-green-300">Actual Tenure</p>
                                                </div>
                                                <p className="text-xl sm:text-2xl lg:text-3xl font-black text-green-600 dark:text-green-400">
                                                    {emiDetails.actualTenure} {emiDetails.actualTenure === 1 ? 'month' : 'months'}
                                                </p>
                                                {emiDetails.actualTenure < parseInt(tenure) * (tenureUnit === 'years' ? 12 : 1) && (
                                                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-bold flex items-center justify-center">
                                                        🎉 Saved {(parseInt(tenure) * (tenureUnit === 'years' ? 12 : 1)) - emiDetails.actualTenure} months!
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6 sm:mt-8 h-64 sm:h-80">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 20, right: window.innerWidth < 640 ? 5 : 10, left: 0, bottom: 20 }}>
                                                <defs>
                                                    <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                                                <XAxis 
                                                    dataKey="month" 
                                                    stroke="#6B7280" 
                                                    tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }} 
                                                    label={window.innerWidth >= 640 ? { value: 'Months', position: 'insideBottom', offset: -5, fill: '#6B7280' } : undefined}
                                                    interval={window.innerWidth < 640 ? 'preserveStartEnd' : 'preserveEnd'}
                                                />
                                                <YAxis 
                                                    stroke="#6B7280" 
                                                    tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }} 
                                                    tickFormatter={(value) => compactNumberFormatter.format(Number(value))} 
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: theme === 'light' ? 'white' : '#1F2937', 
                                                        border: `1px solid ${theme === 'light' ? '#E5E7EB' : '#374151'}`, 
                                                        borderRadius: '0.5rem',
                                                        fontSize: window.innerWidth < 640 ? '12px' : '14px'
                                                    }} 
                                                    formatter={(value: number) => currencyFormatter.format(value)}
                                                />
                                                <Legend wrapperStyle={{ color: '#6B7280', fontSize: window.innerWidth < 640 ? '12px' : '14px' }} />
                                                <Area type="monotone" dataKey="Principal" stroke="#10B981" fillOpacity={1} fill="url(#colorPrincipal)" />
                                                <Area type="monotone" dataKey="Interest" stroke="#EF4444" fillOpacity={1} fill="url(#colorInterest)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 p-4 sm:p-8 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                                    <button 
                                        onClick={() => setShowSchedule(!showSchedule)} 
                                        className="w-full flex justify-between items-center text-left group hover:bg-gray-50/50 dark:hover:bg-gray-700/50 p-4 rounded-2xl transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                                                <span className="text-2xl">📊</span>
                                            </div>
                                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Amortization Schedule</h3>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 sm:h-8 sm:w-8 transition-transform duration-300 text-gray-600 dark:text-gray-400 group-hover:text-purple-500 ${showSchedule ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {showSchedule && (
                                        <div className="mt-6 overflow-x-auto max-h-[400px] sm:max-h-[600px] rounded-2xl bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border border-gray-200/50 dark:border-gray-700/50">
                                            <table className="w-full text-xs sm:text-sm text-left text-gray-600 dark:text-gray-300">
                                                <thead className="text-xs text-gray-800 dark:text-gray-200 uppercase bg-gradient-to-r from-emerald-100 to-blue-100 dark:from-emerald-900/50 dark:to-blue-900/50 sticky top-0 font-bold">
                                                    <tr>
                                                        <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 border-r border-gray-200 dark:border-gray-600">📅 Month</th>
                                                        <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell border-r border-gray-200 dark:border-gray-600">💰 Opening Balance</th>
                                                        <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 border-r border-gray-200 dark:border-gray-600">🏦 Principal</th>
                                                        <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 border-r border-gray-200 dark:border-gray-600">📊 Interest</th>
                                                        <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 border-r border-gray-200 dark:border-gray-600">💸 Prepayment</th>
                                                        <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">💳 Closing Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {schedule.map((row, index) => (
                                                        <tr key={row.month} className={`hover:bg-gradient-to-r hover:from-emerald-50 hover:to-blue-50 dark:hover:from-emerald-900/20 dark:hover:to-blue-900/20 transition-all duration-200 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}>
                                                            <td className="px-3 sm:px-6 py-3 font-bold text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700">{row.month}</td>
                                                            <td className="px-3 sm:px-6 py-3 hidden sm:table-cell border-r border-gray-100 dark:border-gray-700">
                                                                <span className="hidden lg:inline font-semibold">{currencyFormatter.format(row.openingBalance)}</span>
                                                                <span className="lg:hidden font-semibold text-emerald-600 dark:text-emerald-400">{compactNumberFormatter.format(row.openingBalance)}</span>
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-3 border-r border-gray-100 dark:border-gray-700">
                                                                <span className="hidden lg:inline font-semibold text-blue-600 dark:text-blue-400">{currencyFormatter.format(row.principal)}</span>
                                                                <span className="lg:hidden font-semibold text-blue-600 dark:text-blue-400">{compactNumberFormatter.format(row.principal)}</span>
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-3 border-r border-gray-100 dark:border-gray-700">
                                                                <span className="hidden lg:inline font-semibold text-red-600 dark:text-red-400">{currencyFormatter.format(row.interest)}</span>
                                                                <span className="lg:hidden font-semibold text-red-600 dark:text-red-400">{compactNumberFormatter.format(row.interest)}</span>
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-3 border-r border-gray-100 dark:border-gray-700">
                                                                <input
                                                                    type="number"
                                                                    placeholder="💰 Add"
                                                                    defaultValue={prepayments[row.month] || ''}
                                                                    onBlur={(e) => handlePrepaymentChange(row.month, e.target.value)}
                                                                    className="w-16 sm:w-28 px-2 sm:px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-500 border-2 border-gray-300 dark:border-gray-500 rounded-xl text-right text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-xs sm:text-sm font-semibold hover:shadow-md"
                                                                />
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-3 font-bold text-gray-900 dark:text-white">
                                                                <span className="hidden lg:inline">{currencyFormatter.format(row.closingBalance)}</span>
                                                                <span className="lg:hidden text-cyan-600 dark:text-cyan-400">{compactNumberFormatter.format(row.closingBalance)}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                             <div className="flex items-center justify-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 h-64 sm:h-full">
                                <div className="text-center">
                                    <div className="relative mb-6">
                                        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                            <span className="text-4xl animate-bounce">📋</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">🚀 Ready to Calculate!</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 px-4 leading-relaxed">Enter your loan details on the left to see beautiful charts, detailed breakdowns, and smart insights about your EMI journey.</p>
                                    <div className="flex justify-center mt-4">
                                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                                            <span className="flex items-center"><span className="w-2 h-2 bg-emerald-400 rounded-full mr-1"></span>Real-time</span>
                                            <span className="flex items-center"><span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>Interactive</span>
                                            <span className="flex items-center"><span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>Accurate</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <section className="mt-12 space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Understanding EMI</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">What is an EMI?</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    An Equated Monthly Installment (EMI) is a fixed payment amount made by a borrower to a lender at a specified date each calendar month. EMIs are used to pay off both interest and principal each month so that over a specified number of years, the loan is paid off in full.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">EMI Formula</h3>
                                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                                    <code className="text-sm text-gray-800 dark:text-gray-200">
                                        EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
                                    </code>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                        Where P = Principal, r = Monthly interest rate, n = Number of months
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How to Use This Calculator</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-400">
                                <li><strong className="font-medium text-gray-800 dark:text-gray-200">Enter Loan Amount:</strong> Use the slider or input field to set the total amount you wish to borrow (up to 100 million).</li>
                                <li><strong className="font-medium text-gray-800 dark:text-gray-200">Set Interest Rate:</strong> Adjust the annual interest rate charged by the lender (0-50%).</li>
                                <li><strong className="font-medium text-gray-800 dark:text-gray-200">Define Loan Tenure:</strong> Input the duration of the loan in either years (max 50) or months (max 600).</li>
                                <li><strong className="font-medium text-gray-800 dark:text-gray-200">View Instant Results:</strong> The calculator automatically updates the EMI, total interest, and total payment.</li>
                            </ol>
                            <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-400" start={5}>
                                <li><strong className="font-medium text-gray-800 dark:text-gray-200">Analyze the Schedule:</strong> Click on "Amortization Schedule" to see a detailed month-by-month breakdown.</li>
                                <li><strong className="font-medium text-gray-800 dark:text-gray-200">Simulate Prepayments:</strong> Add extra payments for any month to see how it reduces your loan tenure and total interest.</li>
                                <li><strong className="font-medium text-gray-800 dark:text-gray-200">Track Savings:</strong> The calculator shows actual tenure and savings when prepayments are made.</li>
                                <li><strong className="font-medium text-gray-800 dark:text-gray-200">Change Currency:</strong> Select from multiple currencies to view amounts in your preferred format.</li>
                            </ol>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Tips for Smart Loan Management</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                </div>
                                <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Make Prepayments</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Regular prepayments can significantly reduce your total interest and loan tenure.</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Compare Options</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Use different interest rates and tenures to find the most suitable loan option.</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Plan Your Budget</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Ensure your EMI doesn't exceed 40% of your monthly income for financial stability.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default App;