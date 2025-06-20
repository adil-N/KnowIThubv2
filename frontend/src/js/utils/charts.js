// frontend/src/js/utils/charts.js

export const chartConfig = {
    colors: {
        primary: '#3b82f6',      // Blue
        secondary: '#10b981',    // Green
        warning: '#f59e0b',      // Yellow
        danger: '#ef4444',       // Red
        purple: '#8b5cf6',       // Purple
        gray: '#6b7280',         // Gray
        background: {
            primary: 'rgba(59, 130, 246, 0.1)',
            secondary: 'rgba(16, 185, 129, 0.1)',
            warning: 'rgba(245, 158, 11, 0.1)',
            danger: 'rgba(239, 68, 68, 0.1)',
            purple: 'rgba(139, 92, 246, 0.1)',
            gray: 'rgba(107, 114, 128, 0.1)'
        }
    },
    defaults: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    padding: 20,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    family: "'Inter', sans-serif",
                    size: 14
                },
                bodyFont: {
                    family: "'Inter', sans-serif",
                    size: 12
                }
            }
        }
    },
    lineChart: {
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
    }
};

// Helper functions for common chart configurations
export const chartHelpers = {
    createGradient: (ctx, color) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        return gradient;
    },

    // Common options for different chart types
    getLineChartOptions: (title = '') => ({
        ...chartConfig.defaults,
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    borderDash: [2],
                    drawBorder: false
                },
                ticks: {
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            }
        },
        plugins: {
            ...chartConfig.defaults.plugins,
            title: {
                display: !!title,
                text: title,
                font: {
                    family: "'Inter', sans-serif",
                    size: 16,
                    weight: 'bold'
                }
            }
        }
    }),

    getBarChartOptions: (title = '') => ({
        ...chartConfig.defaults,
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    borderDash: [2],
                    drawBorder: false
                },
                ticks: {
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            }
        },
        plugins: {
            ...chartConfig.defaults.plugins,
            title: {
                display: !!title,
                text: title,
                font: {
                    family: "'Inter', sans-serif",
                    size: 16,
                    weight: 'bold'
                }
            }
        }
    })
};